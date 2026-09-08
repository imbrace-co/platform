import { injectable, inject } from 'tsyringe';
import { IBusinessUnitRepository } from '../../../domain/repositories/IBusinessUnitRepository.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { BusinessUnit } from '../../../domain/entities/BusinessUnit.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';
import { generateId } from '../../../shared/utils/id-generator.js';

export interface CreateBusinessUnitDTO {
    organizationId: string;
    name: string;
}

@injectable()
export class CreateBusinessUnit {
    constructor(
        @inject('BusinessUnitRepository') private buRepo: IBusinessUnitRepository,
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
    ) { }

    async execute(input: CreateBusinessUnitDTO): Promise<BusinessUnit> {
        if (!input.name || !input.organizationId) {
            throw new DomainError('Organization ID and Name are required');
        }

        const org = await this.orgRepo.findById(input.organizationId);
        if (!org) {
            throw new DomainError('Organization not found', 404);
        }

        const buData: Partial<BusinessUnit> = {
            id: generateId('bu'),
            organizationId: input.organizationId,
            name: input.name,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        return this.buRepo.create(buData);
    }
}
