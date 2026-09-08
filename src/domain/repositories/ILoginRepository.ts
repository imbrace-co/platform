export interface LoginOtp {
    id: string;
    email: string;
    otp: string;
    count: number;
    isReachLimit: boolean;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ILoginRepository {
    findByEmail(email: string): Promise<LoginOtp | null>;
    findByEmailAndOtp(email: string, otp: string): Promise<LoginOtp | null>;
    create(data: Partial<LoginOtp>): Promise<LoginOtp>;
    update(id: string, data: Partial<LoginOtp>): Promise<LoginOtp | null>;
    deleteById(id: string): Promise<void>;
}
