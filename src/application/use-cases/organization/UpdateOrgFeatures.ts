import { injectable, inject } from 'tsyringe';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { Organization } from '../../../domain/entities/Organization.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

/**
 * Free-tier feature limits, mirroring the legacy backend's
 * OrganizationManager.lockFullFeatures `freeVersionLockFeatures`.
 */
const FREE_VERSION_LOCK_FEATURES = {
    teams: { assign_mode: ['grab'], total: 3 },
    analytics: { widget: { operation: ['create', 'update', 'delete'] } },
    channels: { each_channel_count: 1 },
    credentials: { each_channel_count: 1 },
    workflows: {
        channel_workflow: { count: 1 },
        connector_groups: [],
        connectors: {},
        automation_workflow: { operation: ['active'] },
        data_boards_automation: { operation: ['create'] },
    },
};

/**
 * Port of legacy `updateOrganizationFeatures` (organization_services.js):
 *   - is_active = true  → unlockFullFeatures: is_paid=true,  lock_features unset (null)
 *   - is_active = false → lockFullFeatures:   is_paid=false, lock_features = free limits
 */
@injectable()
export class UpdateOrgFeatures {
    constructor(
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(id: string, isActive: boolean): Promise<Organization> {
        const org = await this.orgRepo.findById(id);
        if (!org) {
            throw new DomainError('Organization not found', 404);
        }

        const updated = await this.orgRepo.update(id, isActive
            ? { isPaid: true, organizationLockFeatures: null }
            : { isPaid: false, organizationLockFeatures: FREE_VERSION_LOCK_FEATURES });

        if (!updated) {
            throw new DomainError('Failed to update organization features', 500);
        }

        return updated;
    }
}
