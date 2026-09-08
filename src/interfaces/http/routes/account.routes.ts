import { Hono } from 'hono';
import { AccountController } from '../controllers/AccountController.js';
import { accessMiddleware } from '../middleware/access.js';

const accountRoutes = new Hono({ strict: false });

accountRoutes.use('*', accessMiddleware);

accountRoutes.get('/', AccountController.show);
accountRoutes.put('/', AccountController.update);
accountRoutes.post('/_fileupload', AccountController.fileupload);

export { accountRoutes };
