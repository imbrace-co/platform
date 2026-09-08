import { Context, Next } from 'hono';

export const identityAccessMiddleware = async (c: Context, next: Next) => {
    const token = c.req.header('x-access-token');
    const xUserId = c.req.header('x-user-id');
    const xOrgId = c.req.header('x-organization-id') || c.req.header('x-org-id');

    if (!token && !(xUserId && xOrgId)) {
        return c.json({
            code: 40001,
            message: 'Unauthorized'
        }, 401);
    }

    // Stub: In a real scenario, this would check identity_access table
    // For now, we allow it to pass or you can implement the schema if needed

    await next();
};
