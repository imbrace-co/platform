import { injectable } from 'tsyringe';
import { db } from '../database/drizzle/index.js';
import { login } from '../database/drizzle/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { ILoginRepository, LoginOtp } from '../../domain/repositories/ILoginRepository.js';

@injectable()
export class DrizzleLoginRepository implements ILoginRepository {
    private toLoginOtp(row: any): LoginOtp {
        return {
            id: row.id,
            email: row.email,
            otp: row.otp,
            count: row.count ?? 1,
            isReachLimit: row.isReachLimit ?? false,
            expiresAt: row.expiresAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findByEmail(email: string): Promise<LoginOtp | null> {
        const result = await db.select().from(login).where(eq(login.email, email)).limit(1);
        return result.length ? this.toLoginOtp(result[0]) : null;
    }

    async findByEmailAndOtp(email: string, otp: string): Promise<LoginOtp | null> {
        const result = await db.select().from(login)
            .where(and(eq(login.email, email), eq(login.otp, otp)))
            .limit(1);
        return result.length ? this.toLoginOtp(result[0]) : null;
    }

    async create(data: Partial<LoginOtp>): Promise<LoginOtp> {
        const [inserted] = await db.insert(login).values(data as any).returning();
        return this.toLoginOtp(inserted);
    }

    async update(id: string, data: Partial<LoginOtp>): Promise<LoginOtp | null> {
        const [updated] = await db.update(login)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(eq(login.id, id))
            .returning();
        return updated ? this.toLoginOtp(updated) : null;
    }

    async deleteById(id: string): Promise<void> {
        await db.delete(login).where(eq(login.id, id));
    }
}
