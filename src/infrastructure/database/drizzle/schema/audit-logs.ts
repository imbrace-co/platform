import { pgTable, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
    id: varchar('id', { length: 50 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 50 }).notNull(),
    userId: varchar('user_id', { length: 50 }),
    action: varchar('action', { length: 20 }).notNull(),
    resource: varchar('resource', { length: 50 }).notNull(),
    resourceId: varchar('resource_id', { length: 50 }),
    changes: jsonb('changes'),          // { before: {}, after: {} }
    metadata: jsonb('metadata'),        // { ip, userAgent, ... }
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    idxOrgCreated: index('idx_audit_org_created').on(table.organizationId, table.createdAt),
    idxResource: index('idx_audit_resource').on(table.resource, table.resourceId),
}));
