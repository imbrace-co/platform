import { db } from '../database/drizzle/index.js';
import { loginAttemptEmails } from '../database/drizzle/schema/index.js';
import { ILoginAttemptEmailRepository, LoginAttemptEmail } from '../../domain/repositories/ILoginAttemptEmailRepository.js';
import { eq } from 'drizzle-orm';
import { generateId } from '../../shared/utils/id-generator.js';

function toLoginAttemptEmail(res: any): LoginAttemptEmail {
    return {
        id: res.id,
        email: res.email,
        count: res.count ?? 1,
        isReachLimit: res.isReachLimit ?? false,
        expiresAt: res.expiresAt,
        createdAt: res.createdAt || new Date(),
        updatedAt: res.updatedAt || new Date(),
    };
}

export class DrizzleLoginAttemptEmailRepository implements ILoginAttemptEmailRepository {
    async findByEmail(email: string): Promise<LoginAttemptEmail | null> {
        const results = await db.select().from(loginAttemptEmails)
            .where(eq(loginAttemptEmails.email, email))
            .limit(1);
        if (!results.length) return null;
        const record = results[0];
        // Check if expired — auto-cleanup like MongoDB TTL
        if (new Date() > new Date(record.expiresAt!)) {
            await this.deleteById(record.id);
            return null;
        }
        return toLoginAttemptEmail(record);
    }

    async create(data: Partial<LoginAttemptEmail>): Promise<LoginAttemptEmail> {
        const [inserted] = await db.insert(loginAttemptEmails).values({
            id: data.id || generateId('login_attempt_email'),
            email: data.email!,
            count: data.count ?? 1,
            isReachLimit: data.isReachLimit ?? false,
            expiresAt: data.expiresAt || new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        }).returning();
        return toLoginAttemptEmail(inserted);
    }

    async deleteById(id: string): Promise<void> {
        await db.delete(loginAttemptEmails).where(eq(loginAttemptEmails.id, id));
    }
}
