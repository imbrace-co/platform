import { injectable, inject } from 'tsyringe';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { Organization } from '../../../domain/entities/Organization.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

@injectable()
export class GetOrganization {
    constructor(
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(id: string): Promise<Organization> {
        const org = await this.orgRepo.findById(id);
        if (!org) {
            throw new DomainError('Organization not found', 404);
        }
        return org;
    }
}
