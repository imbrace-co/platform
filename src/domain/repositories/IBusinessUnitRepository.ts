import { BusinessUnit } from '../entities/BusinessUnit.js';

export interface IBusinessUnitRepository {
    create(bu: Partial<BusinessUnit>): Promise<BusinessUnit>;
    findById(id: string): Promise<BusinessUnit | null>;
    findByIdOrPublicId(idOrPublicId: string): Promise<BusinessUnit | null>;
    update(id: string, data: Partial<BusinessUnit>): Promise<BusinessUnit | null>;
    delete(id: string): Promise<boolean>;
    listByOrganization(orgId: string, offset: number, limit: number): Promise<BusinessUnit[]>;
    countByOrganization(orgId: string): Promise<number>;
    findByIds(ids: string[]): Promise<BusinessUnit[]>;
    findFirstByOrganization(orgId: string): Promise<BusinessUnit | null>;
}
