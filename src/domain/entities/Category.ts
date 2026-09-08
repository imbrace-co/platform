export interface Category {
    id: string;
    publicId: string | null;
    name: string;
    description: string | null;
    applyTo: string[];
    isDefault: boolean;
    organizationId: string;
    referenceId: string | null;
    isDeleted: boolean;
    extra: Record<string, any>;
    createdAt: Date | null;
    updatedAt: Date | null;
}
