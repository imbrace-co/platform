import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { ITeamUserRepository } from '../../../domain/repositories/ITeamUserRepository.js';
import { ITeamRepository } from '../../../domain/repositories/ITeamRepository.js';
import { User } from '../../../domain/entities/User.js';
import { getUploadPath, uploadFile } from '../../../shared/utils/s3.js';

export class AccountController {

    private static toAccountResponse(user: User, options: {
        teamRoles?: any[];
        org?: any;
    } = {}) {
        const u = user as any;
        const ent: any = {
            object_name: 'account',
            id: u.publicId || u.id,
            organization_id: u.organizationId,
            display_name: u.displayName || '',
            avatar_url: u.avatarUrl || '',
            gender: u.gender || '',
            first_name: u.firstName || '',
            last_name: u.lastName || '',
            address_line1: u.addressLine1 || '',
            address_line2: u.addressLine2 || '',
            area_code: u.areaCode || '',
            phone_number: u.phoneNumber || '',
            email: u.email || '',
            language: u.language || '',
            role: u.role,
            status: u.status || '',
            is_active: u.isActive,
            is_archived: u.isArchived,
            created_at: u.createdAt ? new Date(u.createdAt).toISOString() : null,
            updated_at: u.updatedAt ? new Date(u.updatedAt).toISOString() : null,
            on_boarded: u.onBoarded || false,
            expired_at: u.expiredAt || null,
        };

        if (options.teamRoles !== undefined) {
            ent.team_roles = options.teamRoles;
        }

        if (options.org) {
            const org = options.org as any;
            ent.organization_name = org.name || '';
            ent.organization_modules = org.modules || {};
            ent.organization_lock_features = org.organizationLockFeatures || org.organization_lock_features || [];
            ent.partition = org.partition || 0;
            ent.is_paid = Boolean(org.isPaid || org.is_paid || (org.partition && org.partition > 0));
            ent.support = {};
        }

        return ent;
    }

    private static async buildTeamRoles(userId: string, orgId: string) {
        const teamUserRepo = container.resolve<ITeamUserRepository>('TeamUserRepository');
        const teamRepo = container.resolve<ITeamRepository>('TeamRepository');

        const teamUsers = await teamUserRepo.listByUser(userId);
        const teamRoles: any[] = [];

        for (const tu of teamUsers as any[]) {
            const team = await teamRepo.findById(tu.teamId);
            if (!team) continue;
            if ((team as any).isDisabled || (team as any).isDelete) continue;

            teamRoles.push({
                object_name: 'team_user',
                id: tu.publicId || tu.id,
                organization_id: tu.organizationId || orgId,
                business_unit_id: tu.businessUnitId || '',
                team_id: tu.teamId,
                user_id: tu.userId,
                role: tu.role || 'member',
                state: tu.state || 'join',
                team: {
                    object_name: 'team',
                    id: (team as any).publicId || (team as any).id,
                    organization_id: (team as any).organizationId,
                    business_unit_id: (team as any).businessUnitId || '',
                    name: team.name,
                    mode: team.mode,
                    icon_url: (team as any).iconUrl || '',
                    description: (team as any).description || '',
                    is_default: (team as any).isDefault,
                    is_joined: undefined,
                    user_state: tu.state || '',
                    created_at: (team as any).createdAt ? new Date((team as any).createdAt).toISOString() : null,
                    updated_at: (team as any).updatedAt ? new Date((team as any).updatedAt).toISOString() : null,
                    is_disabled: (team as any).isDisabled === true,
                    is_delete: (team as any).isDelete,
                },
            });
        }

        return teamRoles;
    }

    // GET /v1/account — matches backend: show → ents.account.new(ctxUser, { with_teams, with_organization })
    static async show(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            if (!ctxUser) return c.json({ code: 40001, message: 'Unauthorized' }, 401);

            const orgRepo = container.resolve<IOrganizationRepository>('OrganizationRepository');
            const org = await orgRepo.findByIdIncludeInactive(ctxUser.organizationId);

            const teamRoles = await AccountController.buildTeamRoles(ctxUser.id, ctxUser.organizationId);

            return c.json(AccountController.toAccountResponse(ctxUser, { teamRoles, org }), 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // PUT /v1/account — matches backend: update → mgrs.user.update → ents.account.new(mUser, { with_teams })
    static async update(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            if (!ctxUser) return c.json({ code: 40001, message: 'Unauthorized' }, 401);

            const body = await c.req.json();
            const userRepo = container.resolve<IUserRepository>('UserRepository');

            const updateParams: Partial<User> = {};
            if (typeof body.display_name === 'string') updateParams.displayName = body.display_name.trim();
            if (typeof body.avatar_url === 'string') updateParams.avatarUrl = body.avatar_url;
            if (typeof body.first_name === 'string') updateParams.firstName = body.first_name.trim();
            if (typeof body.last_name === 'string') updateParams.lastName = body.last_name.trim();
            if (typeof body.gender === 'string') updateParams.gender = body.gender.trim().toLowerCase();
            if (typeof body.language === 'string') updateParams.language = body.language.trim().toLowerCase();
            if (typeof body.area_code === 'string') updateParams.areaCode = body.area_code.replace(/\s+/g, '');
            if (typeof body.phone_number === 'string') updateParams.phoneNumber = body.phone_number.replace(/\s+/g, '');
            if (typeof body.on_boarded === 'boolean') updateParams.onBoarded = body.on_boarded;

            const updated = await userRepo.update(ctxUser.id, updateParams);
            if (!updated) return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);

            const teamRoles = await AccountController.buildTeamRoles(updated.id, updated.organizationId);

            return c.json(AccountController.toAccountResponse(updated, { teamRoles }), 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // POST /v1/account/_fileupload — matches backend: fileupload → s3 upload → { url }
    static async fileupload(c: Context) {
        try {
            const ctxUser = c.get('user') as any;
            if (!ctxUser) return c.json({ code: 40001, message: 'Unauthorized' }, 401);

            const body = await c.req.parseBody();
            const file = body['file'] as File | undefined;
            if (!file || typeof file === 'string') {
                return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
            }

            const ext = file.type.split('/').pop() || 'bin';
            const uploadPath = getUploadPath('user', ctxUser.organizationId, ext);
            const buffer = Buffer.from(await file.arrayBuffer());
            const url = await uploadFile(uploadPath, buffer, file.type);

            return c.json({ url }, 200);
        } catch (err: any) {
            console.error(err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }
}
