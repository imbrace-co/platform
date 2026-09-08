export interface Role {
    id: string;
    organizationId: string;
    key: string;
    name: string;
    description?: string | null;
    permissions: string[];
    priority: number;
    isSystem: boolean;
    isActive: boolean;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
