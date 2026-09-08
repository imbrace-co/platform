import { Context, Next } from 'hono';
import { container } from '../../../shared/di/container.js';
import { IAccessRepository } from '../../../domain/repositories/IAccessRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';

export const accessMiddleware = async (c: Context, next: Next) => {
    const accessToken = c.req.header('x-access-token') || c.req.query('x-access-token');
    const xUserId = c.req.header('x-user-id');
    const xUserEmail = c.req.header('x-user-email');
    const xOrgId = c.req.header('x-organization-id') || c.req.header('x-org-id');

    try {
        const userRepo = container.resolve<IUserRepository>('UserRepository');
        const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');

        let mUser: any = null;
        let expiredAt: Date | null = null;

        if (accessToken) {
            // Standard access token flow
            const accessRepo = container.resolve<IAccessRepository>('AccessRepository');
            const mAccess = await accessRepo.findByToken(accessToken);

            if (!mAccess) {
                return c.json({ code: 40001, message: 'Unauthorized' }, 401);
            }

            if (new Date() > new Date(mAccess.expiresAt)) {
                return c.json({ code: 40001, message: 'Token expired' }, 401);
            }

            mUser = await userRepo.findById(mAccess.userId);
            expiredAt = mAccess.expiresAt;
        } else if (xUserEmail && xOrgId) {
            // Trusted internal call via JWT (gateway forwards email + org)
            mUser = await userRepo.findByEmail(xOrgId, xUserEmail);
        } else if (xUserId && xOrgId) {
            // Trusted internal call via legacy user_id
            mUser = await userRepo.findById(xUserId);
        } else {
            return c.json({ code: 40001, message: 'Unauthorized' }, 401);
        }

        if (!mUser) {
            return c.json({ code: 40001, message: 'User associated with token not found' }, 401);
        }

        // Enrich with teams (matching backend's _ctxUser pattern)
        const teamUsers = await teamUserRepo.listByUser(mUser.id);
        const teamIds = teamUsers
            .filter((tu: any) => tu.state === 'join')
            .map((tu: any) => tu.teamId);

        mUser.teams = teamUsers;
        mUser.teamIds = teamIds;
        if (expiredAt) mUser.expiredAt = expiredAt;

        c.set('user', mUser);

        await next();
    } catch (error) {
        console.error('Access middleware error:', error);
        return c.json({
            code: 99999,
            message: 'Internal server error during authentication'
        }, 500);
    }
};
