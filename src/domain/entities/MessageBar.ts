export type MessageBarType = 'system_upgrade' | 'emergency' | 'new_feature';
export type MessageBarDuration = 'forever' | '1_day' | '3_days' | '7_days' | 'custom';

/**
 * Environment-scoped broadcast banner.
 *
 * Message bars are global within a platform-service deployment: every
 * organization in the environment receives the active banners. Scoping to an
 * environment is achieved at the infrastructure layer — each env runs its own
 * platform-service host/database — so no per-organization column is needed.
 */
export interface MessageBar {
    id: string;
    // One of MessageBarType, or a custom admin-defined type (any string).
    type: string;
    content: string;
    withLink: boolean;
    link: string | null;
    duration: MessageBarDuration | null;
    // Number of hours the banner stays active when `duration === 'custom'`
    // (stored as a numeric string, e.g. "5"). Null for the preset durations.
    customDuration: string | null;
    active: boolean;
    // Set when the banner is switched on; anchor for the expiry countdown.
    activatedAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

// Hours each preset duration keeps a banner active. `forever` never expires;
// `custom` reads the hour count from `customDuration`.
export const DURATION_HOURS: Record<string, number> = {
    '1_day': 24,
    '3_days': 72,
    '7_days': 168,
};

/**
 * Moment an active banner stops being shown, or null when it never expires
 * (inactive, `forever`, or an invalid custom value). Anchored on `activatedAt`
 * and falling back to `createdAt` for legacy rows.
 */
export function messageBarExpiresAt(m: MessageBar): Date | null {
    if (!m.active || !m.duration || m.duration === 'forever') return null;

    let hours: number;
    if (m.duration === 'custom') {
        hours = Number(m.customDuration);
        if (!Number.isFinite(hours) || hours <= 0) return null;
    } else {
        hours = DURATION_HOURS[m.duration];
        if (!hours) return null;
    }

    const anchor = m.activatedAt ?? m.createdAt;
    if (!anchor) return null;
    return new Date(new Date(anchor).getTime() + hours * 3_600_000);
}

export function isMessageBarExpired(m: MessageBar, now: Date = new Date()): boolean {
    const expiry = messageBarExpiresAt(m);
    return expiry !== null && now.getTime() > expiry.getTime();
}
