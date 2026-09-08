import { pgTable, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { users } from './users';
import { organizations } from './organizations';
import { businessUnits } from './business-units';

export const teamUsers = pgTable('team_users', {
    id: varchar('id', { length: 50 }).primaryKey(),    // tu_xxxxx
    teamId: varchar('team_id', { length: 50 }).notNull()
        .references(() => teams.id),
    userId: varchar('user_id', { length: 50 }).notNull()
        .references(() => users.id),
    role: varchar('role', { length: 20 }).default('member'), // admin | member
    state: varchar('state', { length: 20 }).default(''), // request | invite | join
    organizationId: varchar('organization_id', { length: 50 }).references(() => organizations.id),
    businessUnitId: varchar('business_unit_id', { length: 50 }).references(() => businessUnits.id),
    publicId: varchar('public_id', { length: 50 }),
    applicant: varchar('applicant', { length: 50 }).default(''),
    approver: varchar('approver', { length: 50 }).default(''),
    updater: varchar('updater', { length: 50 }).default(''),
    approverAt: varchar('approver_at', { length: 50 }).default(''),
    waitLeave: boolean('wait_leave').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
