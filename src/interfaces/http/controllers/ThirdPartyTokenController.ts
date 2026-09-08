import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { IApiKeyRepository } from '../../../domain/repositories/IApiKeyRepository.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';

export class ThirdPartyTokenController {
    // POST /v1/third_party_token
    static async create(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
            if (!orgId) return c.json({ code: 40000, message: 'x-organization-id header is required' }, 400);

            const orgRepo = container.resolve<IOrganizationRepository>('OrganizationRepository');
            const mOrg = await orgRepo.findById(orgId);
            if (!mOrg) return c.json({ code: 40004, message: 'Organization not found' }, 404);

            const body = await c.req.json().catch(() => ({})) as any;
            const expirationDays = body.expirationDays || 10000;

            const expiredAt = new Date();
            expiredAt.setDate(expiredAt.getDate() + expirationDays);

            const apiKeyRepo = container.resolve<IApiKeyRepository>('ApiKeyRepository');
            const apiKey = await apiKeyRepo.create({
                name: body.name || '',
                userId: ctxUser?.id || '',
                organizationId: orgId,
                isActive: true,
                isTemp: false,
                permissions: body.permissions || {},
                expiredAt,
            });

            const expiresIn = expirationDays * 60 * 60 * 24;

            return c.json({
                apiKey: {
                    _id: apiKey.id,
                    // `apiKey` mirrors the enterprise response shape — the web UI
                    // and the SDK's extractApiKey() read apiKey.apiKey. `token`
                    // is kept for anything already consuming the OSS shape.
                    apiKey: apiKey.apiKey,
                    token: apiKey.apiKey,
                    organization_id: apiKey.organizationId,
                    user_id: apiKey.userId,
                    is_active: apiKey.isActive,
                    permissions: apiKey.permissions || {},
                    expired_at: apiKey.expiredAt ? new Date(apiKey.expiredAt).toISOString() : null,
                    created_at: apiKey.createdAt ? new Date(apiKey.createdAt).toISOString() : null,
                    updated_at: apiKey.updatedAt ? new Date(apiKey.updatedAt).toISOString() : null,
                },
                expires_in: expiresIn,
            }, 201);
        } catch (err: any) {
            console.error('[ThirdPartyTokenController.create]', err);
            return c.json({ code: 99999, message: err.message || 'Service unavailable' }, 500);
        }
    }

    // GET /v1/third_party_token/:third_party_token
    static async verify(c: Context) {
        try {
            const tokenId = c.req.param('third_party_token');
            if (!tokenId) return c.json({ code: 40000, message: 'Missing third_party_token' }, 400);

            const apiKeyRepo = container.resolve<IApiKeyRepository>('ApiKeyRepository');
            const apiKey = await apiKeyRepo.findById(tokenId);
            if (!apiKey) return c.json({ code: 40004, message: 'Third party token is not found' }, 404);

            return c.json({
                _id: apiKey.id,
                token: apiKey.apiKey,
                organization_id: apiKey.organizationId,
                user_id: apiKey.userId,
                is_active: apiKey.isActive,
                permissions: apiKey.permissions || {},
                expired_at: apiKey.expiredAt ? new Date(apiKey.expiredAt).toISOString() : null,
                created_at: apiKey.createdAt ? new Date(apiKey.createdAt).toISOString() : null,
                updated_at: apiKey.updatedAt ? new Date(apiKey.updatedAt).toISOString() : null,
            }, 200);
        } catch (err: any) {
            console.error('[ThirdPartyTokenController.verify]', err);
            return c.json({ code: 99999, message: err.message || 'Service unavailable' }, 500);
        }
    }

    // DELETE /v1/third_party_token/:third_party_token
    static async delete(c: Context) {
        try {
            const tokenId = c.req.param('third_party_token');
            if (!tokenId) return c.json({ code: 40000, message: 'Missing third_party_token' }, 400);

            const apiKeyRepo = container.resolve<IApiKeyRepository>('ApiKeyRepository');
            const deleted = await apiKeyRepo.delete(tokenId);
            if (!deleted) return c.json({ code: 40004, message: 'Third party token not found' }, 404);

            return c.json({ message: 'Third party token deleted successfully' }, 200);
        } catch (err: any) {
            console.error('[ThirdPartyTokenController.delete]', err);
            return c.json({ code: 99999, message: err.message || 'Service unavailable' }, 500);
        }
    }
}
