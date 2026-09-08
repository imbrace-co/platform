import { injectable, inject } from 'tsyringe';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';

@injectable()
export class GetTeamInviteList {
    constructor(
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
    ) { }

    async execute(orgId: string, teamId: string): Promise<any[]> {
        return this.teamUserRepo.getInviteList(orgId, teamId);
    }
}
