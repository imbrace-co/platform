import { injectable } from 'tsyringe';
import { db } from '../database/drizzle/index.js';
import { access } from '../database/drizzle/schema/index.js';
import { eq } from 'drizzle-orm';
import { IAccessRepository, Access } from '../../domain/repositories/IAccessRepository.js';

@injectable()
export class DrizzleAccessRepository implements IAccessRepository {
    async findByToken(token: string): Promise<Access | null> {
        const result = await db.select().from(access).where(eq(access.token, token));
        return result.length ? (result[0] as unknown as Access) : null;
    }

    async create(data: Partial<Access>): Promise<Access> {
        const [inserted] = await db.insert(access).values(data as any).returning();
        return inserted as unknown as Access;
    }

    async deleteByUserId(userId: string): Promise<void> {
        await db.delete(access).where(eq(access.userId, userId));
    }
}
