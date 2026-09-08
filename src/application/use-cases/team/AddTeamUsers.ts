import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { IBusinessUnitUserRepository } from '../../../domain/repositories/IBusinessUnitUserRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { Team } from '../../../domain/entities/Team.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';
import { sendTeamInvitationEmail } from '../../../infrastructure/services/EmailService.js';
import { createNotifications, NotificationType } from '../../../infrastructure/services/NotificationClient.js';

export interface AddTeamUsersResult {
    error?: string;
    status?: number;
    team?: Team;
    teamUsers?: TeamUser[];
}

@injectable()
export class AddTeamUsers {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
        @inject('BusinessUnitUserRepository') private buUserRepo: IBusinessUnitUserRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(
        teamId: string,
        inviterUserId: string,
        users: { user_id: string; role: string }[],
        reserveLeave: boolean,
    ): Promise<AddTeamUsersResult> {
        const team = await this.teamRepo.findById(teamId);
        if (!team || team.isDelete) return { error: 'Invalid team_id', status: 404 };

        const [org, inviter] = await Promise.all([
            this.orgRepo.findById(team.organizationId),
            this.userRepo.findById(inviterUserId),
        ]);
        const inviterName = inviter?.displayName || '';

        await Promise.all(users.map(async (u) => {
            if (!['admin', 'member'].includes(u.role)) return;

            const mUser = await this.userRepo.findById(u.user_id);
            if (!mUser) return;

            if (team.businessUnitId) {
                const buMember = await this.buUserRepo.findByUserAndBU(team.businessUnitId, mUser.id);
                if (!buMember) return;
            }

            const existing = await this.teamUserRepo.findByTeamAndUser(teamId, mUser.id);
            if (existing) return;

            const teamUser = await this.teamUserRepo.create({
                organizationId: team.organizationId,
                businessUnitId: team.businessUnitId,
                teamId: team.id,
                userId: mUser.id,
                role: u.role,
                state: 'invite',
                applicant: inviterUserId,
            });

            if (mUser.email) {
                const ctaUrl = `v2/teams/${team.id}/user/${teamUser.id}/email/accept`;
                sendTeamInvitationEmail(mUser.email, org?.name ?? '', team.name, inviterName, ctaUrl).catch(() => {});
            }

            // In-app notification for the invited user (TEAM_INVITE). Fire-and-forget.
            createNotifications(team.organizationId, {
                type: NotificationType.TEAM_INVITE,
                recipient: mUser.publicId || mUser.id,
                from: inviterName,
                content: inviterName,
                title: team.name,
                action_to: { team_id: team.id, team_user_id: teamUser.id },
            });
        }));

        if (reserveLeave) {
            const inviterTu = await this.teamUserRepo.findByTeamAndUser(teamId, inviterUserId);
            if (inviterTu?.role === 'admin') {
                await this.teamUserRepo.update(inviterTu.id, { waitLeave: true } as any);
            }
        }

        const teamUsers = await this.teamUserRepo.listByTeam(team.organizationId, teamId, 0, 1000);
        return { team, teamUsers };
    }
}
