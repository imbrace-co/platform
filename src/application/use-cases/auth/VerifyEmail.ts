import { injectable, inject } from 'tsyringe';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { ILoginAttemptEmailRepository } from '../../../domain/repositories/ILoginAttemptEmailRepository.js';

@injectable()
export class VerifyEmail {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
        @inject('LoginAttemptEmailRepository') private loginAttemptEmailRepo: ILoginAttemptEmailRepository,
    ) {}

    async execute(email: string, verifyCode: string): Promise<{ success: boolean }> {
        const loginUser = await this.loginUserRepo.findByEmail(email);

        if (!loginUser || loginUser.isVerify) {
            return { success: false };
        }

        if (verifyCode !== loginUser.verifyCode) {
            return { success: false };
        }

        // Mark as verified, clear verify code
        await this.loginUserRepo.update(loginUser.id, {
            isVerify: true,
            verifyCode: null,
            verifyExpiredAt: null,
        });

        // Delete rate limit entry
        const attemptRecord = await this.loginAttemptEmailRepo.findByEmail(email);
        if (attemptRecord) {
            await this.loginAttemptEmailRepo.deleteById(attemptRecord.id);
        }

        return { success: true };
    }
}
