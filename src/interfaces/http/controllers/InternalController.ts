import { Context } from 'hono';

export class InternalController {
    // GET /v1/internal
    static async index(c: Context) {
        return c.json({
            service: 'platform-service',
            status: 'ok',
        }, 200);
    }
}
