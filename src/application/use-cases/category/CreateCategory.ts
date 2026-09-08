import { injectable, inject } from 'tsyringe';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository.js';
import { Category } from '../../../domain/entities/Category.js';
import { generateId } from '../../../shared/utils/id-generator.js';

export interface CreateCategoryDTO {
    name: string;
    description?: string;
    applyTo?: string[];
    extra?: Record<string, any>;
}

@injectable()
export class CreateCategory {
    constructor(
        @inject('CategoryRepository') private categoryRepo: ICategoryRepository,
    ) {}

    async execute(input: CreateCategoryDTO, organizationId: string): Promise<Category> {
        if (!organizationId) {
            throw Object.assign(new Error('Organization id is required'), { code: 400, error_code: 'missing_organization_id' });
        }

        // Default categories cannot be created via API
        await this.validate(organizationId, input.name);

        const data: Partial<Category> = {
            id: generateId('cat'),
            publicId: generateId('pub'),
            name: input.name,
            description: input.description || null,
            applyTo: input.applyTo || [],
            isDefault: false,
            organizationId,
            referenceId: null,
            isDeleted: false,
            extra: input.extra || {},
        };

        return this.categoryRepo.create(data);
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
