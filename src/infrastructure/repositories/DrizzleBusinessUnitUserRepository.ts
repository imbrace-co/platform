import { injectable } from 'tsyringe';
import { db } from '../database/drizzle/index.js';
import { businessUnitUsers, businessUnits } from '../database/drizzle/schema/index.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { BusinessUnitUser, IBusinessUnitUserRepository } from '../../domain/repositories/IBusinessUnitUserRepository.js';
import { generateId } from '../../shared/utils/id-generator.js';

@injectable()
export class DrizzleBusinessUnitUserRepository implements IBusinessUnitUserRepository {
    async listByUser(userId: string, offset: number, limit: number): Promise<BusinessUnitUser[]> {
        const result = await db.select({
                id: businessUnitUsers.id,
                publicId: businessUnitUsers.publicId,
                organizationId: businessUnitUsers.organizationId,
                businessUnitId: businessUnitUsers.businessUnitId,
                userId: businessUnitUsers.userId,
                role: businessUnitUsers.role,
                createdAt: businessUnitUsers.createdAt,
                updatedAt: businessUnitUsers.updatedAt,
            })
            .from(businessUnitUsers)
            .innerJoin(businessUnits, eq(businessUnitUsers.businessUnitId, businessUnits.id))
            .where(and(
                eq(businessUnitUsers.userId, userId),
                eq(businessUnits.isActive, true)
            ))
            .orderBy(desc(businessUnitUsers.createdAt))
            .limit(limit)
            .offset(offset);
        return result as unknown as BusinessUnitUser[];
    }

    async findFirstByUser(userId: string): Promise<BusinessUnitUser | null> {
        const result = await db.select().from(businessUnitUsers)
            .innerJoin(businessUnits, eq(businessUnitUsers.businessUnitId, businessUnits.id))
            .where(and(eq(businessUnitUsers.userId, userId), eq(businessUnits.isActive, true)))
            .orderBy(desc(businessUnitUsers.createdAt))
            .limit(1);
        return result.length ? (result[0].business_unit_users as unknown as BusinessUnitUser) : null;
    }

    async countByUser(userId: string): Promise<number> {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(businessUnitUsers)
            .innerJoin(businessUnits, eq(businessUnitUsers.businessUnitId, businessUnits.id))
            .where(and(
                eq(businessUnitUsers.userId, userId),
                eq(businessUnits.isActive, true)
            ));
        return result[0]?.count || 0;
    }

    async findByUserAndBU(buId: string, userId: string): Promise<BusinessUnitUser | null> {
        const result = await db.select().from(businessUnitUsers)
            .where(and(eq(businessUnitUsers.businessUnitId, buId), eq(businessUnitUsers.userId, userId)));
        return result.length ? (result[0] as unknown as BusinessUnitUser) : null;
    }

    async create(data: Partial<BusinessUnitUser>): Promise<BusinessUnitUser> {
        const newBuu = {
            ...data,
            id: data.id || generateId('buu'),
        };
        const [inserted] = await db.insert(businessUnitUsers).values(newBuu as any).returning();
        return inserted as unknown as BusinessUnitUser;
    }

    async update(id: string, data: Partial<BusinessUnitUser>): Promise<BusinessUnitUser | null> {
        const [updated] = await db.update(businessUnitUsers)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(eq(businessUnitUsers.id, id))
            .returning();
        return updated ? (updated as unknown as BusinessUnitUser) : null;
    }

    async delete(id: string): Promise<boolean> {
        const [deleted] = await db.delete(businessUnitUsers).where(eq(businessUnitUsers.id, id)).returning();
        return !!deleted;
    }
}
