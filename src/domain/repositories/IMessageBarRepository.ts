import { MessageBar } from '../entities/MessageBar.js';

export interface IMessageBarRepository {
    findAll(): Promise<MessageBar[]>;
    findActive(): Promise<MessageBar[]>;
    findById(id: string): Promise<MessageBar | null>;
    create(data: Partial<MessageBar>): Promise<MessageBar>;
    update(id: string, data: Partial<MessageBar>): Promise<MessageBar | null>;
    delete(id: string): Promise<void>;
}
