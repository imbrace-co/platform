import { injectable, inject } from 'tsyringe';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { Organization } from '../../../domain/entities/Organization.js';

@injectable()
export class ListOrganizations {
    constructor(
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(_offset: number = 0, _limit: number = 10): Promise<{ data: Organization[], total: number }> {
        // Single-tenant mode: return only the "default" organization (at most one result)
        const defaultOrg = await this.orgRepo.findByName('default');
        if (defaultOrg) {
            return { data: [defaultOrg], total: 1 };
        }
        return { data: [], total: 0 };
    }
}
