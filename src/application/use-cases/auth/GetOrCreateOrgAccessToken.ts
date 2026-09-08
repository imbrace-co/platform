import { injectable, inject } from 'tsyringe';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IAccessRepository, Access } from '../../../domain/repositories/IAccessRepository.js';
import { User } from '../../../domain/entities/User.js';
import { generateId } from '../../../shared/utils/id-generator.js';

export interface GetOrCreateOrgAccessTokenResult {
    access: Access;
    user: User;
}

@injectable()
export class GetOrCreateOrgAccessToken {
    constructor(
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('AccessRepository') private accessRepo: IAccessRepository,
    ) {}

    async execute(organizationId: string): Promise<GetOrCreateOrgAccessTokenResult> {
        const org = await this.orgRepo.findByIdIncludeInactive(organizationId);
        if (!org) {
            throw Object.assign(new Error('Organization not found'), { code: 'NOT_FOUND' });
        }

        const owners = await this.userRepo.listByOrganization(organizationId, 0, 1, { roles: ['owner'] });
        const owner = owners[0];
        if (!owner) {
            throw Object.assign(new Error('Organization has no owner user'), { code: 'NOT_FOUND' });
        }

        const existing = await this.accessRepo.findLatestUnexpiredByUserId(owner.id);
        if (existing) {
            return { access: existing, user: owner };
        }

        const token = generateId('acc');
        const refreshToken = generateId('rtk');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const access = await this.accessRepo.create({
            id: token,
            token,
            refreshToken,
            userId: owner.id,
            expiresAt,
        });

        return { access, user: owner };
    }
}
