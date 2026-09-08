export interface LoginUser {
    id: string;
    email: string;
    password?: string;
    customerId: string | null;
    isVerify: boolean;
    // Profile fields
    authId?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    tokenLogin?: string | null;
    profile?: string | null; // JSON string
    verifyCode?: string | null;
    verifyExpiredAt?: Date | null;
    providerType?: string | null;
    providerId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
