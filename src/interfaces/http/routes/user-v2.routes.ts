import { Hono } from 'hono';
import { UserController } from '../controllers/UserController.js';
import { accessMiddleware } from '../middleware/access.js';
import { adminRoleMiddleware } from '../middleware/role.js';

const userV2Routes = new Hono({ strict: false });

userV2Routes.use('*', accessMiddleware);

userV2Routes.get('/', UserController.listV2);
userV2Routes.post('/:id/reset_password_admin', adminRoleMiddleware, UserController.resetPassword);
userV2Routes.post('/:id/reset_password', UserController.changePassword);

export { userV2Routes };
