import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';
import { Team } from '../../../domain/entities/Team.js';
import { User } from '../../../domain/entities/User.js';
import { createNotifications, NotificationType } from '../../../infrastructure/services/NotificationClient.js';

export interface UpdateTeamUserRoleResult {
    error?: string;
    code?: number;
    status?: number;
    field?: string;
    teamUser?: TeamUser;
    team?: Team;
    user?: User;
}

@injectable()
export class UpdateTeamUserRole {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
    ) { }

    async execute(teamUserId: string, role: string, updaterId: string): Promise<UpdateTeamUserRoleResult> {
        if (!['admin', 'member'].includes(role)) {
            return { error: 'role format error', code: 3, field: 'role', status: 400 };
        }

        const teamUser = await this.teamUserRepo.findById(teamUserId);
        if (!teamUser) return { error: 'not found team user', code: 40004, status: 404 };

        // Downgrading from admin to member: ensure there's another admin
        if (role === 'member' && teamUser.role === 'admin') {
            const remainingAdmins = await this.teamUserRepo.countAdmins(teamUser.teamId, [teamUser.id]);
            if (remainingAdmins < 1) {
                return { error: 'is last admin, forbidden', code: 11, status: 400 };
            }
        }

        const updated = role !== teamUser.role
            ? await this.teamUserRepo.update(teamUser.id, { role, updater: updaterId } as any)
            : teamUser;

        const [team, user] = await Promise.all([
            this.teamRepo.findById(teamUser.teamId),
            this.userRepo.findById(teamUser.userId),
        ]);

        // Promoting a user to admin lets any admin who is waiting to leave
        // (wait_leave=true) finally go — notify them (TEAM_ADMIN_CAN_LEAVE).
        // Mirrors the monolith's TeamFacade.approve admin-leave branch.
        if (role === 'admin' && teamUser.role !== 'admin' && team) {
            const newAdminName = user?.displayName || '';
            const members = await this.teamUserRepo.findAllByTeamId(teamUser.teamId);
            const waiting = members.filter((m) => m.waitLeave && m.id !== teamUser.id);
            if (waiting.length > 0) {
                const leaverUsers = await Promise.all(waiting.map((m) => this.userRepo.findById(m.userId)));
                createNotifications(team.organizationId, waiting.map((leaver, i) => ({
                    type: NotificationType.TEAM_ADMIN_CAN_LEAVE,
                    recipient: leaverUsers[i]?.publicId || leaver.userId,
                    from: newAdminName,
                    content: newAdminName,
                    title: team.name,
                    action_to: { team_id: leaver.teamId, team_user_id: leaver.id },
                })));
            }
        }

        return { teamUser: updated!, team: team ?? undefined, user: user ?? undefined };
    }
}
