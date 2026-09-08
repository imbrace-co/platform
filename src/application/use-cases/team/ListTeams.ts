import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { Team } from '../../../domain/entities/Team.js';

@injectable()
export class ListTeams {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
    ) { }

    async execute(organizationId: string, offset: number = 0, limit: number = 10, businessUnitId?: string, userId?: string): Promise<{ data: Team[], total: number }> {
        if (businessUnitId) {
            const [data, total] = await Promise.all([
                this.teamRepo.listByBusinessUnit(organizationId, businessUnitId, offset, limit, userId),
                this.teamRepo.countByBusinessUnit(organizationId, businessUnitId)
            ]);
            return { data, total };
        }
        const [data, total] = await Promise.all([
            this.teamRepo.listByOrganization(organizationId, offset, limit, userId),
            this.teamRepo.countByOrganization(organizationId)
        ]);
        return { data, total };
    }
}
