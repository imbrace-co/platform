import { pgTable, varchar, text, boolean, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
    id: varchar('id', { length: 50 }).primaryKey(),    // org_xxxxx
    publicId: varchar('public_id', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    iconUrl: text('icon_url'),
    isPaid: boolean('is_paid').default(false),
    aiSettings: jsonb('ai_settings').default({}),      // { providers: [] }
    modules: jsonb('modules').default({}),             // feature flags
    apps: jsonb('apps').default([]),
    sidebar: jsonb('sidebar'),
    partition: integer('partition').default(0),
    isActive: boolean('is_active').default(true),
    isLicenseRequired: boolean('is_license_required').default(false),
    organizationLockFeatures: jsonb('organization_lock_features').default([]),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
});
