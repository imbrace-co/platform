import { injectable } from 'tsyringe';
import { IBusinessUnitRepository } from '../../domain/repositories/IBusinessUnitRepository.js';
import { BusinessUnit } from '../../domain/entities/BusinessUnit.js';
import { db } from '../database/drizzle/index.js';
import { businessUnits } from '../database/drizzle/schema/index.js';
import { eq, and, or, inArray, sql, desc } from 'drizzle-orm';
import { generateId } from '../../shared/utils/id-generator.js';

@injectable()
export class DrizzleBusinessUnitRepository implements IBusinessUnitRepository {
    async create(buData: Partial<BusinessUnit>): Promise<BusinessUnit> {
        const newBu = {
            ...buData,
            id: buData.id || generateId('bu'),
            name: buData.name || 'Unnamed Business Unit',
        };

        const [inserted] = await db.insert(businessUnits).values(newBu as any).returning();
        return inserted as unknown as BusinessUnit;
    }

    async findById(id: string): Promise<BusinessUnit | null> {
        const result = await db.select().from(businessUnits).where(and(eq(businessUnits.id, id), eq(businessUnits.isActive, true)));
        return result.length ? (result[0] as unknown as BusinessUnit) : null;
    }

    // Resolve a BU by its internal id (bu_*) OR its legacy public_id (pub_*, from Mongo migration).
    // Frontends on migrated envs (e.g. scb2) send public_id; FK columns store the internal id.
    async findByIdOrPublicId(idOrPublicId: string): Promise<BusinessUnit | null> {
        const result = await db.select().from(businessUnits)
            .where(and(
                or(eq(businessUnits.id, idOrPublicId), eq(businessUnits.publicId, idOrPublicId)),
                eq(businessUnits.isActive, true),
            ))
            .limit(1);
        return result.length ? (result[0] as unknown as BusinessUnit) : null;
    }

    async update(id: string, data: Partial<BusinessUnit>): Promise<BusinessUnit | null> {
        const updateData = { ...data, updatedAt: new Date() };
        const [updated] = await db.update(businessUnits)
            .set(updateData as any)
            .where(eq(businessUnits.id, id))
            .returning();

        return updated ? (updated as unknown as BusinessUnit) : null;
    }

    async delete(id: string): Promise<boolean> {
        // Soft delete
        const [deleted] = await db.update(businessUnits)
            .set({ isActive: false, updatedAt: new Date() } as any)
            .where(eq(businessUnits.id, id))
            .returning();
        return !!deleted;
    }

    async listByOrganization(orgId: string, offset: number = 0, limit: number = 10): Promise<BusinessUnit[]> {
        const result = await db.select().from(businessUnits)
            .where(and(eq(businessUnits.organizationId, orgId), eq(businessUnits.isActive, true)))
            .orderBy(desc(businessUnits.createdAt))
            .limit(limit).offset(offset);
        return result as unknown as BusinessUnit[];
    }

    async countByOrganization(orgId: string): Promise<number> {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(businessUnits)
            .where(and(eq(businessUnits.organizationId, orgId), eq(businessUnits.isActive, true)));
        return result[0]?.count || 0;
    }

    async findByIds(ids: string[]): Promise<BusinessUnit[]> {
        if (ids.length === 0) return [];
        const result = await db.select().from(businessUnits)
            .where(and(inArray(businessUnits.id, ids), eq(businessUnits.isActive, true)))
            .orderBy(desc(businessUnits.createdAt));
        return result as unknown as BusinessUnit[];
    }

    async findFirstByOrganization(orgId: string): Promise<BusinessUnit | null> {
        const result = await db.select().from(businessUnits)
            .where(and(eq(businessUnits.organizationId, orgId), eq(businessUnits.isActive, true)))
            .orderBy(businessUnits.createdAt)
            .limit(1);
        return result.length ? (result[0] as unknown as BusinessUnit) : null;
    }
}
