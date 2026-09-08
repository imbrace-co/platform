import { injectable, inject } from 'tsyringe';
import { ILoginRepository } from '../../../domain/repositories/ILoginRepository.js';
import { ILoginAccessRepository, LoginAccess } from '../../../domain/repositories/ILoginAccessRepository.js';
import { generateId } from '../../../shared/utils/id-generator.js';

@injectable()
export class VerifyEmailOTP {
    constructor(
        @inject('LoginRepository') private loginRepo: ILoginRepository,
        @inject('LoginAccessRepository') private loginAccessRepo: ILoginAccessRepository,
    ) {}

    async execute(email: string, otp: string): Promise<LoginAccess> {
        const record = await this.loginRepo.findByEmailAndOtp(email, otp);
        if (!record) {
            throw Object.assign(new Error('Invalid OTP'), { code: 'INVALID_OTP' });
        }

        if (new Date() > new Date(record.expiresAt)) {
            throw Object.assign(new Error('Expired OTP'), { code: 'EXPIRED_OTP' });
        }

        return this.createLoginAccessAndCleanup(email, record.id);
    }

    private async createLoginAccessAndCleanup(email: string, loginRecordId?: string): Promise<LoginAccess> {
        const token = generateId('login_acc');
        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours
        const loginAccess = await this.loginAccessRepo.create({ id: token, email, expiresAt });

        // Delete the used OTP record
        if (loginRecordId) {
            await this.loginRepo.deleteById(loginRecordId);
        } else {
            const record = await this.loginRepo.findByEmail(email);
            if (record) await this.loginRepo.deleteById(record.id);
        }

        return loginAccess;
    }
}
