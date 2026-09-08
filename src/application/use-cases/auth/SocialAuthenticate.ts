import { injectable, inject } from 'tsyringe';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { ILoginAccessRepository, LoginAccess } from '../../../domain/repositories/ILoginAccessRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { LoginUser } from '../../../domain/entities/LoginUser.js';
import { Organization } from '../../../domain/entities/Organization.js';
import { generateId } from '../../../shared/utils/id-generator.js';
import type { AuthenticateResult, OrganizationMembership } from './Authenticate.js';

export interface SocialAuthInput {
    provider_type: string;
    email: string;
    name?: string;
    provider_id?: string;
}

@injectable()
export class SocialAuthenticate {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
        @inject('LoginAccessRepository') private loginAccessRepo: ILoginAccessRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(input: SocialAuthInput): Promise<AuthenticateResult> {
        const { provider_type, email, name, provider_id } = input;

        let loginUser = await this.loginUserRepo.findByEmail(email);
        if (!loginUser) {
            loginUser = await this.loginUserRepo.create({
                email,
                isVerify: true,
                providerType: provider_type,
                providerId: provider_id ?? '',
                name: name ?? '',
            });
        }

        const token = generateId('login_acc');
        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
        const loginAccess = await this.loginAccessRepo.create({ id: token, email, expiresAt });

        const [organizations, appUsers] = await Promise.all([
            this._fetchOrganizations(email),
            this.userRepo.listByEmail(email, 0, 1),
        ]);

        const userId = appUsers[0]?.publicId ?? loginUser.id;
        return { loginAccess, loginUser, organizations, userId };
    }

    private async _fetchOrganizations(email: string): Promise<OrganizationMembership[]> {
        const orgIds = await this.userRepo.listDistinctOrganizationIdsByEmail(email);
        if (!orgIds.length) return [];

        const [orgs, users] = await Promise.all([
            this.orgRepo.listByIds(orgIds),
            Promise.all(orgIds.map((id) => this.userRepo.findByEmail(id, email))),
        ]);

        const orgMap = new Map<string, Organization>(orgs.map((o) => [o.id, o]));

        const result: OrganizationMembership[] = [];
        for (let i = 0; i < orgIds.length; i++) {
            const user = users[i];
            const org = orgMap.get(orgIds[i]);
            if (!user || !org) continue;
            result.push({
                organization_id: org.publicId || org.id,
                display_name: org.name,
                icon_url: org.iconUrl ?? null,
                is_paid: org.isPaid,
                is_active: org.isActive,
                role: user.role,
                is_admin: user.isAdmin,
                status: user.status,
                display_name_user: user.displayName || '',
                avatar_url: user.avatarUrl || '',
            });
        }
        return result;
    }
}
