import { injectable } from 'tsyringe';
import { db } from '../database/drizzle/index.js';
import { teamConversationUsers } from '../database/drizzle/schema/index.js';
import { and, eq, sql } from 'drizzle-orm';
import { ITeamConversationUserRepository } from '../../domain/repositories/ITeamConversationUserRepository.js';

@injectable()
export class DrizzleTeamConversationUserRepository implements ITeamConversationUserRepository {

    async hasAssignment(conversationId: string, teamId: string): Promise<boolean> {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(teamConversationUsers)
            .where(and(
                eq(teamConversationUsers.conversationId, conversationId),
                eq(teamConversationUsers.teamId, teamId),
            ));
        return (result[0]?.count || 0) > 0;
    }

    async findAssignedMemberUserIds(conversationId: string, teamId: string): Promise<string[]> {
        const result = await db.select({ userId: teamConversationUsers.userId })
            .from(teamConversationUsers)
            .where(and(
                eq(teamConversationUsers.conversationId, conversationId),
                eq(teamConversationUsers.teamId, teamId),
                eq(teamConversationUsers.role, 'member'),
                eq(teamConversationUsers.deletedAt, ''),
            ));
        return result.map(r => r.userId).filter(Boolean) as string[];
    }
}
