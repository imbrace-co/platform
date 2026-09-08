import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { IRoleRepository } from '../../../domain/repositories/IRoleRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { generateId } from '../../../shared/utils/id-generator.js';
import { invalidateRoleCache } from '../../../shared/utils/role-cache.js';
import { isSuperadminEmail } from '../../../shared/utils/superadmin.js';
import {
    PERMISSION_GROUPS,
    ALL_PERMISSIONS,
    WILDCARD,
    isValidPermission,
    expandPermissions,
} from '../../../shared/constants/permissions.js';
import { SYSTEM_ROLE_KEYS } from '../../../shared/constants/system-roles.js';
import { getRoleResolved } from '../../../shared/utils/role-cache.js';

const KEY_PATTERN = /^[a-z][a-z0-9_]{1,49}$/;

function toResponse(role: any) {
    return {
        id: role.id,
        organization_id: role.organizationId,
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.permissions ?? [],
        priority: role.priority,
        is_system: role.isSystem,
        is_active: role.isActive,
        created_by: role.createdBy,
        updated_by: role.updatedBy,
        created_at: role.createdAt instanceof Date ? role.createdAt.toISOString() : (role.createdAt ?? null),
        updated_at: role.updatedAt instanceof Date ? role.updatedAt.toISOString() : (role.updatedAt ?? null),
    };
}

export class RoleController {
    private get repo() {
        return container.resolve<IRoleRepository>('RoleRepository');
    }
    private get userRepo() {
        return container.resolve<IUserRepository>('UserRepository');
    }
    private get orgRepo() {
        return container.resolve<IOrganizationRepository>('OrganizationRepository');
    }

    // GET /v1/roles/permissions — the catalog for a UI matrix.
    async permissions(c: Context): Promise<Response> {
        return c.json({
            groups: PERMISSION_GROUPS,
            all: ALL_PERMISSIONS,
            wildcard: WILDCARD,
        });
    }

    // GET /v1/roles/_effective?user_id=&org_id= — consumed by other services.
    async effective(c: Context): Promise<Response> {
        try {
            const ctxUser = c.get('user');
            const userId = c.req.query('user_id') || ctxUser?.id;
            const orgId = c.req.query('org_id') || c.req.query('organization_id') || ctxUser?.organizationId;

            if (!userId || !orgId) {
                return c.json({ code: 40000, message: 'user_id and org_id are required' }, 400);
            }

            const user = await this.userRepo.findById(userId);
            if (!user || user.organizationId !== orgId) {
                return c.json({ code: 40004, message: 'User not found in organization' }, 404);
            }

            const roleKey = (user as any).role || 'user';
            // Cached (~5s TTL) resolution shared with requirePermission / internal endpoint.
            const resolved = await getRoleResolved(orgId, roleKey);
            const isOwner = roleKey === 'owner' || resolved.permissions.includes(WILDCARD);

            return c.json({
                user_id: userId,
                organization_id: orgId,
                role: roleKey,
                is_owner: isOwner,
                permissions: expandPermissions(resolved.permissions),
                roles_version: resolved.version,
            });
        } catch (err: any) {
            console.error('[RoleController.effective]', err);
            return c.json({ code: 99999, message: 'Service unavailable' }, 500);
        }
    }

    // GET /v1/roles
    async index(c: Context): Promise<Response> {
        try {
            const ctxUser = c.get('user');
            const limit = parseInt(c.req.query('limit') || '50');
            const skip = parseInt(c.req.query('skip') || '0');

            await this.repo.ensureSystemRoles(ctxUser.organizationId);
            const data = await this.repo.findByOrganization(ctxUser.organizationId, limit, skip);
            return c.json({
                data: data.items.map(toResponse),
                count: data.count,
                has_more: data.count > skip + limit,
            });
        } catch (err: any) {
            console.error('[RoleController.index]', err);
            return c.json({ code: 99999, message: 'Service unavailable' }, 500);
        }
    }

