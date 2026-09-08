import { Hono } from 'hono';
import { UserController } from '../controllers/UserController.js';
import { accessMiddleware } from '../middleware/access.js';
import { adminRoleMiddleware } from '../middleware/role.js';

const userRoutes = new Hono({ strict: false });

userRoutes.use('*', accessMiddleware);

userRoutes.get('/_me', UserController.getMe);
userRoutes.get('/', UserController.list);
userRoutes.get('/_all', UserController.indexSimple);
userRoutes.post('/_bulk_invite', adminRoleMiddleware, UserController.bulkInvite);
userRoutes.post('/_deactivate', UserController.deactivate);
userRoutes.post('/_reactivate', UserController.reactivate);
userRoutes.post('/_change_role', UserController.changeRole);
userRoutes.get('/_roles_count', UserController.rolesCount);
userRoutes.put('/:id', UserController.update);
userRoutes.patch('/:id/_remove', adminRoleMiddleware, UserController.remove);
userRoutes.post('/:id/reset_password', adminRoleMiddleware, UserController.resetPassword);
userRoutes.get('/:id', UserController.get);

export { userRoutes };
