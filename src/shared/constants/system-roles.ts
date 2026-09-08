/**
 * The 4 built-in system roles seeded into every organization.
 *
 * Single source of truth shared by org-creation seeding (CreateOrganization) and
 * the backfill script. `key` matches the legacy `users.role` values, so existing
 * data aligns the instant these rows exist. `priority` mirrors the historical
 * ROLE_HIERARCHY (lower = higher authority).
 *
 * System roles are undeletable and their `key`/`priority`/`isSystem` are immutable;
 * only `name`/`description`/`permissions` may be edited via the API (owner stays `['*']`).
 */
import { generateId } from '../utils/id-generator.js';
import {
    PERMISSION_GROUPS,
    ALL_PERMISSIONS,
    WILDCARD,
} from './permissions.js';

// Product-feature groups split by their WRITE tier in the permission matrix:
//   TECH  → read for every role, write for owner/admin/technician
//   ADMIN → read for every role, write for owner/admin only (technician stays read-only)
// `member` is intentionally absent — member management is governed by `users:*` (see permissions.ts).
const MODULE_KEYS_TECH_WRITE = [
    'conversation', 'databoards', 'campaign', 'channels', 'crm',
    'events', 'document_model', 'ai_agent',
    'knowledge_hub', 'workflows_v2',
] as const;
const MODULE_KEYS_ADMIN_WRITE = ['templates', 'marketplace'] as const;
// Read for every role, but NO write permission exists in the catalog (e.g. insight_iq / InsightIQ).
const MODULE_KEYS_READ_ONLY = ['insight_iq'] as const;

// Every product-feature :read — granted to every role (incl. system `user`).
const MODULE_READS: string[] = [...MODULE_KEYS_TECH_WRITE, ...MODULE_KEYS_ADMIN_WRITE, ...MODULE_KEYS_READ_ONLY]
    .flatMap((k) => PERMISSION_GROUPS[k])
    .filter((p) => p.endsWith(':read'));
// Product-feature :write granted to technician (and above). admin/owner cover the rest via ALL_PERMISSIONS / '*'.
const TECH_MODULE_WRITES: string[] = MODULE_KEYS_TECH_WRITE
    .flatMap((k) => PERMISSION_GROUPS[k])
    .filter((p) => p.endsWith(':write'));

export interface SystemRoleDef {
    key: string;
    name: string;
    description: string;
    priority: number;
    permissions: string[];
}

export const SYSTEM_ROLES: SystemRoleDef[] = [
    {
        key: 'owner',
        name: 'Owner',
        description: 'Full, unrestricted access to the organization.',
        priority: 0,
        permissions: [WILDCARD],
    },
    {
        key: 'admin',
        name: 'Admin',
        description: 'Manage the organization, members, and all modules (except billing).',
        priority: 1,
        // Everything except billing.
        permissions: ALL_PERMISSIONS.filter((p) => p !== 'org:billing'),
    },
    {
        key: 'technician',
        name: 'Technician',
        description: 'Work across all product modules; read-only on org administration.',
        priority: 2,
        // Matrix: reads every module; writes the TECH-tier modules (NOT templates/marketplace). Org-admin
        // access limited to users/teams/api_keys reads + teams:manage_members + ai_tracing:read — NO roles/sso/manage.
        permissions: [
            'org:read', 'business_units:read', // infra reads (not product permissions in the matrix)
            'users:read', 'teams:read', 'teams:manage_members', 'api_keys:read', 'ai_tracing:read',
            ...MODULE_READS,
            ...TECH_MODULE_WRITES,
        ],
    },
    {
        key: 'user',
        name: 'User',
        description: 'Standard member: read modules and participate in conversations.',
        priority: 3,
        permissions: ['org:read', 'teams:read', 'users:read', ...MODULE_READS, 'conversation:write'],
    },
];

export const SYSTEM_ROLE_KEYS: string[] = SYSTEM_ROLES.map((r) => r.key);

/** Look up a system role definition by key. */
export function getSystemRole(key: string): SystemRoleDef | undefined {
    return SYSTEM_ROLES.find((r) => r.key === key);
}

/** Build insertable `roles` rows for a given org (used by seeding + backfill). */
export function buildSystemRoleRows(organizationId: string, createdBy?: string | null) {
    return SYSTEM_ROLES.map((r) => ({
        id: generateId('role'),
        organizationId,
        key: r.key,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        priority: r.priority,
        isSystem: true,
        isActive: true,
        createdBy: createdBy ?? null,
    }));
}
