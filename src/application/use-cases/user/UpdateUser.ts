import { injectable, inject } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';

@injectable()
export class UpdateUser {
    constructor(
        @inject('UserRepository') private userRepo: IUserRepository,
    ) { }

    async execute(id: string, orgId: string, params: Partial<User>): Promise<User | null> {
        const mUser = await this.userRepo.findById(id);
        if (!mUser || mUser.organizationId !== orgId) return null;

        return await this.userRepo.update(mUser.id, params);
    }
}
