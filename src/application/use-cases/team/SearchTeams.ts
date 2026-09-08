import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { Team } from '../../../domain/entities/Team.js';
import { DomainError } from '../../../interfaces/http/middleware/error-handler.js';

@injectable()
export class SearchTeams {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
    ) { }

    async execute(organizationId: string, query: string, offset: number = 0, limit: number = 10, businessUnitId?: string, userId?: string): Promise<{ data: Team[], total: number }> {
        if (!query || query.trim() === '') {
            throw new DomainError('Search query is required');
        }

        const keyword = query.trim();

        if (businessUnitId) {
            const [data, total] = await Promise.all([
                this.teamRepo.searchByBusinessUnit(organizationId, businessUnitId, keyword, offset, limit, userId),
                this.teamRepo.countSearchByBusinessUnit(organizationId, businessUnitId, keyword)
            ]);
            return { data, total };
        }

        const [data, total] = await Promise.all([
            this.teamRepo.searchByName(organizationId, keyword, offset, limit, userId),
            this.teamRepo.countSearchByName(organizationId, keyword)
        ]);
        return { data, total };
    }
}
