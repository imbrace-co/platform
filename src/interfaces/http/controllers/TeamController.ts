import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { CreateTeam } from '../../../application/use-cases/team/CreateTeam.js';
import { GetTeam } from '../../../application/use-cases/team/GetTeam.js';
import { UpdateTeam } from '../../../application/use-cases/team/UpdateTeam.js';
import { DeleteTeam } from '../../../application/use-cases/team/DeleteTeam.js';
import { ListTeams } from '../../../application/use-cases/team/ListTeams.js';
import { SearchTeams } from '../../../application/use-cases/team/SearchTeams.js';
import { IBusinessUnitUserRepository } from '../../../domain/repositories/IBusinessUnitUserRepository.js';
import { IBusinessUnitRepository } from '../../../domain/repositories/IBusinessUnitRepository.js';
import { ListTeamLabels } from '../../../application/use-cases/team/ListTeamLabels.js';
import { RemoveTeamUsers } from '../../../application/use-cases/team/RemoveTeamUsers.js';
import { GetMyTeams } from '../../../application/use-cases/team/GetMyTeams.js';
import { JoinTeam } from '../../../application/use-cases/team/JoinTeam.js';
import { AddTeamUsers } from '../../../application/use-cases/team/AddTeamUsers.js';
import { JoinTeamRequest } from '../../../application/use-cases/team/JoinTeamRequest.js';
import { ApproveTeamUser } from '../../../application/use-cases/team/ApproveTeamUser.js';
import { UpdateTeamUserRole } from '../../../application/use-cases/team/UpdateTeamUserRole.js';
import { LeaveTeam } from '../../../application/use-cases/team/LeaveTeam.js';
import { getUploadPath, uploadFile } from '../../../shared/utils/s3.js';
import { Team } from '../../../domain/entities/Team.js';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { config } from '../../../shared/config/index.js';

export class TeamController {
    private static toRawTeamDocument(team: Team) {
        return {
            doc_name: 'team',
            _id: (team as any).id,
            public_id: (team as any).publicId || (team as any).id,
            organization_id: (team as any).organizationId,
            business_unit_id: (team as any).businessUnitId || '',
            icon_url: (team as any).iconUrl || '',
            name: team.name,
            mode: team.mode,
            description: (team as any).description || '',
            is_default: (team as any).isDefault,
            is_disabled: (team as any).isDisabled,
            is_delete: (team as any).isDelete,
            deleted_by: (team as any).deletedBy || '',
            deleted_at: (team as any).deletedAt || '',
            created_at: (team as any).createdAt ? new Date((team as any).createdAt).toISOString() : null,
            updated_at: (team as any).updatedAt ? new Date((team as any).updatedAt).toISOString() : null,
        };
    }

