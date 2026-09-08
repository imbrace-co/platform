import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { ListUsers } from '../../../application/use-cases/user/ListUsers.js';
import { GetUser } from '../../../application/use-cases/user/GetUser.js';
import { UpdateUser } from '../../../application/use-cases/user/UpdateUser.js';
import { BulkInviteUsers } from '../../../application/use-cases/user/BulkInviteUsers.js';
import { DeactivateUser } from '../../../application/use-cases/user/DeactivateUser.js';
import { ReactivateUser } from '../../../application/use-cases/user/ReactivateUser.js';
import { RemoveUserFromOrg } from '../../../application/use-cases/user/RemoveUserFromOrg.js';
import { ChangeUserRole } from '../../../application/use-cases/user/ChangeUserRole.js';
import { AdminResetPassword } from '../../../application/use-cases/user/AdminResetPassword.js';
import { User } from '../../../domain/entities/User.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';

export class UserController {
    private static toResponse(user: User & { teamIds?: string[] }) {
        return {
            object_name: 'user',
            id: user.publicId || user.id,
            internal_id: user.id,
            public_id: user.publicId || null,
            organization_id: user.organizationId,
            email: user.email || '',
            role: user.role,
            display_name: user.displayName || '',
            avatar_url: user.avatarUrl || '',
            gender: user.gender || '',
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            area_code: user.areaCode || '',
            phone_number: user.phoneNumber || '',
            language: user.language || '',
            status: user.status || '',
            is_bot: user.isBot,
            is_admin: user.isAdmin,
            is_deleted: user.isDeleted,
            is_archived: user.isArchived,
            is_active: user.isActive,
            on_boarded: user.onBoarded,
            team_ids: user.teamIds || [],
            created_at: user.createdAt ? user.createdAt.toISOString() : null,
            updated_at: user.updatedAt ? user.updatedAt.toISOString() : null
        };
    }

    // GET /v1/user/_me
    static async getMe(c: Context) {
        const user = c.get('user');
        if (!user) {
            return c.json({ code: 40001, message: 'Unauthorized' }, 401);
        }
        return c.json(UserController.toResponse(user), 200);
    }

    static async list(c: Context) {
        const user = c.get('user');
        const orgId = c.req.header('x-organization-id') || user?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const skip = parseInt(c.req.query('skip') || '0', 10) || 0;
        let limit = parseInt(c.req.query('limit') || '10', 10) || 10;
        if (limit > 100) limit = 100;

        const roles = c.req.query('roles')?.split(',').filter(r => r !== '');
        const team_ids = c.req.query('team_ids')?.split(',').filter(t => t !== '');
        const status = c.req.query('status')?.split(',').filter(s => s !== '');
        const search = c.req.query('search')?.trim();

        const useCase = container.resolve(ListUsers);
        const { data, total, nested } = await useCase.execute(orgId, skip, limit, { roles, status, search, team_ids });

        return c.json({
            object_name: 'list',
            data: data.map(u => UserController.toResponse(u)),
            nested,
            has_more: Number(total) >= (skip + limit),
            count: Number(total),
            total: data.length
        });
    }

    static async indexSimple(c: Context) {
        const user = c.get('user');
        const orgId = c.req.header('x-organization-id') || user?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const useCase = container.resolve(ListUsers);
        const { data } = await useCase.execute(orgId, 0, 0, { roles: ['owner', 'member'] });

        return c.json(data.map(user => UserController.toResponse(user)));
    }

    static async update(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const id = c.req.param('id');
        if (!id) return c.json({ error: 'User ID is required' }, 400);

        const body = await c.req.json();

        const updateParams: Partial<User> = {};
        if (typeof body.display_name === 'string') updateParams.displayName = body.display_name.trim();
        if (typeof body.avatar_url === 'string') updateParams.avatarUrl = body.avatar_url;
        if (typeof body.first_name === 'string') updateParams.firstName = body.first_name.trim();
        if (typeof body.last_name === 'string') updateParams.lastName = body.last_name.trim();
        if (typeof body.gender === 'string') updateParams.gender = body.gender.trim().toLowerCase();
        if (typeof body.language === 'string') updateParams.language = body.language.trim().toLowerCase();
        if (typeof body.area_code === 'string') updateParams.areaCode = body.area_code.replace(/\s+/g, '');
        if (typeof body.phone_number === 'string') updateParams.phoneNumber = body.phone_number.replace(/\s+/g, '');
        if (typeof body.status === 'string') updateParams.status = body.status;
        if (typeof body.role === 'string') updateParams.role = body.role;
        if (typeof body.is_active === 'boolean') updateParams.isActive = body.is_active;
        if (typeof body.is_archived === 'boolean') updateParams.isArchived = body.is_archived;
        if (typeof body.is_deleted === 'boolean') updateParams.isDeleted = body.is_deleted;
        if (typeof body.on_boarded === 'boolean') updateParams.onBoarded = body.on_boarded;

        const useCase = container.resolve(UpdateUser);
        const updated = await useCase.execute(id, orgId, updateParams);
        if (!updated) return c.json({ error: 'User not found' }, 404);

        return c.json(UserController.toResponse(updated));
    }

