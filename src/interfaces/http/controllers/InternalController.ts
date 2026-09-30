import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { IApiKeyRepository } from '../../../domain/repositories/IApiKeyRepository.js';

export class InternalController {
    // GET /v1/internal/api_key_token/:key — called by app-gateway to validate x-api-key
    static async apiKeyToken(c: Context) {
        try {
            const key = c.req.param('key');
            const apiKeyRepo = container.resolve<IApiKeyRepository>('ApiKeyRepository');
            const apiKey = key ? await apiKeyRepo.findById(key) : null;

            const expired = apiKey?.expiredAt ? new Date() > new Date(apiKey.expiredAt) : false;
            if (!apiKey || !apiKey.isActive || expired) {
                return c.json({ code: 40001, message: 'Unauthorized' }, 401);
            }

            return c.json({
                user_id: apiKey.userId,
                org_id: apiKey.organizationId,
                permissions: apiKey.permissions || {},
            }, 200);
        } catch (err: any) {
            console.error('[InternalController.apiKeyToken]', err);
            return c.json({ code: 99999, message: err.message || 'Service unavailable' }, 500);
        }
    }

    // GET /v1/internal
    static async index(c: Context) {
        return c.json({
            service: 'platform-service',
            status: 'ok',
        }, 200);
    }
}
