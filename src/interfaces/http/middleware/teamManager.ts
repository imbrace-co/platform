import { Context, Next } from 'hono';
import { container } from '../../../shared/di/container.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';

// owner always passes; others must have a team_user in non-pending state
// with either global member role or team admin role.
export const teamManagerMiddleware = async (c: Context, next: Next) => {
    const ctxUser = c.get('user');
    if (!ctxUser) {
        return c.json({ code: 40001, message: 'Unauthorized' }, 401);
    }

    if (ctxUser.role === 'owner') {
        await next();
        return;
    }

    let teamId = c.req.param('team_id');
    if (!teamId) teamId = (await c.req.json().catch(() => ({}) as any))?.team_id;
    if (!teamId) {
        return c.json({ code: 40003, message: 'Forbidden, insufficient permission' }, 403);
    }

    const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
    const teamUser = await teamUserRepo.findByTeamAndUser(teamId, ctxUser.id);

    if (
        !teamUser ||
        ['request', 'invite'].includes(teamUser.state || '') ||
        (ctxUser.role !== 'member' && teamUser.role !== 'admin')
    ) {
        return c.json({ code: 40003, message: 'Forbidden, insufficient permission' }, 403);
    }

    c.set('teamUser', teamUser);
    await next();
};
