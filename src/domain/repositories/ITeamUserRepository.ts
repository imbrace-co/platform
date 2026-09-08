import { TeamUser } from '../entities/TeamUser.js';

export interface ITeamUserRepository {
    findById(id: string): Promise<TeamUser | null>;
    findByTeamAndUser(teamId: string, userId: string): Promise<TeamUser | null>;
    listByTeam(orgId: string, teamId: string, offset: number, limit: number, filters?: {
        search?: string;
        hiddenPending?: boolean;
    }): Promise<TeamUser[]>;
    countByTeam(teamId: string, filters?: any): Promise<number>;
    listByUser(userId: string): Promise<TeamUser[]>;
    listByUsers(userIds: string[]): Promise<TeamUser[]>;
    create(data: Partial<TeamUser>): Promise<TeamUser>;
    update(id: string, data: Partial<TeamUser>): Promise<TeamUser | null>;
    delete(id: string): Promise<boolean>;
    getInviteList(orgId: string, teamId: string): Promise<any[]>;
    countAdmins(teamId: string, excludeIds?: string[]): Promise<number>;
    findAllByTeamId(teamId: string): Promise<TeamUser[]>;
    deleteAllByTeamId(teamId: string): Promise<void>;
}
