import { pgTable, varchar, timestamp, text, boolean } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { businessUnits } from './business-units';

export const teams = pgTable('teams', {
    id: varchar('id', { length: 50 }).primaryKey(),    // t_xxxxx
    organizationId: varchar('organization_id', { length: 50 }).notNull()
        .references(() => organizations.id),
    publicId: varchar('public_id', { length: 50 }),
    businessUnitId: varchar('business_unit_id', { length: 50 })
        .references(() => businessUnits.id),
    name: varchar('name', { length: 150 }).notNull(),
    mode: varchar('mode', { length: 50 }).default('public'), // grab | public | round_robin
    iconUrl: text('icon_url').default(''),
    description: text('description').default(''),
    isDefault: boolean('is_default').default(false),
    isDisabled: boolean('is_disabled').default(false),
    isDelete: boolean('is_delete').default(false),
    deletedBy: varchar('deleted_by', { length: 50 }).default(''),
    deletedAt: varchar('deleted_at', { length: 50 }).default(''),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
