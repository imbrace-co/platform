export interface Team {
    id: string;
    organizationId: string;
    publicId: string | null;
    businessUnitId: string | null;
    name: string;
    mode: string;
    iconUrl: string | null;
    description: string | null;
    isDefault: boolean;
    isDisabled: boolean;
    isDelete: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
    membersCount?: number;
    adminCount?: number;
    isJoined?: boolean;
    userState?: string;
}
