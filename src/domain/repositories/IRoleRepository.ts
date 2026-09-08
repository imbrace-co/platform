import { Role } from '../entities/Role.js';

export interface IRoleRepository {
    findByOrganization(organizationId: string, limit?: number, skip?: number): Promise<{ items: Role[]; count: number }>;
    findById(id: string): Promise<Role | null>;
    /** Hot path for permission resolution: resolve a user's role key within an org. */
    findByOrgAndKey(organizationId: string, key: string): Promise<Role | null>;
    create(data: Partial<Role>): Promise<Role>;
    update(id: string, data: Partial<Role>): Promise<Role | null>;
    deleteById(id: string): Promise<void>;
    /** Idempotent seed/backfill — inserts rows, ignoring (organizationId, key) conflicts. */
    bulkCreate(rows: Partial<Role>[]): Promise<void>;
    /** Lazy-seed the 4 system roles for an org if none exist yet (pre-RBAC backfill). */
    ensureSystemRoles(organizationId: string): Promise<void>;
    /**
     * Re-align the 4 system roles for an org to the code-defined defaults (UPSERT):
     * updates name/description/permissions/priority of existing rows (keeping their id),
     * inserts any missing. Use to propagate catalog changes to already-seeded orgs.
     * WARNING: overwrites any manual edits to system roles.
     */
    syncSystemRoles(organizationId: string): Promise<void>;
}
