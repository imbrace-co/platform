import { Hono } from 'hono';
import { AssignController } from '../controllers/AssignController.js';
import { accessMiddleware } from '../middleware/access.js';

const assignRoutes = new Hono({ strict: false });

assignRoutes.use('*', accessMiddleware);

assignRoutes.get('/teams/all', AssignController.teamsList);
assignRoutes.get('/team/:teamId/observers', AssignController.observers);

export { assignRoutes };
