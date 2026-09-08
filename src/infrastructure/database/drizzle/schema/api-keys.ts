import { pgTable, varchar, timestamp, text, boolean, jsonb } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const apiKeys = pgTable('api_keys', {
    id: varchar('id', { length: 50 }).primaryKey(),           // api_xxxxx
    apiKey: varchar('api_key', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).default(''),
    organizationId: varchar('organization_id', { length: 50 }).notNull()
        .references(() => organizations.id),
    userId: varchar('user_id', { length: 50 }).notNull()
        .references(() => users.id),
    isActive: boolean('is_active').default(true),
    isTemp: boolean('is_temp').default(false),
    permissions: jsonb('permissions').default({}),
    expiredAt: timestamp('expired_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
