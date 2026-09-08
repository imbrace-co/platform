import { injectable, inject } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { ILoginAccessRepository } from '../../../domain/repositories/ILoginAccessRepository.js';
import { IAccessRepository, Access } from '../../../domain/repositories/IAccessRepository.js';
import { User } from '../../../domain/entities/User.js';
import { generateId } from '../../../shared/utils/id-generator.js';

export interface ExchangeResult {
    access: Access;
    user: User;
}

@injectable()
export class ExchangeAccessToken {
    constructor(
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('LoginAccessRepository') private loginAccessRepo: ILoginAccessRepository,
        @inject('AccessRepository') private accessRepo: IAccessRepository,
    ) {}

    async execute(loginAccessId: string, email: string, organizationId: string): Promise<ExchangeResult> {
        const user = await this.userRepo.findByEmail(organizationId, email);
        if (!user) {
            throw Object.assign(new Error('User not found in this organization'), { code: 'NOT_FOUND' });
        }

        if (user.status === 'deactivated' || user.status === 'DEACTIVATED') {
            throw Object.assign(new Error('User is deactivated'), { code: 'DEACTIVATED' });
        }

        const token = generateId('acc');
        const refreshToken = generateId('rtk');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const access = await this.accessRepo.create({
            id: token,
            token,
            refreshToken,
            userId: user.id,
            expiresAt,
        });

        // Revoke login access token immediately after exchange (skip if no loginAccessId — e.g. called via access token)
        if (loginAccessId) {
            await this.loginAccessRepo.deleteById(loginAccessId);
        }

        return { access, user };
    }
}
