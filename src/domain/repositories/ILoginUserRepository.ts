import { LoginUser } from '../entities/LoginUser.js';

export interface ILoginUserRepository {
    findByEmail(email: string): Promise<LoginUser | null>;
    findById(id: string): Promise<LoginUser | null>;
    findByAuthId(authId: string): Promise<LoginUser | null>;
    create(data: Partial<LoginUser>): Promise<LoginUser>;
    update(id: string, data: Partial<LoginUser>): Promise<LoginUser | null>;
}
