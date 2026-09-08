import { RoleCacheStore, ResolvedRole, cacheKey } from './RoleCacheStore.js';

interface Entry extends ResolvedRole {
    expiresAt: number;
}

/**
 * Default driver: per-instance in-memory cache. Tiny (keyed by org x role),
 * fastest possible lookup, no infra. Not shared across instances — eager
 * `invalidate` only affects this process; other instances rely on the TTL.
 */
export class MemoryRoleCacheStore implements RoleCacheStore {
    private cache = new Map<string, Entry>();

    constructor(private ttlMs: number) {}

    async get(orgId: string, roleKey: string): Promise<ResolvedRole | null> {
        const entry = this.cache.get(cacheKey(orgId, roleKey));
        if (entry && entry.expiresAt > Date.now()) {
            return { permissions: entry.permissions, version: entry.version };
        }
        return null;
    }

    async set(orgId: string, roleKey: string, value: ResolvedRole): Promise<void> {
        this.cache.set(cacheKey(orgId, roleKey), {
            permissions: value.permissions,
            version: value.version,
            expiresAt: Date.now() + this.ttlMs,
        });
    }

    async invalidate(orgId: string, roleKey?: string): Promise<void> {
        if (roleKey) {
            this.cache.delete(cacheKey(orgId, roleKey));
            return;
        }
        const prefix = `${orgId}::`;
        for (const k of this.cache.keys()) {
            if (k.startsWith(prefix)) this.cache.delete(k);
        }
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }
}
