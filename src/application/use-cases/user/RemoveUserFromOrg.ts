import { injectable, inject } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IAccessRepository } from '../../../domain/repositories/IAccessRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { IBusinessUnitUserRepository } from '../../../domain/repositories/IBusinessUnitUserRepository.js';
import { User } from '../../../domain/entities/User.js';

@injectable()
export class RemoveUserFromOrg {
    constructor(
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('AccessRepository') private accessRepo: IAccessRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
        @inject('BusinessUnitUserRepository') private buUserRepo: IBusinessUnitUserRepository,
    ) { }

    async execute(
        userId: string,
        orgId: string,
        requesterRole: string,
    ): Promise<{ user: User | null; error?: string; status?: number }> {
        const mUser = await this.userRepo.findById(userId);

        if (!mUser) return { user: null, status: 404, error: 'User not found' };
        if (mUser.organizationId !== orgId) return { user: null, status: 403, error: 'Insufficient permission' };
        if (mUser.isBot) return { user: null, status: 403, error: 'Insufficient permission' };
        if (requesterRole === 'member' && mUser.role === 'owner') return { user: null, status: 403, error: 'Insufficient permission' };
        if (requesterRole === 'owner' && mUser.role === 'owner') return { user: null, status: 403, error: 'Insufficient permission' };

        const teamUsers = await this.teamUserRepo.listByUser(mUser.id);
        for (const tu of teamUsers) {
            await this.teamUserRepo.delete(tu.id);
        }

        const buUsers = await this.buUserRepo.listByUser(mUser.id, 0, 1000);
        for (const bu of buUsers) {
            await this.buUserRepo.delete(bu.id);
        }

        await this.accessRepo.deleteByUserId(mUser.id);

        const updated = await this.userRepo.update(mUser.id, {
            status: 'removed',
            isDeleted: true,
        });

        return { user: updated };
    }
}
