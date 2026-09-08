import { injectable } from 'tsyringe';
import { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository.js';
import { Organization } from '../../domain/entities/Organization.js';
import { db } from '../database/drizzle/index.js';
import { organizations } from '../database/drizzle/schema/index.js';
import { eq, sql, desc, and, inArray } from 'drizzle-orm';
import { generateId } from '../../shared/utils/id-generator.js';

@injectable()
export class DrizzleOrganizationRepository implements IOrganizationRepository {
    async create(orgData: Partial<Organization>): Promise<Organization> {
        const newOrg = {
            ...orgData,
            id: orgData.id || generateId('org'),
            publicId: orgData.publicId || generateId('pub'),
            name: orgData.name || 'Unnamed Organization',
            isPaid: orgData.isPaid ?? false,
            modules: orgData.modules || {},
            organizationLockFeatures: orgData.organizationLockFeatures || {},
        };

        const [inserted] = await db.insert(organizations).values(newOrg as any).returning();
        return inserted as unknown as Organization;
    }

    async findById(id: string): Promise<Organization | null> {
        const result = await db.select().from(organizations).where(and(eq(organizations.id, id), eq(organizations.isActive, true)));
        return result.length ? (result[0] as unknown as Organization) : null;
    }

    async findByIdIncludeInactive(id: string): Promise<Organization | null> {
        const result = await db.select().from(organizations).where(eq(organizations.id, id));
        return result.length ? (result[0] as unknown as Organization) : null;
    }

    async findByName(name: string): Promise<Organization | null> {
        const result = await db.select().from(organizations).where(and(eq(organizations.name, name), eq(organizations.isActive, true)));
        return result.length ? (result[0] as unknown as Organization) : null;
    }

    async findByPublicId(publicId: string): Promise<Organization | null> {
        const result = await db.select().from(organizations).where(and(eq(organizations.publicId, publicId), eq(organizations.isActive, true)));
        return result.length ? (result[0] as unknown as Organization) : null;
    }

    async update(id: string, data: Partial<Organization>): Promise<Organization | null> {
        const updateData = { ...data, updatedAt: new Date() };
        const [updated] = await db.update(organizations)
            .set(updateData as any)
            .where(eq(organizations.id, id))
            .returning();

        return updated ? (updated as unknown as Organization) : null;
    }

    async delete(id: string): Promise<boolean> {
        // Soft delete or hard delete? The schema has `is_active`.
        // Let's implement soft delete via update.
        const [deleted] = await db.update(organizations)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(organizations.id, id))
            .returning();

        return !!deleted;
    }

    async list(offset: number = 0, limit: number = 10): Promise<Organization[]> {
        const result = await db.select()
            .from(organizations)
            .where(eq(organizations.isActive, true))
            .orderBy(desc(organizations.createdAt))
            .limit(limit)
            .offset(offset);
        return result as unknown as Organization[];
    }

    async listByIds(ids: string[]): Promise<Organization[]> {
        if (!ids.length) return [];
        const result = await db.select()
            .from(organizations)
            .where(inArray(organizations.id, ids))
            .orderBy(desc(organizations.createdAt));
        return result as unknown as Organization[];
    }

    async count(): Promise<number> {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(organizations)
            .where(eq(organizations.isActive, true));
        return result[0]?.count || 0;
    }
}
