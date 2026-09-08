import { Hono } from 'hono';
import { orgRoutes } from './organization.routes.js';
import { orgRoutesV2 } from './organizationV2.routes.js';
import { buRoutes } from './business-unit.routes.js';
import { teamRoutes } from './team.routes.js';
import { teamUserRoutes, teamUserRoutesV2 } from './team-user.routes.js';
import { userRoutes } from './user.routes.js';
import { UserController } from '../controllers/UserController.js';
import { TeamController } from '../controllers/TeamController.js';
import { accessMiddleware } from '../middleware/access.js';
import { loginRoutes } from './login.routes.js';
import { accessRoutes } from './access.routes.js';
import { accountRoutes } from './account.routes.js';
import { assignRoutes } from './assign.routes.js';
import { teamSingularRoutes } from './team-singular.routes.js';
import { categoryRoutes } from './category.routes.js';
import { thirdPartyTokenRoutes } from './third-party-token.routes.js';
import { internalRoutes } from './internal.routes.js';
import { userV2Routes } from './user-v2.routes.js';

const apiRoutes = new Hono({ strict: false });

apiRoutes.route('/v1/login', loginRoutes);
apiRoutes.route('/v1/access', accessRoutes);
apiRoutes.route('/v1/account', accountRoutes);
apiRoutes.route('/v1/assign', assignRoutes);
apiRoutes.route('/v1/organizations', orgRoutes);
apiRoutes.route('/v1/organization', orgRoutes);
apiRoutes.route('/v2/organizations', orgRoutesV2);
apiRoutes.route('/v1/users', userRoutes);
apiRoutes.get('/v1/user/_me', accessMiddleware, UserController.getMe);
apiRoutes.route('/v1/business_units', buRoutes);
// Public (no auth) — must stay above the /v2/teams mount so it runs before teamRoutes' accessMiddleware
apiRoutes.get('/v2/teams/:team_id/user/:team_user_id/email/accept', TeamController.emailAccept);
apiRoutes.route('/v1/teams', teamRoutes);
apiRoutes.route('/v2/teams', teamRoutes);
apiRoutes.route('/v1/team', teamSingularRoutes);
apiRoutes.route('/v1/categories', categoryRoutes);
apiRoutes.route('/v1/team_users', teamUserRoutes);
apiRoutes.route('/v2/team_users', teamUserRoutesV2);
apiRoutes.route('/v1/third_party_token', thirdPartyTokenRoutes);
apiRoutes.route('/v1/internal', internalRoutes);
apiRoutes.route('/v2/user', userV2Routes);

export { apiRoutes };
