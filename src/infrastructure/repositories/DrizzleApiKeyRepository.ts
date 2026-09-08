import { injectable } from 'tsyringe';
import { IApiKeyRepository } from '../../domain/repositories/IApiKeyRepository.js';
import { ApiKey } from '../../domain/entities/ApiKey.js';
import { db } from '../database/drizzle/index.js';
import { apiKeys } from '../database/drizzle/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../../shared/utils/id-generator.js';

@injectable()
export class DrizzleApiKeyRepository implements IApiKeyRepository {
    async create(data: Partial<ApiKey>): Promise<ApiKey> {
        const id = generateId('api');
        const newApiKey = {
            id,
            apiKey: id,
            name: data.name || '',
            organizationId: data.organizationId || '',
            userId: data.userId || '',
            isActive: data.isActive ?? true,
            isTemp: data.isTemp ?? false,
            permissions: data.permissions || {},
            expiredAt: data.expiredAt || null,
        };
        const [inserted] = await db.insert(apiKeys).values(newApiKey).returning();
        return inserted as unknown as ApiKey;
    }

    async findById(id: string): Promise<ApiKey | null> {
        const [result] = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
        return (result as unknown as ApiKey) || null;
    }

    async findAll(filter: { userId?: string; organizationId?: string }): Promise<ApiKey[]> {
        const conditions = [];
        if (filter.userId) conditions.push(eq(apiKeys.userId, filter.userId));
        if (filter.organizationId) conditions.push(eq(apiKeys.organizationId, filter.organizationId));

        const query = conditions.length > 0
            ? db.select().from(apiKeys).where(and(...conditions))
            : db.select().from(apiKeys);

        const result = await query;
        return result as unknown as ApiKey[];
    }

    async update(id: string, data: Partial<ApiKey>): Promise<ApiKey | null> {
        const updateData: any = { ...data, updatedAt: new Date() };
        delete updateData.id;
        delete updateData.apiKey;

        const [updated] = await db.update(apiKeys)
            .set(updateData)
            .where(eq(apiKeys.id, id))
            .returning();
        return (updated as unknown as ApiKey) || null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
        return (result as any).rowCount > 0;
    }
}
