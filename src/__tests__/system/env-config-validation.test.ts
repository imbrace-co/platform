import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * System Tests: .env.example Validation
 *
 * Verifies that .env.example contains all variables the application needs
 * and that the config module can load cleanly with those variables.
 */

const ROOT_DIR = resolve(__dirname, '..', '..', '..');
const envExamplePath = resolve(ROOT_DIR, '.env.example');
const envExampleContent = readFileSync(envExamplePath, 'utf-8');

// Parse .env.example into key-value pairs (ignoring comments and empty lines)
function parseEnvFile(content: string): Map<string, string> {
    const vars = new Map<string, string>();
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        vars.set(key, value);
    }
    return vars;
}

const envVars = parseEnvFile(envExampleContent);

// ============================================================
// 1. REQUIRED VARIABLES PRESENT
// ============================================================
describe('ENV: Required variables exist in .env.example', () => {
    const requiredVars = [
        'PORT',
        'DATABASE_URL',
        'SMTP_ADDRESS',
        'SMTP_PORT',
        'SMTP_USERNAME',
        'SMTP_PASSWORD',
        'SMTP_SENDER',
        'IMBRACE_USERNAME',
        'IMBRACE_PASSWORD',
        'NODE_ENV',
        'APP_URL',
        'SERVICE_AI',
        'SERVICE_AI_V2',
        'SERVICE_IPS',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'AWS_S3_BUCKET',
        'AWS_S3_BUCKET_PREFIX',
    ];

    for (const varName of requiredVars) {
        it(`${varName} is defined`, () => {
            expect(envVars.has(varName)).toBe(true);
        });
    }
});

// ============================================================
// 2. BOOTSTRAP VARIABLES (needed for first-run org creation)
// ============================================================
describe('ENV: Bootstrap variables for first-run setup', () => {
    // These are read by config.newOrg and used in bootstrap()
    // They should be documented in .env.example even if empty

    it('should document NEW_ORG_USERNAME (used for bootstrap)', () => {
        // config.newOrg.username reads NEW_ORG_USERNAME
        // bootstrap() requires this to create the default org
        const hasVar = envVars.has('NEW_ORG_USERNAME');
        const hasComment = envExampleContent.includes('NEW_ORG_USERNAME');
        expect(hasVar || hasComment).toBe(true);
    });

    it('should document NEW_ORG_PASSWORD (used for bootstrap)', () => {
        // config.newOrg.password reads NEW_ORG_PASSWORD
        // bootstrap() requires this to create the default org
        const hasVar = envVars.has('NEW_ORG_PASSWORD');
        const hasComment = envExampleContent.includes('NEW_ORG_PASSWORD');
        expect(hasVar || hasComment).toBe(true);
    });

    it('should document APP_API_URL (read by config)', () => {
        // config.appApiUrl reads APP_API_URL
        const hasVar = envVars.has('APP_API_URL');
        const hasComment = envExampleContent.includes('APP_API_URL');
        expect(hasVar || hasComment).toBe(true);
    });
});

// ============================================================
// 3. REMOVED ENTERPRISE VARIABLES NOT PRESENT
// ============================================================
describe('ENV: Enterprise variables are removed', () => {
    const removedVars = [
        'SSO_PROVIDER',
        'GOOGLE_CLIENT_ID_SSO',
        'GOOGLE_CLIENT_SECRET_SSO',
        'GOOGLE_CALLBACK_URL_SSO',
        'MICROSOFT_CLIENT_ID',
        'MICROSOFT_CLIENT_SECRET',
        'MICROSOFT_CLIENT_ID_SSO',
        'MICROSOFT_CLIENT_SECRET_SSO',
        'MICROSOFT_CALLBACK_URL',
        'MICROSOFT_CALLBACK_URL_SSO',
        'AZURE_AD_CLIENT_ID',
        'AZURE_AD_CLIENT_SECRET',
        'AZURE_AD_TENANT_ID',
        'AZURE_AD_CALLBACK_URL',
        'AZURE_AD_CLIENT_ID_SSO',
        'AZURE_AD_CLIENT_SECRET_SSO',
        'AZURE_AD_TENANT_ID_SSO',
        'AZURE_AD_CALLBACK_URL_SSO',
        'OIDC_ISSUER',
        'OIDC_CLIENT_ID',
        'OIDC_CLIENT_SECRET',
        'OIDC_REDIRECT_URI',
        'OIDC_CALLBACK_URL',
        'LDAP_URL',
        'LDAP_BIND_DN',
        'LDAP_BIND_PASSWORD',
        'LDAP_BASE_DN',
        'LDAP_USER_SEARCH_BASE',
        'LDAP_USER_SEARCH_FILTER',
        'LDAP_GROUP_SEARCH_BASE',
        'LDAP_GROUP_SEARCH_FILTER',
        'LDAP_GROUP_NAME_ATTRIBUTE',
        'LDAP_USE_TLS',
        'AWS_MARKETPLACE_API_URL',
    ];

    for (const varName of removedVars) {
        it(`${varName} is NOT present`, () => {
            expect(envVars.has(varName)).toBe(false);
        });
    }
});

// ============================================================
// 4. CONFIG MODULE LOADS WITHOUT ERRORS
// ============================================================
describe('ENV: Config module loads cleanly', () => {
    it('config module imports without throwing', async () => {
        const { config } = await import('../../shared/config/index.js');
        expect(config).toBeDefined();
        expect(config.port).toBeTypeOf('number');
        expect(config.db.url).toBeTypeOf('string');
    });

    it('config has no undefined required fields', async () => {
        const { config } = await import('../../shared/config/index.js');
        // These should always have values (either from env or defaults)
        expect(config.port).toBeGreaterThan(0);
        expect(config.db.url).toBeTruthy();
        expect(config.mail.smtpAddress).toBeTruthy();
        expect(config.mail.smtpPort).toBeGreaterThan(0);
        expect(config.appUrl).toBeTruthy();
    });

    it('config does not reference any SSO/enterprise keys', async () => {
        const { config } = await import('../../shared/config/index.js');
        const configKeys = Object.keys(config);
        expect(configKeys).not.toContain('ssoProvider');
        expect(configKeys).not.toContain('googleSSO');
        expect(configKeys).not.toContain('microsoftSSO');
        expect(configKeys).not.toContain('azureAdSSO');
        expect(configKeys).not.toContain('keycloakSSO');
        expect(configKeys).not.toContain('ldapSSO');
        expect(configKeys).not.toContain('marketplace');
    });
});

// ============================================================
// 5. .env.example FORMAT VALIDATION
// ============================================================
describe('ENV: File format is valid', () => {
    it('no duplicate variable definitions', () => {
        const keys: string[] = [];
        for (const line of envExampleContent.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) continue;
            const key = trimmed.substring(0, eqIdx).trim();
            keys.push(key);
        }
        const uniqueKeys = new Set(keys);
        expect(keys.length).toBe(uniqueKeys.size);
    });

    it('no trailing whitespace in variable names', () => {
        for (const line of envExampleContent.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) continue;
            const key = trimmed.substring(0, eqIdx);
            expect(key).toBe(key.trim());
        }
    });

    it('all variable names are UPPER_SNAKE_CASE', () => {
        for (const [key] of envVars) {
            expect(key).toMatch(/^[A-Z][A-Z0-9_]*$/);
        }
    });
});
