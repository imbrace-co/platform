import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { businessUnits } from './business-units';
import { teams } from './teams';
import { users } from './users';
import { conversations } from './conversations';

export const teamConversationUsers = pgTable('team_conversation_users', {
    id: varchar('id', { length: 50 }).primaryKey(),         // tcu_xxxxx
    publicId: varchar('public_id', { length: 50 }),
    organizationId: varchar('organization_id', { length: 50 })
        .references(() => organizations.id),
    businessUnitId: varchar('business_unit_id', { length: 50 })
        .references(() => businessUnits.id),
    teamId: varchar('team_id', { length: 50 })
        .references(() => teams.id),
    conversationId: varchar('conversation_id', { length: 50 })
        .references(() => conversations.id),
    userId: varchar('user_id', { length: 50 })
        .references(() => users.id),
    role: varchar('role', { length: 20 }).default('member'),    // member | observer
    assignFrom: varchar('assign_from', { length: 50 }).default(''),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: varchar('deleted_at', { length: 50 }).default(''),
});
