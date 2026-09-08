import { injectable } from 'tsyringe';
import { db } from '../database/drizzle/index.js';
import { users, teamUsers } from '../database/drizzle/schema/index.js';
import { eq, and, or, ilike, sql, isNull, inArray } from 'drizzle-orm';
import { User } from '../../domain/entities/User.js';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { generateId } from '../../shared/utils/id-generator.js';

@injectable()
export class DrizzleUserRepository implements IUserRepository {
    async findById(id: string): Promise<User | null> {
        const result = await db.select().from(users).where(or(eq(users.id, id), eq(users.publicId, id)));
        return result.length ? (result[0] as unknown as User) : null;
    }

    async findByEmail(orgId: string, email: string): Promise<User | null> {
        const result = await db.select().from(users)
            .where(and(eq(users.organizationId, orgId), eq(users.email, email)));
        return result.length ? (result[0] as unknown as User) : null;
    }

    async listByOrganization(orgId: string, offset: number, limit: number, filters?: any): Promise<User[]> {
        const conditions: any[] = [eq(users.organizationId, orgId)];

        if (filters) {
            if (filters.roles && filters.roles.length > 0) {
                conditions.push(sql`${users.role} IN ${filters.roles}`);
            }
            if (filters.status && filters.status.length > 0) {
                conditions.push(sql`${users.status} IN ${filters.status}`);
            }
            if (filters.search) {
                conditions.push(or(
                    ilike(users.displayName, `%${filters.search}%`),
                    ilike(users.email, `%${filters.search}%`),
                    ilike(users.firstName, `%${filters.search}%`),
                    ilike(users.lastName, `%${filters.search}%`)
                ));
            }
            if (filters.team_ids && filters.team_ids.length > 0) {
                const subquery = db.select({ userId: teamUsers.userId })
                    .from(teamUsers)
                    .where(inArray(teamUsers.teamId, filters.team_ids));
                conditions.push(inArray(users.id, subquery));
            }
        }

        const query = db.select().from(users)
            .where(and(...conditions))
            .offset(offset)
            .orderBy(sql`${users.createdAt} DESC`);

        const result = limit > 0 ? await query.limit(limit) : await query;

        return result as unknown as User[];
    }

    async listByEmail(email: string, offset: number, limit: number): Promise<User[]> {
        const result = await db.select().from(users)
            .where(and(
                eq(users.email, email),
                eq(users.isBot, false),
                or(eq(users.isDeleted, false), isNull(users.isDeleted))
            ))
            .limit(limit)
            .offset(offset)
            .orderBy(sql`${users.createdAt} DESC`);

        return result as unknown as User[];
    }

    async listDistinctOrganizationIdsByEmail(email: string): Promise<string[]> {
        const result = await db.selectDistinct({ organizationId: users.organizationId })
            .from(users)
            .where(eq(users.email, email));
        
        return result.map(r => r.organizationId);
    }

    async countByOrganization(orgId: string, filters?: any): Promise<number> {
        const conditions: any[] = [eq(users.organizationId, orgId)];

        if (filters) {
            if (filters.roles && filters.roles.length > 0) {
                conditions.push(sql`${users.role} IN ${filters.roles}`);
            }
            if (filters.status && filters.status.length > 0) {
                conditions.push(sql`${users.status} IN ${filters.status}`);
            }
            if (filters.search) {
                conditions.push(or(
                    ilike(users.displayName, `%${filters.search}%`),
                    ilike(users.email, `%${filters.search}%`)
                ));
            }
            if (filters.team_ids && filters.team_ids.length > 0) {
                const subquery = db.select({ userId: teamUsers.userId })
                    .from(teamUsers)
                    .where(inArray(teamUsers.teamId, filters.team_ids));
                conditions.push(inArray(users.id, subquery));
            }
        }

        const result = await db.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(and(...conditions));

        return result[0]?.count || 0;
    }

    async countByEmail(email: string): Promise<number> {
        const result = await db.select({ count: sql`count(*)` })
            .from(users)
            .where(and(
                eq(users.email, email),
                eq(users.isBot, false),
                or(eq(users.isDeleted, false), isNull(users.isDeleted))
            ));

        return Number(result[0]?.count) || 0;
    }

    async countByRoles(orgId: string): Promise<Record<string, number>> {
        const result = await db.select({ role: users.role, count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.organizationId, orgId))
            .groupBy(users.role);

        const defaultResult: Record<string, number> = { owner: 0, member: 0 };
        for (const row of result) {
            if (row.role) defaultResult[row.role] = Number(row.count);
        }
        return defaultResult;
    }

    async update(id: string, data: Partial<User>): Promise<User | null> {
        const [updated] = await db.update(users)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(eq(users.id, id))
            .returning();
        return updated ? (updated as unknown as User) : null;
    }

    async create(data: Partial<User>): Promise<User> {
        const newUser = {
            ...data,
            id: data.id || generateId('u'),
            publicId: data.publicId || generateId('u'),
        };
        const [inserted] = await db.insert(users).values(newUser as any).returning();
        return inserted as unknown as User;
    }

    // Whitelisted column mapping: snake_case query param → drizzle column
    private static readonly selectorColumns: Record<string, any> = {
        organization_id: users.organizationId,
        email: users.email,
        role: users.role,
        status: users.status,
        is_bot: users.isBot,
        is_active: users.isActive,
        is_deleted: users.isDeleted,
        is_archived: users.isArchived,
        is_admin: users.isAdmin,
        display_name: users.displayName,
        first_name: users.firstName,
        last_name: users.lastName,
    };

    private static readonly sortColumns: Record<string, any> = {
        created_at: users.createdAt,
        updated_at: users.updatedAt,
        email: users.email,
        display_name: users.displayName,
    };

    async listV2(params: {
        limit: number;
        skip: number;
        sort: string;
        selector: Record<string, string>;
    }): Promise<{ items: User[]; count: number }> {
        const conditions: any[] = [];

        for (const [key, value] of Object.entries(params.selector)) {
            const col = DrizzleUserRepository.selectorColumns[key];
            if (!col) continue;

            // Handle boolean columns
            if (key.startsWith('is_')) {
                conditions.push(eq(col, value === 'true'));
            } else {
                conditions.push(eq(col, value));
            }
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const sortCol = DrizzleUserRepository.sortColumns[params.sort] || users.createdAt;

        const [countResult, items] = await Promise.all([
            db.select({ count: sql<number>`count(*)` })
                .from(users)
                .where(whereClause),
            db.select().from(users)
                .where(whereClause)
                .orderBy(sql`${sortCol} DESC`)
                .limit(params.limit)
                .offset(params.skip),
        ]);

        return {
            items: items as unknown as User[],
            count: Number(countResult[0]?.count) || 0,
        };
    }
}
