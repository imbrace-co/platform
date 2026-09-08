export interface TeamLabel {
    id: string;
    publicId: string | null;
    organizationId: string;
    businessUnitId: string | null;
    teamId: string;
    name: string;
    color: string;
    createdAt: Date | null;
    updatedAt: Date | null;
}
