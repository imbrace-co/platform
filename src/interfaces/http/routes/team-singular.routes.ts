import { Hono } from 'hono';
import { TeamController } from '../controllers/TeamController.js';
import { accessMiddleware } from '../middleware/access.js';

const teamSingularRoutes = new Hono({ strict: false });

teamSingularRoutes.use('*', accessMiddleware);

teamSingularRoutes.get('/_my_team_ids', TeamController.getMyTeamIds);
teamSingularRoutes.get('/all', TeamController.listAllByBuOrg);
teamSingularRoutes.get('/users/:teamUserId', TeamController.getTeamUserPrivate);
teamSingularRoutes.get('/:teamId/users', TeamController.getAllActiveTeamUsers);
teamSingularRoutes.get('/:teamId', TeamController.getTeamPrivate);

export { teamSingularRoutes };
