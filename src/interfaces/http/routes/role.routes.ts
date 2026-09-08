import { Hono } from 'hono';
import { RoleController } from '../controllers/RoleController.js';
import { accessMiddleware } from '../middleware/access.js';
import { adminRoleMiddleware } from '../middleware/role.js';

const roleRoutes = new Hono({ strict: false });
const controller = new RoleController();

// Catalog + effective-permissions: auth only (services query on behalf of users).
roleRoutes.get('/permissions', accessMiddleware, (c) => controller.permissions(c));
roleRoutes.get('/_effective', accessMiddleware, (c) => controller.effective(c));

// Catalog re-sync (UPSERT the 4 system roles to the code-defined defaults). Overwrites manual edits.
roleRoutes.post('/_sync', accessMiddleware, adminRoleMiddleware, (c) => controller.sync(c));        // this org (admin)
roleRoutes.post('/_sync_system', accessMiddleware, (c) => controller.syncSystem(c));                // ALL orgs (superadmin)

// Management: auth + admin role.
roleRoutes.get('/', accessMiddleware, adminRoleMiddleware, (c) => controller.index(c));
roleRoutes.get('/:id', accessMiddleware, adminRoleMiddleware, (c) => controller.showOne(c));
roleRoutes.post('/', accessMiddleware, adminRoleMiddleware, (c) => controller.create(c));
roleRoutes.put('/:id', accessMiddleware, adminRoleMiddleware, (c) => controller.update(c));
roleRoutes.delete('/:id', accessMiddleware, adminRoleMiddleware, (c) => controller.delete(c));

export { roleRoutes };