    private static toResponse(team: Team) {
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

    static async create(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const body = await c.req.json();
        const useCase = container.resolve(CreateTeam);
        const { team, teamUser } = await useCase.execute({
            organizationId: orgId,
            businessUnitId: body.business_unit_id,
            name: body.name,
            mode: typeof body.mode === 'string' ? body.mode : undefined,
            iconUrl: typeof body.icon_url === 'string' ? body.icon_url.trim() : undefined,
            description: typeof body.description === 'string' ? body.description : undefined,
            creatorUserId: ctxUser?.id,
            creatorRole: (ctxUser as any)?.role,
        });

        const teamResponse = TeamController.toResponse(team);
        return c.json({
            ...teamResponse,
            team_user_ids: teamUser ? [teamUser.id] : [],
            team_users: teamUser ? [{
                object_name: 'team_user',
                id: teamUser.publicId || teamUser.id,
                team_id: teamUser.teamId,
                user_id: teamUser.userId,
                role: teamUser.role,
                state: teamUser.state,
                organization_id: teamUser.organizationId,
                business_unit_id: teamUser.businessUnitId,
                created_at: teamUser.createdAt ? teamUser.createdAt.toISOString() : null,
                updated_at: teamUser.updatedAt ? teamUser.updatedAt.toISOString() : null,
            }] : [],
        });
    }

    static async get(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const teamId = c.req.param('team_id') || c.req.header('x-team-id');
            if (!teamId) return c.json({ code: 40004, message: 'Not found' }, 404);

            const teamRepo = container.resolve<ITeamRepository>('TeamRepository');
            const team = await teamRepo.findById(teamId);
            if (!team) {
                return c.json({ code: 40004, message: 'Not found' }, 404);
            }

            const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
            const userRepo = container.resolve<IUserRepository>('UserRepository');

            const allTeamUsers = await teamUserRepo.findAllByTeamId(teamId);

            const teamUserEntities: any[] = [];
            const teamUserIds: string[] = [];

            for (const tu of allTeamUsers as any[]) {
                const user = await userRepo.findById(tu.userId);
                const tuEntity: any = {
                    object_name: 'team_user',
                    id: tu.publicId || tu.id,
                    organization_id: tu.organizationId || '',
                    business_unit_id: tu.businessUnitId || '',
                    team_id: tu.teamId,
                    user_id: tu.userId,
                    role: tu.role,
                    state: tu.state || 'join',
                };

                if (user) {
                    tuEntity.user = {
                        object_name: 'user',
                        id: (user as any).publicId || (user as any).id,
                        display_name: (user as any).displayName || '',
                        avatar_url: (user as any).avatarUrl || '',
                        first_name: (user as any).firstName || '',
                        last_name: (user as any).lastName || '',
                        gender: (user as any).gender || '',
                        area_code: (user as any).areaCode || '',
                        phone_number: (user as any).phoneNumber || '',
                        language: (user as any).language || 'en',
                        status: (user as any).status || 'active',
                        email: (user as any).email || '',
                        is_bot: (user as any).isBot || false,
                        is_active: (user as any).isActive ?? (user as any).status === 'active',
                        is_archived: (user as any).isArchived || false,
                        is_deleted: (user as any).isDeleted || false,
                        created_at: (user as any).createdAt ? new Date((user as any).createdAt).toISOString() : null,
                        updated_at: (user as any).updatedAt ? new Date((user as any).updatedAt).toISOString() : null,
                        organization_id: (user as any).organizationId || '',
                        role: (user as any).role || '',
                    };
                }

                teamUserIds.push(tu.publicId || tu.id);
                teamUserEntities.push(tuEntity);
            }

            return c.json({
                ...TeamController.toResponse(team),
                team_user_ids: teamUserIds,
                team_users: teamUserEntities,
            });
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    static async list(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        const userId = c.req.header('x-user-id') || ctxUser?.id;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const type = c.req.query('type');
        const q = c.req.query('q');
        const search = c.req.query('search');

        const skip = parseInt(c.req.query('skip') || '0', 10) || 0;
        let limit = parseInt(c.req.query('limit') || '10', 10) || 10;
        if (limit < 1) limit = 1;
        if (limit > 100) limit = 100;

        if (type !== 'business_unit_id' || !q) {
            return c.json({ error: 'Unknown query type' }, 400);
        }

        // Resolve BU — q may be internal id (bu_*) or legacy public_id (pub_*)
        const buRepo = container.resolve<IBusinessUnitRepository>('BusinessUnitRepository');
        const bu = await buRepo.findByIdOrPublicId(q);
        if (!bu) {
            return c.json({ error: 'Invalid business Unit ID, or no permission' }, 403);
        }

        // Validate BU membership using internal bu.id
        const buUserRepo = container.resolve<IBusinessUnitUserRepository>('BusinessUnitUserRepository');
        const buMembership = await buUserRepo.findByUserAndBU(bu.id, userId!);
        if (!buMembership) {
            return c.json({ error: 'Invalid business Unit ID, or no permission' }, 403);
        }

        let result: { data: Team[], total: number };
        if (search) {
            const useCase = container.resolve(SearchTeams);
            result = await useCase.execute(orgId, search, skip, limit, bu.id, userId);
        } else {
            const useCase = container.resolve(ListTeams);
            result = await useCase.execute(orgId, skip, limit, bu.id, userId);
        }

        const { data, total } = result;
        return c.json({
            object_name: 'list',
            data: data.map(team => TeamController.toResponse(team)),
            nested: {},
            has_more: Number(total) >= (skip + limit),
            count: Number(total),
            total: data.length
        });
    }

    static async update(c: Context) {
        try {
            const ctxUser = c.get('user');
            if (!ctxUser) return c.json({ code: 40001, message: 'Unauthorized' }, 401);
            const team_id = c.req.param('team_id');
            if (!team_id) return c.json({ code: 40004, message: 'Not found' }, 404);

            const body = await c.req.json().catch(() => ({})) as any;
            const useCase = container.resolve(UpdateTeam);
            const result = await useCase.execute(team_id, ctxUser.id, body);

            if (result.error) {
                return c.json({ code: result.code ?? 99999, message: result.error }, result.status as any || 500);
            }

            const t = result.team!;
            const teamUsers = result.teamUsers || [];
            return c.json({
                object_name: 'team',
                id: t.id,
                organization_id: t.organizationId,
                business_unit_id: t.businessUnitId || '',
                name: t.name,
                mode: t.mode,
                icon_url: t.iconUrl || '',
                description: t.description || '',
                is_default: t.isDefault,
                ...(t.isJoined !== undefined ? { is_joined: t.isJoined } : {}),
                user_state: t.userState || '',
                created_at: t.createdAt ? t.createdAt.toISOString() : null,
                updated_at: t.updatedAt ? t.updatedAt.toISOString() : null,
                is_disabled: t.isDisabled === true,
                is_delete: t.isDelete,
                action: 'team.update',
                team_user_ids: teamUsers.map(tu => tu.id),
                team_users: teamUsers.map(tu => ({
                    object_name: 'team_user',
                    id: tu.publicId || tu.id,
                    organization_id: tu.organizationId,
                    business_unit_id: tu.businessUnitId || '',
                    team_id: tu.teamId,
                    user_id: tu.userId,
                    role: tu.role,
                    state: tu.state || 'join',
                })),
            });
        } catch (err) {
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    static async delete(c: Context) {
        try {
            const team_id = c.req.param('team_id');
            if (!team_id) return c.body('', 200);
            const useCase = container.resolve(DeleteTeam);
            const result = await useCase.execute(team_id);
            if (result.error) {
                const errResp: any = { code: result.code ?? 99999, field: result.field, message: result.error };
                return c.json(errResp, result.status as any || 500);
            }
            return c.body('', 200);
        } catch (err) {
            return c.json({ message: 'something went wrong' }, 500);
        }
    }

    static async removeUsers(c: Context) {
        try {
            const ctxUser = c.get('user');
            const body = await c.req.json();
            const teamId = body.team_id;
            const userIds: string[] = Array.isArray(body.user_ids) ? body.user_ids : [];

            if (!teamId) return c.json({ error: 'team_id is required' }, 400);

            const requesterId = ctxUser?.id;
            if (!requesterId) return c.json({ error: 'Unauthorized' }, 401);

            const useCase = container.resolve(RemoveTeamUsers);
            const result = await useCase.execute(teamId, requesterId, userIds, false);

            if (result.error) {
                return c.json({ error: result.error }, result.status as any || 500);
            }

            const team = result.team!;
            const teamUsers = result.teamUsers!;
            return c.json({
                ...TeamController.toResponse(team),
                team_user_ids: teamUsers.map(tu => tu.id),
                team_users: teamUsers.map(tu => ({
                    object_name: 'team_user',
                    id: tu.publicId || tu.id,
                    organization_id: tu.organizationId,
                    business_unit_id: tu.businessUnitId || '',
                    team_id: tu.teamId,
                    user_id: tu.userId,
                    role: tu.role,
                    state: tu.state || 'join',
                })),
            });
        } catch (err) {
            return c.json({ error: 'service unavailable' }, 500);
        }
    }

    static async getLabels(c: Context) {
        const teamId = c.req.param('team_id');
        if (!teamId) return c.json({ items: [], count: 0, total: 0, has_more: false });

        const skip = parseInt(c.req.query('skip') || '0', 10) || 0;
        let limit = parseInt(c.req.query('limit') || '20', 10) || 20;
        if (limit < 1) limit = 1;
        if (limit > 200) limit = 200;

        const useCase = container.resolve(ListTeamLabels);
        const { items, count } = await useCase.execute(teamId, skip, limit);

        return c.json({
            items: items.map(label => ({
                _id: label.id,
                public_id: label.publicId || label.id,
                organization_id: label.organizationId,
                business_unit_id: label.businessUnitId || '',
                team_id: label.teamId,
                name: label.name,
                color: label.color,
                created_at: label.createdAt ? label.createdAt.toISOString() : null,
                updated_at: label.updatedAt ? label.updatedAt.toISOString() : null,
            })),
            count: Number(count),
            total: items.length,
            has_more: skip + limit < Number(count),
        });
    }

    static async fileUpload(c: Context) {
        try {
            const ctxUser = c.get('user');
            const orgId = ctxUser?.organizationId;
            if (!orgId) return c.json({ code: 40001, message: 'Unauthorized' }, 401);

            const body = await c.req.parseBody();
            const file = body['file'] as File;
            if (!file) return c.json({ code: 40000, message: 'file is required' }, 400);

            const ext = file.type.split('/').pop() || 'bin';
            const key = getUploadPath('team', orgId, ext);
            const buffer = Buffer.from(await file.arrayBuffer());
            const url = await uploadFile(key, buffer, file.type);

            if (!url) return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
            return c.json({ url });
        } catch (err) {
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    static async getMyTeams(c: Context) {
        try {
            const ctxUser = c.get('user');
            const userId = ctxUser?.id;
            if (!userId) return c.json([]);

            const useCase = container.resolve(GetMyTeams);
            const teams = await useCase.execute(userId);

            return c.json(teams.map(t => ({
                ...TeamController.toResponse(t),
                role: t.role,
            })));
        } catch (err) {
            return c.json({ message: 'something went wrong' }, 500);
        }
    }

    // GET /v1/team/_my_team_ids (internal, accessMiddleware via x-user-id + x-organization-id)
    // Lean team-membership lookup for other services (e.g. data_board board access).
    // Returns the caller's joined, non-deleted team ids — mirrors GetMyTeams so the
    // list stays identical to GET /teams/my, without the N+1 team_roles payload.
    static async getMyTeamIds(c: Context) {
        try {
            const ctxUser = c.get('user');
            const userId = ctxUser?.id;
            if (!userId) return c.json({ team_ids: [] });

            const useCase = container.resolve(GetMyTeams);
            const teams = await useCase.execute(userId);
            return c.json({ team_ids: teams.map(t => t.id) });
        } catch (err) {
            return c.json({ team_ids: [] });
        }
    }

    static async joinTeam(c: Context) {
        try {
            const ctxUser = c.get('user');
            const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
            if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

            const body = await c.req.json();
            const teamId = body.team_id;
            if (!teamId) return c.json({ error: 'team_id is required' }, 400);

            const useCase = container.resolve(JoinTeam);
            const result = await useCase.execute(teamId, ctxUser?.id, orgId);

            if (result.error) return c.json({ error: result.error }, result.status as any || 500);

            const team = result.team!;
            const teamUsers = result.teamUsers!;
            return c.json({
                ...TeamController.toResponse(team),
                team_user_ids: teamUsers.map(tu => tu.id),
                team_users: teamUsers.map(tu => ({
                    object_name: 'team_user',
                    id: tu.publicId || tu.id,
                    organization_id: tu.organizationId,
                    business_unit_id: tu.businessUnitId || '',
                    team_id: tu.teamId,
                    user_id: tu.userId,
                    role: tu.role,
                    state: tu.state || 'join',
                })),
            });
        } catch (err) {
            return c.json({ error: 'service unavailable' }, 500);
        }
    }

    static async addUsers(c: Context) {
        try {
            const ctxUser = c.get('user');
            const body = await c.req.json();
            const teamId = body.team_id;
            const users = Array.isArray(body.users) ? body.users : [];
            const reserveLeave = !!body.reserve_leave;

            if (!teamId) return c.json({ error: 'team_id is required' }, 400);

            const useCase = container.resolve(AddTeamUsers);
            const result = await useCase.execute(teamId, ctxUser?.id, users, reserveLeave);

            if (result.error) return c.json({ error: result.error }, result.status as any || 500);

            const team = result.team!;
            const teamUsers = result.teamUsers!;
            return c.json({
                ...TeamController.toResponse(team),
                team_user_ids: teamUsers.map(tu => tu.id),
                team_users: teamUsers.map(tu => ({
                    object_name: 'team_user',
                    id: tu.publicId || tu.id,
                    organization_id: tu.organizationId,
                    business_unit_id: tu.businessUnitId || '',
                    team_id: tu.teamId,
                    user_id: tu.userId,
                    role: tu.role,
                    state: tu.state || 'join',
                })),
            });
        } catch (err) {
            return c.json({ error: 'service unavailable' }, 500);
        }
    }

    static async joinRequest(c: Context) {
        try {
            const ctxUser = c.get('user');
            const teamId = c.req.param('team_id');
            const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
            if (!teamId) return c.json({ code: 40000, message: 'team_id is required' }, 400);
            if (!orgId) return c.json({ code: 40000, message: 'x-organization-id header is required' }, 400);

            const useCase = container.resolve(JoinTeamRequest);
            const result = await useCase.execute(teamId, ctxUser?.id, ctxUser?.role || '', orgId);

            if (result.error) {
                const codeMap: Record<number, number> = { 403: 40003, 404: 40004, 400: 4 };
                const code = codeMap[result.status!] ?? 99999;
                return c.json({ code, message: result.error }, result.status as any || 500);
            }
            return c.json({});
        } catch (err) {
            return c.json({ code: 99999, message: 'Internal Server Error' }, 500);
        }
    }

    static async approve(c: Context) {
        try {
            const ctxUser = c.get('user');
            const teamUserId = c.req.param('team_user_id');
            if (!teamUserId) return c.json({ error: 'team_user_id is required' }, 400);

            const body = await c.req.json().catch(() => ({})) as any;
            const role = body.role;

            const useCase = container.resolve(ApproveTeamUser);
            const result = await useCase.executeApprove(teamUserId, role, ctxUser?.id);

            if (result.error) {
                const errResp: any = { code: result.code ?? 99999, message: result.error };
                if (result.field) errResp.field = result.field;
                return c.json(errResp, result.status as any || 500);
            }

            const tu = result.teamUser!;
            const u = result.user;
            const t = result.team;
            return c.json({
                object_name: 'team_user',
                id: tu.publicId || tu.id,
                organization_id: tu.organizationId,
                team_id: tu.teamId,
                user_id: tu.userId,
                role: tu.role,
                state: tu.state,
                user: u ? {
                    object_name: 'user',
                    id: u.publicId || u.id,
                    display_name: u.displayName || '',
                    avatar_url: u.avatarUrl || '',
                    first_name: u.firstName || '',
                    last_name: u.lastName || '',
                    gender: (u as any).gender || '',
                    area_code: (u as any).areaCode || '',
                    phone_number: (u as any).phoneNumber || '',
                    language: (u as any).language || 'en',
                    status: u.status || 'active',
                    email: u.email || '',
                    is_bot: u.isBot || false,
                    is_active: u.status === 'active',
                    is_archived: false,
                    is_deleted: u.isDeleted || false,
                    created_at: u.createdAt ? u.createdAt.toISOString() : null,
                    updated_at: u.updatedAt ? u.updatedAt.toISOString() : null,
                    organization_id: u.organizationId,
                    role: u.role,
                } : null,
                team: t ? {
                    object_name: 'team',
                    id: t.id,
                    organization_id: t.organizationId,
                    business_unit_id: t.businessUnitId || '',
                    name: t.name,
                    mode: t.mode,
                    icon_url: t.iconUrl || '',
                    description: t.description || '',
                    is_default: t.isDefault,
                    user_state: '',
                    created_at: t.createdAt ? t.createdAt.toISOString() : null,
                    updated_at: t.updatedAt ? t.updatedAt.toISOString() : null,
                    is_disabled: t.isDisabled,
                    is_delete: t.isDelete,
                } : null,
            });
        } catch (err) {
            return c.json({ code: 99999, message: 'Internal Server Error' }, 500);
        }
    }

    static async accept(c: Context) {
        try {
            const ctxUser = c.get('user');
            const teamUserId = c.req.param('team_user_id');
            if (!teamUserId) return c.json({ code: 40000, message: 'team_user_id is required' }, 400);

            const useCase = container.resolve(ApproveTeamUser);
            const result = await useCase.executeAccept(teamUserId, ctxUser?.id);

            if (result.error) return c.json({ code: result.code ?? 99999, message: result.error }, result.status as any || 500);

            const tu = result.teamUser!;
            const u = result.user;
            const t = result.team;
            return c.json({
                object_name: 'team_user',
                id: tu.publicId || tu.id,
                organization_id: tu.organizationId,
                team_id: tu.teamId,
                user_id: tu.userId,
                role: tu.role,
                state: tu.state,
                user: u ? {
                    object_name: 'user',
                    id: u.publicId || u.id,
                    display_name: u.displayName || '',
                    avatar_url: u.avatarUrl || '',
                    first_name: u.firstName || '',
                    last_name: u.lastName || '',
                    gender: (u as any).gender || '',
                    area_code: (u as any).areaCode || '',
                    phone_number: (u as any).phoneNumber || '',
                    language: (u as any).language || 'en',
                    status: u.status || 'active',
                    email: u.email || '',
                    is_bot: u.isBot || false,
                    is_active: u.status === 'active',
                    is_archived: false,
                    is_deleted: u.isDeleted || false,
                    created_at: u.createdAt ? u.createdAt.toISOString() : null,
                    updated_at: u.updatedAt ? u.updatedAt.toISOString() : null,
                    organization_id: u.organizationId,
                    role: u.role,
                } : null,
                team: t ? {
                    object_name: 'team',
                    id: t.id,
                    organization_id: t.organizationId,
                    business_unit_id: t.businessUnitId || '',
                    name: t.name,
                    mode: t.mode,
                    icon_url: t.iconUrl || '',
                    description: t.description || '',
                    is_default: t.isDefault,
                    user_state: '',
                    created_at: t.createdAt ? t.createdAt.toISOString() : null,
                    updated_at: t.updatedAt ? t.updatedAt.toISOString() : null,
                    is_disabled: t.isDisabled,
                    is_delete: t.isDelete,
                } : null,
            });
        } catch (err) {
            return c.json({ code: 99999, message: 'Internal Server Error' }, 500);
        }
    }

    static async emailAccept(c: Context) {
        const errorPage = `${config.appUrl}/invalid-invitation`;
        try {
            const teamUserId = c.req.param('team_user_id');
            if (!teamUserId) return c.redirect(errorPage);

            const useCase = container.resolve(ApproveTeamUser);
            const result = await useCase.executeEmailAccept(teamUserId);
            if (result.error || !result.teamUser) return c.redirect(errorPage);

            return c.redirect(`${config.appUrl}/teams/${result.teamUser.teamId}/members`);
        } catch (err) {
            return c.redirect(errorPage);
        }
    }

    static async removeUsersV2(c: Context) {
        try {
            const ctxUser = c.get('user');
            const body = await c.req.json();
            const teamId = body.team_id;
            const userIds: string[] = Array.isArray(body.user_ids) ? body.user_ids : [];

            if (!teamId) return c.json({ code: 40000, message: 'team_id is required' }, 400);
            const requesterId = ctxUser?.id;
            if (!requesterId) return c.json({ code: 40001, message: 'Unauthorized' }, 401);

            const useCase = container.resolve(RemoveTeamUsers);
            const result = await useCase.execute(teamId, requesterId, userIds, true);

            if (result.error) return c.json({ code: result.code ?? 99999, message: result.error }, result.status as any || 500);

            const t = result.team!;
            const teamUsers = result.teamUsers!;
            return c.json({
                object_name: 'team',
                id: t.id,
                organization_id: t.organizationId,
                business_unit_id: t.businessUnitId || '',
                name: t.name,
                mode: t.mode,
                icon_url: t.iconUrl || '',
                description: t.description || '',
                is_default: t.isDefault,
                user_state: t.userState || '',
                created_at: t.createdAt ? t.createdAt.toISOString() : null,
                updated_at: t.updatedAt ? t.updatedAt.toISOString() : null,
                is_disabled: t.isDisabled === true,
                is_delete: t.isDelete,
                team_user_ids: teamUsers.map(tu => tu.id),
                team_users: teamUsers.map(tu => ({
                    object_name: 'team_user',
                    id: tu.publicId || tu.id,
                    organization_id: tu.organizationId,
                    business_unit_id: tu.businessUnitId || '',
                    team_id: tu.teamId,
                    user_id: tu.userId,
                    role: tu.role,
                    state: tu.state || 'join',
                })),
            });
        } catch (err) {
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    static async updateUserRole(c: Context) {
        try {
            const ctxUser = c.get('user');
            const teamUserId = c.req.param('team_user_id');
            if (!teamUserId) return c.json({ code: 40000, message: 'team_user_id is required' }, 400);

            const body = await c.req.json().catch(() => ({})) as any;
            const role = body.role;

            const useCase = container.resolve(UpdateTeamUserRole);
            const result = await useCase.execute(teamUserId, role, ctxUser?.id);

            if (result.error) {
                const errResp: any = { code: result.code ?? 99999, message: result.error };
                if (result.field) errResp.field = result.field;
                return c.json(errResp, result.status as any || 500);
            }

            const tu = result.teamUser!;
            const u = result.user;
            const t = result.team;
            return c.json({
                object_name: 'team_user',
                id: tu.publicId || tu.id,
                organization_id: tu.organizationId,
                business_unit_id: tu.businessUnitId || '',
                team_id: tu.teamId,
                user_id: tu.userId,
                role: tu.role,
                state: tu.state || 'join',
                user: u ? {
                    object_name: 'user',
                    id: u.publicId || u.id,
                    display_name: u.displayName || '',
                    avatar_url: u.avatarUrl || '',
                    first_name: u.firstName || '',
                    last_name: u.lastName || '',
                    gender: (u as any).gender || '',
                    area_code: (u as any).areaCode || '',
                    phone_number: (u as any).phoneNumber || '',
                    language: (u as any).language || 'en',
                    status: u.status || 'active',
                    email: u.email || '',
                    is_bot: u.isBot || false,
                    is_active: u.status === 'active',
                    is_archived: false,
                    is_deleted: u.isDeleted || false,
                    created_at: u.createdAt ? u.createdAt.toISOString() : null,
                    updated_at: u.updatedAt ? u.updatedAt.toISOString() : null,
                    organization_id: u.organizationId,
                    role: u.role,
                } : null,
                team: t ? {
                    object_name: 'team',
                    id: t.id,
                    organization_id: t.organizationId,
                    business_unit_id: t.businessUnitId || '',
                    name: t.name,
                    mode: t.mode,
                    icon_url: t.iconUrl || '',
                    description: t.description || '',
                    is_default: t.isDefault,
                    user_state: '',
                    created_at: t.createdAt ? t.createdAt.toISOString() : null,
                    updated_at: t.updatedAt ? t.updatedAt.toISOString() : null,
                    is_disabled: t.isDisabled,
                    is_delete: t.isDelete,
                } : null,
                action: 'team_user.role.update',
            });
        } catch (err) {
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    static async leaveTeam(c: Context) {
        try {
            const ctxUser = c.get('user');
            const body = await c.req.json().catch(() => ({})) as any;
            const teamId = body.team_id;
            if (!teamId) return c.json({ code: 40000, message: 'team_id is required' }, 400);

            const useCase = container.resolve(LeaveTeam);
            const result = await useCase.execute(teamId, ctxUser?.id);

            if (result.error) return c.json({ code: result.code ?? 99999, message: result.error }, result.status as any || 500);
            return c.body(null, 204);
        } catch (err) {
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/team/:teamId (private, no auth)
    // matches backend private: get → getById(teamId) + entity with team_users, users, org_info
    static async getTeamPrivate(c: Context) {
        try {
            const teamId = c.req.param('teamId') || '';
            if (!teamId) return c.json({ code: 40004, message: 'Not found' }, 404);

            const teamRepo = container.resolve<ITeamRepository>('TeamRepository');
            const team = await teamRepo.findById(teamId);
            if (!team) return c.json({ code: 40004, message: 'Not found' }, 404);

            const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
            const userRepo = container.resolve<IUserRepository>('UserRepository');

            const allTeamUsers = await teamUserRepo.findAllByTeamId(teamId);
            const teamUserEntities: any[] = [];
            const teamUserIds: string[] = [];

            for (const tu of allTeamUsers as any[]) {
                const user = await userRepo.findById(tu.userId);
                const tuEntity: any = {
                    object_name: 'team_user',
                    id: tu.publicId || tu.id,
                    organization_id: tu.organizationId || '',
                    business_unit_id: tu.businessUnitId || '',
                    team_id: tu.teamId,
                    user_id: tu.userId,
                    role: tu.role,
                    state: tu.state || 'join',
                };
                if (user) {
                    tuEntity.user = {
                        object_name: 'user',
                        id: (user as any).publicId || (user as any).id,
                        display_name: (user as any).displayName || '',
                        avatar_url: (user as any).avatarUrl || '',
                        first_name: (user as any).firstName || '',
                        last_name: (user as any).lastName || '',
                        gender: (user as any).gender || '',
                        area_code: (user as any).areaCode || '',
                        phone_number: (user as any).phoneNumber || '',
                        language: (user as any).language || 'en',
                        status: (user as any).status || 'active',
                        email: (user as any).email || '',
                        is_bot: (user as any).isBot || false,
                        is_active: (user as any).isActive ?? (user as any).status === 'active',
                        is_archived: (user as any).isArchived || false,
                        is_deleted: (user as any).isDeleted || false,
                        created_at: (user as any).createdAt ? new Date((user as any).createdAt).toISOString() : null,
                        updated_at: (user as any).updatedAt ? new Date((user as any).updatedAt).toISOString() : null,
                        organization_id: (user as any).organizationId || '',
                        role: (user as any).role || '',
                    };
                }
                teamUserIds.push(tu.publicId || tu.id);
                teamUserEntities.push(tuEntity);
            }

            return c.json({
                ...TeamController.toResponse(team),
                team_user_ids: teamUserIds,
                team_users: teamUserEntities,
            });
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/team/all (private, no auth)
    // matches backend private: all → getAllByBuOrg(buId, orgId, {sort: name})
    static async listAllByBuOrg(c: Context) {
        try {
            const orgId = c.req.header('x-organization-id') || c.req.query('organization_id') || '';
            const buId = c.req.header('x-business-unit-id') || c.req.query('business_unit_id') || '';

            const teamRepo = container.resolve<ITeamRepository>('TeamRepository');
            let items: any[];
            if (buId && orgId) {
                items = await teamRepo.listByBuAndOrg(buId, orgId);
            } else if (orgId) {
                items = await teamRepo.listAllByOrganization(orgId);
            } else {
                return c.json({ code: 40000, message: 'organization_id is required' }, 400);
            }
            return c.json(items.map(TeamController.toRawTeamDocument), 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/team/users/:teamUserId (private, no auth)
    // matches backend private: getTeamUser → getById(teamUserId) + entity with user, team
    static async getTeamUserPrivate(c: Context) {
        try {
            const teamUserId = c.req.param('teamUserId') || '';

            const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
            const teamUser = await teamUserRepo.findById(teamUserId);
            if (!teamUser) return c.json({ code: 40004, message: 'Not found' }, 404);

            const userRepo = container.resolve<IUserRepository>('UserRepository');
            const teamRepo = container.resolve<ITeamRepository>('TeamRepository');

            const user = await userRepo.findById((teamUser as any).userId);
            const team = await teamRepo.findById((teamUser as any).teamId);

            const result: any = {
                object_name: 'team_user',
                id: (teamUser as any).publicId || (teamUser as any).id,
                organization_id: (teamUser as any).organizationId || '',
                business_unit_id: (teamUser as any).businessUnitId || '',
                team_id: (teamUser as any).teamId,
                user_id: (teamUser as any).userId,
                role: (teamUser as any).role,
                state: (teamUser as any).state || 'join',
            };

            if (user) {
                result.user = {
                    object_name: 'user',
                    id: (user as any).publicId || (user as any).id,
                    display_name: (user as any).displayName || '',
                    avatar_url: (user as any).avatarUrl || '',
                    email: (user as any).email || '',
                    role: (user as any).role || '',
                    status: (user as any).status || 'active',
                    organization_id: (user as any).organizationId || '',
                };
            }

            if (team) {
                result.team = TeamController.toRawTeamDocument(team);
            }

            return c.json(result, 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/team/:teamId/users
    // matches backend: allTeamUser → getAllActiveUserByTeamRole({teamId})
    // returns active team members with state='join' or no state
    static async getAllActiveTeamUsers(c: Context) {
        try {
            const teamId = c.req.param('teamId') || '';

            const teamRepo = container.resolve<ITeamRepository>('TeamRepository');
            const mTeam = await teamRepo.findById(teamId);
            if (!mTeam || (mTeam as any).isDelete === true) {
                return c.json({ code: 40004, message: 'Not found' }, 404);
            }

            const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
            const userRepo = container.resolve<IUserRepository>('UserRepository');

            const allTeamUsers = await teamUserRepo.findAllByTeamId(teamId);

            const result: any[] = [];
            for (const tu of allTeamUsers as any[]) {
                if (tu.state && tu.state !== 'join') continue;

                const user = await userRepo.findById(tu.userId);
                if (!user || (user as any).status !== 'active') continue;

                result.push({
                    role: tu.role,
                    user: {
                        _id: (user as any).id,
                        public_id: (user as any).publicId || (user as any).id,
                        organization_id: (user as any).organizationId || '',
                        email: (user as any).email || '',
                        display_name: (user as any).displayName || '',
                        avatar_url: (user as any).avatarUrl || '',
                        first_name: (user as any).firstName || '',
                        last_name: (user as any).lastName || '',
                        role: (user as any).role || '',
                        status: (user as any).status || '',
                        is_active: (user as any).isActive ?? (user as any).status === 'active',
                    },
                });
            }

            return c.json(result, 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/organization/:org_id/teams (private service, no auth)
    // matches backend: getOrgTeams → getAllByOrgId({is_disabled!=true, is_delete!=true}, sort name ASC)
    // response: plain array of raw team docs
    static async getOrgTeams(c: Context) {
        try {
            const orgId = c.req.param('id') || '';
            const teamRepo = container.resolve<ITeamRepository>('TeamRepository');
            const items = await teamRepo.listAllByOrganization(orgId);
            return c.json(items.map(TeamController.toRawTeamDocument), 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    private static toRawTeamUser(tu: TeamUser) {
        return {
            doc_name: 'team_user',
            _id: tu.id,
            public_id: (tu as any).publicId || tu.id,
            organization_id: (tu as any).organizationId || '',
            business_unit_id: (tu as any).businessUnitId || '',
            team_id: tu.teamId,
            user_id: tu.userId,
            role: tu.role,
            state: tu.state,
        };
    }

    // GET /v1/organizations/:id/teams/:teamId/team_users (private service, no auth)
    // Returns the team's member rows so internal services (channel-service) can
    // seed team_conversation_user observers when a conversation is assigned to a
    // team. Mirrors getOrgTeams' unauth, raw-document pattern.
    static async getOrgTeamUsers(c: Context) {
        try {
            const teamId = c.req.param('teamId') || '';
            const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
            const items = await teamUserRepo.findAllByTeamId(teamId);
            return c.json(items.map(TeamController.toRawTeamUser), 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }
}