    static async get(c: Context) {
        const id = c.req.param('id');
        if (!id) return c.json({ error: 'User ID is required' }, 400);

        const orgId = c.req.header('x-organization-id');

        const useCase = container.resolve(GetUser);
        const user = await useCase.execute(id);

        if (!user || (orgId && user.organizationId !== orgId)) {
            return c.json({ error: 'User not found' }, 404);
        }

        return c.json({ data: UserController.toResponse(user) });
    }

    static async bulkInvite(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const body = await c.req.json();
        const invitations = body.invitations;
        if (!Array.isArray(invitations)) return c.json({ error: 'invitations must be an array' }, 400);

        const useCase = container.resolve(BulkInviteUsers);
        const result = await useCase.execute(orgId, ctxUser?.displayName || '', invitations);

        if (result.conflict) {
            return c.json({
                code: 400,
                message: { error: 'Emails already exist', refs: result.conflict }
            }, 400);
        }

        return c.json({
            object_name: 'list',
            data: result.users.map(u => UserController.toResponse(u)),
            nested: {},
            has_more: false,
            count: undefined,
            total: result.users.length
        });
    }

    static async rolesCount(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const userRepo = container.resolve<import('../../../domain/repositories/IUserRepository.js').IUserRepository>('UserRepository');
        const data = await userRepo.countByRoles(orgId);
        return c.json(data);
    }

    static async deactivate(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const body = await c.req.json();
        const userId = body.user_id;
        if (!userId) return c.json({ error: 'user_id is required' }, 400);

        const useCase = container.resolve(DeactivateUser);
        const result = await useCase.execute(userId, orgId, ctxUser?.role || '');

        if (result.error) {
            return c.json({ error: result.error }, result.status as any || 500);
        }

        return c.json(UserController.toResponse(result.user!));
    }

    static async reactivate(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const body = await c.req.json();
        const userId = body.user_id;
        if (!userId) return c.json({ error: 'user_id is required' }, 400);

        const useCase = container.resolve(ReactivateUser);
        const result = await useCase.execute(userId, orgId, ctxUser?.role || '');

        if (result.error) {
            return c.json({ error: result.error }, result.status as any || 500);
        }

        return c.json(UserController.toResponse(result.user!));
    }

    static async remove(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const userId = c.req.param('id');
        if (!userId) return c.json({ error: 'user id is required in path' }, 400);

        const useCase = container.resolve(RemoveUserFromOrg);
        const result = await useCase.execute(userId, orgId, ctxUser?.role || '');

        if (result.error) {
            return c.json({ error: result.error }, result.status as any || 500);
        }

        return c.json(UserController.toResponse(result.user!));
    }

    static async changeRole(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const body = await c.req.json();
        const userId = body.user_id;
        const role = body.role;
        if (!userId) return c.json({ error: 'user_id is required' }, 400);
        if (!role) return c.json({ error: 'role is required' }, 400);

        const useCase = container.resolve(ChangeUserRole);
        const result = await useCase.execute(userId, orgId, ctxUser?.id || '', role);

        if (result.error) {
            return c.json({ error: result.error }, result.status as any || 500);
        }

        return c.json(UserController.toResponse(result.user!));
    }

    static async resetPassword(c: Context) {
        const ctxUser = c.get('user');
        const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);

        const userId = c.req.param('id');
        if (!userId) return c.json({ error: 'user id is required' }, 400);

        let newPassword;
        try {
            const body = await c.req.json();
            newPassword = typeof body.new_password === 'string' ? body.new_password : undefined;
        } catch {
            // body is optional
        }

        const useCase = container.resolve(AdminResetPassword);
        const result = await useCase.execute(userId, orgId, ctxUser?.role || '', newPassword);

        if (!result.success) {
            return c.json({ error: result.error }, result.status as any || 500);
        }

