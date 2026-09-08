export interface LoginAttemptEmail {
    id: string;
    email: string;
    count: number;
    isReachLimit: boolean;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ILoginAttemptEmailRepository {
    findByEmail(email: string): Promise<LoginAttemptEmail | null>;
    create(data: Partial<LoginAttemptEmail>): Promise<LoginAttemptEmail>;
    deleteById(id: string): Promise<void>;
}
