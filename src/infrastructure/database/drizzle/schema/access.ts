import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const access = pgTable('access', {
    id: varchar('id', { length: 50 }).primaryKey(), // The token itself (acc_...)
    token: varchar('token', { length: 50 }).notNull(),
    refreshToken: varchar('refresh_token', { length: 50 }),
    userId: varchar('user_id', { length: 50 }).notNull()
        .references(() => users.id),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