        return c.json({
            message: 'Password reset successfully',
            new_password: result.newPassword,
            user: UserController.toResponse(result.user!)
        }, 200);
    }

    static async changePassword(c: Context) {
        const ctxUser = c.get('user');
        const targetId = c.req.param('id');
        if (!targetId) return c.json({ error: 'user id is required' }, 400);

        if (!ctxUser || (ctxUser.id !== targetId && ctxUser.publicId !== targetId)) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        let newPassword: string | undefined;
        try {
            const body = await c.req.json();
            newPassword = typeof body.new_password === 'string' ? body.new_password : undefined;
        } catch {
            // ignore
        }
        if (!newPassword) return c.json({ error: 'new_password is required' }, 400);

        const passwordRegex = /^(?=(?:.*[A-Z])+)(?=(?:.*[a-z])+)(?=(?:.*\d)+)(?=(?:.*[!@#$%^&*_()+\-=\[\]{}|])+)([A-Za-z0-9!@#$%^&*_()+\-=\[\]{}|]{12,})$/;
        if (!passwordRegex.test(newPassword)) {
            return c.json({ error: 'password does not match the required format' }, 400);
        }

        const loginUserRepo = container.resolve<import('../../../domain/repositories/ILoginUserRepository.js').ILoginUserRepository>('LoginUserRepository');
        const userRepo = container.resolve<import('../../../domain/repositories/IUserRepository.js').IUserRepository>('UserRepository');

        const targetUser = await userRepo.findById(targetId);
        if (!targetUser) return c.json({ error: 'User not found' }, 404);
        if (!targetUser.email) return c.json({ error: 'User has no email' }, 400);

        const loginUser = await loginUserRepo.findByEmail(targetUser.email);
        if (!loginUser) return c.json({ error: 'Login identity not found' }, 404);

        const bcrypt = await import('bcryptjs');
        await loginUserRepo.update(loginUser.id, {
            password: bcrypt.hashSync(newPassword),
            verifyCode: null,
            verifyExpiredAt: null,
        });

        return c.json({ message: 'Password changed successfully' }, 200);
    }

    private static toRawUserDocument(user: User) {
        return {
            doc_name: 'user',
            _id: user.id,
            public_id: (user as any).publicId || user.id,
            organization_id: user.organizationId,
            email: user.email || '',
            role: user.role,
            display_name: user.displayName || '',
            avatar_url: user.avatarUrl || '',
            gender: user.gender || '',
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            address_line1: (user as any).addressLine1 || '',
            address_line2: (user as any).addressLine2 || '',
            area_code: user.areaCode || '',
            phone_number: user.phoneNumber || '',
            language: user.language || '',
            status: user.status || '',
            is_active: user.isActive,
            is_archived: user.isArchived,
            is_deleted: user.isDeleted,
            is_bot: user.isBot,
            is_admin: user.isAdmin,
            on_boarded: user.onBoarded,
            created_at: user.createdAt ? user.createdAt.toISOString() : null,
            updated_at: user.updatedAt ? user.updatedAt.toISOString() : null,
        };
    }

    private static toRawTeamUserDocument(teamUser: import('../../../domain/entities/TeamUser.js').TeamUser) {
        return {
            _id: (teamUser as any).id,
            team_id: (teamUser as any).teamId,
            user_id: (teamUser as any).userId,
            organization_id: (teamUser as any).organizationId || null,
            business_unit_id: (teamUser as any).businessUnitId || null,
            role: (teamUser as any).role || 'member',
            state: (teamUser as any).state || '',
            applicant: (teamUser as any).applicant || '',
            approver: (teamUser as any).approver || '',
            updater: (teamUser as any).updater || '',
            approver_at: (teamUser as any).approverAt || '',
            wait_leave: (teamUser as any).waitLeave || false,
            created_at: (teamUser as any).createdAt ? new Date((teamUser as any).createdAt).toISOString() : null,
            updated_at: (teamUser as any).updatedAt ? new Date((teamUser as any).updatedAt).toISOString() : null,
        };
    }

    // GET /v1/organization/:org_id/user/:user_id (private service, no auth)
    static async getUserDetails(c: Context) {
        try {
            const userId = c.req.param('user_id') || '';
            const userRepo = container.resolve<IUserRepository>('UserRepository');
            const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');

            const data = await userRepo.findById(userId);
            const teamData = await teamUserRepo.listByUser(userId);

            if (!data) {
                return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
            }

            const result: any = UserController.toRawUserDocument(data);
            result.team = teamData.map(UserController.toRawTeamUserDocument);

            return c.json(result, 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v2/user (matches backend private: getAllUsersV2)
    // dynamic query filtering with limit/skip/sort + arbitrary selector fields
    static async listV2(c: Context) {
        try {
            const query = c.req.query();
            const { limit: limitStr = '100', skip: skipStr = '0', sort = 'created_at', ...selectors } = query;
            const limit = parseInt(limitStr, 10);
            const skip = parseInt(skipStr, 10);

            const selector: Record<string, string> = {};
            for (const [key, value] of Object.entries(selectors)) {
                if (value) selector[key] = value;
            }

            const userRepo = container.resolve<IUserRepository>('UserRepository');
            const result = await userRepo.listV2({ limit, skip, sort, selector });

            return c.json({
                data: result.items.map(UserController.toRawUserDocument),
                total: result.count,
                count: result.items.length,
                has_more: skip + limit < result.count,
            }, 200);
        } catch (err: any) {
            console.error('[UserController.listV2]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/organization/:org_id/users (private service, no auth)
    // matches backend: getAllUserInfo → getUserInfoByORG → findAll({organization_id}, {limit:0})
    // response: { items: [raw user docs], count: number }
    static async getAllUserInfo(c: Context) {
        try {
            const orgId = c.req.param('id') || '';
            const userRepo = container.resolve<IUserRepository>('UserRepository');

            const items = await userRepo.listByOrganization(orgId, 0, 0);
            const rawItems = items.map(UserController.toRawUserDocument);

            return c.json({ items: rawItems, count: rawItems.length }, 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }
}
