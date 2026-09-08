import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const dbType = process.env.DB_TYPE || 'postgres';

if (dbType === 'mysql') {
    console.warn(`[WARNING] DB_TYPE is set to 'mysql', but MySQL is not fully implemented in schema yet. Proceeding with caution.`);
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);
