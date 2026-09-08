import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { GetOrganization } from '../../../application/use-cases/organization/GetOrganization.js';
import { UpdateOrganization } from '../../../application/use-cases/organization/UpdateOrganization.js';
import { ListOrganizations } from '../../../application/use-cases/organization/ListOrganizations.js';
import { ListUserOrganizations } from '../../../application/use-cases/organization/ListUserOrganizations.js';
import { UpdateOrgModules } from '../../../application/use-cases/organization/UpdateOrgModules.js';
import { UpdateOrgAISettings } from '../../../application/use-cases/organization/UpdateOrgAISettings.js';
import { UpdateOrgSidebar } from '../../../application/use-cases/organization/UpdateOrgSidebar.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { Organization } from '../../../domain/entities/Organization.js';

export class OrganizationController {
    private static toResponse(org: Organization) {
        return {
            object_name: 'organization',
            id: org.id,
            name: org.name,
            created_at: org.createdAt ? org.createdAt.toISOString() : null,
            updated_at: org.updatedAt ? org.updatedAt.toISOString() : null,
            is_active: org.isActive,
            ai_settings: org.aiSettings && Object.keys(org.aiSettings).length > 0
                ? org.aiSettings
                : { allowed_models: [] }
        };
    }

    private static toUpdateResult(org: Organization) {
        return {
            ai_settings: org.aiSettings && Object.keys(org.aiSettings).length > 0 
                ? org.aiSettings 
                : { allowed_models: [] },
            modules: org.modules || {
                conversation: true,
                databoards: true,
                campaign: false,
                workflows: true,
                channels: true,
                credentials: true,
                analytics: false,
                teams: true,
                member: true,
                templates: true,
                marketplace: true,
                crm: true,
                ideas: true,
                events: true,
                knowledge_hub: true,
                internal_ai_chat: true,
                workflows_v2: true,
                apps: false
            },
            _id: org.id,
            doc_name: 'organization',
            public_id: org.publicId,
            updated_at: org.updatedAt ? org.updatedAt.toISOString() : null,
            created_at: org.createdAt ? org.createdAt.toISOString() : null,
            name: org.name,
            is_active: org.isActive,
            is_paid: org.isPaid,
            icon_url: org.iconUrl || '',
            partition: org.partition || 0,
            apps: org.apps || [],
            id: org.id
        };
    }

    static async create(c: Context) {
        return c.json({ code: 40003, message: 'Organization creation is disabled' }, 403);
    }

    static async createAws(c: Context) {
        return c.json({ code: 40003, message: 'Organization creation is disabled' }, 403);
    }

    static async get(c: Context) {
        const id = c.req.param('id') || c.req.header('x-organization-id');
        if (!id) return c.json({ error: 'Organization ID is required' }, 400);
        const useCase = container.resolve(GetOrganization);
        const org = await useCase.execute(id);
        if (!org) return c.json({ error: 'Organization not found' }, 404);
        return c.json({ data: OrganizationController.toResponse(org) });
    }

    static async list(c: Context) {
        const skip = Number(c.req.query('skip')) || 0;
        const limit = Number(c.req.query('limit')) || 10;
        const useCase = container.resolve(ListOrganizations);
        const { data: orgs, total } = await useCase.execute(skip, limit);

        return c.json({
            object_name: 'list',
            data: orgs.map(org => OrganizationController.toResponse(org)),
            nested: {},
            has_more: Number(total) >= (skip + limit),
            count: Number(total),
            total: orgs.length
        });
    }

    static async listAll(c: Context) {
        const user = c.get('user') as any;
        const email = user?.email;
        if (!email) {
            return c.json({ error: 'User email is required' }, 401);
        }

        const useCase = container.resolve(ListUserOrganizations);
        // limit 0 means fetch all according to our update in ListUserOrganizations
        const { data: orgs, dbCount, pageRecordCount } = await useCase.execute(email, 0, 0);

        return c.json({
            object_name: 'list',
            data: orgs.map(org => OrganizationController.toResponse(org)),
            nested: {},
            has_more: false,
            count: 0,
            total: 0
        });
    }

    static async indexV2(c: Context) {
        const email = c.req.header('x-user-email') || (c.get('user') as any)?.email;
        if (!email) {
            return c.json({ error: 'User email is required' }, 401);
        }

        // Backend matches limit/skip from query or headers in some cases, 
        // and has a global cap of 100 for this endpoint.
        const skipStr = c.req.header('skip') || c.req.query('skip') || '0';
        const limitStr = c.req.header('limit') || c.req.query('limit') || '10';
        
        const skip = parseInt(skipStr, 10) || 0;
        // Backend OrganizationController.js line 134: Math.min(Math.max(parseInt(query.limit) || 10, 1), 100)
        let limit = parseInt(limitStr, 10) || 10;
        limit = Math.min(Math.max(limit, 1), 100);

        const useCase = container.resolve(ListUserOrganizations);
        const { data: orgs, dbCount, pageRecordCount } = await useCase.execute(email, skip, limit);

        return c.json({
            object_name: 'list',
            data: orgs.map(org => OrganizationController.toResponse(org)),
            nested: {},
            has_more: Number(dbCount) > (skip + limit),
            count: Number(dbCount),
            total: pageRecordCount
        });
    }

