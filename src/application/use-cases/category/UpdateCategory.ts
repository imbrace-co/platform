import { injectable, inject } from 'tsyringe';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository.js';
import { Category } from '../../../domain/entities/Category.js';
import { generateId } from '../../../shared/utils/id-generator.js';

export interface UpdateCategoryDTO {
    name?: string;
    description?: string;
    applyTo?: string[];
    extra?: Record<string, any>;
}

@injectable()
export class UpdateCategory {
    constructor(
        @inject('CategoryRepository') private categoryRepo: ICategoryRepository,
    ) {}

    async execute(id: string, input: UpdateCategoryDTO, organizationId: string): Promise<Category> {
        if (!organizationId) {
            throw Object.assign(new Error('Organization id is required'), { code: 400, error_code: 'missing_organization_id' });
        }

        if (input.name) {
            await this.validate(organizationId, input.name);
        }

        // Resolve current category (handles default/override logic same as getCategoryById)
        const matched = await this.categoryRepo.findByIdAndOrg(id, organizationId);
        if (!matched || matched.length === 0) {
            throw Object.assign(new Error('Category not found'), { code: 404, error_code: 'category_not_found' });
        }

        const defaultCategory = matched.find(c => c.isDefault);
        const overrideCategory = matched.find(c => c.referenceId);

        let current: Category;
        if (matched.length > 0 && !defaultCategory && !overrideCategory) {
            current = matched[0];
        } else if (overrideCategory && !overrideCategory.isDeleted) {
            current = overrideCategory;
        } else if (defaultCategory) {
            current = defaultCategory;
        } else {
            throw Object.assign(new Error('Category not found'), { code: 404, error_code: 'category_not_found' });
        }

        // If updating a default category → create override record
        if (current.isDefault) {
            const overrideData: Partial<Category> = {
                id: generateId('cat'),
                publicId: generateId('pub'),
                name: input.name ?? current.name,
                description: input.description ?? current.description,
                applyTo: input.applyTo ?? current.applyTo,
                extra: input.extra ?? current.extra,
                organizationId,
                referenceId: id,
                isDefault: false,
                isDeleted: false,
            };
            return this.categoryRepo.create(overrideData);
        }

        // Normal update
        const updated = await this.categoryRepo.update(current.id, organizationId, {
            name: input.name,
            description: input.description,
            applyTo: input.applyTo,
            extra: input.extra,
        });

        if (!updated) {
            throw Object.assign(new Error('Category not found'), { code: 404, error_code: 'category_not_found' });
        }

        return updated;
    }

    private async validate(organizationId: string, name: string): Promise<void> {
        const existing = await this.categoryRepo.findByNameAndOrg(name, organizationId);

        const defaultCategory = existing.find(c => c.isDefault && !c.isDeleted);
        if (defaultCategory) {
            const isDefaultDeleted = existing.find(c => c.referenceId === defaultCategory.id && c.isDeleted);
            if (!isDefaultDeleted) {
                throw Object.assign(new Error('Default Category already exists'), { code: 400, error_code: 'category_already_exists' });
            }
        }

        if (existing.some(c => !c.isDefault && !c.isDeleted)) {
            throw Object.assign(new Error('Category already exists'), { code: 400, error_code: 'category_already_exists' });
        }
    }
}
