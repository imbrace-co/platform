import { injectable, inject } from 'tsyringe';
import { IMessageBarRepository } from '../../../domain/repositories/IMessageBarRepository.js';
import {
    MessageBar,
    MessageBarDuration,
} from '../../../domain/entities/MessageBar.js';

const VALID_DURATIONS: MessageBarDuration[] = ['forever', '1_day', '3_days', '7_days', 'custom'];
const TYPE_MAX_LEN = 32;

export interface UpdateMessageBarDTO {
    type?: string;
    content?: string;
    withLink?: boolean;
    link?: string;
    duration?: MessageBarDuration | '';
    customDuration?: string;
    active?: boolean;
}

@injectable()
export class UpdateMessageBar {
    constructor(
        @inject('MessageBarRepository') private messageBarRepo: IMessageBarRepository,
    ) {}

    async execute(id: string, input: UpdateMessageBarDTO): Promise<MessageBar> {
        const existing = await this.messageBarRepo.findById(id);
        if (!existing) {
            throw Object.assign(new Error('Message bar not found'), { code: 404, error_code: 'message_bar_not_found' });
        }

        if (input.type !== undefined) {
            const type = input.type.trim();
            if (!type) {
                throw Object.assign(new Error('Message type is required'), { code: 400, error_code: 'invalid_message_type' });
            }
            if (type.length > TYPE_MAX_LEN) {
                throw Object.assign(new Error(`Message type must be ${TYPE_MAX_LEN} characters or fewer`), { code: 400, error_code: 'invalid_message_type' });
            }
        }

        const patch: Partial<MessageBar> = {};

        if (input.type !== undefined) patch.type = input.type.trim();
        if (input.content !== undefined) patch.content = input.content;
        if (input.withLink !== undefined) patch.withLink = input.withLink;
        if (input.link !== undefined) patch.link = input.link;
        if (input.active !== undefined) {
            patch.active = input.active;
            // Switching a banner on (re)starts its expiry countdown.
            if (input.active && !existing.active) {
                patch.activatedAt = new Date();
            }
        }

        if (input.duration !== undefined) {
            const duration = input.duration ? input.duration : null;
            if (duration && !VALID_DURATIONS.includes(duration)) {
                throw Object.assign(new Error('Invalid duration'), { code: 400, error_code: 'invalid_duration' });
            }
            patch.duration = duration;
            // Keep customDuration consistent with the selected duration.
            if (duration === 'custom') {
                patch.customDuration = input.customDuration ?? existing.customDuration ?? '';
            } else {
                patch.customDuration = null;
            }
        } else if (input.customDuration !== undefined) {
            // customDuration edited without changing the duration kind.
            patch.customDuration = input.customDuration;
        }

        const updated = await this.messageBarRepo.update(id, patch);
        if (!updated) {
            throw Object.assign(new Error('Message bar not found'), { code: 404, error_code: 'message_bar_not_found' });
        }
        return updated;
    }
}
