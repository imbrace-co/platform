export interface Organization {
    id: string;
    publicId: string;
    name: string;
    iconUrl: string | null;
    isPaid: boolean;
    aiSettings: any;
    modules: any;
    sidebar: any | null;
    partition: number;
    isActive: boolean;
    organizationLockFeatures?: any;
    apps?: any;
    createdAt: Date | null;
    updatedAt: Date | null;
}
