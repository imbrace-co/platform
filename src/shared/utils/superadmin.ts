import { config } from '../config/index.js';

/**
 * True when `email` matches a configured superadmin — either an entry in
 * SUPERADMIN_EMAILS or the legacy IMBRACE_USERNAME. Case/space-insensitive.
 * Shared by accessMiddleware and the internal superadmin guard.
 */
export function isSuperadminEmail(email: string | undefined | null): boolean {
    // The email we're checking, normalized (lowercase, no spaces).
    const target = (email || '').trim().toLowerCase();
    if (!target) return false;

    // All configured superadmin emails = SUPERADMIN_EMAILS list + the legacy
    // single IMBRACE_USERNAME, all normalized the same way.
    const superadmins = [
        ...config.auth.superadminEmails,
        config.auth.superadminEmail,
    ]
        .map((e) => e?.trim().toLowerCase())
        .filter(Boolean);

    return superadmins.includes(target);
}
