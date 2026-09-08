import { config } from '../../shared/config/index.js';

/**
 * Build the default agent payload (use case + AI assistant) provisioned for a new
 * team. Shape mirrors the builtin agents the marketplace already accepts, so the
 * AI service can create the assistant without extra configuration.
 */
const buildDefaultTeamAgent = (teamName: string | undefined, teamId: string) => {
    const safeName = (teamName || 'Team').trim();
    const title = `Agent team ${safeName}`;
    const coreTask = `You are a helpful assistant for the ${safeName} team. Help team members with their questions and tasks.`;

    return {
        usecase: {
            title,
            name: title,
            short_description: `Default assistant for the ${safeName} team.`,
            description: coreTask,
            agent_type: 'agent',
            suggestion_prompts: [],
            supported_channels: [],
            demo_url: '',
            // Deployment access: scope the agent to the new team only.
            team_ids: [teamId],
            // Marks this as the team's auto-provisioned default agent. The marketplace
            // persists this as a top-level field on the use case (sibling of managers).
            is_team_default_agent: true,
        },
        assistant: {
            name: title,
            mode: 'standard',
            // Required by the AI service (`assistant_apps` rejects a missing/blank
            // workflow_name with "Invalid workflow name"). Format: `${mode} | ${name}`.
            workflow_name: `standard | ${title}`,
            provider_id: 'system',
            credential_id: null,
            guardrail_id: '',
            document_ai: null,
            preload_information_type: '',
            vibe_code: false,
            core_task: coreTask,
            instructions: coreTask,
            personality_role: '',
            tone_and_style: '',
            response_length: '',
            banned_words: '',
            model: 'rag',
            model_id: 'qwen.qwen3-32b-v1:0',
            temperature: 0.1,
            streaming: true,
            show_thinking_process: false,
            use_memory: true,
            board_ids: [],
            folder_ids: [],
            default_folder_id: '',
            file_ids: [],
            knowledge_hubs: [],
            workflow_function_call: [],
            sub_agents: [],
            preload_information: '',
            metadata: {
                other_requirements: [],
                channel_id: '',
                team_ids: [teamId],
                is_team_default_agent: true,
                enable_echart: false,
                top_k_relevant_results: 3,
                top_k: 40,
            },
            version: 2,
        },
    };
};

export interface CreateDefaultTeamAgentArgs {
    organizationId: string;
    teamId: string;
    teamName?: string;
    userId?: string;
}

/**
 * Provision a default AI agent (use case + assistant) for a freshly created team
 * by calling the marketplace service directly. Best-effort: any failure is logged
 * and swallowed so it never blocks or breaks team creation. The marketplace's
 * `createCustomV2` endpoint authorizes on `x-organization-id` alone, so no user
 * token is required for this server-to-server call.
 */
export async function createDefaultTeamAgent({
    organizationId,
    teamId,
    teamName,
    userId,
}: CreateDefaultTeamAgentArgs): Promise<void> {
    if (!organizationId || !teamId) {
        console.error('createDefaultTeamAgent: missing organizationId or teamId');
        return;
    }
    const url = `${config.services.marketplace.baseUrl}/v3/use-cases/v2/custom`;
    try {
        const headers: Record<string, string> = {
            'content-type': 'application/json',
            'x-organization-id': organizationId,
        };
        if (userId) headers['x-user-id'] = userId;

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(buildDefaultTeamAgent(teamName, teamId)),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error(
                `createDefaultTeamAgent: marketplace returned ${res.status} for team ${teamId}: ${text}`,
            );
        }
    } catch (err) {
        console.error(
            `createDefaultTeamAgent: failed for team ${teamId} (${(err as Error).message})`,
        );
    }
}

/**
 * Detach a deleted team from every marketplace use case that references it in
 * `managers`/`team_ids`. Without this the team's default agent keeps an orphaned
 * teamId and is filtered out of every GET/list forever (the requester's live
 * team memberships can never contain a deleted team).
 *
 * Legacy semantics (backend TeamController.delete board cleanup):
 * - use case assigned to several teams → only the deleted team is removed;
 * - the deleted team was its ONLY team → reassigned to `fallbackTeamId`
 *   (the BU's default team) instead of being opened to the whole org.
 * The `is_team_default_agent` flag is cleared either way.
 *
 * Best-effort: failures are logged and swallowed so they never block or break
 * team deletion.
 */
export async function detachTeamAgents(organizationId: string, teamId: string, fallbackTeamId?: string): Promise<void> {
    if (!organizationId || !teamId) {
        console.error('detachTeamAgents: missing organizationId or teamId');
        return;
    }
    const query = fallbackTeamId ? `?fallback_team_id=${encodeURIComponent(fallbackTeamId)}` : '';
    const url = `${config.services.marketplace.baseUrl}/v3/use-cases/teams/${teamId}${query}`;
    try {
        const res = await fetch(url, {
            method: 'DELETE',
            headers: { 'x-organization-id': organizationId },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error(
                `detachTeamAgents: marketplace returned ${res.status} for team ${teamId}: ${text}`,
            );
        }
    } catch (err) {
        console.error(
            `detachTeamAgents: failed for team ${teamId} (${(err as Error).message})`,
        );
    }
}
