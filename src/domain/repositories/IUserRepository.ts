import { User } from '../entities/User.js';

export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(orgId: string, email: string): Promise<User | null>;
    listByOrganization(orgId: string, offset: number, limit: number, filters?: {
        roles?: string[];
        status?: string[];
        search?: string;
        team_ids?: string[];
    }): Promise<User[]>;
    listByEmail(email: string, offset: number, limit: number): Promise<User[]>;
    listDistinctOrganizationIdsByEmail(email: string): Promise<string[]>;
    countByOrganization(orgId: string, filters?: any): Promise<number>;
    countByEmail(email: string): Promise<number>;
    countByRoles(orgId: string): Promise<Record<string, number>>;
    update(id: string, data: Partial<User>): Promise<User | null>;
    create(data: Partial<User>): Promise<User>;
    listV2(params: {
        limit: number;
        skip: number;
        sort: string;
        selector: Record<string, string>;
    }): Promise<{ items: User[]; count: number }>;
}
