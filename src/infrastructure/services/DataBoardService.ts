import { config } from '../../shared/config/index.js';

/**
 * Detach a deleted team from every data-board resource (CRM boards + knowledge
 * folders) that references it in `managers`. Mirrors the legacy backend's board
 * cleanup on team deletion (TeamController.delete) and the marketplace
 * counterpart (detachTeamAgents):
 * - resource managed by several teams → only the deleted team is removed;
 * - the deleted team was its ONLY manager → reassigned to `fallbackTeamId`
 *   (the BU's default team) instead of being opened org-wide.
 * Best-effort: failures are logged and swallowed so they never block or break
 * team deletion. Internal-only endpoint, no auth (same as _seed_default).
 */
export async function detachTeamBoards(
    organizationId: string,
    teamId: string,
    fallbackTeamId?: string,
): Promise<void> {
    if (!organizationId || !teamId) {
        console.error('detachTeamBoards: missing organizationId or teamId');
        return;
    }
    const url = `${config.services.dataBoard.baseUrl}/api/boards/_detach_team`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                organization_id: organizationId,
                team_id: teamId,
                fallback_team_id: fallbackTeamId,
            }),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error(
                `detachTeamBoards: data-board returned ${res.status} for team ${teamId}: ${text}`,
            );
        }
    } catch (err) {
        console.error(
            `detachTeamBoards: failed for team ${teamId} (${(err as Error).message})`,
        );
    }
}
