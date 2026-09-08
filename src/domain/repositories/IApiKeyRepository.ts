import { ApiKey } from '../entities/ApiKey.js';

export interface IApiKeyRepository {
    create(data: Partial<ApiKey>): Promise<ApiKey>;
    findById(id: string): Promise<ApiKey | null>;
    findAll(filter: { userId?: string; organizationId?: string }): Promise<ApiKey[]>;
    update(id: string, data: Partial<ApiKey>): Promise<ApiKey | null>;
    delete(id: string): Promise<boolean>;
}
