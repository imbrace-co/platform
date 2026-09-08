import { Context, Next } from 'hono';
import { container } from '../../../shared/di/container.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';

export const teamAdminMiddleware = async (c: Context, next: Next) => {
    const ctxUser = c.get('user');
    if (!ctxUser) {
        return c.json({ code: 40001, message: 'Unauthorized' }, 401);
    }

    const teamId = c.req.param('team_id');
    if (!teamId) {
        return c.json({ code: 40003, message: 'Forbidden, insufficient permission' }, 403);
    }

    try {
        const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
        const teamUser = await teamUserRepo.findByTeamAndUser(teamId, ctxUser.id);

        if (!teamUser || ['request', 'invite'].includes(teamUser.state || '') || teamUser.role !== 'admin') {
            return c.json({ code: 40003, message: 'Forbidden, insufficient permission' }, 403);
        }

        c.set('teamUser', teamUser);
        await next();
    } catch (err) {
        return c.json({ code: 40001, message: 'Unauthorized' }, 401);
    }
};
