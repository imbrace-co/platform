import { injectable, inject } from 'tsyringe';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository.js';
import { generateId } from '../../../shared/utils/id-generator.js';

@injectable()
export class DeleteCategory {
    constructor(
        @inject('CategoryRepository') private categoryRepo: ICategoryRepository,
    ) {}

    async execute(id: string, organizationId: string): Promise<void> {
        const matched = await this.categoryRepo.findByIdAndOrg(id, organizationId);
        if (!matched || matched.length === 0) {
            throw Object.assign(new Error('Category not found'), { code: 404, error_code: 'category_not_found' });
        }

        const defaultCategory = matched.find(c => c.isDefault);
        const overrideCategory = matched.find(c => c.referenceId);

        let current = matched[0];
        if (overrideCategory && !overrideCategory.isDeleted) {
            current = overrideCategory;
        } else if (defaultCategory) {
            current = defaultCategory;
        }

        if (current.isDefault) {
            // Create override record with is_deleted = true to "shadow" the default
            await this.categoryRepo.create({
                id: generateId('cat'),
                publicId: generateId('pub'),
                name: current.name,
                description: current.description,
                applyTo: current.applyTo,
                extra: current.extra,
                organizationId,
                referenceId: id,
                isDefault: false,
                isDeleted: true,
            });
            return;
        }

        if (current.referenceId) {
            // Soft delete the override
            await this.categoryRepo.softDelete(current.id, organizationId);
            return;
        }

        // Hard delete regular category
        await this.categoryRepo.hardDelete(current.id);
    }
}
