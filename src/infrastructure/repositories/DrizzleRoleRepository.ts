import { injectable } from 'tsyringe';
import { db } from '../database/drizzle/index.js';
import { roles } from '../database/drizzle/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { IRoleRepository } from '../../domain/repositories/IRoleRepository.js';
import { Role } from '../../domain/entities/Role.js';
import { buildSystemRoleRows } from '../../shared/constants/system-roles.js';

@injectable()
export class DrizzleRoleRepository implements IRoleRepository {
    private toEntity(row: any): Role {
        return {
            id: row.id,
            organizationId: row.organizationId,
            key: row.key,
            name: row.name,
            description: row.description,
            permissions: (row.permissions as string[]) ?? [],
            priority: row.priority ?? 3,
            isSystem: row.isSystem ?? false,
            isActive: row.isActive ?? true,
            createdBy: row.createdBy,
            updatedBy: row.updatedBy,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }

    async findByOrganization(organizationId: string, limit = 50, skip = 0): Promise<{ items: Role[]; count: number }> {
        const items = await db.select().from(roles)
            .where(eq(roles.organizationId, organizationId))
            .limit(limit).offset(skip)
            .orderBy(sql`${roles.priority} ASC`, sql`${roles.createdAt} ASC`);
        const [{ count }] = await db.select({ count: sql<number>`count(*)` })
            .from(roles).where(eq(roles.organizationId, organizationId));
        return { items: items.map((r) => this.toEntity(r)), count: Number(count) };
    }

    async findById(id: string): Promise<Role | null> {
        const [row] = await db.select().from(roles).where(eq(roles.id, id));
        return row ? this.toEntity(row) : null;
    }

    async findByOrgAndKey(organizationId: string, key: string): Promise<Role | null> {
        const [row] = await db.select().from(roles).where(
            and(eq(roles.organizationId, organizationId), eq(roles.key, key))
        );
        return row ? this.toEntity(row) : null;
    }

    async create(data: Partial<Role>): Promise<Role> {
        const [inserted] = await db.insert(roles).values(data as any).returning();
        return this.toEntity(inserted);
    }

    async update(id: string, data: Partial<Role>): Promise<Role | null> {
        const [updated] = await db.update(roles)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(eq(roles.id, id))
            .returning();
        return updated ? this.toEntity(updated) : null;
    }

    async deleteById(id: string): Promise<void> {
        await db.delete(roles).where(eq(roles.id, id));
    }

    async bulkCreate(rows: Partial<Role>[]): Promise<void> {
        if (!rows.length) return;
        // Idempotent: the (organization_id, key) unique index makes re-runs safe.
        await db.insert(roles).values(rows as any).onConflictDoNothing();
    }

    async ensureSystemRoles(organizationId: string): Promise<void> {
        const [existing] = await db.select({ id: roles.id }).from(roles)
            .where(and(eq(roles.organizationId, organizationId), eq(roles.isSystem, true)))
            .limit(1);
        if (existing) return;
        await this.bulkCreate(buildSystemRoleRows(organizationId, null) as Partial<Role>[]);
    }

    async syncSystemRoles(organizationId: string): Promise<void> {
        const rows = buildSystemRoleRows(organizationId, null);
        if (!rows.length) return;
        // UPSERT on the (organization_id, key) unique index: existing rows keep their id/createdAt
        // and get their name/description/permissions/priority refreshed; missing rows are inserted.
        await db.insert(roles).values(rows as any).onConflictDoUpdate({
            target: [roles.organizationId, roles.key],
            set: {
                name: sql`excluded.name`,
                description: sql`excluded.description`,
                permissions: sql`excluded.permissions`,
                priority: sql`excluded.priority`,
                isSystem: sql`excluded.is_system`,
                isActive: sql`excluded.is_active`,
                updatedAt: new Date(),
            },
        });
    }
}
