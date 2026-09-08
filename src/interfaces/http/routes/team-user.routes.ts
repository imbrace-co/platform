import { Hono } from 'hono';
import { TeamUserController } from '../controllers/TeamUserController.js';
import { accessMiddleware } from '../middleware/access.js';

const teamUserRoutes = new Hono({ strict: false });

teamUserRoutes.use('*', accessMiddleware);

teamUserRoutes.get('/', TeamUserController.list);
teamUserRoutes.get('/_invite_list', TeamUserController.getTeamInviteList);

const teamUserRoutesV2 = new Hono({ strict: false });
teamUserRoutesV2.use('*', accessMiddleware);
teamUserRoutesV2.get('/', TeamUserController.indexV2);
teamUserRoutesV2.get('/_invite_list', TeamUserController.getTeamInviteList);

export { teamUserRoutes, teamUserRoutesV2 };
