import { Hono } from 'hono';
import { OrganizationController } from '../controllers/OrganizationController.js';
import { loginAccessMiddleware } from '../middleware/loginAccess.js';
import { accessMiddleware } from '../middleware/access.js';

const orgRoutesV2 = new Hono({ strict: false });

orgRoutesV2.get('/', loginAccessMiddleware, OrganizationController.indexV2);
orgRoutesV2.get('/_all', accessMiddleware, OrganizationController.listAll);

export { orgRoutesV2 };
