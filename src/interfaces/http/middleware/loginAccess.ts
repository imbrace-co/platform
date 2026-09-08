import { Context, Next } from 'hono';
import { container } from '../../../shared/di/container.js';
import { ILoginAccessRepository } from '../../../domain/repositories/ILoginAccessRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';

export const loginAccessMiddleware = async (c: Context, next: Next) => {
    const token = c.req.header('x-access-token');
    const xUserId = c.req.header('x-user-id');
    const xOrgId = c.req.header('x-organization-id') || c.req.header('x-org-id');


    console.log('[loginAccessMiddleware]', c.req.method, c.req.path, {
        'x-access-token': token ? `${token.slice(0, 8)}...` : null,
        'x-user-id': xUserId,
        'x-organization-id': xOrgId,
        'all-headers': Object.fromEntries(
            Object.entries(c.req.header()).filter(([k]) =>
                /^(x-|authorization)/i.test(k)
            )
        ),
    });

    try {
        if (token) {
            // Standard login access token flow
            const loginAccessRepo = container.resolve<ILoginAccessRepository>('LoginAccessRepository');
            const mLoginAccess = await loginAccessRepo.findByToken(token);

            if (!mLoginAccess) {
                return c.json({ code: 40001, message: 'Unauthorized' }, 401);
            }

            if (new Date() > new Date(mLoginAccess.expiresAt)) {
                return c.json({ code: 40001, message: 'Token expired' }, 401);
            }

            c.set('user', {
                email: mLoginAccess.email,
                token: mLoginAccess.id
            });
        } else if (xUserId && xOrgId) {
            // Trusted internal call (from app-gateway / auth-service)
            const userRepo = container.resolve<IUserRepository>('UserRepository');
            const mUser = await userRepo.findById(xUserId);

            if (!mUser) {
                return c.json({ code: 40001, message: 'User not found' }, 401);
            }

            c.set('user', {
                email: mUser.email,
                token: null
            });
        } else {
            return c.json({ code: 40001, message: 'Unauthorized' }, 401);
        }

        await next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return c.json({
            code: 99999,
            message: 'Internal server error during authentication'
        }, 500);
    }
};
