import { injectable } from 'tsyringe';
import { db } from '../database/drizzle/index.js';
import { loginAccess } from '../database/drizzle/schema/index.js';
import { eq } from 'drizzle-orm';
import { ILoginAccessRepository, LoginAccess } from '../../domain/repositories/ILoginAccessRepository.js';

@injectable()
export class DrizzleLoginAccessRepository implements ILoginAccessRepository {
    async findByToken(token: string): Promise<LoginAccess | null> {
        const result = await db.select().from(loginAccess).where(eq(loginAccess.id, token));
        return result.length ? (result[0] as unknown as LoginAccess) : null;
    }

    async findByEmail(email: string): Promise<LoginAccess | null> {
        const result = await db.select().from(loginAccess).where(eq(loginAccess.email, email));
        return result.length ? (result[0] as unknown as LoginAccess) : null;
    }

    async create(data: Partial<LoginAccess>): Promise<LoginAccess> {
        const [inserted] = await db.insert(loginAccess).values(data as any).returning();
        return inserted as unknown as LoginAccess;
    }

    async deleteById(id: string): Promise<void> {
        await db.delete(loginAccess).where(eq(loginAccess.id, id));
    }
}
