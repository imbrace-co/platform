import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { Team } from '../../../domain/entities/Team.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';

export interface JoinTeamResult {
    error?: string;
    status?: number;
    team?: Team;
    teamUsers?: TeamUser[];
}

@injectable()
export class JoinTeam {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
    ) { }

    async execute(teamId: string, userId: string, orgId: string): Promise<JoinTeamResult> {
        const team = await this.teamRepo.findById(teamId);
        if (!team) return { error: 'Team not found', status: 404 };

        // Add user as admin with state=join (idempotent)
        let existing = await this.teamUserRepo.findByTeamAndUser(teamId, userId);
        if (!existing) {
            await this.teamUserRepo.create({
                organizationId: orgId,
                businessUnitId: team.businessUnitId,
                teamId: team.id,
                userId,
                role: 'admin',
                state: 'join',
            });
        }

        const teamUsers = await this.teamUserRepo.listByTeam(orgId, teamId, 0, 1000);
        return { team, teamUsers };
    }
}
