import { injectable, inject } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IAccessRepository } from '../../../domain/repositories/IAccessRepository.js';
import { User } from '../../../domain/entities/User.js';

@injectable()
export class DeactivateUser {
    constructor(
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('AccessRepository') private accessRepo: IAccessRepository,
    ) { }

    async execute(
        userId: string,
        orgId: string,
        requesterRole: string
    ): Promise<{ user: User | null; error?: string; status?: number }> {
        const mUser = await this.userRepo.findById(userId);

        if (!mUser) return { user: null, status: 404, error: 'User not found' };
        if (mUser.organizationId !== orgId) return { user: null, status: 403, error: 'Insufficient permission' };
        if (mUser.isBot) return { user: null, status: 403, error: 'Insufficient permission' };
        if (requesterRole === 'member' && mUser.role === 'owner') return { user: null, status: 403, error: 'Insufficient permission' };
        if (requesterRole === 'owner' && mUser.role === 'owner') return { user: null, status: 403, error: 'Insufficient permission' };

        if (mUser.status === 'deactivated') return { user: mUser };

        const updated = await this.userRepo.update(mUser.id, { status: 'deactivated' });
        await this.accessRepo.deleteByUserId(mUser.id);

        // TODO: send deactivation email
        // TODO: emit socket event OUTBOUND_ORG_DEACTIVATED_USER

        return { user: updated };
    }
}
