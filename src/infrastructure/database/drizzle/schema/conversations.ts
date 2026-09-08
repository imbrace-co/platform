import { pgTable, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { businessUnits } from './business-units';

export const conversations = pgTable('conversations', {
    id: varchar('id', { length: 50 }).primaryKey(),         // conv_xxxxx
    publicId: varchar('public_id', { length: 50 }),
    organizationId: varchar('organization_id', { length: 50 }).notNull()
        .references(() => organizations.id),
    businessUnitId: varchar('business_unit_id', { length: 50 })
        .references(() => businessUnits.id),
    channelId: varchar('channel_id', { length: 50 }).default(''),
    channelType: varchar('channel_type', { length: 50 }).default(''),
    contactId: varchar('contact_id', { length: 50 }).default(''),
    status: varchar('status', { length: 30 }).default('active'),
    name: varchar('name', { length: 255 }).default(''),
    mode: varchar('mode', { length: 30 }).default('automation'),
    isReady: boolean('is_ready').default(true),
    isAgentJoined: boolean('is_agent_joined').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
