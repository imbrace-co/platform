import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Hono } from 'hono';
import { apiRoutes } from '../../interfaces/http/routes/index.js';

/**
 * Property 11: Removed endpoints return 404
 *
 * For any HTTP request to a path previously served by a Removed_Feature
 * (/v1/sso/*, /v1/oidc_role_mappings/*, /v1/api_key_token/*, /v1/aws-marketplace/*),
 * the Platform_Service SHALL respond with HTTP 404.
 *
 * **Validates: Requirements 12.3**
 */

// Create a minimal Hono app with the same route setup as the real app
const app = new Hono({ strict: false });
app.route('/', apiRoutes);

// Generator for URL-safe path suffixes
// Filter out characters that would break URL parsing: ?, #, and control characters
const urlSafePathSuffix = fc
    .string({ minLength: 0, maxLength: 50 })
    .map((s) =>
        s
            .replace(/[?#\x00-\x1F\x7F]/g, '') // Remove query/fragment delimiters and control chars
            .replace(/\\/g, '/') // Normalize backslashes to forward slashes
            .replace(/\/+/g, '/') // Collapse multiple slashes
    );

describe('Feature: simplify-for-opensource, Property 11: Removed endpoints return 404', () => {
    it('should return 404 for any path under removed endpoint prefixes', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(
                    '/v1/sso',
                    '/v1/oidc_role_mappings',
                    '/v1/api_key_token',
                    '/v1/aws-marketplace'
                ),
                urlSafePathSuffix,
                async (basePath, suffix) => {
                    // Build the full path: base + optional suffix
                    const fullPath = suffix ? `${basePath}/${suffix}` : basePath;
                    const url = `http://localhost${fullPath}`;

                    const response = await app.request(url, { method: 'GET' });

                    expect(response.status).toBe(404);
                }
            ),
            { numRuns: 100 }
        );
    });
});
