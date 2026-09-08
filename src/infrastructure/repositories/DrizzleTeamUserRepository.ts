import { injectable } from 'tsyringe';
import { db } from '../database/drizzle/index.js';
import { teamUsers, users } from '../database/drizzle/schema/index.js';
import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm';
import { TeamUser } from '../../domain/entities/TeamUser.js';
import { ITeamUserRepository } from '../../domain/repositories/ITeamUserRepository.js';
import { generateId } from '../../shared/utils/id-generator.js';

@injectable()
export class DrizzleTeamUserRepository implements ITeamUserRepository {
    async findById(id: string): Promise<TeamUser | null> {
        const result = await db.select().from(teamUsers)
            .where(or(eq(teamUsers.id, id), eq(teamUsers.publicId, id)))
            .limit(1);
        return result.length ? (result[0] as unknown as TeamUser) : null;
    }

    async findByTeamAndUser(teamId: string, userId: string): Promise<TeamUser | null> {
        const result = await db.select().from(teamUsers)
            .where(and(eq(teamUsers.teamId, teamId), eq(teamUsers.userId, userId)));
        return result.length ? (result[0] as unknown as TeamUser) : null;
    }

    async listByTeam(orgId: string, teamId: string, offset: number, limit: number, filters?: any): Promise<TeamUser[]> {
        const conditions: any[] = [eq(teamUsers.teamId, teamId), eq(users.status, 'active'), eq(users.isDeleted, false)];

        if (filters) {
            if (filters.hiddenPending) {
                conditions.push(or(eq(teamUsers.state, 'join'), eq(teamUsers.state, '')));
            }
            if (filters.search) {
                conditions.push(or(
                    ilike(users.displayName, `%${filters.search}%`),
                    ilike(users.email, `%${filters.search}%`)
                ));
            }
        }

        const result = await db.select({
            id: teamUsers.id,
            teamId: teamUsers.teamId,
            userId: teamUsers.userId,
            role: teamUsers.role,
            state: teamUsers.state,
            organizationId: teamUsers.organizationId,
            businessUnitId: teamUsers.businessUnitId,
            publicId: teamUsers.publicId,
            applicant: teamUsers.applicant,
            approver: teamUsers.approver,
            updater: teamUsers.updater,
            approverAt: teamUsers.approverAt,
            waitLeave: teamUsers.waitLeave,
            createdAt: teamUsers.createdAt,
            updatedAt: teamUsers.updatedAt,
            user: {
                id: users.id,
                publicId: users.publicId,
                organizationId: users.organizationId,
                email: users.email,
                role: users.role,
                displayName: users.displayName,
                avatarUrl: users.avatarUrl,
                firstName: users.firstName,
                lastName: users.lastName,
                gender: users.gender,
                areaCode: users.areaCode,
                phoneNumber: users.phoneNumber,
                language: users.language,
                status: users.status,
                isBot: users.isBot,
                isActive: users.isActive,
                isArchived: users.isArchived,
                isDeleted: users.isDeleted,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            },
        }).from(teamUsers)
            .innerJoin(users, eq(teamUsers.userId, users.id))
            .where(and(...conditions))
            .orderBy(desc(teamUsers.createdAt))
            .limit(limit)
            .offset(offset);

        return result as unknown as TeamUser[];
    }

    async countByTeam(teamId: string, filters?: any): Promise<number> {
        const conditions: any[] = [eq(teamUsers.teamId, teamId), eq(users.status, 'active'), eq(users.isDeleted, false)];

        if (filters?.hiddenPending) {
            conditions.push(or(eq(teamUsers.state, 'join'), eq(teamUsers.state, '')));
        }
        if (filters?.search) {
            conditions.push(or(
                ilike(users.displayName, `%${filters.search}%`),
                ilike(users.email, `%${filters.search}%`)
            ));
        }

        const result = await db.select({ count: sql<number>`count(*)` })
            .from(teamUsers)
            .innerJoin(users, eq(teamUsers.userId, users.id))
            .where(and(...conditions));
        return result[0]?.count || 0;
    }

    async listByUser(userId: string): Promise<TeamUser[]> {
        const result = await db.select().from(teamUsers).where(eq(teamUsers.userId, userId));
        return result as unknown as TeamUser[];
    }

    async listByUsers(userIds: string[]): Promise<TeamUser[]> {
        if (userIds.length === 0) return [];
        const result = await db.select().from(teamUsers).where(inArray(teamUsers.userId, userIds));
        return result as unknown as TeamUser[];
    }

    async create(data: Partial<TeamUser>): Promise<TeamUser> {
        const newTu = {
            ...data,
            id: data.id || generateId('tu'),
            publicId: data.publicId || generateId('tu'),
        };
        const [inserted] = await db.insert(teamUsers).values(newTu as any).returning();
        return inserted as unknown as TeamUser;
    }

    async update(id: string, data: Partial<TeamUser>): Promise<TeamUser | null> {
        const [updated] = await db.update(teamUsers)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(eq(teamUsers.id, id))
            .returning();
        return updated ? (updated as unknown as TeamUser) : null;
    }

    async delete(id: string): Promise<boolean> {
        const [deleted] = await db.delete(teamUsers).where(eq(teamUsers.id, id)).returning();
        return !!deleted;
    }

    async getInviteList(orgId: string, teamId: string): Promise<any[]> {
        const subquery = db.select({ userId: teamUsers.userId })
            .from(teamUsers)
            .where(eq(teamUsers.teamId, teamId));

        const result = await db.select().from(users)
            .where(and(
                eq(users.organizationId, orgId),
                eq(users.isBot, false),
                eq(users.status, 'active'),
                sql`${users.id} NOT IN ${subquery}`
            ));
        return result as any[];
    }

    async findAllByTeamId(teamId: string): Promise<TeamUser[]> {
        const result = await db.select().from(teamUsers)
            .where(eq(teamUsers.teamId, teamId))
            .orderBy(desc(teamUsers.createdAt));
        return result as unknown as TeamUser[];
    }

    async deleteAllByTeamId(teamId: string): Promise<void> {
        await db.delete(teamUsers).where(eq(teamUsers.teamId, teamId));
    }

    async countAdmins(teamId: string, excludeIds: string[] = []): Promise<number> {
        const conditions: any[] = [
            eq(teamUsers.teamId, teamId),
            eq(teamUsers.role, 'admin'),
            or(eq(teamUsers.state, 'join'), eq(teamUsers.state, '')),
        ];
        if (excludeIds.length > 0) {
            conditions.push(sql`${teamUsers.id} NOT IN ${excludeIds}`);
        }
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(teamUsers)
            .where(and(...conditions));
        return Number(result[0]?.count || 0);
    }
}
