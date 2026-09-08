import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { IBusinessUnitUserRepository } from '../../../domain/repositories/IBusinessUnitUserRepository.js';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamConversationUserRepository } from '../../../domain/repositories/ITeamConversationUserRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';

export class AssignController {

    private static toRawTeamDoc(team: any) {
        return {
            doc_name: 'team',
            _id: team.id,
            public_id: team.publicId || team.id,
            organization_id: team.organizationId,
            business_unit_id: team.businessUnitId || '',
            icon_url: team.iconUrl || '',
            name: team.name,
            mode: team.mode,
            description: team.description || '',
            is_default: team.isDefault,
            is_disabled: team.isDisabled,
            is_delete: team.isDelete,
            deleted_by: team.deletedBy || '',
            deleted_at: team.deletedAt || '',
            created_at: team.createdAt ? new Date(team.createdAt).toISOString() : null,
            updated_at: team.updatedAt ? new Date(team.updatedAt).toISOString() : null,
        };
    }

    // GET /v1/assign/teams/all
    // matches backend: assignTeamsList → getAllByBuOrg → check isAssign per team
    static async teamsList(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const conversationId = c.req.query('conversation_id');

            if (!conversationId) {
                return c.json({ code: 40000, field: 'conversation_id', message: 'conversation_id is required', required: false }, 400);
            }

            const buUserRepo = container.resolve<IBusinessUnitUserRepository>('BusinessUnitUserRepository');
            const mBuUser = await buUserRepo.findFirstByUser(ctxUser.id) as any;
            if (!mBuUser) {
                return c.json({ code: 40003, message: 'Invalid business Unit ID, or no permission' }, 403);
            }

            const teamRepo = container.resolve<ITeamRepository>('TeamRepository');
            const tcuRepo = container.resolve<ITeamConversationUserRepository>('TeamConversationUserRepository');

            const teams = await teamRepo.listByBuAndOrg(
                mBuUser.businessUnitId,
                mBuUser.organizationId,
            );

            const result = await Promise.all(teams.map(async (team) => {
                const raw = AssignController.toRawTeamDoc(team);
                (raw as any).isAssign = await tcuRepo.hasAssignment(conversationId, team.id);
                return raw;
            }));

            return c.json(result, 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/assign/team/:teamId/observers
    // matches backend: observers → getAllActiveUserByTeamRole({teamId, isObservers:true, conversationId})
    // returns active team members NOT yet assigned as member in this conversation
    static async observers(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const teamId = c.req.param('teamId') || '';
            const conversationId = c.req.query('conversation_id');

            if (!conversationId) {
                return c.json({ code: 40000, field: 'conversation_id', message: 'conversation_id is required', required: false }, 400);
            }

            const buUserRepo = container.resolve<IBusinessUnitUserRepository>('BusinessUnitUserRepository');
            const mBuUser = await buUserRepo.findFirstByUser(ctxUser.id);
            if (!mBuUser) {
                return c.json({ code: 40003, message: 'Invalid business Unit ID, or no permission' }, 403);
            }

            const teamRepo = container.resolve<ITeamRepository>('TeamRepository');
            const mTeam = await teamRepo.findById(teamId) as any;
            if (!mTeam || mTeam.isDelete === true) {
                return c.json({ code: 40004, message: 'Not found' }, 404);
            }

            // Get assigned member user IDs for this conversation+team (to exclude)
            const tcuRepo = container.resolve<ITeamConversationUserRepository>('TeamConversationUserRepository');
            const assignedUserIds = await tcuRepo.findAssignedMemberUserIds(conversationId, teamId);
            const assignedSet = new Set(assignedUserIds);

            const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
            const userRepo = container.resolve<IUserRepository>('UserRepository');

            const allTeamUsers = await teamUserRepo.findAllByTeamId(teamId);

            const result: any[] = [];
            for (const tu of allTeamUsers as any[]) {
                // Only include users with state='join' or no state
                if (tu.state && tu.state !== 'join') continue;
                // Exclude already assigned members
                if (assignedSet.has(tu.userId)) continue;

                const user = await userRepo.findById(tu.userId);
                if (!user || (user as any).status !== 'active') continue;

                result.push({
                    role: tu.role,
                    user: {
                        _id: (user as any).id,
                        public_id: (user as any).publicId || (user as any).id,
                        organization_id: (user as any).organizationId,
                        email: (user as any).email || '',
                        display_name: (user as any).displayName || '',
                        avatar_url: (user as any).avatarUrl || '',
                        first_name: (user as any).firstName || '',
                        last_name: (user as any).lastName || '',
                        role: (user as any).role,
                        status: (user as any).status,
                        is_active: (user as any).isActive,
                    },
                });
            }

            return c.json(result, 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }
}
