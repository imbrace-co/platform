import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { ILoginAttemptEmailRepository } from '../../../domain/repositories/ILoginAttemptEmailRepository.js';
import { sendVerifyEmail } from '../../../infrastructure/services/EmailService.js';
import { config } from '../../../shared/config/index.js';
import { generateId } from '../../../shared/utils/id-generator.js';

function generateVerifyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

@injectable()
export class SignUp {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('LoginAttemptEmailRepository') private loginAttemptEmailRepo: ILoginAttemptEmailRepository,
    ) {}

    async execute(email: string, password: string): Promise<void> {
        // Check if email already exists in LoginUsers
        const existingLoginUser = await this.loginUserRepo.findByEmail(email);
        if (existingLoginUser) {
            const err: any = new Error('email existed');
            err.code = 'EMAIL_EXISTED';
            throw err;
        }

        // Check if email already exists in Users
        const users = await this.userRepo.listByEmail(email, 0, 1);
        if (users.length) {
            const err: any = new Error('email existed');
            err.code = 'EMAIL_EXISTED';
            throw err;
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password);

        // Generate verify code
        const verifyCode = generateVerifyCode();
        const verifyExpiredAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

        // Create LoginUser
        await this.loginUserRepo.create({
            id: generateId('lu'),
            email,
            password: hashedPassword,
            isVerify: false,
            verifyCode,
            verifyExpiredAt,
        });

        // Send verify email
        const verifyUrl = `${config.appApiUrl}/v1/login/sign_up/verify?verify_code=${verifyCode}&email=${email}`;
        await sendVerifyEmail(email, verifyUrl);

        // Set send email rate limit (15 minutes)
        await this.loginAttemptEmailRepo.create({ email });
    }
}
