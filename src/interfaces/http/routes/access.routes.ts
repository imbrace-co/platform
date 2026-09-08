import { Hono } from 'hono';
import { AccessController } from '../controllers/AccessController.js';
import { loginAccessMiddleware } from '../middleware/loginAccess.js';
import { accessMiddleware } from '../middleware/access.js';

const accessRoutes = new Hono({ strict: false });

accessRoutes.post('/_exchange_access_token', loginAccessMiddleware, AccessController.exchangeAccessToken);
accessRoutes.post('/_exchange_access_token_with_access_token', accessMiddleware, AccessController.exchangeAccessTokenWithAccessToken);

export { accessRoutes };
