import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { businessUnits } from './business-units';
import { users } from './users';

export const businessUnitUsers = pgTable('business_unit_users', {
    id: varchar('id', { length: 50 }).primaryKey(),    // buu_xxxxx
    publicId: varchar('public_id', { length: 50 }).default(''),
    organizationId: varchar('organization_id', { length: 50 }).notNull()
        .references(() => organizations.id),
    businessUnitId: varchar('business_unit_id', { length: 50 }).notNull()
        .references(() => businessUnits.id),
    userId: varchar('user_id', { length: 50 }).notNull()
        .references(() => users.id),
    role: varchar('role', { length: 20 }).default('member'), // admin | member
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
