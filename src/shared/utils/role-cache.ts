/**
 * (organizationId, roleKey) -> permissions resolution, cached behind a pluggable
 * backend (memory by default, redis when CACHE_DRIVER=redis).
 *
 * Permission resolution is keyed by role (not user), so a handful of entries serve
 * unlimited users/requests. The short TTL (config.cache.roleTtlMs) gives seconds-
 * level propagation of role edits; mutations also call `invalidateRoleCache`.
 *
 * Resolution falls back to the code-defined SYSTEM_ROLES when no row exists yet
 * (pre-backfill window), so nothing 403s unexpectedly during rollout.
 */
import { container } from '../di/container.js';
import { IRoleRepository } from '../../domain/repositories/IRoleRepository.js';
import { getSystemRole } from '../constants/system-roles.js';
import { config } from '../config/index.js';
import { RoleCacheStore, ResolvedRole } from './cache/RoleCacheStore.js';
import { MemoryRoleCacheStore } from './cache/MemoryRoleCacheStore.js';
import { RedisRoleCacheStore } from './cache/RedisRoleCacheStore.js';

export type { ResolvedRole } from './cache/RoleCacheStore.js';

function createStore(): RoleCacheStore {
    const { driver, redisUrl, roleTtlMs } = config.cache;
    if (driver === 'redis') {
        console.log('[role-cache] using redis driver');
        return new RedisRoleCacheStore(redisUrl, roleTtlMs);
    }
    return new MemoryRoleCacheStore(roleTtlMs);
}

let store: RoleCacheStore = createStore();

/** Override the backing store (tests). */
export function setRoleCacheStore(custom: RoleCacheStore): void {
    store = custom;
}

/**
 * Resolve a role's permissions + version, served from cache when warm.
 * Falls back to SYSTEM_ROLES when no row exists yet (pre-backfill window).
 */
export async function getRoleResolved(orgId: string, roleKey: string): Promise<ResolvedRole> {
    const cached = await store.get(orgId, roleKey);
    if (cached) return cached;

    const repo = container.resolve<IRoleRepository>('RoleRepository');
    const role = await repo.findByOrgAndKey(orgId, roleKey);
    const permissions = role?.permissions ?? getSystemRole(roleKey)?.permissions ?? [];
    const ts = role?.updatedAt ?? role?.createdAt;
    const version = ts ? new Date(ts).getTime() : 0;

    const resolved: ResolvedRole = { permissions, version };
    await store.set(orgId, roleKey, resolved);
    return resolved;
}

/**
 * Resolve a role's stored permission list (may contain the `'*'` wildcard).
 * Returns `[]` only when the role key is unknown to both the DB and SYSTEM_ROLES.
 */
export async function getRolePermissions(orgId: string, roleKey: string): Promise<string[]> {
    return (await getRoleResolved(orgId, roleKey)).permissions;
}

/** Drop cached entries for an org (all roles) or a specific (org, role). */
export function invalidateRoleCache(orgId: string, roleKey?: string): Promise<void> {
    return store.invalidate(orgId, roleKey);
}

/** Test/maintenance helper. */
export function clearRoleCache(): Promise<void> {
    return store.clear();
}
