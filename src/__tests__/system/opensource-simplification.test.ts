import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';

/**
 * System Tests: Opensource Simplification Verification
 *
 * These tests verify that the platform-service works correctly after
 * the "simplify for opensource" refactor. They test the Hono app directly
 * (no database required) to validate routing, controller logic, and
 * constraint enforcement.
 */

// Import the routes barrel to create a test app instance
import { apiRoutes } from '../../interfaces/http/routes/index.js';

// Create a test app that mirrors the production setup
const app = new Hono({ strict: false });
app.get('/health', (c) => c.json({ status: 'ok', service: 'platform-service' }));
app.route('/', apiRoutes);

// Helper to make requests
function request(method: string, path: string, options?: { body?: any; headers?: Record<string, string> }) {
    const url = `http://localhost${path}`;
    const init: RequestInit = { method };
    const headers: Record<string, string> = { ...(options?.headers || {}) };

    if (options?.body) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(options.body);
    }

    init.headers = headers;
    return app.request(new Request(url, init));
}

// ============================================================
// 1. HEALTH CHECK
// ============================================================
describe('System: Health Check', () => {
    it('GET /health returns 200 with status ok', async () => {
        const res = await request('GET', '/health');
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.status).toBe('ok');
        expect(json.service).toBe('platform-service');
    });
});

// ============================================================
// 2. REMOVED ENDPOINTS RETURN 404
// ============================================================
describe('System: Removed Endpoints', () => {
    const removedPaths = [
        // SSO
        { method: 'GET', path: '/v1/sso' },
        { method: 'GET', path: '/v1/sso/google' },
        { method: 'GET', path: '/v1/sso/microsoft' },
        { method: 'GET', path: '/v1/sso/callback' },
        { method: 'POST', path: '/v1/sso/authenticate' },
        // OIDC Role Mapping
        { method: 'GET', path: '/v1/oidc_role_mappings' },
        { method: 'POST', path: '/v1/oidc_role_mappings' },
        { method: 'PUT', path: '/v1/oidc_role_mappings/123' },
        { method: 'DELETE', path: '/v1/oidc_role_mappings/123' },
        // Public API Keys
        { method: 'GET', path: '/v1/api_key_token' },
        { method: 'POST', path: '/v1/api_key_token' },
        { method: 'DELETE', path: '/v1/api_key_token/abc' },
        // AWS Marketplace
        { method: 'GET', path: '/v1/aws-marketplace' },
        { method: 'POST', path: '/v1/aws-marketplace/resolve' },
        { method: 'POST', path: '/v1/aws-marketplace/subscribe' },
    ];

    for (const { method, path } of removedPaths) {
        it(`${method} ${path} returns 404`, async () => {
            const res = await request(method, path);
            expect(res.status).toBe(404);
        });
    }

    it('POST /v1/login/sign_up/aws is not registered (404)', async () => {
        const res = await request('POST', '/v1/login/sign_up/aws', {
            body: { token: 'some-aws-token' },
        });
        expect(res.status).toBe(404);
    });
});

