import { Hono } from 'hono';
import { MessageBarController } from '../controllers/MessageBarController.js';
import { identityAccessMiddleware } from '../middleware/identityAccess.js';

const messageBarRoutes = new Hono({ strict: false });

// Reads are public: message bars are env-scoped broadcast banners shown to every
// client (including the unauthenticated login screen), so list/detail skip auth.
messageBarRoutes.get('/', MessageBarController.list);
messageBarRoutes.get('/:id', MessageBarController.get);

// Mutations DON'T require a selected organization — env message bars are a
// platform-wide system resource. identityAccessMiddleware trusts a superadmin on
// the gateway-forwarded x-user-email alone, so admins can edit without an org.
messageBarRoutes.post('/', identityAccessMiddleware, MessageBarController.create);
messageBarRoutes.put('/:id', identityAccessMiddleware, MessageBarController.update);
messageBarRoutes.delete('/:id', identityAccessMiddleware, MessageBarController.delete);

export { messageBarRoutes };
