import { injectable } from 'tsyringe';
import { IMessageBarRepository } from '../../domain/repositories/IMessageBarRepository.js';
import { MessageBar } from '../../domain/entities/MessageBar.js';
import { db } from '../database/drizzle/index.js';
import { messageBars } from '../database/drizzle/schema/index.js';
import { eq, desc } from 'drizzle-orm';

@injectable()
export class DrizzleMessageBarRepository implements IMessageBarRepository {
    async findAll(): Promise<MessageBar[]> {
        const result = await db.select().from(messageBars)
            .orderBy(desc(messageBars.createdAt));
        return result as unknown as MessageBar[];
    }

    async findActive(): Promise<MessageBar[]> {
        const result = await db.select().from(messageBars)
            .where(eq(messageBars.active, true))
            .orderBy(desc(messageBars.createdAt));
        return result as unknown as MessageBar[];
    }

    async findById(id: string): Promise<MessageBar | null> {
        const [row] = await db.select().from(messageBars)
            .where(eq(messageBars.id, id));
        return row ? (row as unknown as MessageBar) : null;
    }

    async create(data: Partial<MessageBar>): Promise<MessageBar> {
        const [inserted] = await db.insert(messageBars).values(data as any).returning();
        return inserted as unknown as MessageBar;
    }

    async update(id: string, data: Partial<MessageBar>): Promise<MessageBar | null> {
        const [updated] = await db.update(messageBars)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(eq(messageBars.id, id))
            .returning();
        return updated ? (updated as unknown as MessageBar) : null;
    }

    async delete(id: string): Promise<void> {
        await db.delete(messageBars).where(eq(messageBars.id, id));
    }
}
