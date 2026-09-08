export interface BusinessUnit {
    id: string;
    publicId: string | null;
    organizationId: string;
    name: string;
    isActive: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
}
