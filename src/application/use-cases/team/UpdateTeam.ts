import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { IBusinessUnitUserRepository } from '../../../domain/repositories/IBusinessUnitUserRepository.js';
import { Team } from '../../../domain/entities/Team.js';
import { TeamUser } from '../../../domain/entities/TeamUser.js';

export interface UpdateTeamResult {
    error?: string;
    code?: number;
    status?: number;
    team?: Team;
    teamUsers?: TeamUser[];
}

@injectable()
export class UpdateTeam {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
        @inject('BusinessUnitUserRepository') private buUserRepo: IBusinessUnitUserRepository,
    ) { }

    async execute(teamId: string, callerId: string, body: any): Promise<UpdateTeamResult> {
        const team = await this.teamRepo.findById(teamId);
        if (!team) {
            return { error: 'Not found', code: 40004, status: 404 };
        }

        const buUser = await this.buUserRepo.findByUserAndBU(team.businessUnitId!, callerId);
        if (!buUser) {
            return { error: 'Forbidden, insufficient permission', code: 40003, status: 403 };
        }

        const { name, is_disabled, icon_url } = body;
        const updateParams: any = {};

        if (name) {
            if (name !== team.name) {
                const existingTeam = await this.teamRepo.findByBuAndName(team.businessUnitId!, name);
                if (existingTeam && existingTeam.id !== team.id) {
                    return { error: 'Team name already exists in this business unit (case-insensitive)', code: 40000, status: 400 };
                }
            }
            updateParams.name = name;
        }

        if (typeof is_disabled === 'boolean') {
            if (is_disabled && team.isDefault) {
                return { error: 'is default team, refuse to disabled', code: 8, status: 403 };
            }
            updateParams.isDisabled = is_disabled;
        }

        if (typeof icon_url === 'string') {
            updateParams.iconUrl = icon_url;
        }

        const updatedTeam = await this.teamRepo.update(teamId, updateParams);
        if (!updatedTeam) {
            return { error: 'Service unavailable, please try again later', code: 99999, status: 500 };
        }

        const teamUsers = await this.teamUserRepo.findAllByTeamId(teamId);
        return { team: updatedTeam, teamUsers };
    }
}
