export interface LoginAccess {
    id: string;
    email: string;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ILoginAccessRepository {
    findByToken(token: string): Promise<LoginAccess | null>;
    findByEmail(email: string): Promise<LoginAccess | null>;
    create(data: Partial<LoginAccess>): Promise<LoginAccess>;
    deleteById(id: string): Promise<void>;
}
