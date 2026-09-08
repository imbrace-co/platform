export interface TeamUser {
    id: string;
    teamId: string;
    userId: string;
    role: string;
    state: string;
    organizationId?: string | null;
    businessUnitId?: string | null;
    publicId?: string | null;
    applicant: string;
    approver: string;
    updater: string;
    approverAt: string;
    waitLeave: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Embedded user (populated by listByTeam)
    user?: {
        id: string;
        publicId: string;
        organizationId: string;
        email: string;
        role: string;
        displayName: string;
        avatarUrl: string;
        firstName: string;
        lastName: string;
        gender: string;
        areaCode: string;
        phoneNumber: string;
        language: string;
        status: string;
        isBot: boolean;
        isActive: boolean;
        isArchived: boolean;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null;
}
