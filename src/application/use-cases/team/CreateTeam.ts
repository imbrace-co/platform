import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { IBusinessUnitUserRepository } from '../../../domain/repositories/IBusinessUnitUserRepository.js';
import { IBusinessUnitRepository } from '../../../domain/repositories/IBusinessUnitRepository.js';
import { Team } from '../../../domain/entities/Team.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';
import { generateId } from '../../../shared/utils/id-generator.js';
import { createDefaultTeamAgent } from '../../../infrastructure/services/MarketplaceService.js';

export interface CreateTeamDTO {
    organizationId: string;
    businessUnitId?: string;
    name: string;
    mode?: string;
    iconUrl?: string;
    description?: string;
    creatorUserId?: string;
    creatorRole?: string;
}

@injectable()
export class CreateTeam {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
        @inject('BusinessUnitUserRepository') private buUserRepo: IBusinessUnitUserRepository,
        @inject('BusinessUnitRepository') private buRepo: IBusinessUnitRepository,
    ) { }

    async execute(input: CreateTeamDTO): Promise<{ team: Team; teamUser: TeamUser | null }> {
        if (!input.name || !input.organizationId) {
            throw new DomainError('Organization ID and Name are required');
        }

        // Resolve the BU to its internal id. Migrated frontends (e.g. scb2) send the legacy
        // public_id (pub_*), but the FK columns store the internal id (bu_*) — using the raw
        // value would violate teams_business_unit_id_business_units_id_fk. Accept either form.
        let businessUnitId = input.businessUnitId || null;
        if (input.businessUnitId) {
            const bu = await this.buRepo.findByIdOrPublicId(input.businessUnitId);
            if (!bu) {
                throw new DomainError('Business unit not found', 404);
            }
            businessUnitId = bu.id;
        }

        // Validate BU membership — owner/technician (super admin) bypass, mirroring JoinTeamRequest
        const isSuperAdmin = ['owner', 'technician'].includes(input.creatorRole ?? '');
        if (!isSuperAdmin && businessUnitId && input.creatorUserId) {
            const buMember = await this.buUserRepo.findByUserAndBU(businessUnitId, input.creatorUserId);
            if (!buMember) {
                throw new DomainError('Insufficient permission', 403);
            }
        }

        // Check team name uniqueness in BU
        if (businessUnitId) {
            const existing = await this.teamRepo.findByBuAndName(businessUnitId, input.name);
            if (existing) {
                throw new DomainError('Team name already exists', 400);
            }
        }

        const teamData: Partial<Team> = {
            id: generateId('t'),
            organizationId: input.organizationId,
            businessUnitId: businessUnitId,
            name: input.name,
            mode: input.mode || 'public',
            iconUrl: input.iconUrl || null,
            description: input.description || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const team = await this.teamRepo.create(teamData);

        // Add creator as admin teamUser
        let teamUser: TeamUser | null = null;
        if (input.creatorUserId) {
            teamUser = await this.teamUserRepo.create({
                organizationId: input.organizationId,
                businessUnitId: businessUnitId,
                teamId: team.id,
                userId: input.creatorUserId,
                role: 'admin',
                state: 'join',
            });
        }

        // Provision a default AI agent (use case + assistant) for the new team in
        // the marketplace service. Best-effort & fire-and-forget so a marketplace/AI
        // outage never blocks or breaks team creation.
        void createDefaultTeamAgent({
            organizationId: input.organizationId,
            teamId: team.id,
            teamName: input.name,
            userId: input.creatorUserId,
        });

        return { team, teamUser };
    }
}
