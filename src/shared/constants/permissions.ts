/**
 * Central permission catalog (code-defined).
 *
 * This service is the single source of truth for permissions across the whole
 * product. Permission keys are `resource:action` strings. The catalog is the
 * validation source for `roles.permissions` and the payload of
 * `GET /v1/roles/permissions` so a UI can render a resource x action matrix.
 *
 * Extending = append a key to a group below. The owner role (`['*']`) auto-covers
 * any new key; other roles opt in via the management API.
 *
 * Permissions and `organizations.modules` are DECOUPLED — a permission group is not
 * required to have a matching org module, and vice versa. Notably: member management
 * is governed by the `users:*` group (no `member:*`); `document_model` / `ai_agent` /
 * `ai_tracing` are permission features with no org-module toggle; and some org modules
 * (workflows v1, credentials, analytics, apps) are gated by org role only, not RBAC.
 */

export const WILDCARD = '*';

export const PERMISSION_GROUPS = {
    // --- platform-service resources ---
    users: ['users:read', 'users:invite', 'users:update', 'users:remove', 'users:change_role'],
    teams: ['teams:read', 'teams:create', 'teams:update', 'teams:delete', 'teams:manage_members'],
    business_units: ['business_units:read', 'business_units:create', 'business_units:update', 'business_units:delete'],
    org: ['org:read', 'org:settings', 'org:billing'],
    roles: ['roles:read', 'roles:manage'],
    api_keys: ['api_keys:read', 'api_keys:manage'],
    audit_trail: ['audit_trail:read', 'audit_trail:write'],
    llm_providers: ['llm_providers:read', 'llm_providers:write'],
    guardrail_providers: ['guardrail_providers:read', 'guardrail_providers:write'],
    // --- product features (each has a FE gate; NOT necessarily 1:1 with organizations.modules keys) ---
    conversation: ['conversation:read', 'conversation:write'],
    databoards: ['databoards:read', 'databoards:write'],
    campaign: ['campaign:read', 'campaign:write'],
    channels: ['channels:read', 'channels:write'],
    templates: ['templates:read', 'templates:write'],
    marketplace: ['marketplace:read', 'marketplace:write'],
    crm: ['crm:read', 'crm:write'],
    events: ['events:read', 'events:write'],
    document_model: ['document_model:read', 'document_model:write'],
    ai_agent: ['ai_agent:read', 'ai_agent:write'],
    knowledge_hub: ['knowledge_hub:read', 'knowledge_hub:write'],
    insight_iq: ['insight_iq:read'],
    workflows_v2: ['workflows_v2:read', 'workflows_v2:write'],
    ai_tracing: ['ai_tracing:read'],
} as const;

/** Flat list of every valid permission key. */
export const ALL_PERMISSIONS: string[] = Object.values(PERMISSION_GROUPS).flat();

/** O(1) membership set for validation. */
export const PERMISSION_SET: Set<string> = new Set(ALL_PERMISSIONS);

/** Permission keys covering only the product modules (read variants), for default roles. */
export const MODULE_READ_PERMISSIONS: string[] = ALL_PERMISSIONS.filter((p) => p.endsWith(':read'));

/** True if `key` is a recognized catalog permission. */
export function isValidPermission(key: string): boolean {
    return PERMISSION_SET.has(key);
}

/**
 * Pure local evaluation — shareable with downstream services that receive a
 * forwarded permission set. `'*'` (WILDCARD) grants everything.
 */
export function hasPermission(perms: string[] | undefined | null, ...required: string[]): boolean {
    if (!perms || perms.length === 0) return false;
    if (perms.includes(WILDCARD)) return true;
    return required.every((r) => perms.includes(r));
}

/** Expand a stored permission list to its concrete keys (`['*']` -> ALL_PERMISSIONS). */
export function expandPermissions(perms: string[] | undefined | null): string[] {
    if (perms && perms.includes(WILDCARD)) return [...ALL_PERMISSIONS];
    return perms ?? [];
}
