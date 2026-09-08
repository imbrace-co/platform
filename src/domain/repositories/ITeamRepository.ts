import { Team } from '../entities/Team.js';

export interface ITeamRepository {
    create(team: Partial<Team>): Promise<Team>;
    findById(id: string): Promise<Team | null>;
    findByIds(ids: string[]): Promise<Team[]>;
    update(id: string, data: Partial<Team>): Promise<Team | null>;
    delete(id: string): Promise<boolean>;
    listByOrganization(orgId: string, offset: number, limit: number, userId?: string): Promise<Team[]>;
    countByOrganization(orgId: string): Promise<number>;
    listByBusinessUnit(orgId: string, buId: string, offset: number, limit: number, userId?: string): Promise<Team[]>;
    countByBusinessUnit(orgId: string, buId: string): Promise<number>;
    searchByName(orgId: string, keyword: string, offset: number, limit: number, userId?: string): Promise<Team[]>;
    countSearchByName(orgId: string, keyword: string): Promise<number>;
    searchByBusinessUnit(orgId: string, buId: string, keyword: string, offset: number, limit: number, userId?: string): Promise<Team[]>;
    countSearchByBusinessUnit(orgId: string, buId: string, keyword: string): Promise<number>;
    findByBuAndName(buId: string, name: string): Promise<Team | null>;
    findBuDefaultTeam(buId: string): Promise<Team | null>;
    listAllByOrganization(orgId: string): Promise<Team[]>;
    listByBuAndOrg(buId: string, orgId: string): Promise<Team[]>;
}
