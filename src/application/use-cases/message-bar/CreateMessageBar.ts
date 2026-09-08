import { injectable, inject } from 'tsyringe';
import { IMessageBarRepository } from '../../../domain/repositories/IMessageBarRepository.js';
import {
    MessageBar,
    MessageBarDuration,
} from '../../../domain/entities/MessageBar.js';
import { generateId } from '../../../shared/utils/id-generator.js';

const VALID_DURATIONS: MessageBarDuration[] = ['forever', '1_day', '3_days', '7_days', 'custom'];
// Built-in presets; admins may also supply a custom type (any non-empty string).
const TYPE_MAX_LEN = 32;

export interface CreateMessageBarDTO {
    type?: string;
    content?: string;
    withLink?: boolean;
    link?: string;
    duration?: MessageBarDuration | '';
    customDuration?: string;
    active?: boolean;
}

@injectable()
export class CreateMessageBar {
    constructor(
        @inject('MessageBarRepository') private messageBarRepo: IMessageBarRepository,
    ) {}

    async execute(input: CreateMessageBarDTO): Promise<MessageBar> {
        const type = (input.type ?? 'system_upgrade').trim();
        if (!type) {
            throw Object.assign(new Error('Message type is required'), { code: 400, error_code: 'invalid_message_type' });
        }
        if (type.length > TYPE_MAX_LEN) {
            throw Object.assign(new Error(`Message type must be ${TYPE_MAX_LEN} characters or fewer`), { code: 400, error_code: 'invalid_message_type' });
        }

        const duration = input.duration ? input.duration : null;
        if (duration && !VALID_DURATIONS.includes(duration)) {
            throw Object.assign(new Error('Invalid duration'), { code: 400, error_code: 'invalid_duration' });
        }

        const active = input.active ?? false;
        const data: Partial<MessageBar> = {
            id: generateId('mb'),
            type,
            content: input.content ?? '',
            withLink: Boolean(input.withLink),
            link: input.link ?? '',
            duration,
            customDuration: duration === 'custom' ? (input.customDuration ?? '') : null,
            active,
            activatedAt: active ? new Date() : null,
        };

        return this.messageBarRepo.create(data);
    }
}
