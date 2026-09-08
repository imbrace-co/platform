import { injectable, inject } from 'tsyringe';
import { ILoginRepository } from '../../../domain/repositories/ILoginRepository.js';
import { sendOtpEmail } from '../../../infrastructure/services/EmailService.js';
import { generateId } from '../../../shared/utils/id-generator.js';

function generateOtp(): string {
    // 6-digit uppercase alphanumeric (no lowercase, no special chars) — matches backend otp-generator config
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
        otp += chars[Math.floor(Math.random() * chars.length)];
    }
    return otp;
}

@injectable()
export class RequestEmailOTP {
    constructor(
        @inject('LoginRepository') private loginRepo: ILoginRepository,
    ) {}

    async execute(email: string): Promise<void> {
        const existing = await this.loginRepo.findByEmail(email);

        if (!existing) {
            // Create new OTP record
            const otp = generateOtp();
            const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
            await this.loginRepo.create({
                id: generateId('login'),
                email,
                otp,
                count: 1,
                isReachLimit: false,
                expiresAt,
            });
            await sendOtpEmail(email, otp);
            return;
        }

        const isExpired = new Date() > new Date(existing.expiresAt);
        if (isExpired) {
            // Regenerate OTP
            const otp = generateOtp();
            const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
            await this.loginRepo.update(existing.id, { otp, expiresAt, isReachLimit: false });
            await sendOtpEmail(email, otp);
            return;
        }

        // OTP still valid — resend the existing one
        await sendOtpEmail(email, existing.otp);
    }
}
