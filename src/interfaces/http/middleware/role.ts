import { Context, Next } from 'hono';

export const roles = {
    OWNER: 'owner',
    MEMBER: 'member',
};

export const adminRoleMiddleware = async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
        return c.json({
            code: 40001,
            message: 'Unauthorized'
        }, 401);
    }

    if (user.role !== roles.OWNER) {
        return c.json({
            code: 40003,
            message: 'Forbidden, insufficient permission'
        }, 403);
    }

    await next();
};
