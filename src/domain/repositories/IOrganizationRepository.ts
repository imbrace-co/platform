import { Organization } from '../entities/Organization.js';

export interface IOrganizationRepository {
    create(org: Partial<Organization>): Promise<Organization>;
    findById(id: string): Promise<Organization | null>;
    findByIdIncludeInactive(id: string): Promise<Organization | null>;
    findByName(name: string): Promise<Organization | null>;
    findByPublicId(publicId: string): Promise<Organization | null>;
    update(id: string, data: Partial<Organization>): Promise<Organization | null>;
    delete(id: string): Promise<boolean>;
    list(offset: number, limit: number): Promise<Organization[]>;
    listByIds(ids: string[]): Promise<Organization[]>;
    count(): Promise<number>;
}
