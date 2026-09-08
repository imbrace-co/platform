import { Hono } from 'hono';
import { ApiKeyController } from '../controllers/ApiKeyController.js';
import { accessMiddleware } from '../middleware/access.js';

const apiKeyRoutes = new Hono({ strict: false });

apiKeyRoutes.use('*', accessMiddleware);

apiKeyRoutes.post('/', ApiKeyController.create);
apiKeyRoutes.get('/', ApiKeyController.getAll);
apiKeyRoutes.get('/:id', ApiKeyController.getOne);
apiKeyRoutes.put('/:id', ApiKeyController.update);
apiKeyRoutes.delete('/:id', ApiKeyController.delete);

export { apiKeyRoutes };
