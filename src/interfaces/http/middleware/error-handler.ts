import { Context } from 'hono';
import { logger } from '../../../shared/utils/logger.js';

export class DomainError extends Error {
    constructor(message: string, public statusCode: number = 400) {
        super(message);
        this.name = 'DomainError';
    }
}

export const errorHandler = (err: Error, c: Context) => {
    logger.error(err.message, err.stack);

    if (err instanceof DomainError) {
        return c.json({
            success: false,
            error: {
                message: err.message,
                code: err.name,
            }
        }, err.statusCode as any);
    }

    // Handle other known errors (Zod validation, etc.) if necessary

    return c.json({
        success: false,
        error: {
            message: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
        }
    }, 500);
};
