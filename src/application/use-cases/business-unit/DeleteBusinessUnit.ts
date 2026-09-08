import { injectable, inject } from 'tsyringe';
import { IBusinessUnitRepository } from '../../../domain/repositories/IBusinessUnitRepository.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

@injectable()
export class DeleteBusinessUnit {
    constructor(
        @inject('BusinessUnitRepository') private buRepo: IBusinessUnitRepository,
    ) { }

    async execute(organizationId: string, id: string): Promise<boolean> {
        const bu = await this.buRepo.findById(id);
        if (!bu || bu.organizationId !== organizationId) {
            throw new DomainError('Business Unit not found', 404);
        }

        // TODO: Need to check if there are teams associated with this BU before deleting. Let's ignore it for now or assume cascade/app logic.
        return this.buRepo.delete(id);
    }
}
