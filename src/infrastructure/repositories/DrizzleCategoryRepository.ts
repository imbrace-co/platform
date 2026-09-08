import { injectable } from 'tsyringe';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository.js';
import { Category } from '../../domain/entities/Category.js';
import { db } from '../database/drizzle/index.js';
import { categories } from '../database/drizzle/schema/index.js';
import { eq, or, and, desc, ilike } from 'drizzle-orm';

@injectable()
export class DrizzleCategoryRepository implements ICategoryRepository {
    async findAllByOrg(orgId: string): Promise<Category[]> {
        const result = await db.select().from(categories)
            .where(
                or(
                    eq(categories.organizationId, orgId),
                    eq(categories.organizationId, 'default'),
                )
            )
            .orderBy(desc(categories.isDefault), desc(categories.createdAt));
        return result as unknown as Category[];
    }

    async findByIdAndOrg(id: string, orgId: string): Promise<Category[]> {
        const result = await db.select().from(categories)
            .where(
                and(
                    or(eq(categories.id, id), eq(categories.referenceId, id)),
                    or(eq(categories.organizationId, orgId), eq(categories.organizationId, 'default')),
                )
            );
        return result as unknown as Category[];
    }

    async create(data: Partial<Category>): Promise<Category> {
        const [inserted] = await db.insert(categories).values(data as any).returning();
        return inserted as unknown as Category;
    }

    async update(id: string, orgId: string, data: Partial<Category>): Promise<Category | null> {
        const [updated] = await db.update(categories)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(and(eq(categories.id, id), eq(categories.organizationId, orgId)))
            .returning();
        return updated ? (updated as unknown as Category) : null;
    }

    async softDelete(id: string, orgId: string): Promise<void> {
        await db.update(categories)
            .set({ isDeleted: true, updatedAt: new Date() })
            .where(and(eq(categories.id, id), eq(categories.organizationId, orgId)));
    }

    async hardDelete(id: string): Promise<void> {
        await db.delete(categories).where(eq(categories.id, id));
    }

    async findByNameAndOrg(name: string, orgId: string): Promise<Category[]> {
        const result = await db.select().from(categories)
            .where(
                and(
                    ilike(categories.name, name),
                    or(eq(categories.organizationId, orgId), eq(categories.organizationId, 'default')),
                )
            );
        return result as unknown as Category[];
    }

    async deleteOverridesByOrg(orgId: string): Promise<void> {
        const all = await db.select().from(categories)
            .where(and(eq(categories.organizationId, orgId)));
        const overrideIds = (all as unknown as Category[])
            .filter(c => c.referenceId)
            .map(c => c.id);
        for (const id of overrideIds) {
            await db.delete(categories).where(eq(categories.id, id));
        }
    }
}
