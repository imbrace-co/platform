import { injectable, inject } from 'tsyringe';
import { IBusinessUnitRepository } from '../../../domain/repositories/IBusinessUnitRepository.js';
import { IBusinessUnitUserRepository } from '../../../domain/repositories/IBusinessUnitUserRepository.js';
import { BusinessUnit } from '../../../domain/entities/BusinessUnit.js';

@injectable()
export class ListBusinessUnits {
    constructor(
        @inject('BusinessUnitRepository') private buRepo: IBusinessUnitRepository,
        @inject('BusinessUnitUserRepository') private buUserRepo: IBusinessUnitUserRepository,
    ) { }

    async execute(organizationId: string, skip: number = 0, limit: number = 10, userId?: string): Promise<{ data: BusinessUnit[], total: number }> {
        // Cap to at most 1 BU per organization (single-tenant constraint)
        const cappedLimit = 1;

        if (userId) {
            const buUsers = await this.buUserRepo.listByUser(userId, 0, cappedLimit);
            if (buUsers.length === 0) return { data: [], total: 0 };

            const ids = buUsers.map(buu => buu.businessUnitId);
            const data = await this.buRepo.findByIds(ids);
            return { data: data.slice(0, cappedLimit), total: Math.min(data.length, cappedLimit) };
        }

        const data = await this.buRepo.listByOrganization(organizationId, 0, cappedLimit);
        return { data, total: data.length };
    }
}
