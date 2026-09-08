import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { IApiKeyRepository } from '../../../domain/repositories/IApiKeyRepository.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';

export class ApiKeyController {
    // POST /v1/api_key_token
    static async create(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const orgId = c.req.header('x-organization-id') || ctxUser?.organizationId;
            if (!orgId) return c.json({ code: 40000, message: 'x-organization-id header is required' }, 400);

            const orgRepo = container.resolve<IOrganizationRepository>('OrganizationRepository');
            const mOrg = await orgRepo.findById(orgId);
            if (!mOrg) return c.json({ code: 40004, message: 'Organization not found' }, 404);

            const body = await c.req.json().catch(() => ({})) as any;

            const defaultExpiry = new Date();
            defaultExpiry.setDate(defaultExpiry.getDate() + 30);

            const apiKeyRepo = container.resolve<IApiKeyRepository>('ApiKeyRepository');
            const apiKey = await apiKeyRepo.create({
                name: body.name || '',
                userId: ctxUser?.id || '',
                organizationId: orgId,
                isActive: true,
                isTemp: false,
                permissions: body.permissions || {},
                expiredAt: body.expiresAt ? new Date(body.expiresAt) : defaultExpiry,
            });

            return c.json(ApiKeyController.toResponse(apiKey), 201);
        } catch (err: any) {
            console.error('[ApiKeyController.create]', err);
            return c.json({ code: 99999, message: err.message || 'Service unavailable' }, 500);
        }
    }

    // GET /v1/api_key_token
    static async getAll(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const apiKeyRepo = container.resolve<IApiKeyRepository>('ApiKeyRepository');
            const apiKeys = await apiKeyRepo.findAll({ userId: ctxUser?.id });
            return c.json(apiKeys.map(ApiKeyController.toResponse), 200);
        } catch (err: any) {
            console.error('[ApiKeyController.getAll]', err);
            return c.json({ code: 99999, message: err.message || 'Service unavailable' }, 500);
        }
    }

    // GET /v1/api_key_token/:id
    static async getOne(c: Context) {
        try {
            const id = c.req.param('id') || '';
            const apiKeyRepo = container.resolve<IApiKeyRepository>('ApiKeyRepository');
            const apiKey = await apiKeyRepo.findById(id);
            if (!apiKey) return c.json({ code: 40004, message: 'Not found' }, 404);
            return c.json(ApiKeyController.toResponse(apiKey), 200);
        } catch (err: any) {
            console.error('[ApiKeyController.getOne]', err);
            return c.json({ code: 99999, message: err.message || 'Service unavailable' }, 500);
        }
    }

    // PUT /v1/api_key_token/:id
    static async update(c: Context) {
        try {
            const id = c.req.param('id') || '';
            const body = await c.req.json().catch(() => ({})) as any;

            const apiKeyRepo = container.resolve<IApiKeyRepository>('ApiKeyRepository');
            const updateData: any = {};
            if (body.permissions !== undefined) updateData.permissions = body.permissions;
            if (body.expiresAt !== undefined) updateData.expiredAt = new Date(body.expiresAt);

            const updated = await apiKeyRepo.update(id, updateData);
            if (!updated) return c.json({ code: 40004, message: 'Not found' }, 404);
            return c.json(ApiKeyController.toResponse(updated), 200);
        } catch (err: any) {
            console.error('[ApiKeyController.update]', err);
            return c.json({ code: 99999, message: err.message || 'Service unavailable' }, 500);
        }
    }

    // DELETE /v1/api_key_token/:id
    static async delete(c: Context) {
        try {
            const id = c.req.param('id') || '';
            const apiKeyRepo = container.resolve<IApiKeyRepository>('ApiKeyRepository');
            const deleted = await apiKeyRepo.delete(id);
            if (!deleted) return c.json({ code: 40004, message: 'Not found' }, 404);
            return c.json({ message: 'Deleted successfully' }, 200);
        } catch (err: any) {
            console.error('[ApiKeyController.delete]', err);
            return c.json({ code: 99999, message: err.message || 'Service unavailable' }, 500);
        }
    }

    private static toResponse(apiKey: any) {
        return {
            _id: apiKey.id,
            token: apiKey.apiKey,
            name: apiKey.name || '',
            organization_id: apiKey.organizationId,
            user_id: apiKey.userId,
            is_active: apiKey.isActive,
            permissions: apiKey.permissions || {},
            expired_at: apiKey.expiredAt ? new Date(apiKey.expiredAt).toISOString() : null,
            created_at: apiKey.createdAt ? new Date(apiKey.createdAt).toISOString() : null,
            updated_at: apiKey.updatedAt ? new Date(apiKey.updatedAt).toISOString() : null,
        };
    }
}
