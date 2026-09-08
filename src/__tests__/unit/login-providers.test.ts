import { describe, it, expect, vi } from 'vitest';
import { AuthController } from '../../interfaces/http/controllers/AuthController.js';

/**
 * Unit tests for getLoginProviders
 * Validates: Requirements 4.6
 */

function createMockContext() {
    const jsonMock = vi.fn().mockImplementation((body: unknown, status: number) => {
        return new Response(JSON.stringify(body), { status });
    });

    const context = {
        json: jsonMock,
    };

    return context;
}

describe('AuthController.getLoginProviders', () => {
    it('should return { email: true } with HTTP 200', async () => {
        const c = createMockContext();

        await AuthController.getLoginProviders(c as any);

        expect(c.json).toHaveBeenCalledWith({ email: true }, 200);
    });

    it('should NOT include SSO provider keys in the response', async () => {
        const c = createMockContext();

        await AuthController.getLoginProviders(c as any);

        const responseBody = c.json.mock.calls[0][0];

        expect(responseBody).not.toHaveProperty('google');
        expect(responseBody).not.toHaveProperty('microsoft');
        expect(responseBody).not.toHaveProperty('azure_ad');
        expect(responseBody).not.toHaveProperty('oidc');
        expect(responseBody).not.toHaveProperty('ldap');
        expect(responseBody).not.toHaveProperty('sso_provider');
    });
});
