import { RoleCacheStore, ResolvedRole } from './RoleCacheStore.js';

const KEY_PREFIX = 'rolecache:';

/**
 * Shared driver: Redis-backed cache. Lookups cross a network hop but are shared
 * across all instances, and `invalidate` clears the entry fleet-wide for instant
 * propagation. `ioredis` is imported lazily so the package is only required when
 * CACHE_DRIVER=redis. Fails open: on any Redis error, reads return null and the
 * caller falls back to the database.
 */
export class RedisRoleCacheStore implements RoleCacheStore {
    private clientPromise: Promise<any> | null = null;

    constructor(private url: string, private ttlMs: number) {}

    private async client(): Promise<any> {
        if (!this.clientPromise) {
            this.clientPromise = (async () => {
                const mod: any = await import('ioredis');
                const Redis = mod.default || mod;
                const client = new Redis(this.url, { maxRetriesPerRequest: 2, lazyConnect: false });
                client.on('error', (e: any) => console.error('[RedisRoleCacheStore] redis error', e?.message || e));
                return client;
            })();
        }
        return this.clientPromise;
    }

    private redisKey(orgId: string, roleKey: string) {
        return `${KEY_PREFIX}${orgId}::${roleKey}`;
    }

    async get(orgId: string, roleKey: string): Promise<ResolvedRole | null> {
        try {
            const c = await this.client();
            const raw = await c.get(this.redisKey(orgId, roleKey));
            return raw ? (JSON.parse(raw) as ResolvedRole) : null;
        } catch (e: any) {
            console.error('[RedisRoleCacheStore.get]', e?.message || e);
            return null; // fail open -> DB
        }
    }

    async set(orgId: string, roleKey: string, value: ResolvedRole): Promise<void> {
        try {
            const c = await this.client();
            await c.set(this.redisKey(orgId, roleKey), JSON.stringify(value), 'PX', this.ttlMs);
        } catch (e: any) {
            console.error('[RedisRoleCacheStore.set]', e?.message || e);
        }
    }

    async invalidate(orgId: string, roleKey?: string): Promise<void> {
        try {
            const c = await this.client();
            if (roleKey) {
                await c.del(this.redisKey(orgId, roleKey));
                return;
            }
            // Org-wide: scan + delete matching keys (only runs on role mutations).
            const match = `${KEY_PREFIX}${orgId}::*`;
            let cursor = '0';
            do {
                const [next, keys] = await c.scan(cursor, 'MATCH', match, 'COUNT', 100);
                cursor = next;
                if (keys.length) await c.del(...keys);
            } while (cursor !== '0');
        } catch (e: any) {
            console.error('[RedisRoleCacheStore.invalidate]', e?.message || e);
        }
    }

    async clear(): Promise<void> {
        try {
            const c = await this.client();
            let cursor = '0';
            do {
                const [next, keys] = await c.scan(cursor, 'MATCH', `${KEY_PREFIX}*`, 'COUNT', 100);
                cursor = next;
                if (keys.length) await c.del(...keys);
            } while (cursor !== '0');
        } catch (e: any) {
            console.error('[RedisRoleCacheStore.clear]', e?.message || e);
        }
    }
}
