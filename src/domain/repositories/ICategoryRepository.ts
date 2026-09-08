import { Category } from '../entities/Category.js';

export interface ICategoryRepository {
    findAllByOrg(orgId: string): Promise<Category[]>;
    findByIdAndOrg(id: string, orgId: string): Promise<Category[]>;
    create(data: Partial<Category>): Promise<Category>;
    update(id: string, orgId: string, data: Partial<Category>): Promise<Category | null>;
    softDelete(id: string, orgId: string): Promise<void>;
    hardDelete(id: string): Promise<void>;
    findByNameAndOrg(name: string, orgId: string): Promise<Category[]>;
    deleteOverridesByOrg(orgId: string): Promise<void>;
}
