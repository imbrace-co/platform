export interface ApiKey {
    id: string;
    apiKey: string;
    name: string;
    organizationId: string;
    userId: string;
    isActive: boolean;
    isTemp: boolean;
    permissions: Record<string, { read: boolean; write: boolean }>;
    expiredAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}
