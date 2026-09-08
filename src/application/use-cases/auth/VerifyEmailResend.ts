import { injectable, inject } from 'tsyringe';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { ILoginAttemptEmailRepository } from '../../../domain/repositories/ILoginAttemptEmailRepository.js';
import { sendVerifyEmail } from '../../../infrastructure/services/EmailService.js';
import { config } from '../../../shared/config/index.js';

function generateVerifyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

@injectable()
export class VerifyEmailResend {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
        @inject('LoginAttemptEmailRepository') private loginAttemptEmailRepo: ILoginAttemptEmailRepository,
    ) {}

    async execute(email: string): Promise<void> {
        const loginUser = await this.loginUserRepo.findByEmail(email);

        if (!loginUser || loginUser.isVerify) {
            const err: any = new Error('email not sign up or verify success.');
            err.code = 'NOT_FOUND';
            throw err;
        }

        // Check rate limit (15 minutes)
        const attemptRecord = await this.loginAttemptEmailRepo.findByEmail(email);
        if (attemptRecord) {
            const err: any = new Error('send email limit 15 minutes.');
            err.code = 'EMAIL_RATE_LIMIT';
            throw err;
        }

        // Generate new verify code
        const verifyCode = generateVerifyCode();
        const verifyExpiredAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

        await this.loginUserRepo.update(loginUser.id, {
            verifyCode,
            verifyExpiredAt,
        });

        // Send verify email
        const verifyUrl = `${config.appApiUrl}/v1/login/sign_up/verify?verify_code=${verifyCode}&email=${email}`;
        await sendVerifyEmail(email, verifyUrl);

        // Set rate limit
        await this.loginAttemptEmailRepo.create({ email });
    }
}
