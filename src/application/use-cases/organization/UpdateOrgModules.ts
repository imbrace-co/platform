import { injectable, inject } from 'tsyringe';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { Organization } from '../../../domain/entities/Organization.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

@injectable()
export class UpdateOrgModules {
    constructor(
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(id: string, modules: any): Promise<Organization> {
        const org = await this.orgRepo.findById(id);
        if (!org) {
            throw new DomainError('Organization not found', 404);
        }

        const updatedOrg = await this.orgRepo.update(id, { modules });
        if (!updatedOrg) {
            throw new DomainError('Failed to update organization modules', 500);
        }

        // TODO: Log audit event

        return updatedOrg;
    }
}
