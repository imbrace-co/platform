import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';

/**
 * Change the password of an already-authenticated user (old password -> new).
 *
 * This is the open-source replacement for the email-based reset flow: a member
 * who signed in with the default invite password can change it without any
 * email/OTP. The caller's email comes from the authenticated context, so a user
 * can only change their own password.
 */
@injectable()
export class ChangePassword {
    constructor(
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
    ) {}

    async execute(email: string, oldPassword: string, newPassword: string): Promise<void> {
        const loginUser = await this.loginUserRepo.findByEmail(email);
        if (!loginUser) {
            throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
        }

        // Verify the current password before allowing a change.
        if (!loginUser.password || !bcrypt.compareSync(oldPassword, loginUser.password)) {
            throw Object.assign(new Error('incorrect password'), { code: 'INCORRECT_PASSWORD' });
        }

        // Reject a no-op change so users actually rotate away from the default.
        if (bcrypt.compareSync(newPassword, loginUser.password)) {
            throw Object.assign(new Error('new password must differ from the old one'), { code: 'SAME_PASSWORD' });
        }

        await this.loginUserRepo.update(loginUser.id, {
            password: bcrypt.hashSync(newPassword),
            // Clear any pending reset code; verified status is preserved.
            verifyCode: null,
            verifyExpiredAt: null,
        });
    }
}
