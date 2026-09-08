import { Hono } from 'hono';
import { InternalController } from '../controllers/InternalController.js';
import { accessMiddleware } from '../middleware/access.js';

const internalRoutes = new Hono({ strict: false });

internalRoutes.use('*', accessMiddleware);

internalRoutes.get('/', InternalController.index);

export { internalRoutes };
