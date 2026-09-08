import { Hono } from 'hono';
import { OrganizationController } from '../controllers/OrganizationController.js';
import { AIController } from '../controllers/AIController.js';
import { IpsController } from '../controllers/IpsController.js';
import { UserController } from '../controllers/UserController.js';
import { TeamController } from '../controllers/TeamController.js';
import { CategoryController } from '../controllers/CategoryController.js';
import { identityAccessMiddleware } from '../middleware/identityAccess.js';
import { loginAccessMiddleware } from '../middleware/loginAccess.js';
import { accessMiddleware } from '../middleware/access.js';

const orgRoutes = new Hono({ strict: false });

// --- Organization CRUD ---
orgRoutes.post('/', loginAccessMiddleware, OrganizationController.create);
orgRoutes.post('/aws', loginAccessMiddleware, OrganizationController.createAws);
orgRoutes.get('/', identityAccessMiddleware, OrganizationController.list);
// Header-based reads (x-organization-id) — no auth, internal-only.
// Register BEFORE /:id so Hono doesn't match these literals as the :id param.
// These mirror the legacy backend's private endpoints (chat-ai calls them
// server-to-server with only x-organization-id, no user token).
orgRoutes.get('/sidebar', OrganizationController.getSidebar);
orgRoutes.get('/ai-settings', OrganizationController.getAiSettings);
orgRoutes.get('/:id', loginAccessMiddleware, OrganizationController.get);
orgRoutes.put('/:id', accessMiddleware, OrganizationController.update);
orgRoutes.put('/:id/modules', accessMiddleware, OrganizationController.updateModules);
orgRoutes.put('/:id/ai-settings', accessMiddleware, OrganizationController.updateAiSettings);
orgRoutes.put('/:id/sidebar', accessMiddleware, OrganizationController.updateSidebar);

// --- Private endpoints (no auth — internal service calls) ---
orgRoutes.get('/:id/accounts', OrganizationController.getAccount);
orgRoutes.get('/:id/is-paid-user', OrganizationController.isPaidUser);
orgRoutes.get('/:id/user/:user_id', UserController.getUserDetails);
orgRoutes.get('/:id/users', UserController.getAllUserInfo);
orgRoutes.get('/:id/teams', TeamController.getOrgTeams);
orgRoutes.get('/:id/teams/:teamId/team_users', TeamController.getOrgTeamUsers);
orgRoutes.get('/:id/categories', CategoryController.getOrgCategories);

// --- AI proxy (no auth — private service) ---
orgRoutes.all('/:id/ai/:wildcard{.*}', AIController.proxyAI);
orgRoutes.all('/:id/ai', AIController.proxyAI);

// --- IPS / Scheduler proxy (no auth — private service) ---
orgRoutes.all('/:id/ips/:wildcard{.*}', IpsController.proxyIps);
orgRoutes.all('/:id/ips', IpsController.proxyIps);

export { orgRoutes };
