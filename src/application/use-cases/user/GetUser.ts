import { injectable, inject } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { User } from '../../../domain/entities/User.js';

@injectable()
export class GetUser {
    constructor(
        @inject('UserRepository') private userRepo: IUserRepository,
    ) { }

    async execute(id: string): Promise<User | null> {
        return this.userRepo.findById(id);
    }
}
