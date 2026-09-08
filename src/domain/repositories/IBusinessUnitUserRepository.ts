export interface BusinessUnitUser {
    id: string;
    organizationId: string;
    businessUnitId: string;
    userId: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IBusinessUnitUserRepository {
    listByUser(userId: string, offset: number, limit: number): Promise<BusinessUnitUser[]>;
    findFirstByUser(userId: string): Promise<BusinessUnitUser | null>;
    countByUser(userId: string): Promise<number>;
    findByUserAndBU(buId: string, userId: string): Promise<BusinessUnitUser | null>;
    create(data: Partial<BusinessUnitUser>): Promise<BusinessUnitUser>;
    update(id: string, data: Partial<BusinessUnitUser>): Promise<BusinessUnitUser | null>;
    delete(id: string): Promise<boolean>;
}
