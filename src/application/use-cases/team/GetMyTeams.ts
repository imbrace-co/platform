import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { Team } from '../../../domain/entities/Team.js';

@injectable()
export class GetMyTeams {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
    ) { }

    async execute(userId: string): Promise<(Team & { role: string })[]> {
        const teamUsers = await this.teamUserRepo.listByUser(userId);
        const joinedTeamUsers = teamUsers.filter(tu => !tu.state || tu.state === 'join');
        if (joinedTeamUsers.length === 0) return [];

        const teamIds = joinedTeamUsers.map(tu => tu.teamId);
        const teams = await this.teamRepo.findByIds(teamIds);

        return teams
            .filter(t => !t.isDelete)
            .map(team => {
                const tu = joinedTeamUsers.find(tu => tu.teamId === team.id);
                return { ...team, role: tu?.role || 'member' };
            });
    }
}
