import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const loginAccess = pgTable('login_access', {
    id: varchar('id', { length: 255 }).primaryKey(), // The token itself
    email: varchar('email', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
