import { pgTable, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const users = pgTable('users', {
    id: varchar('id', { length: 50 }).primaryKey(),    // u_xxxxx
    publicId: varchar('public_id', { length: 50 }).notNull(),
    organizationId: varchar('organization_id', { length: 50 }).notNull()
        .references(() => organizations.id),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('member'),  // owner|member
    displayName: varchar('display_name', { length: 100 }).default(''),
    avatarUrl: text('avatar_url').default(''),
    gender: varchar('gender', { length: 5 }).default(''),
    firstName: varchar('first_name', { length: 100 }).default(''),
    lastName: varchar('last_name', { length: 100 }).default(''),
    addressLine1: text('address_line1').default(''),
    addressLine2: text('address_line2').default(''),
    areaCode: varchar('area_code', { length: 10 }).default(''),
    phoneNumber: varchar('phone_number', { length: 20 }).default(''),
    language: varchar('language', { length: 5 }).default('en'),
    status: varchar('status', { length: 20 }).default('active'),
    isBot: boolean('is_bot').default(false),
    isAdmin: boolean('is_admin').default(false),
    isDeleted: boolean('is_deleted').default(false),
    isArchived: boolean('is_archived').default(false),
    isActive: boolean('is_active').default(true),
    onBoarded: boolean('on_boarded').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
