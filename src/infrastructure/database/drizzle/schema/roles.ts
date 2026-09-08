import { pgTable, varchar, timestamp, boolean, jsonb, integer, uniqueIndex } from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
    id: varchar('id', { length: 255 }).primaryKey(),                 // role_<uuid>
    organizationId: varchar('organization_id', { length: 255 }).notNull(),
    key: varchar('key', { length: 50 }).notNull(),                   // slug; users.role stores this
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1024 }).default(''),
    permissions: jsonb('permissions').$type<string[]>().default([]).notNull(),
    priority: integer('priority').notNull().default(3),              // 0..n, lower = higher authority
    isSystem: boolean('is_system').default(false),
    isActive: boolean('is_active').default(true),
    createdBy: varchar('created_by', { length: 255 }),
    updatedBy: varchar('updated_by', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
    orgKeyUnique: uniqueIndex('roles_org_key_unique').on(t.organizationId, t.key),
}));
