import { Hono } from 'hono';
import { InternalController } from '../controllers/InternalController.js';
import { accessMiddleware } from '../middleware/access.js';

const internalRoutes = new Hono({ strict: false });

// Registered before the access middleware: the gateway calls it with only the key, no user token.
internalRoutes.get('/api_key_token/:key', InternalController.apiKeyToken);

internalRoutes.use('*', accessMiddleware);

internalRoutes.get('/', InternalController.index);

export { internalRoutes };
