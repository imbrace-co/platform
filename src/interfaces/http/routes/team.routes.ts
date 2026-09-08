import { Hono } from 'hono';
import { TeamController } from '../controllers/TeamController.js';
import { accessMiddleware } from '../middleware/access.js';
import { teamAdminMiddleware } from '../middleware/teamAdmin.js';
import { teamManagerMiddleware } from '../middleware/teamManager.js';

const teamRoutes = new Hono({ strict: false });

teamRoutes.use('*', accessMiddleware);

// These routes will be mounted under /organizations/:orgId/teams
teamRoutes.post('/', TeamController.create);
teamRoutes.get('/', TeamController.list);
teamRoutes.post('/_fileupload', TeamController.fileUpload);
teamRoutes.post('/_remove_users', TeamController.removeUsersV2);
teamRoutes.post('/_leave', teamManagerMiddleware, TeamController.leaveTeam);
teamRoutes.post('/_join_team', TeamController.joinTeam);
teamRoutes.post('/_add_users', TeamController.addUsers);
teamRoutes.get('/my', TeamController.getMyTeams);
teamRoutes.get('/:team_id/team_labels', TeamController.getLabels);
teamRoutes.post('/:team_id/join_request', TeamController.joinRequest);
teamRoutes.post('/:team_id/user/:team_user_id/approve', teamAdminMiddleware, TeamController.approve);
teamRoutes.post('/:team_id/user/:team_user_id/accept', TeamController.accept);
teamRoutes.put('/:team_id/user/:team_user_id/role', teamManagerMiddleware, TeamController.updateUserRole);
teamRoutes.get('/:team_id', TeamController.get);
teamRoutes.put('/:team_id', teamManagerMiddleware, TeamController.update);
teamRoutes.delete('/:team_id', teamManagerMiddleware, TeamController.delete);

export { teamRoutes };
