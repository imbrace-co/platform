import { pgTable, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
    id: varchar('id', { length: 50 }).primaryKey(),    // cat_xxxxx
    publicId: varchar('public_id', { length: 50 }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').default(''),
    applyTo: jsonb('apply_to').default([]),             // string array
    isDefault: boolean('is_default').default(false),
    organizationId: varchar('organization_id', { length: 50 }).notNull(),
    referenceId: varchar('reference_id', { length: 50 }),
    isDeleted: boolean('is_deleted').default(false),
    extra: jsonb('extra').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
