import { injectable, inject } from 'tsyringe';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { ILoginAttemptEmailRepository } from '../../../domain/repositories/ILoginAttemptEmailRepository.js';
import { sendResetPasswordEmail } from '../../../infrastructure/services/EmailService.js';
import { config } from '../../../shared/config/index.js';
import { generateId } from '../../../shared/utils/id-generator.js';

function generateVerifyCode(): string {
    // 6-char alphanumeric (upper + lower + digits, no special chars) — matches backend otp-generator config
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

@injectable()
export class ForgetPassword {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('LoginAttemptEmailRepository') private loginAttemptEmailRepo: ILoginAttemptEmailRepository,
    ) {}

    async execute(email: string): Promise<void> {
        // Check if user exists in either LoginUsers or Users
        const existingLoginUser = await this.loginUserRepo.findByEmail(email);
        const users = await this.userRepo.listByEmail(email, 0, 1);
        const user = users.length ? users[0] : null;

        if (!existingLoginUser && !user) {
            const err: any = new Error('Not found');
            err.code = 'NOT_FOUND';
            throw err;
        }

        // If LoginUser exists but is not verified
        if (existingLoginUser && !existingLoginUser.isVerify) {
            const err: any = new Error('Not found');
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

        let loginUser = existingLoginUser;

        // OTP-only user (exists in Users but not in LoginUsers) — create LoginUser record
        if (!loginUser && user) {
            loginUser = await this.loginUserRepo.create({
                id: generateId('lu'),
                email,
                isVerify: true,
            });
        }

        // Generate verify code
        const verifyCode = generateVerifyCode();
        const verifyExpiredAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

        await this.loginUserRepo.update(loginUser!.id, {
            verifyCode,
            verifyExpiredAt,
        });

        // Send reset password email
        const verifyUrl = `${config.appApiUrl}/v1/login/forget/verify?verify_code=${verifyCode}&email=${encodeURIComponent(email)}`;
        await sendResetPasswordEmail(email, verifyUrl);

        // Set rate limit record
        await this.loginAttemptEmailRepo.create({ email });
    }
}
