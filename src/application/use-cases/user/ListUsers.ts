import { injectable, inject } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { User } from '../../../domain/entities/User.js';

@injectable()
export class ListUsers {
    constructor(
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
        @inject('TeamRepository') private teamRepo: ITeamRepository,
    ) { }

    async execute(orgId: string, skip: number = 0, limit: number = 10, filters?: any): Promise<{
        data: (User & { teamIds: string[] })[],
        total: number,
        nested: { teams: Record<string, any> }
    }> {
        const [data, total] = await Promise.all([
            this.userRepo.listByOrganization(orgId, skip, limit, filters),
            this.userRepo.countByOrganization(orgId, filters)
        ]);

        if (data.length === 0) {
            return { data: [], total, nested: { teams: {} } };
        }

        // Fetch all team memberships for users on this page in one query
        const userIds = data.map(u => u.id);
        const allTeamUsers = await this.teamUserRepo.listByUsers(userIds);

        // Group teamIds per userId
        const teamIdsByUser: Record<string, string[]> = {};
        for (const tu of allTeamUsers) {
            if (!teamIdsByUser[tu.userId]) teamIdsByUser[tu.userId] = [];
            teamIdsByUser[tu.userId].push(tu.teamId);
        }

        const usersWithTeams = data.map(u => ({
            ...u,
            teamIds: teamIdsByUser[u.id] || [],
        }));

        // Fetch unique teams for nested
        const allTeamIds = [...new Set(allTeamUsers.map(tu => tu.teamId))];
        const teamList = await this.teamRepo.findByIds(allTeamIds);
        const nestedTeams: Record<string, any> = {};
        for (const team of teamList) {
            nestedTeams[team.id] = team;
        }

        return { data: usersWithTeams, total, nested: { teams: nestedTeams } };
    }
}
