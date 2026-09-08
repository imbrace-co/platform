import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository.js';
import { Category } from '../../../domain/entities/Category.js';
import { CreateCategory } from '../../../application/use-cases/category/CreateCategory.js';
import { UpdateCategory } from '../../../application/use-cases/category/UpdateCategory.js';
import { DeleteCategory } from '../../../application/use-cases/category/DeleteCategory.js';
import { RestoreDefaultCategory } from '../../../application/use-cases/category/RestoreDefaultCategory.js';

export class CategoryController {

    private static toCategoryResponse(cat: Category) {
        const effectiveId = cat.referenceId || cat.id;
        return {
            _id: effectiveId,
            id: effectiveId,
            public_id: effectiveId,
            name: cat.name,
            description: cat.description || '',
            apply_to: cat.applyTo || [],
            is_default: cat.isDefault,
            organization_id: cat.organizationId,
            reference_id: cat.referenceId || undefined,
            is_deleted: cat.isDeleted,
            extra: cat.extra || {},
            created_at: cat.createdAt ? new Date(cat.createdAt).toISOString() : null,
            updated_at: cat.updatedAt ? new Date(cat.updatedAt).toISOString() : null,
        };
    }

    // Private (no-auth) GET /v1/organizations/:id/categories — for internal
    // service-to-service hydration (e.g. channel-service decorating message
    // templates with category names). Mirrors the override-dedupe + soft-
    // delete filter the public list does, but skips search/sort/apply_to
    // filtering since callers don't need those.
    static async getOrgCategories(c: Context) {
        try {
            const orgId = c.req.param('id');
            if (!orgId) {
                return c.json({ message: 'Organization id is required', code: 400 }, 400);
            }
            const categoryRepo = container.resolve<ICategoryRepository>('CategoryRepository');
            const all = await categoryRepo.findAllByOrg(orgId);
            const overrideIds = all
                .filter(cat => cat.referenceId)
                .map(cat => cat.referenceId!);
            const filtered = all.filter(cat => {
                if (cat.isDefault && overrideIds.includes(cat.id)) return false;
                if (cat.isDeleted) return false;
                return true;
            });
            const data = filtered.map(cat => CategoryController.toCategoryResponse(cat));
            return c.json({ data }, 200);
        } catch (err: any) {
            console.error('[CategoryController.getOrgCategories]', err);
            return c.json({ message: 'Service unavailable', code: 500 }, 500);
        }
    }

