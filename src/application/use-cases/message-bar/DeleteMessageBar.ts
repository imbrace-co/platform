import { injectable, inject } from 'tsyringe';
import { IMessageBarRepository } from '../../../domain/repositories/IMessageBarRepository.js';

@injectable()
export class DeleteMessageBar {
    constructor(
        @inject('MessageBarRepository') private messageBarRepo: IMessageBarRepository,
    ) {}

    async execute(id: string): Promise<void> {
        const existing = await this.messageBarRepo.findById(id);
        if (!existing) {
            throw Object.assign(new Error('Message bar not found'), { code: 404, error_code: 'message_bar_not_found' });
        }
        await this.messageBarRepo.delete(id);
    }
}
