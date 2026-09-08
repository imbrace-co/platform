import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { ILoginAccessRepository, LoginAccess } from '../../../domain/repositories/ILoginAccessRepository.js';
import { generateId } from '../../../shared/utils/id-generator.js';
import { config } from '../../../shared/config/index.js';

export interface SignInResult {
    loginAccess: LoginAccess;
    customerId?: string | null;
}

@injectable()
export class SignIn {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
        @inject('LoginAccessRepository') private loginAccessRepo: ILoginAccessRepository,
    ) {}

    async execute(email: string, password: string): Promise<SignInResult> {
        // Superadmin env bypass (plaintext compare, matching backend behaviour)
        const { superadminEmail: ENV_EMAIL, superadminPassword: ENV_PASSWORD } = config.auth;
        if (ENV_EMAIL && ENV_PASSWORD && email === ENV_EMAIL && password === ENV_PASSWORD) {
            const loginAccess = await this.createLoginAccess(email);
            return { loginAccess };
        }

        const loginUser = await this.loginUserRepo.findByEmail(email);
        if (!loginUser) {
            throw Object.assign(new Error('email not sign up.'), { code: 'NOT_FOUND' });
        }

        if (!loginUser.password || !bcrypt.compareSync(password, loginUser.password)) {
            throw Object.assign(new Error('incorrect password. or email unverified'), { code: 'INCORRECT_PASSWORD' });
        }

        if (!loginUser.isVerify) {
            throw Object.assign(new Error('incorrect password. or email unverified'), { code: 'UNVERIFIED' });
        }

        const loginAccess = await this.createLoginAccess(email);
        return { loginAccess, customerId: loginUser.customerId };
    }

    private async createLoginAccess(email: string): Promise<LoginAccess> {
        const token = generateId('login_acc');
        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours
        return this.loginAccessRepo.create({ id: token, email, expiresAt });
    }
}
