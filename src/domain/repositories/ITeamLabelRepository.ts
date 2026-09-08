import { TeamLabel } from '../entities/TeamLabel.js';

export interface ITeamLabelRepository {
    create(data: Partial<TeamLabel>): Promise<TeamLabel>;
    findById(id: string): Promise<TeamLabel | null>;
    listByTeam(teamId: string, offset: number, limit: number): Promise<TeamLabel[]>;
    countByTeam(teamId: string): Promise<number>;
    update(id: string, data: Partial<TeamLabel>): Promise<TeamLabel | null>;
    delete(id: string): Promise<boolean>;
}