    static async update(c: Context) {
        const id = c.req.param('id') || c.req.header('x-organization-id');
        if (!id) return c.json({ error: 'Organization ID is required' }, 400);
        const input = await c.req.json();

        // Reject name changes to non-default values; treat 'default' as no-op
        if ('name' in input) {
            if (input.name !== 'default') {
                return c.json({ message: 'Organization name is fixed' }, 400);
            }
            // name equals 'default' — remove it so it's a no-op for the name field
            delete input.name;
        }

        const useCase = container.resolve(UpdateOrganization);
        const org = await useCase.execute(id, input);
        if (!org) return c.json({ error: 'Organization not found' }, 404);
        return c.json({ data: OrganizationController.toResponse(org) });
    }

    static async updateModules(c: Context) {
        const id = c.req.param('id') || c.req.header('x-organization-id');
        if (!id) return c.json({ error: 'Organization ID is required' }, 400);
        const { modules } = await c.req.json();
        const useCase = container.resolve(UpdateOrgModules);
        const org = await useCase.execute(id, modules);
        if (!org) return c.json({ error: 'Organization not found' }, 404);
        return c.json({ data: OrganizationController.toResponse(org) });
    }

    static async updateAiSettings(c: Context) {
        const id = c.req.param('id') || c.req.header('x-organization-id');
        if (!id) return c.json({ error: 'Organization ID is required' }, 400);
        const { aiSettings } = await c.req.json();
        const useCase = container.resolve(UpdateOrgAISettings);
        const org = await useCase.execute(id, aiSettings);
        if (!org) return c.json({ error: 'Organization not found' }, 404);
        return c.json({ data: OrganizationController.toResponse(org) });
    }

    /**
     * Matches backend's raw MongoDB document format from
     * repositories.organization.findById(orgId)
     */
    private static toRawDocument(org: Organization) {
        return {
            _id: org.id,
            doc_name: 'organization',
            public_id: org.publicId,
            name: org.name,
            icon_url: org.iconUrl || '',
            created_at: org.createdAt ? org.createdAt.toISOString() : '',
            updated_at: org.updatedAt ? org.updatedAt.toISOString() : '',
            is_paid: org.isPaid,
            ai_settings: org.aiSettings || { providers: [] },
            modules: org.modules || {},
            sidebar: org.sidebar || null,
            partition: org.partition || 0,
            is_active: org.isActive,
            organization_lock_features: org.organizationLockFeatures || [],
            apps: org.apps || [],
        };
    }

    static async isPaidUser(c: Context) {
        try {
            const orgId = c.req.param('id');
            if (!orgId) throw new Error('Organization not found');
            const orgRepo = container.resolve<IOrganizationRepository>('OrganizationRepository');
            const org = await orgRepo.findByIdIncludeInactive(orgId);
            const isPaid = Boolean(org?.isPaid || (org?.partition && org?.partition !== 0));
            return c.json({
                organization_id: org?.id,
                is_paid_user: isPaid,
                partition: org?.partition,
            });
        } catch (error: any) {
            console.error('Error in checking if user paid', error);
            return c.json({ message: 'Error in checking if user paid', error: error.message }, 500);
        }
    }

    static async getAccount(c: Context) {
        try {
            const orgId = c.req.param('id');
            if (!orgId) return c.json(null);
            const orgRepo = container.resolve<IOrganizationRepository>('OrganizationRepository');
            const organization = await orgRepo.findByIdIncludeInactive(orgId);
            return c.json(organization ? OrganizationController.toRawDocument(organization) : null);
        } catch (error: any) {
            console.error('Error in getAccount', error);
            return c.json({ message: 'Error in getAccount', error: error.message }, 500);
        }
    }

    static async updateSidebar(c: Context) {
        const id = c.req.param('id') || c.req.header('x-organization-id');
        if (!id) return c.json({ error: 'Organization ID is required' }, 400);
        const { sidebar } = await c.req.json();
        const useCase = container.resolve(UpdateOrgSidebar);
        const org = await useCase.execute(id, sidebar);
        if (!org) return c.json({ error: 'Organization not found' }, 404);
        return c.json({ data: OrganizationController.toResponse(org) });
    }

    static async getSidebar(c: Context) {
        const orgId = c.req.header('x-organization-id');
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);
        const orgRepo = container.resolve<IOrganizationRepository>('OrganizationRepository');
        const org = await orgRepo.findByIdIncludeInactive(orgId);
        if (!org) return c.json({ error: 'Organization not found' }, 404);
        // Return bare sidebar object to match the legacy backend response shape
        // (admin-portal reads keys directly off the response).
        return c.json(org.sidebar ?? null);
    }

    static async getAiSettings(c: Context) {
        const orgId = c.req.header('x-organization-id');
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);
        const orgRepo = container.resolve<IOrganizationRepository>('OrganizationRepository');
        const org = await orgRepo.findByIdIncludeInactive(orgId);
        if (!org) return c.json({ error: 'Organization not found' }, 404);
        // Return bare ai_settings object to match the legacy backend response
        // shape (chat-ai workflow_agent/utils.models read `allowed_models` etc.
        // directly off the top-level response).
        return c.json(org.aiSettings ?? { providers: [] });
    }
}
