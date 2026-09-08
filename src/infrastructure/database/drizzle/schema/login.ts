import { pgTable, varchar, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const login = pgTable('login', {
    id: varchar('id', { length: 255 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    otp: varchar('otp', { length: 50 }).notNull(),
    count: integer('count').default(1),
    isReachLimit: boolean('is_reach_limit').default(false),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
