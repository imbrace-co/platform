import { pgTable, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const loginAttemptEmails = pgTable('login_attempt_emails', {
    id: varchar('id', { length: 255 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    count: integer('count').default(1),
    isReachLimit: boolean('is_reach_limit').default(false),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
