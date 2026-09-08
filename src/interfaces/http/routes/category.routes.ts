import { Hono } from 'hono';
import { CategoryController } from '../controllers/CategoryController.js';
import { accessMiddleware } from '../middleware/access.js';

const categoryRoutes = new Hono({ strict: false });

categoryRoutes.use('*', accessMiddleware);

categoryRoutes.get('/', CategoryController.list);
categoryRoutes.post('/', CategoryController.create);
categoryRoutes.patch('/restore-default', CategoryController.restoreDefault);
categoryRoutes.get('/:id', CategoryController.get);
categoryRoutes.put('/:id', CategoryController.update);
categoryRoutes.delete('/:id', CategoryController.delete);

export { categoryRoutes };
