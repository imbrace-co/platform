import { db } from '../drizzle/index';

async function seed() {
    console.log('Seeding...');
    try {
        // TODO: add seed data when roles/permissions tables are added to schema
        console.log('Seed completed successfully (no-op).');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

seed();
