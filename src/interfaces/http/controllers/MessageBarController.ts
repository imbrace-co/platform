import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { IMessageBarRepository } from '../../../domain/repositories/IMessageBarRepository.js';
import { MessageBar, messageBarExpiresAt, isMessageBarExpired } from '../../../domain/entities/MessageBar.js';
import { CreateMessageBar } from '../../../application/use-cases/message-bar/CreateMessageBar.js';
import { UpdateMessageBar } from '../../../application/use-cases/message-bar/UpdateMessageBar.js';
import { DeleteMessageBar } from '../../../application/use-cases/message-bar/DeleteMessageBar.js';

export class MessageBarController {

    private static toResponse(m: MessageBar) {
        const expiresAt = messageBarExpiresAt(m);
        return {
            _id: m.id,
            id: m.id,
            type: m.type,
            content: m.content ?? '',
            with_link: m.withLink,
            link: m.link ?? '',
            duration: m.duration ?? '',
            custom_duration: m.customDuration ?? '',
            active: m.active,
            activated_at: m.activatedAt ? new Date(m.activatedAt).toISOString() : null,
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            created_at: m.createdAt ? new Date(m.createdAt).toISOString() : null,
            updated_at: m.updatedAt ? new Date(m.updatedAt).toISOString() : null,
        };
    }

    // Auto-disable any active banner whose duration has elapsed, persisting the
    // flip so the change sticks. Preserves the incoming order.
    private static async expireElapsed(
        repo: IMessageBarRepository,
        items: MessageBar[],
    ): Promise<MessageBar[]> {
        const now = new Date();
        return Promise.all(items.map(async (m) => {
            if (m.active && isMessageBarExpired(m, now)) {
                const updated = await repo.update(m.id, { active: false });
                return updated ?? { ...m, active: false };
            }
            return m;
        }));
    }

    // Map the snake_case request body to the use-case DTO. Only forward keys
    // that are actually present so partial updates stay partial.
    private static parseBody(body: any) {
        const dto: any = {};
        if (body.type !== undefined) dto.type = body.type;
        if (body.content !== undefined) dto.content = body.content;
        if (body.with_link !== undefined) dto.withLink = body.with_link;
        if (body.withLink !== undefined) dto.withLink = body.withLink;
        if (body.link !== undefined) dto.link = body.link;
        if (body.duration !== undefined) dto.duration = body.duration;
        if (body.custom_duration !== undefined) dto.customDuration = body.custom_duration;
        if (body.customDuration !== undefined) dto.customDuration = body.customDuration;
        if (body.active !== undefined) dto.active = body.active;
        return dto;
    }

    // GET /v1/message_bars  — all banners (admin portal)
    // GET /v1/message_bars?active=true — only active banners (client apps)
    static async list(c: Context) {
        try {
            const repo = container.resolve<IMessageBarRepository>('MessageBarRepository');
            const activeOnly = c.req.query('active') === 'true';
            const raw = activeOnly ? await repo.findActive() : await repo.findAll();
            const settled = await MessageBarController.expireElapsed(repo, raw);
            // Client apps asking for active banners must not see freshly-expired ones.
            const items = activeOnly ? settled.filter((m) => m.active) : settled;
            const data = items.map(MessageBarController.toResponse);
            return c.json({ data }, 200);
        } catch (err: any) {
            console.error('[MessageBarController.list]', err);
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    // GET /v1/message_bars/:id
    static async get(c: Context) {
        try {
            const id = c.req.param('id');
            if (!id) {
                return c.json({ message: 'Message bar not found', error_code: 'message_bar_not_found', code: 404 }, 404);
            }
            const repo = container.resolve<IMessageBarRepository>('MessageBarRepository');
            const item = await repo.findById(id);
            if (!item) {
                return c.json({ message: 'Message bar not found', error_code: 'message_bar_not_found', code: 404 }, 404);
            }
            return c.json(MessageBarController.toResponse(item), 200);
        } catch (err: any) {
            console.error('[MessageBarController.get]', err);
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    // POST /v1/message_bars
    static async create(c: Context) {
        try {
            const body = await c.req.json();
            const useCase = container.resolve(CreateMessageBar);
            const item = await useCase.execute(MessageBarController.parseBody(body));
            return c.json(MessageBarController.toResponse(item), 200);
        } catch (err: any) {
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    // PUT /v1/message_bars/:id
    static async update(c: Context) {
        try {
            const id = c.req.param('id');
            if (!id) {
                return c.json({ message: 'Message bar not found', error_code: 'message_bar_not_found', code: 404 }, 404);
            }
            const body = await c.req.json();
            const useCase = container.resolve(UpdateMessageBar);
            const item = await useCase.execute(id, MessageBarController.parseBody(body));
            return c.json(MessageBarController.toResponse(item), 200);
        } catch (err: any) {
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }

    // DELETE /v1/message_bars/:id
    static async delete(c: Context) {
        try {
            const id = c.req.param('id');
            if (!id) {
                return c.json({ message: 'Message bar not found', error_code: 'message_bar_not_found', code: 404 }, 404);
            }
            const useCase = container.resolve(DeleteMessageBar);
            await useCase.execute(id);
            return c.json({ message: 'Message bar deleted successfully', id }, 200);
        } catch (err: any) {
            return c.json({
                message: err.message || 'Service unavailable',
                error_code: err.error_code || 'internal_error',
                code: err.code || 500,
            }, err.code || 500);
        }
    }
}