    // GET /v1/categories
    // matches backend: getAll → categoryService.getAll(organization_id, query)
    static async list(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const organizationId = ctxUser?.organizationId;

            if (!organizationId) {
                return c.json({ message: 'Organization id is required', error_code: 'missing_organization_id', code: 400 }, 400);
            }

            const search = c.req.query('search') || '';
            const sort = c.req.query('sort') || '';
            const applyToRaw = c.req.queries('apply_to') || [];

            const categoryRepo = container.resolve<ICategoryRepository>('CategoryRepository');
            const allCategories = await categoryRepo.findAllByOrg(organizationId);

            // Collect override IDs (reference_id values from override categories)
            const overrideIdsList = allCategories
                .filter(cat => cat.referenceId)
                .map(cat => cat.referenceId!);

            // Filter and transform
            let filtered = allCategories.filter(cat => {
                // Remove default categories that have been overridden
                if (cat.isDefault && overrideIdsList.includes(cat.id)) {
                    return false;
                }

                // Apply apply_to filter if provided
                if (applyToRaw.length > 0) {
                    const catApplyTo = (cat.applyTo || []) as string[];
                    return catApplyTo.some(item => applyToRaw.includes(item));
                }

                // Remove deleted categories
                if (cat.isDeleted) {
                    return false;
                }

                return true;
            });

            // Apply search filter
            if (search) {
                const regex = new RegExp(search, 'i');
                filtered = filtered.filter(cat => regex.test(cat.name));
            }

            // Apply custom sort
            if (sort) {
                const sortString = sort.trim();
                const descending = sortString.startsWith('-');
                const sortKey = descending ? sortString.substring(1) : sortString;

                filtered.sort((a: any, b: any) => {
                    // is_default sort direction flips based on custom sort
                    if (a.isDefault !== b.isDefault) {
                        return a.isDefault ? 1 : -1;
                    }
                    const aVal = a[CategoryController.toCamelCase(sortKey)];
                    const bVal = b[CategoryController.toCamelCase(sortKey)];
                    if (aVal < bVal) return descending ? 1 : -1;
                    if (aVal > bVal) return descending ? -1 : 1;
                    return 0;
                });
            }

            const data = filtered.map(cat => CategoryController.toCategoryResponse(cat));
            return c.json({ data }, 200);
        } catch (err: any) {
            console.error(err);
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    // GET /v1/categories/:id
    // matches backend: getCategoryById
    static async get(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const organizationId = ctxUser?.organizationId;
            const id = c.req.param('id');

            if (!organizationId || !id) {
                return c.json({ message: 'Category not found', error_code: 'category_not_found', code: 404 }, 404);
            }

            const categoryRepo = container.resolve<ICategoryRepository>('CategoryRepository');
            const matchedCategories = await categoryRepo.findByIdAndOrg(id, organizationId);

            if (!matchedCategories || matchedCategories.length === 0) {
                return c.json({ message: 'Category not found', error_code: 'category_not_found', code: 404 }, 404);
            }

            const defaultCategory = matchedCategories.find(cat => cat.isDefault);
            const overrideCategory = matchedCategories.find(cat => cat.referenceId);

            let category: Category;

            // Normal one category (no default, no override)
            if (matchedCategories.length > 0 && !defaultCategory && !overrideCategory) {
                category = matchedCategories[0];
            }
            // Override exists and is not deleted
            else if (overrideCategory && !overrideCategory.isDeleted) {
                category = overrideCategory;
            }
            // Default category
            else if (defaultCategory) {
                category = defaultCategory;
            } else {
                return c.json({ message: 'Category not found', error_code: 'category_not_found', code: 404 }, 404);
            }

            return c.json(CategoryController.toCategoryResponse(category), 200);
        } catch (err: any) {
            console.error(err);
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    // POST /v1/categories
    static async create(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const organizationId = ctxUser?.organizationId;
            if (!organizationId) {
                return c.json({ message: 'Organization id is required', error_code: 'missing_organization_id', code: 400 }, 400);
            }

            const body = await c.req.json();
            const useCase = container.resolve(CreateCategory);
            const category = await useCase.execute({
                name: body.name,
                description: body.description,
                applyTo: body.apply_to,
                extra: body.extra,
            }, organizationId);

            return c.json(CategoryController.toCategoryResponse(category), 200);
        } catch (err: any) {
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    // PUT /v1/categories/:id
    static async update(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const organizationId = ctxUser?.organizationId;
            const id = c.req.param('id');
            if (!organizationId || !id) {
                return c.json({ message: 'Category not found', error_code: 'category_not_found', code: 404 }, 404);
            }

            const body = await c.req.json();
            const useCase = container.resolve(UpdateCategory);
            const category = await useCase.execute(id, {
                name: body.name,
                description: body.description,
                applyTo: body.apply_to,
                extra: body.extra,
            }, organizationId);

            const effectiveId = category.referenceId || category.id;
            return c.json({
                ...CategoryController.toCategoryResponse(category),
                _id: effectiveId,
                id: effectiveId,
                public_id: effectiveId,
            }, 200);
        } catch (err: any) {
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    // DELETE /v1/categories/:id
    static async delete(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const organizationId = ctxUser?.organizationId;
            const id = c.req.param('id');
            if (!organizationId || !id) {
                return c.json({ message: 'Category not found', error_code: 'category_not_found', code: 404 }, 404);
            }

            const useCase = container.resolve(DeleteCategory);
            await useCase.execute(id, organizationId);

            return c.json({ message: 'Category deleted successfully', id }, 200);
        } catch (err: any) {
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    // PATCH /v1/categories/restore-default
    static async restoreDefault(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            const organizationId = ctxUser?.organizationId;
            if (!organizationId) {
                return c.json({ message: 'Organization id is required', error_code: 'missing_organization_id', code: 400 }, 400);
            }

            const useCase = container.resolve(RestoreDefaultCategory);
            await useCase.execute(organizationId);

            return c.json({ message: 'Category restored successfully' }, 200);
        } catch (err: any) {
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    private static toCamelCase(snakeStr: string): string {
        return snakeStr.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }
}
