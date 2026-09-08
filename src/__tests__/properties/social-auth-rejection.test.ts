import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Hono } from 'hono';
import { AuthController } from '../../interfaces/http/controllers/AuthController.js';

/**
 * Property 8: Social authentication is always rejected
 *
 * For any non-empty string value in the `provider_type` field of a
 * `POST /v1/login/authenticate` request, the Auth_Module SHALL respond
 * with HTTP 400 and a message stating social authentication is not available.
 *
 * **Validates: Requirements 4.3**
 */
describe('Feature: simplify-for-opensource, Property 8: Social authentication is always rejected', () => {
    // Set up a minimal Hono app with the authenticate handler
    const app = new Hono();
    app.post('/v1/login/authenticate', (c) => AuthController.authenticate(c));

    it('should reject any non-empty provider_type with HTTP 400', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1 }),
                async (providerType) => {
                    const body = JSON.stringify({
                        provider_type: providerType,
                        email: 'test@example.com',
                        password: 'somepassword',
                    });

                    const req = new Request('http://localhost/v1/login/authenticate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body,
                    });

                    const res = await app.request(req);

                    expect(res.status).toBe(400);

                    const json = await res.json();
                    expect(json).toHaveProperty('message', 'Social authentication is not available');
                    expect(json).toHaveProperty('code', 40000);
                }
            ),
            { numRuns: 100 }
        );
    });
});
