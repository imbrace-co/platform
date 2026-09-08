import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IBusinessUnitRepository } from '../../../domain/repositories/IBusinessUnitRepository.js';
import { IBusinessUnitUserRepository, BusinessUnitUser } from '../../../domain/repositories/IBusinessUnitUserRepository.js';
import { IOrganizationRepository } from '../../../domain/repositories/IOrganizationRepository.js';
import { ILoginUserRepository } from '../../../domain/repositories/ILoginUserRepository.js';
import { User } from '../../../domain/entities/User.js';
import { sendInvitationEmail } from '../../../infrastructure/services/EmailService.js';
import { config } from '../../../shared/config/index.js';
import { generateId } from '../../../shared/utils/id-generator.js';

const VALID_ROLES = ['owner', 'member'];

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface InvitationItem {
    email: string;
    role: string;
}

export interface BulkInviteResult {
    users: User[];
    conflict?: InvitationItem[];
}

@injectable()
export class BulkInviteUsers {
    constructor(
        @inject('UserRepository') private userRepo: IUserRepository,
        @inject('BusinessUnitRepository') private buRepo: IBusinessUnitRepository,
        @inject('BusinessUnitUserRepository') private buUserRepo: IBusinessUnitUserRepository,
        @inject('OrganizationRepository') private orgRepo: IOrganizationRepository,
        @inject('LoginUserRepository') private loginUserRepo: ILoginUserRepository,
    ) { }

    // Open-source edition: there is no email/OTP delivery, so each invited member
    // is given a default password and can sign in with email + password right
    // away (they should change it afterwards). Creates a verified LoginUser if one
    // doesn't already exist for the email; never overwrites an existing password.
    private async ensureLoginUser(email: string): Promise<void> {
        const existing = await this.loginUserRepo.findByEmail(email);
        if (existing) return;
        await this.loginUserRepo.create({
            id: generateId('lu'),
            email,
            password: bcrypt.hashSync(config.auth.defaultInvitePassword),
            isVerify: true,
        });
    }

    async execute(
        orgId: string,
        inviterName: string,
        rawInvitations: any[]
    ): Promise<BulkInviteResult> {
        // Validate and normalize
        const invitations: InvitationItem[] = [];
        const seen = new Set<string>();

        for (const item of rawInvitations) {
            if (typeof item !== 'object' || item === null) continue;
            if (!isValidEmail(item?.email)) continue;
            if (!VALID_ROLES.includes(item?.role)) continue;

            const email = (item.email as string).toLowerCase().replace(/\s+/g, '');
            if (seen.has(email)) continue;
            seen.add(email);
            invitations.push({ email, role: item.role });
        }

        // Check for existing active users
        const existing = await Promise.all(
            invitations.map(async (inv) => ({
                invitation: inv,
                user: await this.userRepo.findByEmail(orgId, inv.email),
            }))
        );

        const activeConflicts = existing.filter((e) => e.user && !e.user.isDeleted);
        if (activeConflicts.length > 0) {
            return { users: [], conflict: activeConflicts.map((e) => e.invitation) };
        }

        // Get default business unit and organization info
        const [defaultBu, org] = await Promise.all([
            this.buRepo.findFirstByOrganization(orgId),
            this.orgRepo.findById(orgId),
        ]);

        // Process invitations
        const users = await Promise.all(
            existing.map(async ({ invitation, user }) => {
                let resultUser: User;

                if (user && user.isDeleted) {
                    // Reactivate soft-deleted user. _remove sets status='removed',
                    // isDeleted=true and drops BU membership, so restore all of it.
                    const updated = await this.userRepo.update(user.id, {
                        isDeleted: false,
                        status: 'active',
                        role: invitation.role,
                        firstName: invitation.email,
                        displayName: invitation.email,
                        onBoarded: false,
                    });
                    resultUser = updated!;
                } else {
                    // Create new user
                    resultUser = await this.userRepo.create({
                        organizationId: orgId,
                        firstName: invitation.email,
                        displayName: invitation.email,
                        email: invitation.email,
                        role: invitation.role,
                        status: 'active',
                        isBot: false,
                        isAdmin: false,
                        isDeleted: false,
                        isArchived: false,
                        isActive: true,
                        onBoarded: false,
                    });
                }

                // (Re)join default business unit — covers both brand-new users
                // and reactivated ones whose membership was removed.
                if (defaultBu) {
                    await this.buUserRepo.create({
                        organizationId: orgId,
                        businessUnitId: defaultBu.id,
                        userId: resultUser.id,
                        role: 'member',
                    }).catch(() => {});
                }

                // Create a login account with the default password so the
                // member can sign in with email + password (no email needed).
                // Applies to both new and reactivated users.
                await this.ensureLoginUser(invitation.email);

                // Send invitation email (fire-and-forget; no-op if SMTP unset)
                sendInvitationEmail(invitation.email, org?.name ?? '', inviterName).catch(() => {});

                return resultUser;
            })
        );

        return { users };
    }
}
