import { Context } from 'hono';
import axios from 'axios';
import { config } from '../../../shared/config/index.js';

/**
 * Paths that should be routed to SERVICE_AI_V2/api/v1 instead of SERVICE_AI/v1.
 * Mirrors backend's isAIV2() function in AIController.js
 */
const AI_V2_PATHS = [
    '/rag/answer_question',
    '/document/models',
    '/document',
    '/files/extract',
];

function isAIV2(path: string): boolean {
    return AI_V2_PATHS.some((p) => path.startsWith(p));
}

export class AIController {
    /**
     * Proxy all /v1/organization/:id/ai/* requests to the AI service.
     * Mirrors backend's AIController.proxyAI().
     *
     * - No auth (private service endpoint)
     * - Injects x-organization-id header for the downstream AI service
     * - Handles both regular JSON and SSE streaming responses
     */
    static async proxyAI(c: Context) {
        try {
            const orgId = c.req.param('id');
            const wildcard = c.req.param('wildcard') ?? '';
            const path = wildcard ? `/${wildcard}` : '';
            const method = c.req.method;

            const aiBaseUrl = `${config.services.ai.baseUrl}/v1`;
            const aiV2BaseUrl = `${config.services.ai.baseUrlV2}/api/v1`;
            const targetBase = isAIV2(path) ? aiV2BaseUrl : aiBaseUrl;
            const targetUrl = targetBase + path;

            // Forward query params
            const queryString = new URLSearchParams(
                Object.fromEntries(
                    Object.entries(c.req.query()).filter(([, v]) => v !== undefined)
                ) as Record<string, string>
            ).toString();
            const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

            const headers: Record<string, string> = {
                'x-organization-id': orgId ?? '',
                'Content-Type': 'application/json',
            };

            // Parse body for non-GET/HEAD
            let body: any = undefined;
            if (!['GET', 'HEAD'].includes(method)) {
                try {
                    body = await c.req.json();
                } catch {
                    body = undefined;
                }
            }

            const isStreaming =
                path === '/rag/answer_question' &&
                body &&
                typeof body === 'object' &&
                body.streaming === true;

            if (isStreaming) {
                // Pipe SSE stream directly to client
                const response = await axios.request({
                    method,
                    url: fullUrl,
                    data: body,
                    headers,
                    responseType: 'stream',
                });

                c.header('Content-Type', 'text/event-stream');
                c.header('Cache-Control', 'no-cache');
                c.header('Connection', 'keep-alive');
                c.header('X-Accel-Buffering', 'no');

                return c.body(response.data);
            }

            // Non-streaming: forward and return response
            const { data, status } = await axios.request({
                method,
                url: fullUrl,
                data: body,
                headers,
            });

            return c.json(data, status as any);
        } catch (error: any) {
            console.error('Error in AI proxy', error);
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: error.message };
            return c.json({ message: error.message, detail: data }, status);
        }
    }
}
