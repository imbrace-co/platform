import { pgTable, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const messageBars = pgTable('message_bars', {
    id: varchar('id', { length: 50 }).primaryKey(),     // mb_xxxxx
    type: varchar('type', { length: 32 }).notNull(),     // system_upgrade | emergency | new_feature
    content: text('content').default(''),
    withLink: boolean('with_link').default(false),
    link: text('link').default(''),
    duration: varchar('duration', { length: 32 }),       // forever | 1_day | 3_days | 7_days | custom
    // Number of hours entered by the admin when duration === 'custom'.
    customDuration: varchar('custom_duration', { length: 255 }),
    active: boolean('active').default(false),
    // Moment the banner was last switched on — anchor for expiry countdown.
    activatedAt: timestamp('activated_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
