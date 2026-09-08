import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { ListTeamUsers } from '../../../application/use-cases/team-user/ListTeamUsers.js';
import { GetTeamInviteList } from '../../../application/use-cases/team-user/GetTeamInviteList.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { Team } from '../../../domain/entities/Team.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';

export class TeamUserController {
    private static toTeamUserResponse(tu: TeamUser) {
        const res: Record<string, any> = {
            object_name: 'team_user',
            id: tu.publicId || tu.id,
            team_id: tu.teamId,
            user_id: tu.userId,
            role: tu.role,
            state: tu.state,
            organization_id: tu.organizationId,
            business_unit_id: tu.businessUnitId,
            public_id: tu.publicId,
            applicant: tu.applicant,
            approver: tu.approver,
            updater: tu.updater,
            approver_at: tu.approverAt,
            wait_leave: tu.waitLeave,
            created_at: tu.createdAt ? tu.createdAt.toISOString() : null,
            updated_at: tu.updatedAt ? tu.updatedAt.toISOString() : null,
        };

        if (tu.user) {
            res.user = {
                object_name: 'user',
                id: tu.user.publicId || tu.user.id,
                display_name: tu.user.displayName,
                avatar_url: tu.user.avatarUrl,
                first_name: tu.user.firstName,
                last_name: tu.user.lastName,
                gender: tu.user.gender,
                area_code: tu.user.areaCode,
                phone_number: tu.user.phoneNumber,
                language: tu.user.language,
                status: tu.user.status,
                email: tu.user.email,
                role: tu.user.role,
                is_bot: tu.user.isBot,
                is_active: tu.user.isActive,
                is_archived: tu.user.isArchived,
                is_deleted: tu.user.isDeleted,
                organization_id: tu.user.organizationId,
                created_at: tu.user.createdAt ? tu.user.createdAt.toISOString() : null,
                updated_at: tu.user.updatedAt ? tu.user.updatedAt.toISOString() : null,
            };
        }

        return res;
    }

    private static toTeamResponse(team: Team) {
        return {
            object_name: 'team',
            id: team.id,
            organization_id: team.organizationId,
            business_unit_id: team.businessUnitId || '',
            name: team.name,
            mode: team.mode,
            icon_url: team.iconUrl || '',
            description: team.description || '',
            is_default: team.isDefault,
            is_joined: team.isJoined === true,
            user_state: team.userState || '',
            created_at: team.createdAt ? team.createdAt.toISOString() : null,
            updated_at: team.updatedAt ? team.updatedAt.toISOString() : null,
            is_disabled: team.isDisabled,
            is_delete: team.isDelete,
            members_count: team.membersCount || 0,
            admin_count: team.adminCount || 0
        };
    }

    static async list(c: Context) {
        try {
            const ctxUser = c.get('user');
            const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
            if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

            const type = c.req.query('type');
            const q = c.req.query('q');
            const search = c.req.query('search');
            const skip = Number(c.req.query('skip')) || 0;
            const limit = Math.min(Math.max(Number(c.req.query('limit')) || 10, 1), 100);

            if (type === 'team_id' && q) {
                const teamRepo = container.resolve<ITeamRepository>('TeamRepository');
                const team = await teamRepo.findById(q);
                if (!team || team.organizationId !== orgId) {
                    return c.json({ error: 'Insufficient permission' }, 403);
                }

                const useCase = container.resolve(ListTeamUsers);
                const filters = search ? { search } : undefined;
                const { data, total } = await useCase.execute(orgId, q, skip, limit, filters);

                return c.json({
                    object_name: 'list',
                    data: data.map(tu => TeamUserController.toTeamUserResponse(tu)),
                    nested: { team: TeamUserController.toTeamResponse(team) },
                    has_more: Number(total) >= (skip + limit),
                    count: Number(total),
                    total: data.length
                });
            }

            return c.json({ error: 'Unknown query type' }, 400);
        } catch (err) {
            return c.json({ message: 'something went wrong' }, 500);
        }
    }

    static async indexV2(c: Context) {
        try {
            const ctxUser = c.get('user');
            const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
            if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

            const type = c.req.query('type');
            const q = c.req.query('q');
            const search = c.req.query('search');
            const skip = Number(c.req.query('skip')) || 0;
            const limit = Math.min(Math.max(Number(c.req.query('limit')) || 10, 1), 100);

            if (type === 'team_id' && q) {
                const teamRepo = container.resolve<ITeamRepository>('TeamRepository');
                const team = await teamRepo.findById(q);
                if (!team || team.isDelete) {
                    return c.json({ error: 'team not found or deleted' }, 404);
                }
                if (team.organizationId !== orgId) {
                    return c.json({ error: 'Insufficient permission' }, 403);
                }

                // Determine hiddenPending: non-managers cannot see invite/join_request users
                const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
                const requesterTeamUser = await teamUserRepo.findByTeamAndUser(q, ctxUser.id);
                const userRole = ctxUser?.role || 'user';

                let isManager = false;
                if (['owner', 'technician'].includes(userRole)) {
                    isManager = true;
                } else if (
                    requesterTeamUser &&
                    !['request', 'invite'].includes(requesterTeamUser.state || '') &&
                    (userRole === 'admin' || requesterTeamUser.role === 'admin')
                ) {
                    isManager = true;
                }
                const hiddenPending = !isManager;

                const useCase = container.resolve(ListTeamUsers);
                const filters = { ...(search ? { search } : {}), hiddenPending };
                const { data, total } = await useCase.execute(orgId, q, skip, limit, filters);

                return c.json({
                    object_name: 'list',
                    data: data.map(tu => TeamUserController.toTeamUserResponse(tu)),
                    nested: { team: TeamUserController.toTeamResponse(team) },
                    has_more: Number(total) >= (skip + limit),
                    count: Number(total),
                    total: data.length
                });
            }

            return c.json({ error: 'Unknown query type' }, 400);
        } catch (err) {
            return c.json({ message: 'something went wrong' }, 500);
        }
    }

    static async getTeamInviteList(c: Context) {
        try {
            const ctxUser = c.get('user');
            const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
            if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

            const type = c.req.query('type');
            const teamId = c.req.query('team_id');

            if (type !== 'team_id' || !teamId) {
                return c.json({ error: 'Unknown query type' }, 400);
            }

            const useCase = container.resolve(GetTeamInviteList);
            const users = await useCase.execute(orgId, teamId);

            return c.json({
                object_name: 'list',
                data: users.map((user: any) => ({
                    object_name: 'user',
                    id: user.publicId || user.id,
                    public_id: user.publicId || null,
                    organization_id: user.organizationId,
                    email: user.email || '',
                    role: user.role,
                    display_name: user.displayName || '',
                    avatar_url: user.avatarUrl || '',
                    status: user.status || 'active',
                    created_at: user.createdAt ? user.createdAt.toISOString() : null,
                    updated_at: user.updatedAt ? user.updatedAt.toISOString() : null
                })),
                nested: {},
                count: users.length,
                total: users.length
            });
        } catch (err) {
            return c.json({ message: 'something went wrong' }, 500);
        }
    }
}
