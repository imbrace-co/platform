import { Hono } from 'hono';
import { AuthController } from '../controllers/AuthController.js';
import { loginAccessMiddleware } from '../middleware/loginAccess.js';

const loginRoutes = new Hono({ strict: false });

loginRoutes.post('/sign_up', AuthController.signUp);
loginRoutes.get('/sign_up/verify', AuthController.verify);
loginRoutes.get('/sign_up/verify/check', AuthController.verifyCheck);
loginRoutes.get('/sign_up/verify/resend', AuthController.verifyResend);
loginRoutes.post('/sign_in', AuthController.signIn);
loginRoutes.post('/sign_in/file_up_load', loginAccessMiddleware, AuthController.fileUpLoad);
loginRoutes.post('/authenticate', AuthController.authenticate);
loginRoutes.get('/forget', AuthController.forget);
loginRoutes.get('/forget/verify', AuthController.forgetVerify);
loginRoutes.post('/forget/reset', AuthController.reset);
loginRoutes.post('/change_password', loginAccessMiddleware, AuthController.changePassword);
loginRoutes.get('/providers', AuthController.getLoginProviders);

export { loginRoutes };
