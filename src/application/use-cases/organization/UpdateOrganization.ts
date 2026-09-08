import { injectable, inject } from 'tsyringe';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { Organization } from '../../../domain/entities/Organization.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

export interface UpdateOrganizationDTO {
    name?: string;
    iconUrl?: string;
    isPaid?: boolean;
}

@injectable()
export class UpdateOrganization {
    constructor(
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(id: string, input: UpdateOrganizationDTO): Promise<Organization> {
        const org = await this.orgRepo.findById(id);
        if (!org) {
            throw new DomainError('Organization not found', 404);
        }

        const updateData: Partial<Organization> = {
            ...input,
            updatedAt: new Date(),
        };

        const updatedOrg = await this.orgRepo.update(id, updateData);
        if (!updatedOrg) {
            throw new DomainError('Failed to update organization', 500);
        }

        // TODO: Log audit event

        return updatedOrg;
    }
}
