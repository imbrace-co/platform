import { injectable } from 'tsyringe';
import { ITeamRepository } from '../../domain/repositories/ITeamRepository.js';
import { Team } from '../../domain/entities/Team.js';
import { db } from '../database/drizzle/index.js';
import { teams, teamUsers, users } from '../database/drizzle/schema/index.js';
import { eq, and, ilike, sql, aliasedTable, not, desc, inArray } from 'drizzle-orm';

const currentUserTeamUsers = aliasedTable(teamUsers, 'current_user_team_users');
import { generateId } from '../../shared/utils/id-generator.js';

@injectable()
export class DrizzleTeamRepository implements ITeamRepository {
    async create(teamData: Partial<Team>): Promise<Team> {
        const newTeam = {
            ...teamData,
            id: teamData.id || generateId('t'),
            name: teamData.name || 'Unnamed Team',
            mode: teamData.mode || 'public',
        };

        const [inserted] = await db.insert(teams).values(newTeam as any).returning();
        return inserted as unknown as Team;
    }

    async findById(id: string): Promise<Team | null> {
        const result = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.isDelete, false)));
        return result.length ? (result[0] as unknown as Team) : null;
    }

    async findByIds(ids: string[]): Promise<Team[]> {
        if (ids.length === 0) return [];
        const result = await db.select().from(teams).where(and(inArray(teams.id, ids), eq(teams.isDelete, false)));
        return result as unknown as Team[];
    }

    async update(id: string, data: Partial<Team>): Promise<Team | null> {
        const updateData = { ...data, updatedAt: new Date() };
        const [updated] = await db.update(teams)
            .set(updateData as any)
            .where(eq(teams.id, id))
            .returning();

        return updated ? (updated as unknown as Team) : null;
    }

    async delete(id: string): Promise<boolean> {
        const [updated] = await db.update(teams)
            .set({ isDelete: true, updatedAt: new Date() } as any)
            .where(eq(teams.id, id))
            .returning();
        return !!updated;
    }

    async listByOrganization(orgId: string, offset: number = 0, limit: number = 10, userId?: string): Promise<Team[]> {
        const rows = await db.select({
            team: teams,
            membersCount: sql<number>`count(${teamUsers.id}) filter (where (${teamUsers.state} = 'join' or ${teamUsers.state} is null) and ${users.status} = 'active' and ${users.isDeleted} = false)`,
            adminCount: sql<number>`count(${teamUsers.id}) filter (where (${teamUsers.state} = 'join' or ${teamUsers.state} is null) and ${teamUsers.role} = 'admin' and ${users.status} = 'active' and ${users.isDeleted} = false)`,
            userState: currentUserTeamUsers.state,
            userTeamUserId: currentUserTeamUsers.id,
        })
            .from(teams)
            .leftJoin(teamUsers, eq(teams.id, teamUsers.teamId))
            .leftJoin(users, eq(teamUsers.userId, users.id))
            .leftJoin(currentUserTeamUsers, and(
                eq(teams.id, currentUserTeamUsers.teamId),
                userId ? eq(currentUserTeamUsers.userId, userId) : sql`false`
            ))
            .where(and(eq(teams.organizationId, orgId), eq(teams.isDelete, false)))
            .groupBy(teams.id, currentUserTeamUsers.id)
            .orderBy(desc(teams.createdAt))
            .limit(limit).offset(offset);

        return rows.map(row => ({
            ...row.team,
            membersCount: Number(row.membersCount),
            adminCount: Number(row.adminCount),
            userState: row.userState || '',
            isJoined: row.userTeamUserId !== undefined && row.userTeamUserId !== null ? !['invite', 'request'].includes(row.userState || '') : false
        })) as unknown as Team[];
    }

    async countByOrganization(orgId: string): Promise<number> {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(teams)
            .where(and(eq(teams.organizationId, orgId), eq(teams.isDelete, false)));
        return result[0]?.count || 0;
    }

    // matches backend: getAllByBuOrg — filter by BU + org, is_disabled=false, is_delete=false, sort name ASC
    async listByBuAndOrg(buId: string, orgId: string): Promise<Team[]> {
        const result = await db.select().from(teams)
            .where(and(
                eq(teams.businessUnitId, buId),
                eq(teams.organizationId, orgId),
                eq(teams.isDisabled, false),
                eq(teams.isDelete, false),
            ))
            .orderBy(sql`${teams.name} ASC`);
        return result as unknown as Team[];
    }

    // matches backend: getAllByOrgId — filter is_disabled!=true AND is_delete!=true, sort name ASC
    async listAllByOrganization(orgId: string): Promise<Team[]> {
        const result = await db.select().from(teams)
            .where(and(
                eq(teams.organizationId, orgId),
                eq(teams.isDisabled, false),
                eq(teams.isDelete, false),
            ))
            .orderBy(sql`${teams.name} ASC`);
        return result as unknown as Team[];
    }

    async listByBusinessUnit(orgId: string, buId: string, offset: number = 0, limit: number = 10, userId?: string): Promise<Team[]> {
        const rows = await db.select({
            team: teams,
            membersCount: sql<number>`count(${teamUsers.id}) filter (where (${teamUsers.state} = 'join' or ${teamUsers.state} is null) and ${users.status} = 'active' and ${users.isDeleted} = false)`,
            adminCount: sql<number>`count(${teamUsers.id}) filter (where (${teamUsers.state} = 'join' or ${teamUsers.state} is null) and ${teamUsers.role} = 'admin' and ${users.status} = 'active' and ${users.isDeleted} = false)`,
            userState: currentUserTeamUsers.state,
            userTeamUserId: currentUserTeamUsers.id,
        })
            .from(teams)
            .leftJoin(teamUsers, eq(teams.id, teamUsers.teamId))
            .leftJoin(users, eq(teamUsers.userId, users.id))
            .leftJoin(currentUserTeamUsers, and(
                eq(teams.id, currentUserTeamUsers.teamId),
                userId ? eq(currentUserTeamUsers.userId, userId) : sql`false`
            ))
            .where(
                and(
                    eq(teams.organizationId, orgId),
                    eq(teams.businessUnitId, buId),
                    eq(teams.isDelete, false)
                )
            )
            .groupBy(teams.id, currentUserTeamUsers.id)
            .orderBy(desc(teams.createdAt))
            .limit(limit).offset(offset);

        return rows.map(row => ({
            ...row.team,
            membersCount: Number(row.membersCount),
            adminCount: Number(row.adminCount),
            userState: row.userState || '',
            isJoined: row.userTeamUserId !== undefined && row.userTeamUserId !== null ? !['invite', 'request'].includes(row.userState || '') : false
        })) as unknown as Team[];
    }

    async countByBusinessUnit(orgId: string, buId: string): Promise<number> {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(teams)
            .where(
                and(
                    eq(teams.organizationId, orgId),
                    eq(teams.businessUnitId, buId),
                    eq(teams.isDelete, false)
                )
            );
        return result[0]?.count || 0;
    }

    async searchByName(orgId: string, keyword: string, offset: number = 0, limit: number = 10, userId?: string): Promise<Team[]> {
        const rows = await db.select({
            team: teams,
            membersCount: sql<number>`count(${teamUsers.id}) filter (where (${teamUsers.state} = 'join' or ${teamUsers.state} is null) and ${users.status} = 'active' and ${users.isDeleted} = false)`,
            adminCount: sql<number>`count(${teamUsers.id}) filter (where (${teamUsers.state} = 'join' or ${teamUsers.state} is null) and ${teamUsers.role} = 'admin' and ${users.status} = 'active' and ${users.isDeleted} = false)`,
            userState: currentUserTeamUsers.state,
            userTeamUserId: currentUserTeamUsers.id,
        })
            .from(teams)
            .leftJoin(teamUsers, eq(teams.id, teamUsers.teamId))
            .leftJoin(users, eq(teamUsers.userId, users.id))
            .leftJoin(currentUserTeamUsers, and(
                eq(teams.id, currentUserTeamUsers.teamId),
                userId ? eq(currentUserTeamUsers.userId, userId) : sql`false`
            ))
            .where(
                and(
                    eq(teams.organizationId, orgId),
                    ilike(teams.name, `%${keyword}%`),
                    eq(teams.isDelete, false)
                )
            )
            .groupBy(teams.id, currentUserTeamUsers.id)
            .orderBy(desc(teams.createdAt))
            .limit(limit).offset(offset);

        return rows.map(row => ({
            ...row.team,
            membersCount: Number(row.membersCount),
            adminCount: Number(row.adminCount),
            userState: row.userState || '',
            isJoined: row.userTeamUserId !== undefined && row.userTeamUserId !== null ? !['invite', 'request'].includes(row.userState || '') : false
        })) as unknown as Team[];
    }

    async countSearchByName(orgId: string, keyword: string): Promise<number> {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(teams)
            .where(
                and(
                    eq(teams.organizationId, orgId),
                    ilike(teams.name, `%${keyword}%`),
                    eq(teams.isDelete, false)
                )
            );
        return result[0]?.count || 0;
    }

    async searchByBusinessUnit(orgId: string, buId: string, keyword: string, offset: number = 0, limit: number = 10, userId?: string): Promise<Team[]> {
        const rows = await db.select({
            team: teams,
            membersCount: sql<number>`count(${teamUsers.id}) filter (where (${teamUsers.state} = 'join' or ${teamUsers.state} is null) and ${users.status} = 'active' and ${users.isDeleted} = false)`,
            adminCount: sql<number>`count(${teamUsers.id}) filter (where (${teamUsers.state} = 'join' or ${teamUsers.state} is null) and ${teamUsers.role} = 'admin' and ${users.status} = 'active' and ${users.isDeleted} = false)`,
            userState: currentUserTeamUsers.state,
            userTeamUserId: currentUserTeamUsers.id,
        })
            .from(teams)
            .leftJoin(teamUsers, eq(teams.id, teamUsers.teamId))
            .leftJoin(users, eq(teamUsers.userId, users.id))
            .leftJoin(currentUserTeamUsers, and(
                eq(teams.id, currentUserTeamUsers.teamId),
                userId ? eq(currentUserTeamUsers.userId, userId) : sql`false`
            ))
            .where(
                and(
                    eq(teams.organizationId, orgId),
                    eq(teams.businessUnitId, buId),
                    ilike(teams.name, `%${keyword}%`),
                    eq(teams.isDelete, false)
                )
            )
            .groupBy(teams.id, currentUserTeamUsers.id)
            .orderBy(desc(teams.createdAt))
            .limit(limit).offset(offset);

        return rows.map(row => ({
            ...row.team,
            membersCount: Number(row.membersCount),
            adminCount: Number(row.adminCount),
            userState: row.userState || '',
            isJoined: row.userTeamUserId !== undefined && row.userTeamUserId !== null ? !['invite', 'request'].includes(row.userState || '') : false
        })) as unknown as Team[];
    }

    async countSearchByBusinessUnit(orgId: string, buId: string, keyword: string): Promise<number> {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(teams)
            .where(
                and(
                    eq(teams.organizationId, orgId),
                    eq(teams.businessUnitId, buId),
                    ilike(teams.name, `%${keyword}%`),
                    eq(teams.isDelete, false)
                )
            );
        return result[0]?.count || 0;
    }

    async findByBuAndName(buId: string, name: string): Promise<Team | null> {
        const result = await db.select().from(teams)
            .where(and(eq(teams.businessUnitId, buId), ilike(teams.name, name), eq(teams.isDelete, false)))
            .limit(1);
        return result.length ? (result[0] as unknown as Team) : null;
    }

    // BU's default team (mirrors legacy getBuDefaultTeam) — used to reassign
    // team-scoped resources when their team is deleted.
    async findBuDefaultTeam(buId: string): Promise<Team | null> {
        const result = await db.select().from(teams)
            .where(and(eq(teams.businessUnitId, buId), eq(teams.isDefault, true), eq(teams.isDelete, false)))
            .limit(1);
        return result.length ? (result[0] as unknown as Team) : null;
    }
}
