import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';
import { createNotifications, NotificationType } from '../../../infrastructure/services/NotificationClient.js';

export interface JoinTeamRequestResult {
    error?: string;
    status?: number;
    teamUser?: TeamUser;
}

@injectable()
export class JoinTeamRequest {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
    ) { }

    async execute(teamId: string, userId: string, userRole: string, orgId: string): Promise<JoinTeamRequestResult> {
        // Owner/technician don't need to request
        if (['owner', 'technician'].includes(userRole)) {
            return { error: 'super admin no need to join request', status: 403 };
        }

        const team = await this.teamRepo.findById(teamId);
        if (!team || team.isDelete) return { error: 'not found team', status: 404 };

        const existing = await this.teamUserRepo.findByTeamAndUser(teamId, userId);
        if (existing) return { error: 'team user existed', status: 400 };

        const teamUser = await this.teamUserRepo.create({
            organizationId: orgId,
            businessUnitId: team.businessUnitId,
            teamId: team.id,
            userId,
            role: 'member',
            state: 'request',
            applicant: userId,
        });

        // Notify every joined team admin that a user requested to join
        // (TEAM_JOIN_REQUEST). Fire-and-forget — never blocks the request.
        const requester = await this.userRepo.findById(userId);
        const requesterName = requester?.displayName || '';
        const members = await this.teamUserRepo.findAllByTeamId(team.id);
        const adminMembers = members.filter((m) => m.role === 'admin' && ['join', ''].includes(m.state || ''));
        if (adminMembers.length > 0) {
            const adminUsers = await Promise.all(adminMembers.map((m) => this.userRepo.findById(m.userId)));
            createNotifications(orgId, adminUsers.filter(Boolean).map((adminUser) => ({
                type: NotificationType.TEAM_JOIN_REQUEST,
                recipient: adminUser!.publicId || adminUser!.id,
                from: requesterName,
                content: requesterName,
                title: team.name,
                action_to: { team_id: team.id, team_user_id: teamUser.id },
            })));
        }
        return { teamUser };
    }
}