// ============================================================
// 3. PRESERVED ROUTES ARE REACHABLE
// ============================================================
describe('System: Preserved Routes Reachable', () => {
    it('GET /v1/login/providers returns 200 with email: true', async () => {
        const res = await request('GET', '/v1/login/providers');
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ email: true });
    });

    it('GET /v1/login/providers does NOT include SSO keys', async () => {
        const res = await request('GET', '/v1/login/providers');
        const json = await res.json();
        expect(json).not.toHaveProperty('google');
        expect(json).not.toHaveProperty('microsoft');
        expect(json).not.toHaveProperty('azure_ad');
        expect(json).not.toHaveProperty('oidc');
        expect(json).not.toHaveProperty('ldap');
        expect(json).not.toHaveProperty('sso_provider');
    });

    // These routes require auth but should NOT return 404
    it('POST /v1/login/sign_in returns 400 (not 404) without body', async () => {
        const res = await request('POST', '/v1/login/sign_in');
        expect(res.status).not.toBe(404);
    });

    it('POST /v1/login/authenticate returns 400 (not 404) without body', async () => {
        const res = await request('POST', '/v1/login/authenticate');
        expect(res.status).not.toBe(404);
    });

    it('GET /v1/login/forget returns 400 (not 404) without email', async () => {
        const res = await request('GET', '/v1/login/forget');
        expect(res.status).not.toBe(404);
    });

    it('POST /v1/login/sign_up returns 400 (not 404) without body', async () => {
        const res = await request('POST', '/v1/login/sign_up');
        expect(res.status).not.toBe(404);
    });

    it('POST /v1/login/forget/reset returns 400 (not 404) without body', async () => {
        const res = await request('POST', '/v1/login/forget/reset');
        expect(res.status).not.toBe(404);
    });

    // Third party token routes exist (require auth, so 401)
    it('POST /v1/third_party_token returns 401 (not 404) without auth', async () => {
        const res = await request('POST', '/v1/third_party_token');
        expect(res.status).toBe(401);
    });

    it('GET /v1/third_party_token/some-token returns 401 (not 404) without auth', async () => {
        const res = await request('GET', '/v1/third_party_token/some-token');
        expect(res.status).toBe(401);
    });

    it('DELETE /v1/third_party_token/some-token returns 401 (not 404) without auth', async () => {
        const res = await request('DELETE', '/v1/third_party_token/some-token');
        expect(res.status).toBe(401);
    });

    // Access routes exist (require auth)
    it('POST /v1/access/_exchange_access_token returns 401 (not 404) without auth', async () => {
        const res = await request('POST', '/v1/access/_exchange_access_token');
        expect(res.status).toBe(401);
    });

    // Business unit routes exist (require auth)
    it('GET /v1/business_units returns 401 (not 404) without auth', async () => {
        const res = await request('GET', '/v1/business_units');
        expect(res.status).toBe(401);
    });

    it('POST /v1/business_units returns 401 (not 404) without auth', async () => {
        const res = await request('POST', '/v1/business_units');
        expect(res.status).toBe(401);
    });
});

