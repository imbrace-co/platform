import { describe, it, expect, vi } from 'vitest';
import { adminRoleMiddleware, roles } from '../../interfaces/http/middleware/role.js';

/**
 * Unit tests for adminRoleMiddleware
 * Validates: Requirements 1.3, 1.4
 */

function createMockContext(user: { role: string } | undefined) {
    const jsonMock = vi.fn().mockImplementation((body: unknown, status: number) => {
        return new Response(JSON.stringify(body), { status });
    });

    const context = {
        get: vi.fn().mockImplementation((key: string) => {
            if (key === 'user') return user;
            return undefined;
        }),
        json: jsonMock,
    };

    return context;
}

describe('adminRoleMiddleware', () => {
    it('should call next() when user has owner role', async () => {
        const c = createMockContext({ role: roles.OWNER });
        const next = vi.fn().mockResolvedValue(undefined);

        await adminRoleMiddleware(c as any, next);

        expect(next).toHaveBeenCalledOnce();
        expect(c.json).not.toHaveBeenCalled();
    });

    it('should return 403 with code 40003 when user has member role', async () => {
        const c = createMockContext({ role: roles.MEMBER });
        const next = vi.fn().mockResolvedValue(undefined);

        await adminRoleMiddleware(c as any, next);

        expect(next).not.toHaveBeenCalled();
        expect(c.json).toHaveBeenCalledWith(
            { code: 40003, message: 'Forbidden, insufficient permission' },
            403
        );
    });

    it('should return 401 with code 40001 when user is missing', async () => {
        const c = createMockContext(undefined);
        const next = vi.fn().mockResolvedValue(undefined);

        await adminRoleMiddleware(c as any, next);

        expect(next).not.toHaveBeenCalled();
        expect(c.json).toHaveBeenCalledWith(
            { code: 40001, message: 'Unauthorized' },
            401
        );
    });
});
