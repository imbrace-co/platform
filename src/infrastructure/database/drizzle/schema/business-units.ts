import { pgTable, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const businessUnits = pgTable('business_units', {
    id: varchar('id', { length: 50 }).primaryKey(),    // bu_xxxxx
    organizationId: varchar('organization_id', { length: 50 }).notNull()
        .references(() => organizations.id),
    publicId: varchar('public_id', { length: 50 }),
    name: varchar('name', { length: 150 }).notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
