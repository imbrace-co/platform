import { injectable, inject } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';

const VALID_ROLES = ['owner', 'member'];

@injectable()
export class ChangeUserRole {
    constructor(
        @inject('UserRepository') private userRepo: IUserRepository,
    ) { }

    async execute(
        userId: string,
        orgId: string,
        requesterId: string,
        role: string
    ): Promise<{ user: User | null; error?: string; status?: number }> {
        if (!VALID_ROLES.includes(role)) {
            return { user: null, status: 400, error: 'Invalid role' };
        }

        const mUser = await this.userRepo.findById(userId);

        if (!mUser || mUser.organizationId !== orgId) {
            return { user: null, status: 403, error: 'Insufficient permission' };
        }

        if (mUser.role === 'owner') {
            return { user: null, status: 400, error: "Invalid, cannot change owner's role" };
        }

        if (mUser.id === requesterId || mUser.publicId === requesterId) {
            return { user: null, status: 400, error: 'Invalid, cannot change self role' };
        }

        const updated = await this.userRepo.update(mUser.id, { role });
        return { user: updated };
    }
}
