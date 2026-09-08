import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { ILoginAccessRepository, LoginAccess } from '../../../domain/repositories/ILoginAccessRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { User } from '../../../domain/entities/User.js';
import { Organization } from '../../../domain/entities/Organization.js';
import { LoginUser } from '../../../domain/entities/LoginUser.js';
import { generateId } from '../../../shared/utils/id-generator.js';
import { config } from '../../../shared/config/index.js';

export interface OrganizationMembership {
    organization_id: string;
    display_name: string;
    icon_url: string | null;
    is_paid: boolean;
    is_active: boolean;
    role: string;
    is_admin: boolean;
    status: string;
    display_name_user: string;
    avatar_url: string;
}

export interface AuthenticateResult {
    loginAccess: LoginAccess;
    loginUser: LoginUser;
    organizations: OrganizationMembership[];
    userId: string | null;
}

@injectable()
export class Authenticate {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
        @inject('LoginAccessRepository') private loginAccessRepo: ILoginAccessRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(email: string, password: string): Promise<AuthenticateResult> {
        const loginAccess = await this._signInWithPassword(email, password);

        const [loginUser, organizations, appUsers] = await Promise.all([
            this.loginUserRepo.findByEmail(email),
            this._fetchOrganizations(email),
            this.userRepo.listByEmail(email, 0, 1),
        ]);

        const userId = appUsers[0]?.publicId ?? loginUser?.id ?? null;
        return { loginAccess, loginUser: loginUser!, organizations, userId };
    }

    private async _signInWithPassword(email: string, password: string): Promise<LoginAccess> {
        const { superadminEmail: ENV_EMAIL, superadminPassword: ENV_PASSWORD } = config.auth;
        if (ENV_EMAIL && ENV_PASSWORD && email === ENV_EMAIL && password === ENV_PASSWORD) {
            return this._createLoginAccess(email);
        }

        const loginUser = await this.loginUserRepo.findByEmail(email);
        if (!loginUser) {
            throw Object.assign(new Error('email not sign up.'), { code: 'NOT_FOUND' });
        }
        if (!loginUser.password || !bcrypt.compareSync(password, loginUser.password)) {
            throw Object.assign(new Error('incorrect password. or email unverified'), { code: 'INCORRECT_PASSWORD' });
        }
        if (!loginUser.isVerify) {
            throw Object.assign(new Error('incorrect password. or email unverified'), { code: 'UNVERIFIED' });
        }

        return this._createLoginAccess(email);
    }

    private async _createLoginAccess(email: string): Promise<LoginAccess> {
        const token = generateId('login_acc');
        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
        return this.loginAccessRepo.create({ id: token, email, expiresAt });
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