    // GET /v1/roles/:id
    async showOne(c: Context): Promise<Response> {
        try {
            const ctxUser = c.get('user');
            const { id } = c.req.param();

            const role = await this.repo.findById(id);
            if (!role) {
                return c.json({ code: 40004, message: 'Not found' }, 404);
            }
            if (role.organizationId !== ctxUser.organizationId) {
                return c.json({ code: 40003, message: 'Forbidden, insufficient permission' }, 403);
            }
            return c.json(toResponse(role));
        } catch (err: any) {
            console.error('[RoleController.showOne]', err);
            return c.json({ code: 99999, message: 'Service unavailable' }, 500);
        }
    }

    // POST /v1/roles — create a custom role.
    async create(c: Context): Promise<Response> {
        try {
            const ctxUser = c.get('user');
            const body = await c.req.json();
            const orgId = ctxUser.organizationId;

            const key = (body.key || '').trim();
            const name = (body.name || '').trim();
            const permissions: string[] = Array.isArray(body.permissions) ? body.permissions : [];

            if (!key || !name) {
                return c.json({ code: 40000, message: 'key and name are required' }, 400);
            }
            if (!KEY_PATTERN.test(key)) {
                return c.json({ code: 40000, message: 'key must be a lowercase slug (a-z, 0-9, _), 2-50 chars' }, 400);
            }
            if (SYSTEM_ROLE_KEYS.includes(key)) {
                return c.json({ code: 40000, message: `key '${key}' is reserved for a system role` }, 400);
            }

            const invalid = permissions.filter((p) => p !== WILDCARD && !isValidPermission(p));
            if (invalid.length) {
                return c.json({ code: 40000, message: `Unknown permission(s): ${invalid.join(', ')}` }, 400);
            }
            // Custom roles cannot grant the all-access wildcard.
            const cleanedPermissions = permissions.filter((p) => p !== WILDCARD);

            const existing = await this.repo.findByOrgAndKey(orgId, key);
            if (existing) {
                return c.json({ code: 40000, message: 'A role with this key already exists' }, 400);
            }

            const role = await this.repo.create({
                id: generateId('role'),
                organizationId: orgId,
                key,
                name,
                description: (body.description || '').trim(),
                permissions: cleanedPermissions,
                priority: typeof body.priority === 'number' ? body.priority : 3,
                isSystem: false,
                isActive: true,
                createdBy: ctxUser.id,
            });

            await invalidateRoleCache(orgId, key);
            return c.json(toResponse(role), 201);
        } catch (err: any) {
            console.error('[RoleController.create]', err);
            return c.json({ code: 99999, message: 'Service unavailable' }, 500);
        }
    }

    // PUT /v1/roles/:id — edit name/description/permissions (and priority for custom roles).
    async update(c: Context): Promise<Response> {
        try {
            const ctxUser = c.get('user');
            const { id } = c.req.param();
            const body = await c.req.json();

            const role = await this.repo.findById(id);
            if (!role) {
                return c.json({ code: 40004, message: 'Not found' }, 404);
            }
            if (role.organizationId !== ctxUser.organizationId) {
                return c.json({ code: 40003, message: 'Forbidden, insufficient permission' }, 403);
            }

            const patch: Record<string, any> = { updatedBy: ctxUser.id };

            if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
            if (typeof body.description === 'string') patch.description = body.description.trim();

            if (Array.isArray(body.permissions)) {
                if (role.isSystem && role.key === 'owner') {
                    // Owner stays omnipotent — refuse to narrow below the wildcard.
                    if (!body.permissions.includes(WILDCARD)) {
                        return c.json({ code: 40000, message: "Cannot narrow the owner role's permissions" }, 400);
                    }
                    patch.permissions = [WILDCARD];
                } else {
                    const invalid = body.permissions.filter((p: string) => p !== WILDCARD && !isValidPermission(p));
                    if (invalid.length) {
                        return c.json({ code: 40000, message: `Unknown permission(s): ${invalid.join(', ')}` }, 400);
                    }
                    // Only the owner role may hold the wildcard.
                    patch.permissions = body.permissions.filter((p: string) => p !== WILDCARD);
                }
            }

            // System roles: key / priority / isSystem are immutable.
            if (!role.isSystem) {
                if (typeof body.priority === 'number') patch.priority = body.priority;
                if (typeof body.is_active === 'boolean') patch.isActive = body.is_active;
            } else if (body.key && body.key !== role.key) {
                return c.json({ code: 40000, message: 'Cannot change the key of a system role' }, 400);
            }

            const updated = await this.repo.update(id, patch);
            await invalidateRoleCache(role.organizationId, role.key);
            return c.json(toResponse(updated));
        } catch (err: any) {
            console.error('[RoleController.update]', err);
            return c.json({ code: 99999, message: 'Service unavailable' }, 500);
        }
    }

