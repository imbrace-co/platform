import { injectable, inject } from 'tsyringe';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IBusinessUnitRepository } from '../../../domain/repositories/IBusinessUnitRepository.js';
import { IBusinessUnitUserRepository } from '../../../domain/repositories/IBusinessUnitUserRepository.js';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { Organization } from '../../../domain/entities/Organization.js';
import { generateId } from '../../../shared/utils/id-generator.js';
import { config } from '../../../shared/config/index.js';
import { createDefaultTeamAgent } from '../../../infrastructure/services/MarketplaceService.js';

export interface CreateOrganizationDTO {
    name: string;
    email: string;
    iconUrl?: string;
    isPaid?: boolean;
}

@injectable()
export class CreateOrganization {
    constructor(
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('BusinessUnitRepository') private buRepo: IBusinessUnitRepository,
        @inject('BusinessUnitUserRepository') private buUserRepo: IBusinessUnitUserRepository,
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
    ) { }

    async execute(input: CreateOrganizationDTO): Promise<Organization> {
        if (!input.name) {
            throw new Error('Organization name is required');
        }

        // 1. Check if organization name already exists
        const existing = await this.orgRepo.findByName(input.name);
        if (existing) {
            throw new Error('Organization name already exists');
        }

        // 2. Create Organization
        const orgId = generateId('org');

        const orgData: Partial<Organization> = {
            id: orgId,
            publicId: orgId,
            name: input.name,
            iconUrl: input.iconUrl || null,
            isPaid: true,
            isActive: true,
            organizationLockFeatures: null,
            aiSettings: { allowed_models: [] },
            modules: {
                conversation: true,
                databoards: true,
                campaign: false,
                workflows: true,
                channels: true,
                credentials: true,
                analytics: false,
                teams: true,
                member: true,
                templates: true,
                marketplace: true,
                crm: true,
                ideas: true,
                events: true,
                knowledge_hub: true,
                internal_ai_chat: true,
                workflows_v2: true,
                apps: false
            },
            sidebar: null,
            partition: 0,
            createdAt: new Date(),
            updatedAt: null,
        };

        const newOrg = await this.orgRepo.create(orgData);

        // 3. Create Owner User
        const ownerId = generateId('u');
        const ownerEmail = input.email || 'superadmin@imbrace.co';
        await this.userRepo.create({
            id: ownerId,
            publicId: generateId('pub'),
            organizationId: orgId,
            email: ownerEmail,
            role: 'owner',
            displayName: `${input.name} owner`,
            firstName: ownerEmail,
            isActive: true,
            status: 'active'
        } as any);

        // 4. Create Bot User
        await this.userRepo.create({
            id: generateId('u'),
            publicId: generateId('pub'),
            organizationId: orgId,
            email: `bot@${orgId}.imbrace.co`,
            role: 'member',
            displayName: 'Bot',
            isBot: true,
            isActive: true,
            status: 'active'
        } as any);

        // 5. Create Default Business Unit
        const buId = generateId('bu');
        await this.buRepo.create({
            id: buId,
            organizationId: orgId,
            publicId: generateId('pub'),
            name: input.name,
            isActive: true
        } as any);

        // 6. Add Owner to Business Unit as ADMIN
        await this.buUserRepo.create({
            id: generateId('buu'),
            organizationId: orgId,
            businessUnitId: buId,
            userId: ownerId,
            role: 'admin'
        } as any);

        // 7. Create Default Team (Admin)
        const teamId = generateId('team');
        await this.teamRepo.create({
            id: teamId,
            organizationId: orgId,
            businessUnitId: buId,
            publicId: generateId('pub'),
            name: 'Admin',
            mode: 'public',
            isDefault: true,
            isDisabled: false
        } as any);

        // 8. Add Owner to Team as ADMIN
        await this.teamUserRepo.create({
            id: generateId('tu'),
            organizationId: orgId,
            businessUnitId: buId,
            teamId: teamId,
            userId: ownerId,
            role: 'admin',
            state: 'join'
        } as any);

        // 8b. Provision a default AI agent for the default team (best-effort).
        // Mirrors CreateTeam — failures never break org creation.
        void createDefaultTeamAgent({
            organizationId: orgId,
            teamId: teamId,
            teamName: 'Admin',
            userId: ownerId,
        });

        // 9. Seed default CRM boards via data-board (best-effort).
        // Creates the 6 default boards (Contacts, Companies, Opportunities,
        // Tasks, Product, Opt-out). Failures don't break org creation.
        await this.seedDefaultBoards(orgId, buId);

        // 10. Seed default DocIQ Document Models via data-board (best-effort).
        // Solves the DocIQ cold-start problem: a new org would otherwise open an
        // empty Document Models catalogue. Independent of board seeding — its
        // own endpoint, idempotent, and failures never break org creation.
        await this.seedDefaultDocModels(orgId);

        return newOrg;
    }

    private async seedDefaultBoards(orgId: string, buId: string): Promise<void> {
        const url = `${config.services.dataBoard.baseUrl}/api/boards/_seed_default`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    organization_id: orgId,
                    business_unit_id: buId,
                }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                console.error(
                    `seedDefaultBoards: data-board returned ${res.status} for org ${orgId}: ${text}`,
                );
            }
        } catch (err) {
            console.error(
                `seedDefaultBoards: failed for org ${orgId} (${(err as Error).message})`,
            );
        }
    }

    /**
     * Seed the curated default DocIQ Document Models into the new org via
     * data-board's internal POST /api/schemas/_seed_default. Best-effort and
     * idempotent (data-board skips if the org already has schemas), mirroring
     * seedDefaultBoards — failures are logged but never break org creation.
     */
    private async seedDefaultDocModels(orgId: string): Promise<void> {
        const url = `${config.services.dataBoard.baseUrl}/api/schemas/_seed_default`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ organization_id: orgId }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                console.error(
                    `seedDefaultDocModels: data-board returned ${res.status} for org ${orgId}: ${text}`,
                );
            }
        } catch (err) {
            console.error(
                `seedDefaultDocModels: failed for org ${orgId} (${(err as Error).message})`,
            );
        }
    }
}
