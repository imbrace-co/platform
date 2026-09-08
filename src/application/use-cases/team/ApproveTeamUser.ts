import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';
import { Team } from '../../../domain/entities/Team.js';
import { User } from '../../../domain/entities/User.js';
import { createNotifications, NotificationType } from '../../../infrastructure/services/NotificationClient.js';

export interface ApproveTeamUserResult {
    error?: string;
    code?: number;
    status?: number;
    field?: string;
    teamUser?: TeamUser;
    team?: Team;
    user?: User;
}

@injectable()
export class ApproveTeamUser {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
    ) { }

    async executeApprove(teamUserId: string, role: string, approverId: string): Promise<ApproveTeamUserResult> {
        if (!['admin', 'member'].includes(role)) {
            return { error: 'role format error', code: 3, status: 400, field: 'role' };
        }

        const teamUser = await this.teamUserRepo.findById(teamUserId);
        if (!teamUser) return { error: 'not found team user', code: 40004, status: 404 };

        if (teamUser.state !== 'request') {
            return { error: 'team user approved', code: 9, status: 400 };
        }

        const updated = await this.teamUserRepo.update(teamUser.id, {
            role,
            state: 'join',
            approver: approverId,
            approverAt: new Date().toISOString(),
        } as any);

        const [team, user] = await Promise.all([
            this.teamRepo.findById(teamUser.teamId),
            this.userRepo.findById(teamUser.userId),
        ]);

        // Notify the approved user (TEAM_JOIN_REQUEST_APPROVED), unless they
        // approved themselves. Fire-and-forget.
        if (team && approverId !== teamUser.userId) {
            const approver = await this.userRepo.findById(approverId);
            const approverName = approver?.displayName || '';
            createNotifications(teamUser.organizationId || team.organizationId, {
                type: NotificationType.TEAM_JOIN_REQUEST_APPROVED,
                recipient: user?.publicId || teamUser.userId,
                from: approverName,
                content: approverName,
                title: team.name,
                action_to: { team_id: teamUser.teamId, team_user_id: teamUser.id },
            });
        }

        return { teamUser: updated!, team: team ?? undefined, user: user ?? undefined };
    }

    async executeEmailAccept(teamUserId: string): Promise<ApproveTeamUserResult> {
        const teamUser = await this.teamUserRepo.findById(teamUserId);
        if (!teamUser) return { error: 'not found team user', code: 40004, status: 404 };

        const user = await this.userRepo.findById(teamUser.userId);
        if (!user) return { error: 'not found team user', code: 40004, status: 404 };

        if (teamUser.state !== 'invite') {
            return { error: 'team user accept', code: 10, status: 400 };
        }

        const updated = await this.teamUserRepo.update(teamUser.id, {
            state: 'join',
            approver: teamUser.userId,
            approverAt: new Date().toISOString(),
        } as any);

        const team = await this.teamRepo.findById(teamUser.teamId);

        return { teamUser: updated!, team: team ?? undefined, user };
    }

    async executeAccept(teamUserId: string, requesterId: string): Promise<ApproveTeamUserResult> {
        const teamUser = await this.teamUserRepo.findById(teamUserId);
        if (!teamUser) return { error: 'not found team user', code: 40004, status: 404 };

        if (teamUser.userId !== requesterId) {
            return { error: 'Insufficient permission', code: 40003, status: 403 };
        }

        if (teamUser.state !== 'invite') {
            return { error: 'team user accept', code: 10, status: 400 };
        }

        const updated = await this.teamUserRepo.update(teamUser.id, {
            state: 'join',
            approver: requesterId,
            approverAt: new Date().toISOString(),
        } as any);

        const [team, user] = await Promise.all([
            this.teamRepo.findById(teamUser.teamId),
            this.userRepo.findById(teamUser.userId),
        ]);

        return { teamUser: updated!, team: team ?? undefined, user: user ?? undefined };
    }
}
