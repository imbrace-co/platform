import { Context } from 'hono';
import axios from 'axios';
import { config } from '../../../shared/config/index.js';

export class IpsController {
    /**
     * Proxy all /v1/organization/:id/ips/* requests to the IPS/scheduler service.
     * Mirrors backend's IpsController.proxyIps().
     *
     * Target: SERVICE_IPS/api/v1/<wildcard>
     * - No auth (private service endpoint)
     * - Injects x-organization-id header
     */
    static async proxyIps(c: Context) {
        try {
            const orgId = c.req.param('id');
            const wildcard = c.req.param('wildcard') ?? '';
            const path = wildcard ? `/${wildcard}` : '';
            const method = c.req.method;

            const url = `${config.services.ips.baseUrl}/api/v1${path}`;

            // Forward query params
            const queryString = new URLSearchParams(
                Object.fromEntries(
                    Object.entries(c.req.query()).filter(([, v]) => v !== undefined)
                ) as Record<string, string>
            ).toString();
            const fullUrl = queryString ? `${url}?${queryString}` : url;

            const headers: Record<string, string> = {
                'x-organization-id': orgId ?? '',
            };

            let body: any = undefined;
            if (!['GET', 'HEAD'].includes(method)) {
                try {
                    body = await c.req.json();
                } catch {
                    body = undefined;
                }
            }

            const { data: result, status } = await axios.request({
                method,
                url: fullUrl,
                data: body,
                headers,
            });

            return c.json(result, status as any);
        } catch (error: any) {
            console.error('Error in IPS proxy', error);
            const status = error.response?.status || 500;
            const data = error.response?.data || { message: error.message };
            return c.json({ message: error.message, detail: data }, status);
        }
    }
}
