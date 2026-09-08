import { injectable, inject } from 'tsyringe';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository.js';

@injectable()
export class RestoreDefaultCategory {
    constructor(
        @inject('CategoryRepository') private categoryRepo: ICategoryRepository,
    ) {}

    async execute(organizationId: string): Promise<void> {
        if (!organizationId) {
            throw Object.assign(new Error('Organization id is required'), { code: 400, error_code: 'missing_organization_id' });
        }
        // Remove all override categories (those with reference_id) for this org
        await this.categoryRepo.deleteOverridesByOrg(organizationId);
    }
}
