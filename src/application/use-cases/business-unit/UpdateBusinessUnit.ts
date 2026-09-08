import { injectable, inject } from 'tsyringe';
import { IBusinessUnitRepository } from '../../../domain/repositories/IBusinessUnitRepository.js';
import { BusinessUnit } from '../../../domain/entities/BusinessUnit.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

export interface UpdateBusinessUnitDTO {
    name: string;
}

@injectable()
export class UpdateBusinessUnit {
    constructor(
        @inject('BusinessUnitRepository') private buRepo: IBusinessUnitRepository,
    ) { }

    async execute(organizationId: string, id: string, input: UpdateBusinessUnitDTO): Promise<BusinessUnit> {
        const bu = await this.buRepo.findById(id);
        if (!bu || bu.organizationId !== organizationId) {
            throw new DomainError('Business Unit not found', 404);
        }

        const updatedBu = await this.buRepo.update(id, { name: input.name });
        if (!updatedBu) {
            throw new DomainError('Failed to update business unit', 500);
        }

        return updatedBu;
    }
}
