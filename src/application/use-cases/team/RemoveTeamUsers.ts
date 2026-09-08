import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { Team } from '../../../domain/entities/Team.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';

export interface RemoveTeamUsersResult {
    error?: string;
    code?: number;
    status?: number;
    team?: Team;
    teamUsers?: TeamUser[];
}

@injectable()
export class RemoveTeamUsers {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
    ) { }

    async execute(teamId: string, requesterId: string, userIds: string[], v2 = false): Promise<RemoveTeamUsersResult> {
        const team = await this.teamRepo.findById(teamId);
        if (!team) return { error: 'Invalid team_id', code: 40000, status: 404 };

        // Collect teamUsers to remove
        const toRemove: TeamUser[] = [];
        for (const userId of userIds) {
            const user = await this.userRepo.findById(userId);
            if (!user) continue;

            const tu = await this.teamUserRepo.findByTeamAndUser(teamId, user.id);
            if (!tu) continue;

            if (v2) {
                // v2: block self-remove
                if (tu.userId === requesterId) {
                    return { error: 'is own, forbidden', code: 12, status: 400 };
                }
            } else {
                // v1: silently skip self
                if (tu.userId === requesterId) continue;
            }

            toRemove.push(tu);
        }

        if (v2) {
            // Check last-admin constraint
            const adminRemoveIds = toRemove.filter(tu => tu.role === 'admin').map(tu => tu.id);
            if (adminRemoveIds.length > 0) {
                const remainingAdmins = await this.teamUserRepo.countAdmins(teamId, adminRemoveIds);
                if (remainingAdmins < 1) {
                    return { error: 'is last admin, forbidden', code: 11, status: 400 };
                }
            }
        }

        await Promise.all(toRemove.map(tu => this.teamUserRepo.delete(tu.id)));

        const updatedTeamUsers = await this.teamUserRepo.findAllByTeamId(teamId);
        return { team, teamUsers: updatedTeamUsers };
    }
}