    // DELETE /v1/roles/:id — block system roles and roles still in use.
    async delete(c: Context): Promise<Response> {
        try {
            const ctxUser = c.get('user');
            const { id } = c.req.param();

            const role = await this.repo.findById(id);
            if (!role) {
                return c.json({ code: 40004, message: 'Not found' }, 404);
            }
            if (role.organizationId !== ctxUser.organizationId) {
                return c.json({ code: 40003, message: 'Forbidden, insufficient permission' }, 403);
            }
            if (role.isSystem) {
                return c.json({ code: 40000, message: 'Cannot delete a system role' }, 400);
            }

            const counts = await this.userRepo.countByRoles(role.organizationId);
            if ((counts[role.key] || 0) > 0) {
                return c.json({ code: 40900, message: `Cannot delete: ${counts[role.key]} user(s) still assigned this role` }, 409);
            }

            await this.repo.deleteById(id);
            await invalidateRoleCache(role.organizationId, role.key);
            return c.json({ success: true, message: 'Role deleted' });
        } catch (err: any) {
            console.error('[RoleController.delete]', err);
            return c.json({ code: 99999, message: 'Service unavailable' }, 500);
        }
    }

    // POST /v1/roles/_sync — re-align THIS org's 4 system roles to the code-defined catalog
    // defaults (UPSERT). Use after a permission-catalog change. WARNING: overwrites manual edits.
    async sync(c: Context): Promise<Response> {
        try {
            const ctxUser = c.get('user');
            const orgId = ctxUser.organizationId;
            await this.repo.syncSystemRoles(orgId);
            await invalidateRoleCache(orgId);
            return c.json({ success: true, organization_id: orgId });
        } catch (err: any) {
            console.error('[RoleController.sync]', err);
            return c.json({ code: 99999, message: 'Service unavailable' }, 500);
        }
    }

    // POST /v1/roles/_sync_system — SUPERADMIN only. Re-align system roles for EVERY org to the
    // catalog defaults (UPSERT). Use once after a catalog change. WARNING: overwrites manual edits.
    async syncSystem(c: Context): Promise<Response> {
        try {
            const ctxUser = c.get('user');
            if (!isSuperadminEmail(ctxUser?.email)) {
                return c.json({ code: 40003, message: 'Forbidden — superadmin only' }, 403);
            }
            const pageSize = 200;
            let offset = 0;
            let synced = 0;
            for (;;) {
                const page = await this.orgRepo.list(offset, pageSize);
                if (!page.length) break;
                for (const org of page) {
                    await this.repo.syncSystemRoles(org.id);
                    await invalidateRoleCache(org.id);
                    synced++;
                }
                if (page.length < pageSize) break;
                offset += page.length;
            }
            return c.json({ success: true, synced });
        } catch (err: any) {
            console.error('[RoleController.syncSystem]', err);
            return c.json({ code: 99999, message: 'Service unavailable' }, 500);
        }
    }
}
