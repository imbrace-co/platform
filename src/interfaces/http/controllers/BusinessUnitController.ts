import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { GetBusinessUnit } from '../../../application/use-cases/business-unit/GetBusinessUnit.js';
import { ListBusinessUnits } from '../../../application/use-cases/business-unit/ListBusinessUnits.js';
import { BusinessUnit } from '../../../domain/entities/BusinessUnit.js';

export class BusinessUnitController {
    private static toResponse(bu: BusinessUnit) {
        return {
            object_name: 'business_unit',
            id: bu.publicId || bu.id,
            public_id: bu.publicId || null,
            organization_id: bu.organizationId,
            name: bu.name,
            created_at: bu.createdAt ? bu.createdAt.toISOString() : null,
            updated_at: bu.updatedAt ? bu.updatedAt.toISOString() : null
        };
    }

    static async create(c: Context) {
        return c.json({ code: 40003, message: 'Business unit creation is disabled' }, 403);
    }

    static async get(c: Context) {
        const orgId = c.req.header('x-organization-id');
        const buId = c.req.param('id') || c.req.header('x-business-unit-id');
        if (!orgId || !buId) return c.json({ error: 'Org and BU IDs are required' }, 400);
        const useCase = container.resolve(GetBusinessUnit);
        const bu = await useCase.execute(orgId, buId);
        if (!bu) return c.json({ error: 'Business Unit not found' }, 404);
        return c.json({ data: BusinessUnitController.toResponse(bu) });
    }

    static async list(c: Context) {
        const user = c.get('user');
        const orgId = c.req.header('x-organization-id') || user?.organizationId;
        if (!orgId) return c.json({ error: 'x-organization-id header is required' }, 400);
        const userId = user?.id;

        const query = c.req.query();
        const skip = parseInt(query.skip || '0', 10) || 0;
        let limit = parseInt(query.limit || '10', 10) || 10;
        if (limit > 100) limit = 100;

        const useCase = container.resolve(ListBusinessUnits);
        const { data, total } = await useCase.execute(orgId, skip, limit, userId);
        return c.json({
            object_name: 'list',
            data: data.map(bu => BusinessUnitController.toResponse(bu)),
            nested: {},
            has_more: Number(total) >= (skip + limit),
            count: Number(total),
            total: data.length
        });
    }

    static async update(c: Context) {
        return c.json({ code: 40003, message: 'Business unit modification is disabled' }, 403);
    }

    static async delete(c: Context) {
        return c.json({ code: 40003, message: 'Cannot delete the default business unit' }, 403);
    }
}
