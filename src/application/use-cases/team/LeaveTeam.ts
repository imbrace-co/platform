import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';

export interface LeaveTeamResult {
    error?: string;
    code?: number;
    status?: number;
}

@injectable()
export class LeaveTeam {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
    ) { }

    async execute(teamId: string, userId: string): Promise<LeaveTeamResult> {
        const teamUser = await this.teamUserRepo.findByTeamAndUser(teamId, userId);
        if (!teamUser) return { error: 'You are not in the team', code: 40000, status: 400 };

        // Admin leaving: ensure there's another admin
        if (teamUser.role === 'admin') {
            const remainingAdmins = await this.teamUserRepo.countAdmins(teamId, [teamUser.id]);
            if (remainingAdmins < 1) {
                return { error: 'is last admin, forbidden', code: 11, status: 400 };
            }
        }

        await this.teamUserRepo.delete(teamUser.id);
        return {};
    }
}
