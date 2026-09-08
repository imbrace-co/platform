import { injectable, inject } from 'tsyringe';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { Organization } from '../../../domain/entities/Organization.js';

@injectable()
export class ListUserOrganizations {
    constructor(
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
        @inject('UserRepository') private userRepo: IUserRepository,
    ) { }

    async execute(email: string, offset: number = 0, limit: number = 10): Promise<{ data: Organization[], dbCount: number, pageRecordCount: number }> {
        // 1. Get total user records for this email (matching backend count)
        const dbCount = await this.userRepo.countByEmail(email);

        if (dbCount === 0) {
            return { data: [], dbCount: 0, pageRecordCount: 0 };
        }

        // 2. Get user records
        // If limit is 0, we fetch all (as backend does for _all endpoint)
        let users = await this.userRepo.listByEmail(email, offset, limit === 0 ? dbCount : limit);
        
        // Backend filters out DEACTIVATED users in indexAll
        users = users.filter(user => user.status !== 'deactivated');
        
        const orgIds = users.map(user => user.organizationId);
        
        if (orgIds.length === 0) {
            return { data: [], dbCount, pageRecordCount: 0 };
        }

        // 3. Fetch organization details for those IDs
        const organizations = await this.orgRepo.listByIds(orgIds);

        return { data: organizations, dbCount, pageRecordCount: users.length };
    }
}
