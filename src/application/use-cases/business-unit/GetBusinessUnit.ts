import { injectable, inject } from 'tsyringe';
import { IBusinessUnitRepository } from '../../../domain/repositories/IBusinessUnitRepository.js';
import { BusinessUnit } from '../../../domain/entities/BusinessUnit.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

@injectable()
export class GetBusinessUnit {
    constructor(
        @inject('BusinessUnitRepository') private buRepo: IBusinessUnitRepository,
    ) { }

    async execute(organizationId: string, id: string): Promise<BusinessUnit> {
        const bu = await this.buRepo.findById(id);
        if (!bu || bu.organizationId !== organizationId) {
            throw new DomainError('Business Unit not found', 404);
        }
        return bu;
    }
}