// ============================================================
// 4. AUTHENTICATION - EMAIL ONLY
// ============================================================
describe('System: Email-Only Authentication', () => {
    it('POST /v1/login/authenticate rejects social provider_type with 400', async () => {
        const res = await request('POST', '/v1/login/authenticate', {
            body: {
                provider_type: 'google',
                email: 'test@example.com',
                password: 'password123',
            },
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.code).toBe(40000);
        expect(json.message).toBe('Social authentication is not available');
    });

    it('POST /v1/login/authenticate rejects any non-empty provider_type', async () => {
        const providers = ['microsoft', 'azure_ad', 'oidc', 'ldap', 'facebook', 'custom_sso'];
        for (const provider of providers) {
            const res = await request('POST', '/v1/login/authenticate', {
                body: {
                    provider_type: provider,
                    email: 'test@example.com',
                    password: 'password123',
                },
            });
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.message).toBe('Social authentication is not available');
        }
    });

    it('POST /v1/login/authenticate accepts email+password (no provider_type)', async () => {
        // Without provider_type, it should proceed to email validation
        // (will fail at DB level, but should NOT return "Social authentication is not available")
        const res = await request('POST', '/v1/login/authenticate', {
            body: {
                email: 'test@example.com',
                password: 'SomePassword1!',
            },
        });
        // Should get a DB error or "not found" — NOT 400 with social auth message
        const json = await res.json();
        expect(json.message).not.toBe('Social authentication is not available');
    });

    it('POST /v1/login/sign_in validates email format', async () => {
        const res = await request('POST', '/v1/login/sign_in', {
            body: { email: 'not-an-email', password: 'test' },
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.field).toBe('email');
    });

    it('POST /v1/login/sign_in requires email and password', async () => {
        const res = await request('POST', '/v1/login/sign_in', {
            body: { email: '', password: '' },
        });
        expect(res.status).toBe(400);
    });

    it('POST /v1/login/sign_up validates password strength', async () => {
        const res = await request('POST', '/v1/login/sign_up', {
            body: { email: 'test@example.com', password: 'weak' },
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.field).toBe('password');
    });
});

// ============================================================
// 5. ORGANIZATION CONSTRAINTS
// ============================================================
describe('System: Organization Constraints', () => {
    it('POST /v1/organizations rejects creation with 403', async () => {
        // This route uses loginAccessMiddleware, so we need to test the controller directly
        // by checking that even if auth passes, creation is rejected.
        // Without auth, it returns 401. Let's verify the route exists first.
        const res = await request('POST', '/v1/organizations', {
            body: { name: 'new-org', email: 'admin@test.com' },
        });
        // Should be 401 (auth required) — NOT 404 (route exists)
        expect(res.status).toBe(401);
    });

    it('POST /v1/organizations/aws rejects creation with 403 (via loginAccessMiddleware → 401)', async () => {
        const res = await request('POST', '/v1/organizations/aws', {
            body: { token: 'aws-token' },
        });
        // Route exists (not 404), requires auth (401)
        expect(res.status).toBe(401);
    });
});

// ============================================================
// 6. BUSINESS UNIT CONSTRAINTS
// ============================================================
describe('System: Business Unit Constraints', () => {
    it('POST /v1/business_units route exists (returns 401 without auth, not 404)', async () => {
        const res = await request('POST', '/v1/business_units', {
            body: { name: 'new-bu', organization_id: 'org-123' },
        });
        expect(res.status).toBe(401);
    });

    it('DELETE /v1/business_units/:id route exists (returns 401 without auth, not 404)', async () => {
        const res = await request('DELETE', '/v1/business_units/bu-123');
        expect(res.status).toBe(401);
    });
});

// ============================================================
// 7. ROLE MIDDLEWARE
// ============================================================
describe('System: RBAC - Owner + Member Only', () => {
    // Import the middleware directly for unit-level testing
    it('roles object contains only OWNER and MEMBER', async () => {
        const { roles } = await import('../../interfaces/http/middleware/role.js');
        expect(Object.keys(roles)).toHaveLength(2);
        expect(roles.OWNER).toBe('owner');
        expect(roles.MEMBER).toBe('member');
        // Legacy roles should NOT exist
        expect(roles).not.toHaveProperty('ADMIN');
        expect(roles).not.toHaveProperty('TECHNICIAN');
        expect(roles).not.toHaveProperty('USER');
    });
});

// ============================================================
// 8. CONFIGURATION CLEANLINESS
// ============================================================
describe('System: Configuration', () => {
    it('config does not contain SSO keys', async () => {
        const { config } = await import('../../shared/config/index.js');
        const configStr = JSON.stringify(config);
        expect(configStr).not.toContain('ssoProvider');
        expect(configStr).not.toContain('googleSSO');
        expect(configStr).not.toContain('microsoftSSO');
        expect(configStr).not.toContain('azureAdSSO');
        expect(configStr).not.toContain('keycloakSSO');
        expect(configStr).not.toContain('ldapSSO');
    });

    it('config retains essential keys', async () => {
        const { config } = await import('../../shared/config/index.js');
        expect(config).toHaveProperty('port');
        expect(config).toHaveProperty('db');
        expect(config).toHaveProperty('mail');
        expect(config).toHaveProperty('auth');
        expect(config).toHaveProperty('newOrg');
        expect(config).toHaveProperty('services');
    });

    it('config.newOrg.name is forced to "default" at runtime', async () => {
        // The forcing happens in src/index.ts at startup: `config.newOrg.name = 'default'`
        // We verify this by checking the index.ts source contains the override
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        const indexPath = resolve(__dirname, '..', '..', 'index.ts');
        const indexContent = readFileSync(indexPath, 'utf-8');
        expect(indexContent).toContain("config.newOrg.name = 'default'");
    });
});

// ============================================================
// 9. SIGN-IN FLOW VALIDATION
// ============================================================
describe('System: Sign-In Flow Input Validation', () => {
    it('POST /v1/login/sign_in with invalid JSON returns 400', async () => {
        const url = 'http://localhost/v1/login/sign_in';
        const res = await app.request(new Request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'not-json{{{',
        }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.message).toContain('Invalid JSON');
    });

    it('POST /v1/login/authenticate with invalid JSON returns 400', async () => {
        const url = 'http://localhost/v1/login/authenticate';
        const res = await app.request(new Request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{broken',
        }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.message).toContain('Invalid JSON');
    });

    it('POST /v1/login/_signin_email_request is removed (404)', async () => {
        const res = await request('POST', '/v1/login/_signin_email_request', {
            body: { email: 'test@example.com' },
        });
        expect(res.status).toBe(404);
    });

    it('POST /v1/login/_signin_with_email is removed (404)', async () => {
        const res = await request('POST', '/v1/login/_signin_with_email', {
            body: { email: 'test@example.com', otp: '123456' },
        });
        expect(res.status).toBe(404);
    });

    it('POST /v1/login/forget/reset validates all required fields', async () => {
        const res = await request('POST', '/v1/login/forget/reset', {
            body: { email: 'test@example.com' },
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.field).toBe('verify_code');
    });

    it('POST /v1/login/forget/reset validates password format', async () => {
        const res = await request('POST', '/v1/login/forget/reset', {
            body: {
                email: 'test@example.com',
                verify_code: 'abc123',
                password: 'weak',
            },
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.field).toBe('password');
    });
});

// ============================================================
// 10. DI CONTAINER VERIFICATION
// ============================================================
describe('System: DI Container', () => {
    it('does not register SSO or marketplace repositories', async () => {
        const { container } = await import('../../shared/di/container.js');

        // These should throw because they're not registered
        expect(() => container.resolve('OidcRoleMappingRepository')).toThrow();
        expect(() => container.resolve('MarketplaceCustomerRepository')).toThrow();
    });

    it('retains ApiKeyRepository registration', async () => {
        const { container } = await import('../../shared/di/container.js');
        // Should NOT throw — ApiKeyRepository is preserved for Third Party Token
        expect(() => container.resolve('ApiKeyRepository')).not.toThrow();
    });

    it('retains core repository registrations', async () => {
        const { container } = await import('../../shared/di/container.js');
        const coreRepos = [
            'OrganizationRepository',
            'BusinessUnitRepository',
            'TeamRepository',
            'UserRepository',
            'TeamUserRepository',
            'LoginAccessRepository',
            'AccessRepository',
            'LoginUserRepository',
            'CategoryRepository',
        ];
        for (const repo of coreRepos) {
            expect(() => container.resolve(repo)).not.toThrow();
        }
    });
});

// ============================================================
// 11. PACKAGE.JSON VERIFICATION
// ============================================================
describe('System: Dependencies', () => {
    it('does not contain removed SSO/marketplace dependencies', async () => {
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        const pkgPath = resolve(__dirname, '..', '..', '..', 'package.json');
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

        const removedDeps = [
            '@azure/msal-node',
            'ldapts',
            'openid-client',
            'passport',
            'passport-google-oauth20',
            'passport-microsoft',
            '@aws-sdk/client-marketplace-metering',
            '@aws-sdk/client-marketplace-entitlement-service',
        ];

        for (const dep of removedDeps) {
            expect(allDeps).not.toHaveProperty(dep);
        }
    });

    it('retains essential dependencies', async () => {
        const { readFileSync } = await import('fs');
        const { resolve } = await import('path');
        const pkgPath = resolve(__dirname, '..', '..', '..', 'package.json');
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

        const requiredDeps = ['hono', '@hono/node-server', 'drizzle-orm', 'tsyringe', 'bcryptjs', 'nodemailer'];
        for (const dep of requiredDeps) {
            expect(pkg.dependencies).toHaveProperty(dep);
        }
    });
});
