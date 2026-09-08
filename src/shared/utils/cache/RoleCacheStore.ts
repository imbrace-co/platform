/**
 * Pluggable backend for the (org, role) -> permissions cache.
 *
 * Two drivers are provided: an in-process Map (default) and Redis (shared across
 * instances). Selected via config.cache.driver. Implementations must fail open —
 * on any backend error, `get` returns null so resolution falls through to the DB
 * rather than breaking authorization.
 */
export interface ResolvedRole {
    /** Stored permission list — may contain the `'*'` wildcard. */
    permissions: string[];
    /** Coarse version (role.updatedAt epoch ms) for downstream cache validation; 0 if unknown. */
    version: number;
}

export interface RoleCacheStore {
    get(orgId: string, roleKey: string): Promise<ResolvedRole | null>;
    set(orgId: string, roleKey: string, value: ResolvedRole): Promise<void>;
    /** Drop one (org, role) entry, or all entries for an org when roleKey is omitted. */
    invalidate(orgId: string, roleKey?: string): Promise<void>;
    clear(): Promise<void>;
}

export const cacheKey = (orgId: string, roleKey: string) => `${orgId}::${roleKey}`;
