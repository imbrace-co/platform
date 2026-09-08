export interface User {
    id: string;
    publicId: string;
    organizationId: string;
    email: string;
    role: string;
    displayName: string;
    avatarUrl: string;
    gender: string;
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2: string;
    areaCode: string;
    phoneNumber: string;
    language: string;
    status: string;
    isBot: boolean;
    isAdmin: boolean;
    isDeleted: boolean;
    isArchived: boolean;
    isActive: boolean;
    onBoarded: boolean;
    customerId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
