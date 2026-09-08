import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { ILoginAttemptEmailRepository } from '../../../domain/repositories/ILoginAttemptEmailRepository.js';

@injectable()
export class ResetPassword {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
        @inject('LoginAttemptEmailRepository') private loginAttemptEmailRepo: ILoginAttemptEmailRepository,
    ) {}

    async execute(email: string, verifyCode: string, password: string): Promise<void> {
        const loginUser = await this.loginUserRepo.findByEmail(email);

        if (!loginUser || !loginUser.verifyCode) {
            const err: any = new Error('Not found');
            err.code = 'NOT_FOUND';
            throw err;
        }

        if (verifyCode !== loginUser.verifyCode) {
            const err: any = new Error('Unauthorized');
            err.code = 'UNAUTHORIZED';
            throw err;
        }

        // Hash new password and clear verify code
        const hashedPassword = bcrypt.hashSync(password);
        await this.loginUserRepo.update(loginUser.id, {
            password: hashedPassword,
            verifyCode: null,
            verifyExpiredAt: null,
        });

        // Delete rate limit record
        const attemptRecord = await this.loginAttemptEmailRepo.findByEmail(email);
        if (attemptRecord) {
            await this.loginAttemptEmailRepo.deleteById(attemptRecord.id);
        }
    }
}
