import { Context, Next } from 'hono';
import { getRolePermissions } from '../../../shared/utils/role-cache.js';
import { hasPermission } from '../../../shared/constants/permissions.js';

/**
 * Permission guard factory. Reads the user set by `accessMiddleware`, resolves the
 * org's role -> permissions (cached, ~5s TTL), and 403s unless ALL `required` keys
 * are present. `owner` and the `'*'` wildcard bypass.
 *
 * Strictly additive: composes alongside `adminRoleMiddleware`; nothing is replaced.
 *
 *   roleRoutes.post('/', accessMiddleware, requirePermission('roles:manage'), handler)
 */
export const requirePermission = (...required: string[]) =>
    async (c: Context, next: Next) => {
        const user = c.get('user');

        if (!user) {
            return c.json({ code: 40001, message: 'Unauthorized' }, 401);
        }

        // Implicit owner bypass — never lock the owner out.
        if (user.role === 'owner') {
            return next();
        }

        const perms = await getRolePermissions(user.organizationId, user.role);

        if (!hasPermission(perms, ...required)) {
            return c.json({ code: 40003, message: 'Forbidden, insufficient permission' }, 403);
        }

        await next();
    };
