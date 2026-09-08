import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { Team } from '../../../domain/entities/Team.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

@injectable()
export class GetTeam {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
    ) { }

    async execute(organizationId: string, id: string): Promise<Team> {
        const team = await this.teamRepo.findById(id);
        if (!team || team.organizationId !== organizationId) {
            throw new DomainError('Team not found', 404);
        }
        return team;
    }
}
