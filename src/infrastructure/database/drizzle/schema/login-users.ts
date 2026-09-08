import { pgTable, varchar, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const loginUsers = pgTable('login_users', {
    id: varchar('id', { length: 255 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }),
    customerId: varchar('customer_id', { length: 255 }),
    isVerify: boolean('is_verify').default(false),
    // Profile fields
    authId: varchar('auth_id', { length: 255 }),
    name: varchar('name', { length: 255 }),
    avatarUrl: varchar('avatar_url', { length: 1024 }),
    tokenLogin: varchar('token_login', { length: 2048 }),
    profile: text('profile'), // JSON string of IDP profile
    verifyCode: varchar('verify_code', { length: 255 }),
    verifyExpiredAt: timestamp('verify_expired_at'),
    providerType: varchar('provider_type', { length: 50 }).default('email'),
    providerId: varchar('provider_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
