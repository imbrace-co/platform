export interface ITeamConversationUserRepository {
    // Check if any assignment exists for (conversationId, teamId) — used for isAssign flag
    hasAssignment(conversationId: string, teamId: string): Promise<boolean>;
    // Get user IDs assigned as 'member' (not deleted) for (conversationId, teamId) — used to exclude from observers
    findAssignedMemberUserIds(conversationId: string, teamId: string): Promise<string[]>;
}
