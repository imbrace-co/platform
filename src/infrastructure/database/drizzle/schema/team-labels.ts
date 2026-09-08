import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { businessUnits } from './business-units';
import { teams } from './teams';

export const teamLabels = pgTable('team_labels', {
    id: varchar('id', { length: 50 }).primaryKey(),
    publicId: varchar('public_id', { length: 50 }),
    organizationId: varchar('organization_id', { length: 50 }).notNull()
        .references(() => organizations.id),
    businessUnitId: varchar('business_unit_id', { length: 50 })
        .references(() => businessUnits.id),
    teamId: varchar('team_id', { length: 50 }).notNull()
        .references(() => teams.id),
    name: varchar('name', { length: 150 }).notNull().default(''),
    color: varchar('color', { length: 50 }).notNull().default(''),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
