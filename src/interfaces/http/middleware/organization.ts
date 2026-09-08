import { Context, Next } from 'hono';
import { container } from '../../../shared/di/container.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';

export const organizationMiddleware = async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user || !user.organizationId) {
        return c.json({
            code: 40001,
            message: 'Unauthorized'
        }, 401);
    }

    try {
        const orgRepo = container.resolve<IOrganizationRepository>('OrganizationRepository');
        const organization = await orgRepo.findById(user.organizationId);

        if (!organization) {
            return c.json({
                code: 40010,
                message: 'Organization not found'
            }, 404);
        }

        c.set('organization', organization);
        await next();
    } catch (error) {
        console.error('Organization middleware error:', error);
        return c.json({
            code: 99999,
            message: 'Internal server error'
        }, 500);
    }
};
