import { injectable, inject } from 'tsyringe';
import { ChangeUserRole } from './ChangeUserRole.js';
import { User } from '../../../domain/entities/User.js';

export interface RoleAssignment {
    userId: string;
    role: string;
}

export interface BulkChangeRoleResult {
    updated: User[];
    errors: Array<{ user_id: string; role: string; status?: number; error: string }>;
    updated_count: number;
    error_count: number;
}

/**
 * Bulk role assignment. Delegates each item to ChangeUserRole so all current
 * validation and guards (role existence, owner-immutability, no-self-change)
 * apply identically — failures are collected per-item rather than aborting.
 */
@injectable()
export class BulkChangeUserRole {
    constructor(
        @inject(ChangeUserRole) private changeUserRole: ChangeUserRole,
    ) { }

    async execute(
        orgId: string,
        requesterId: string,
        assignments: RoleAssignment[],
    ): Promise<BulkChangeRoleResult> {
        const updated: User[] = [];
        const errors: BulkChangeRoleResult['errors'] = [];

        for (const a of assignments) {
            if (!a?.userId || !a?.role) {
                errors.push({
                    user_id: a?.userId ?? '',
                    role: a?.role ?? '',
                    status: 400,
                    error: 'user_id and role are required',
                });
                continue;
            }
            const result = await this.changeUserRole.execute(a.userId, orgId, requesterId, a.role);
            if (result.error || !result.user) {
                errors.push({
                    user_id: a.userId,
                    role: a.role,
                    status: result.status,
                    error: result.error || 'Failed to change role',
                });
                continue;
            }
            updated.push(result.user);
        }

        return {
            updated,
            errors,
            updated_count: updated.length,
            error_count: errors.length,
        };
    }
}
