import { injectable, inject } from 'tsyringe';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { Organization } from '../../../domain/entities/Organization.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

@injectable()
export class UpdateOrgAISettings {
    constructor(
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(id: string, aiSettings: any): Promise<Organization> {
        const org = await this.orgRepo.findById(id);
        if (!org) {
            throw new DomainError('Organization not found', 404);
        }

        const updatedOrg = await this.orgRepo.update(id, { aiSettings });
        if (!updatedOrg) {
            throw new DomainError('Failed to update organization AI settings', 500);
        }

        // TODO: Log audit event

        return updatedOrg;
    }
}
