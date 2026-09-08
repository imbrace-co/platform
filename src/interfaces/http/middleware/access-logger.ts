/**
 * HTTP Access Logger Middleware (Hono) — replaces hono/logger.
 *
 * Emits exactly ONE structured access line per request, carrying status_code
 * and response_time. Correlation fields come from the AsyncLocalStorage context
 * populated by `requestContext` (which MUST run before this). Level reflects
 * the outcome.
 */

import type { Context, Next } from 'hono';
import { logger } from '../../../shared/utils/logger.js';
import { getContext } from '../../../shared/utils/request-context.js';

export const accessLogger = async (c: Context, next: Next) => {
    await next();

    const ctx = getContext();
    const responseTime = ctx ? Date.now() - ctx.startTime : undefined;
    const status = c.res.status;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    logger.log(level, 'http_request_completed', {
        function: 'accessLogger',
        entity: 'EMPTY',
        status_code: status,
        response_time: responseTime,
    });
};
