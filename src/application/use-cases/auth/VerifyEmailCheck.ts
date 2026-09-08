import { injectable, inject } from 'tsyringe';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';

@injectable()
export class VerifyEmailCheck {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
    ) {}

    async execute(email: string): Promise<boolean> {
        const loginUser = await this.loginUserRepo.findByEmail(email);
        return !!loginUser && loginUser.isVerify;
    }
}
