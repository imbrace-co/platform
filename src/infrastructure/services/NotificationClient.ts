/**
 * In-app notification client → channel-service.
 *
 * The notifications table lives in channel-service, but team events
 * (invite / join-request / approve) happen here. We POST to channel-service's
 * internal create endpoint (`POST /internal/notifications`, no user auth, over
 * .lan) to persist them — mirroring the monolith's notificationCenter.create.
 *
 * Fire-and-forget: a notification failure must never break the team flow, so
 * callers should not await the result (same posture as sendTeamInvitationEmail).
 */
import axios from 'axios';
import { config } from '../../shared/config/index.js';

// Numeric values are a frontend contract — keep in sync with
// channel-service/src/domain/shared/notification-types.ts and the monolith's
// NotificationsTypeEnum.
export const NotificationType = {
    TEAM_INVITE: 301,
    TEAM_JOIN_REQUEST: 302,
    TEAM_INVITE_APPROVED: 303,
    TEAM_JOIN_REQUEST_APPROVED: 304,
    TEAM_ADMIN_CAN_LEAVE: 305,
} as const;

export interface NotificationPayload {
    type: number;
    recipient: string;
    from?: string;
    title?: string;
    content?: string;
    action_to?: Record<string, unknown>;
}

const http = axios.create({
    baseURL: config.services.channelService.baseUrl,
    timeout: 5000,
});

/**
 * Persist one or many notifications. Best-effort: errors are swallowed so the
 * caller's main flow is unaffected. Does not throw.
 */
export async function createNotifications(
    orgId: string,
    payload: NotificationPayload | NotificationPayload[],
): Promise<void> {
    try {
        await http.post('/internal/notifications', payload, {
            headers: { 'x-organization-id': orgId, 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[NotificationClient] failed to create notification(s):', (err as Error).message);
    }
}
