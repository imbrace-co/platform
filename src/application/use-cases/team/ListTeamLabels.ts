import { injectable, inject } from 'tsyringe';
import { ITeamLabelRepository } from '../../../domain/repositories/ITeamLabelRepository.js';
import { TeamLabel } from '../../../domain/entities/TeamLabel.js';

@injectable()
export class ListTeamLabels {
    constructor(
        @inject('TeamLabelRepository') private teamLabelRepo: ITeamLabelRepository,
    ) { }

    async execute(teamId: string, offset: number, limit: number): Promise<{ items: TeamLabel[]; count: number }> {
        const [items, count] = await Promise.all([
            this.teamLabelRepo.listByTeam(teamId, offset, limit),
            this.teamLabelRepo.countByTeam(teamId),
        ]);
        return { items, count };
    }
}
