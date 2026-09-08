import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { config } from '../../../shared/config/index.js';

export interface AdminResetPasswordResult {
    success: boolean;
    error?: string;
    status?: number;
    user?: any;
    newPassword?: string;
}

@injectable()
export class AdminResetPassword {
    constructor(
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
    ) { }

    async execute(
        targetUserId: string,
        orgId: string,
        callerRole: string,
        newPassword?: string
    ): Promise<AdminResetPasswordResult> {
        if (callerRole !== 'owner') {
            return { success: false, error: 'Forbidden', status: 403 };
        }

        const targetUser = await this.userRepo.findById(targetUserId);
        if (!targetUser || targetUser.organizationId !== orgId) {
            return { success: false, error: 'User not found', status: 404 };
        }

        if (!targetUser.email) {
            return { success: false, error: 'Target user has no email', status: 400 };
        }

        const loginUser = await this.loginUserRepo.findByEmail(targetUser.email);
        if (!loginUser) {
            return { success: false, error: 'Login identity not found for user', status: 404 };
        }

        const passToSet = newPassword || config.auth.defaultInvitePassword;

        // Password validation if custom password is provided
        if (newPassword) {
            const passwordRegex = /^(?=(?:.*[A-Z])+)(?=(?:.*[a-z])+)(?=(?:.*\d)+)(?=(?:.*[!@#$%^&*_()+\-=\[\]{}|])+)([A-Za-z0-9!@#$%^&*_()+\-=\[\]{}|]{12,})$/;
            if (!passwordRegex.test(newPassword)) {
                return { success: false, error: 'password does not match the required format', status: 400 };
            }
        }

        await this.loginUserRepo.update(loginUser.id, {
            password: bcrypt.hashSync(passToSet),
            verifyCode: null,
            verifyExpiredAt: null,
        });

        return {
            success: true,
            user: targetUser,
            newPassword: passToSet
        };
    }
}
