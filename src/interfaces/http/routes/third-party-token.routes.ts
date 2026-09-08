import { Hono } from 'hono';
import { ThirdPartyTokenController } from '../controllers/ThirdPartyTokenController.js';
import { accessMiddleware } from '../middleware/access.js';

const thirdPartyTokenRoutes = new Hono({ strict: false });

thirdPartyTokenRoutes.use('*', accessMiddleware);

thirdPartyTokenRoutes.post('/', ThirdPartyTokenController.create);
thirdPartyTokenRoutes.get('/:third_party_token', ThirdPartyTokenController.verify);
thirdPartyTokenRoutes.delete('/:third_party_token', ThirdPartyTokenController.delete);

export { thirdPartyTokenRoutes };
