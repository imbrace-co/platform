import { injectable, inject } from 'tsyringe';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { detachTeamAgents } from '../../../infrastructure/services/MarketplaceService.js';
import { detachTeamBoards } from '../../../infrastructure/services/DataBoardService.js';

export interface DeleteTeamResult {
    error?: string;
    code?: number;
    field?: string;
    status?: number;
}

@injectable()
export class DeleteTeam {
    constructor(
        @inject('TeamRepository') private teamRepo: ITeamRepository,
        @inject('TeamUserRepository') private teamUserRepo: ITeamUserRepository,
    ) { }

    async execute(teamId: string): Promise<DeleteTeamResult> {
        const team = await this.teamRepo.findById(teamId);
        if (!team) {
            return { error: 'team not found', code: 40004, field: 'team', status: 404 };
        }
        if (team.isDefault) {
            return { error: 'is default team, refuse to delete', code: 8, field: 'team', status: 400 };
        }

        await this.teamUserRepo.deleteAllByTeamId(teamId);
        await this.teamRepo.delete(teamId);

        // Detach the deleted team from team-scoped resources in downstream
        // services (best-effort, fire-and-forget — mirrors createDefaultTeamAgent
        // on team creation). Otherwise those resources keep an orphaned teamId in
        // `managers` and are hidden from every GET/list forever. Legacy semantics
        // (backend TeamController.delete): resources whose ONLY manager was
        // the deleted team are reassigned to the BU's default team.
        void this.detachTeamResources(team, teamId);

        return {};
    }

    private async detachTeamResources(team: { organizationId: string; businessUnitId: string | null }, teamId: string): Promise<void> {
        try {
            const defaultTeam = team.businessUnitId
                ? await this.teamRepo.findBuDefaultTeam(team.businessUnitId)
                : null;
            // Marketplace agents + data-board boards/knowledge folders share the
            // same managers-based access model — detach from both in parallel.
            await Promise.all([
                detachTeamAgents(team.organizationId, teamId, defaultTeam?.id),
                detachTeamBoards(team.organizationId, teamId, defaultTeam?.id),
            ]);
        } catch (err) {
            console.error(
                `detachTeamResources: failed for team ${teamId} (${(err as Error).message})`,
            );
        }
    }
}
