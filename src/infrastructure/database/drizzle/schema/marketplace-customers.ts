import { pgTable, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const marketplaceCustomers = pgTable('marketplace_customers', {
    id: varchar('id', { length: 50 }).primaryKey(),             // mktp_cust_xxxxx
    customerId: varchar('customer_id', { length: 100 }).notNull().unique(),
    customerAWSAccountId: varchar('customer_aws_account_id', { length: 100 }).default(''),
    productCode: varchar('product_code', { length: 100 }).default(''),
    entitlements: jsonb('entitlements').default([]),
    subscriptionStatus: varchar('subscription_status', { length: 50 }).default('subscribed'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
