export interface Access {
    id: string;
    token: string;
    refreshToken?: string | null;
    userId: string;
    expiresAt: Date;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}

export interface IAccessRepository {
    findByToken(token: string): Promise<Access | null>;
    create(data: Partial<Access>): Promise<Access>;
    deleteByUserId(userId: string): Promise<void>;
}
