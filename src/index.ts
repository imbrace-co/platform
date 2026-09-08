import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import * as dotenv from 'dotenv';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';

import 'reflect-metadata';
import { container } from 'tsyringe';
import './shared/di/container.js';
import { apiRoutes } from './interfaces/http/routes/index.js';
import { errorHandler } from './interfaces/http/middleware/error-handler.js';
import { config } from './shared/config/index.js';
import { CreateOrganization } from './application/use-cases/organization/CreateOrganization.js';
import { ILoginUserRepository } from './domain/repositories/ILoginUserRepository.js';
import { IOrganizationRepository } from './domain/repositories/IOrganizationRepository.js';
import { IBusinessUnitRepository } from './domain/repositories/IBusinessUnitRepository.js';
import { IUserRepository } from './domain/repositories/IUserRepository.js';
import { generateId } from './shared/utils/id-generator.js';

dotenv.config();

// Force org name to 'default' regardless of env value
config.newOrg.name = 'default';

const app = new Hono({ strict: false });

app.use('*', logger());
app.use('*', cors());
app.onError(errorHandler);

app.get('/health', (c) => {
    return c.json({ status: 'ok', service: 'platform-service', timestamp: new Date().toISOString() });
});

app.route('/', apiRoutes);

const port = config.port;

async function bootstrap() {
    const orgRepo = container.resolve<IOrganizationRepository>('OrganizationRepository');
    const buRepo = container.resolve<IBusinessUnitRepository>('BusinessUnitRepository');
    const userRepo = container.resolve<IUserRepository>('UserRepository');

    try {
        // Check how many organizations exist
        const orgCount = Number(await orgRepo.count());

        if (orgCount > 1) {
            console.warn(`[bootstrap] WARNING: Found ${orgCount} organizations in the database. Only the 'default' organization will be served.`);
        }

        // If organizations table is empty, create Default_Organization
        if (orgCount === 0) {
            if (!config.newOrg.username || !config.newOrg.password) {
                console.error('[bootstrap] Cannot create default organization: NEW_ORG_USERNAME and NEW_ORG_PASSWORD environment variables are required.');
                return;
            }

            console.log('[bootstrap] Organizations table is empty. Creating Default_Organization...');

            const loginUserRepo = container.resolve<ILoginUserRepository>('LoginUserRepository');
            const createOrg = container.resolve(CreateOrganization);

            // Create login user if not exists
            const existing = await loginUserRepo.findByEmail(config.newOrg.username);
            if (!existing) {
                await loginUserRepo.create({
                    id: generateId('lu'),
                    email: config.newOrg.username,
                    password: bcrypt.hashSync(config.newOrg.password),
                    isVerify: true,
                    verifyCode: '',
                    verifyExpiredAt: null,
                });
                console.log(`[bootstrap] Created login user: ${config.newOrg.username}`);
            } else {
                console.log(`[bootstrap] Login user ${config.newOrg.username} already exists`);
            }

            const newOrg = await createOrg.execute({
                name: 'default',
                email: config.newOrg.username,
                isPaid: true,
            });

            console.log(`[bootstrap] Successfully created Default_Organization (${newOrg.id})`);
            console.log(`[bootstrap] Login with email: ${config.newOrg.username}`);
        } else {
            // Organization exists — ensure default BU exists and bootstrap user has owner role
            const defaultOrg = await orgRepo.findByName('default');
            if (defaultOrg) {
                // Ensure a business unit exists for the default org
                const buCount = await buRepo.countByOrganization(defaultOrg.id);
                if (buCount === 0) {
                    console.log('[bootstrap] No business unit found for Default_Organization. Creating Default_Business_Unit...');
                    await buRepo.create({
                        id: generateId('bu'),
                        organizationId: defaultOrg.id,
                        publicId: generateId('pub'),
                        name: 'default',
                        isActive: true,
                    } as any);
                    console.log('[bootstrap] Created Default_Business_Unit');
                }

                // Ensure the bootstrap user has role = 'owner'
                if (config.newOrg.username) {
                    const bootstrapUser = await userRepo.findByEmail(defaultOrg.id, config.newOrg.username);
                    if (bootstrapUser && bootstrapUser.role !== 'owner') {
                        await userRepo.update(bootstrapUser.id, { role: 'owner' });
                        console.log(`[bootstrap] Updated bootstrap user ${config.newOrg.username} role to 'owner'`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[bootstrap] Failed to bootstrap default organization:', error);
    }
}

console.log(`Server is running on port ${port}`);

serve({
    fetch: app.fetch,
    port,
});

bootstrap();
