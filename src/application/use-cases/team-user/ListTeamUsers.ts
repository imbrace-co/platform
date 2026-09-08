import { injectable, inject } from 'tsyringe';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';

@injectable()
export class ListTeamUsers {
    constructor(
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
    ) { }

    async execute(orgId: string, teamId: string, skip: number = 0, limit: number = 10, filters?: any): Promise<{ data: TeamUser[], total: number }> {
        const [data, total] = await Promise.all([
            this.teamUserRepo.listByTeam(orgId, teamId, skip, limit, filters),
            this.teamUserRepo.countByTeam(teamId, filters)
        ]);
        return { data, total };
    }
}
