import { Hono } from 'hono';
import { BusinessUnitController } from '../controllers/BusinessUnitController.js';
import { accessMiddleware } from '../middleware/access.js';

const buRoutes = new Hono({ strict: false });

buRoutes.use('*', accessMiddleware);

// These routes will be mounted under /organizations/:orgId/business-units
buRoutes.post('/', BusinessUnitController.create);
buRoutes.get('/', BusinessUnitController.list);
buRoutes.get('/:id', BusinessUnitController.get);
buRoutes.put('/:id', BusinessUnitController.update);
buRoutes.delete('/:id', BusinessUnitController.delete);

export { buRoutes };
