import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { ExchangeAccessToken } from '../../../application/use-cases/auth/ExchangeAccessToken.js';
import { User } from '../../../domain/entities/User.js';
import { Access } from '../../../domain/repositories/IAccessRepository.js';

function toUserResponse(user: User) {
    return {
        object_name: 'user',
        id: user.publicId || user.id,
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
        created_at: user.createdAt ? user.createdAt.toISOString() : null,
        updated_at: user.updatedAt ? user.updatedAt.toISOString() : null,
    };
}

function toAccessResponse(access: Access, user: User) {
    return {
        object_name: 'access',
        id: access.token,
        token: access.token,
        refresh_token: access.refreshToken || null,
        user_id: access.userId,
        expired_at: access.expiresAt instanceof Date
            ? access.expiresAt.toISOString()
            : access.expiresAt,
        created_at: access.createdAt instanceof Date
            ? access.createdAt.toISOString()
            : (access.createdAt ?? null),
        updated_at: access.updatedAt instanceof Date
            ? access.updatedAt.toISOString()
            : (access.updatedAt ?? null),
        creator: toUserResponse(user),
    };
}

export class AccessController {
    // POST /v1/access/_exchange_access_token  (loginAccessMiddleware)
    static async exchangeAccessToken(c: Context) {
        let body: any;
        try {
            body = await c.req.json();
        } catch {
            return c.json({ code: 40000, field: 'body', message: 'Invalid JSON body' }, 400);
        }

        const organizationId = body.organization_id;
        if (!organizationId) {
            return c.json({ code: 1, field: 'organization_id', message: 'organization_id is required' }, 400);
        }

        const loginUser = c.get('user') as any;
        const email = loginUser?.email;
        const loginAccessId = loginUser?.token;

        if (!email || !loginAccessId) {
            return c.json({ code: 40001, message: 'Unauthorized' }, 401);
        }

        try {
            const useCase = container.resolve(ExchangeAccessToken);
            const { access, user } = await useCase.execute(loginAccessId, email, organizationId);
            return c.json(toAccessResponse(access, user), 200);
        } catch (err: any) {
            if (err.code === 'NOT_FOUND') {
                return c.json({ code: 40004, field: 'organization_id', message: err.message }, 400);
            }
            if (err.code === 'DEACTIVATED') {
                return c.json({ code: 40000, field: 'email', message: err.message }, 400);
            }
            console.error('[AccessController.exchangeAccessToken]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // POST /v1/access/_exchange_access_token_with_access_token  (accessMiddleware)
    static async exchangeAccessTokenWithAccessToken(c: Context) {
        let body: any;
        try {
            body = await c.req.json();
        } catch {
            return c.json({ code: 40000, field: 'body', message: 'Invalid JSON body' }, 400);
        }

        const organizationId = body.organization_id;
        if (!organizationId) {
            return c.json({ code: 1, field: 'organization_id', message: 'organization_id is required' }, 400);
        }

        // accessMiddleware sets the full user object (not { email, token })
        const mUser = c.get('user') as any;
        const email = mUser?.email;

        if (!email) {
            return c.json({ code: 40001, message: 'Unauthorized' }, 401);
        }

        try {
            const useCase = container.resolve(ExchangeAccessToken);
            // loginAccessId is null — use case skips revoking the login token
            const { access, user } = await useCase.execute(null as any, email, organizationId);
            return c.json(toAccessResponse(access, user), 200);
        } catch (err: any) {
            if (err.code === 'NOT_FOUND') {
                return c.json({ code: 40004, field: 'organization_id', message: err.message }, 400);
            }
            if (err.code === 'DEACTIVATED') {
                return c.json({ code: 40000, field: 'email', message: err.message }, 400);
            }
            console.error('[AccessController.exchangeAccessTokenWithAccessToken]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }
}
