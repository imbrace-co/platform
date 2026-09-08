import { Context, Next } from 'hono';

export const headerMiddleware = async (c: Context, next: Next) => {
    // Mirroring backend's headerMid.jsonHeader
    // Hono handles json content type automatically in c.json, 
    // but we can set it explicitly or log IP as the backend does.
    
    // console.log('request.ip:', c.req.header('x-forwarded-for') || 'local');
    
    await next();
    
    // Set standard headers if needed
    c.header('Content-Type', 'application/json; charset=utf-8');
};
