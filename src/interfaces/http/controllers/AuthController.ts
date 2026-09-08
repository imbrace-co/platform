import { Context } from 'hono';
import { container } from '../../../shared/di/container.js';
import { SignIn } from '../../../application/use-cases/auth/SignIn.js';
import { SignUp } from '../../../application/use-cases/auth/SignUp.js';
import { VerifyEmail } from '../../../application/use-cases/auth/VerifyEmail.js';
import { VerifyEmailCheck } from '../../../application/use-cases/auth/VerifyEmailCheck.js';
import { VerifyEmailResend } from '../../../application/use-cases/auth/VerifyEmailResend.js';
import { Authenticate, OrganizationMembership } from '../../../application/use-cases/auth/Authenticate.js';
import { ForgetPassword } from '../../../application/use-cases/auth/ForgetPassword.js';
import { ResetPassword } from '../../../application/use-cases/auth/ResetPassword.js';
import { ChangePassword } from '../../../application/use-cases/auth/ChangePassword.js';
import { LoginAccess } from '../../../domain/repositories/ILoginAccessRepository.js';
import { config } from '../../../shared/config/index.js';
import { uploadFile, getUploadPathWithEmail } from '../../../shared/utils/s3.js';

function toLoginAccessResponse(loginAccess: LoginAccess) {
    return {
        object_name: 'login_access',
        id: loginAccess.id,
        token: loginAccess.id,
        email: loginAccess.email,
        expired_at: loginAccess.expiresAt instanceof Date
            ? loginAccess.expiresAt.toISOString()
            : loginAccess.expiresAt,
    };
}

function toOrganizationEntry(org: OrganizationMembership) {
    return {
        organization_id: org.organization_id,
        display_name: org.display_name,
        icon_url: org.icon_url,
        is_paid: org.is_paid,
        is_active: org.is_active,
        role: org.role,
        is_admin: org.is_admin,
        status: org.status,
        display_name_user: org.display_name_user,
        avatar_url: org.avatar_url,
    };
}

export class AuthController {
    // POST /v1/login/sign_in
    static async signIn(c: Context) {
        let body: any;
        try {
            body = await c.req.json();
        } catch {
            return c.json({ code: 40000, field: 'body', message: 'Invalid JSON body' }, 400);
        }

        const email = typeof body.email === 'string'
            ? body.email.toLowerCase().replace(/\s+/g, '')
            : undefined;
        const password = body.password;

        if (!email || !password) {
            return c.json({ code: 1, field: !email ? 'email' : 'password', message: 'Field is required' }, 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return c.json({ code: 3, field: 'email', message: 'email must be in email format' }, 400);
        }

        try {
            const useCase = container.resolve(SignIn);
            const { loginAccess } = await useCase.execute(email, password);
            return c.json(toLoginAccessResponse(loginAccess), 200);
        } catch (err: any) {
            if (err.code === 'NOT_FOUND') {
                return c.json({ code: 40004, field: 'email', message: err.message }, 400);
            }
            if (err.code === 'INCORRECT_PASSWORD' || err.code === 'UNVERIFIED') {
                return c.json({ code: 40005, field: 'password', message: err.message }, 400);
            }
            console.error('[AuthController.signIn]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // POST /v1/login/authenticate
    static async authenticate(c: Context) {
        let body: any;
        try {
            body = await c.req.json();
        } catch {
            return c.json({ code: 40000, field: 'body', message: 'Invalid JSON body' }, 400);
        }

        const provider_type = body.provider_type || undefined;

        // --- Social provider rejected ---
        if (provider_type) {
            return c.json({ code: 40000, message: 'Social authentication is not available' }, 400);
        }

        // --- Email + password only ---
        const email = typeof body.email === 'string'
            ? body.email.toLowerCase().replace(/\s+/g, '')
            : undefined;
        const password = body.password || undefined;

        if (!email) {
            return c.json({ code: 1, field: 'email', message: 'email is required' }, 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return c.json({ code: 3, field: 'email', message: 'email must be in email format' }, 400);
        }

        if (!password) {
            return c.json({ code: 1, field: 'password', message: 'password is required' }, 400);
        }

        try {
            const useCase = container.resolve(Authenticate);
            const { loginAccess, organizations, userId } = await useCase.execute(email, password);
            return c.json({
                ...toLoginAccessResponse(loginAccess),
                user_id: userId,
                organizations: organizations.map(toOrganizationEntry),
            }, 200);
        } catch (err: any) {
            if (err.code === 'NOT_FOUND') {
                return c.json({ code: 40004, field: 'email', message: err.message }, 400);
            }
            if (err.code === 'INCORRECT_PASSWORD' || err.code === 'UNVERIFIED') {
                return c.json({ code: 40005, field: 'password', message: err.message }, 400);
            }
            console.error('[AuthController.authenticate]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/login/forget?email=...
    static async forget(c: Context) {
        const emailRaw = c.req.query('email');
        const email = typeof emailRaw === 'string'
            ? emailRaw.toLowerCase().replace(/\s+/g, '')
            : undefined;

        if (!email) {
            return c.json({ code: 1, field: 'email', message: 'email is required' }, 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return c.json({ code: 3, field: 'email', message: 'email must be in email format' }, 400);
        }

        try {
            const useCase = container.resolve(ForgetPassword);
            await useCase.execute(email);
            return c.body(null, 200);
        } catch (err: any) {
            if (err.code === 'NOT_FOUND') {
                return c.json({ code: 6, field: 'email', message: 'Not found' }, 400);
            }
            if (err.code === 'EMAIL_RATE_LIMIT') {
                return c.json({ code: 5, field: 'email', message: 'send email limit 15 minutes.' }, 400);
            }
            console.error('[AuthController.forget]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/login/forget/verify?verify_code=...&email=...
    static async forgetVerify(c: Context) {
        const emailRaw = c.req.query('email');
        const verifyCode = c.req.query('verify_code');

        const email = typeof emailRaw === 'string'
            ? emailRaw.toLowerCase().replace(/\s+/g, '')
            : undefined;

        if (!email || !verifyCode) {
            return c.redirect(`${config.appUrl}/unauthorized`);
        }

        try {
            const loginUserRepo = container.resolve<import('../../../domain/repositories/ILoginUserRepository.js').ILoginUserRepository>('LoginUserRepository');
            const loginUser = await loginUserRepo.findByEmail(email);

            if (!loginUser || !loginUser.verifyCode) {
                return c.redirect(`${config.appUrl}/unauthorized`);
            }

            if (verifyCode !== loginUser.verifyCode) {
                return c.redirect(`${config.appUrl}/unauthorized`);
            }

            return c.redirect(`${config.appUrl}/reset-password?verify_code=${verifyCode}&email=${encodeURIComponent(email)}`);
        } catch (err: any) {
            console.error('[AuthController.forgetVerify]', err);
            return c.redirect(`${config.appUrl}/unauthorized`);
        }
    }

    // POST /v1/login/sign_up
    static async signUp(c: Context) {
        let body: any;
        try {
            body = await c.req.json();
        } catch {
            return c.json({ code: 40000, field: 'body', message: 'Invalid JSON body' }, 400);
        }

        const email = typeof body.email === 'string'
            ? body.email.toLowerCase().replace(/\s+/g, '')
            : undefined;
        const password = typeof body.password === 'string' ? body.password : undefined;

        if (!email) {
            return c.json({ code: 1, field: 'email', message: 'email is required' }, 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return c.json({ code: 3, field: 'email', message: 'email must be in email format' }, 400);
        }

        if (!password) {
            return c.json({ code: 1, field: 'password', message: 'password is required' }, 400);
        }

        // Password validation: min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
        const passwordRegex = /^(?=(?:.*[A-Z])+)(?=(?:.*[a-z])+)(?=(?:.*\d)+)(?=(?:.*[!@#$%^&*_()+\-=\[\]{}|])+)([A-Za-z0-9!@#$%^&*_()+\-=\[\]{}|]{12,})$/;
        if (!passwordRegex.test(password)) {
            return c.json({ code: 3, field: 'password', message: 'password does not match the required format' }, 400);
        }

        try {
            const useCase = container.resolve(SignUp);
            await useCase.execute(email, password);
            return c.body(null, 200);
        } catch (err: any) {
            if (err.code === 'EMAIL_EXISTED') {
                return c.json({ code: 4, field: 'email', message: 'email existed' }, 400);
            }
            console.error('[AuthController.signUp]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/login/sign_up/verify?verify_code=...&email=...
    static async verify(c: Context) {
        const emailRaw = c.req.query('email');
        const verifyCode = c.req.query('verify_code');

        const email = typeof emailRaw === 'string'
            ? emailRaw.toLowerCase().replace(/\s+/g, '')
            : undefined;

        if (!email || !verifyCode) {
            return c.redirect(`${config.appUrl}/email-verification-error`);
        }

        try {
            const useCase = container.resolve(VerifyEmail);
            const { success } = await useCase.execute(email, verifyCode);

            if (!success) {
                return c.redirect(`${config.appUrl}/email-verification-error`);
            }

            return c.redirect(`${config.appUrl}/email-verified`);
        } catch (err: any) {
            console.error('[AuthController.verify]', err);
            return c.redirect(`${config.appUrl}/email-verification-error`);
        }
    }

    // GET /v1/login/sign_up/verify/check?email=...
    static async verifyCheck(c: Context) {
        const emailRaw = c.req.query('email');
        const email = typeof emailRaw === 'string'
            ? emailRaw.toLowerCase().replace(/\s+/g, '')
            : undefined;

        if (!email) {
            return c.json({ code: 1, field: 'email', message: 'email is required' }, 400);
        }

        try {
            const useCase = container.resolve(VerifyEmailCheck);
            const isVerified = await useCase.execute(email);

            if (!isVerified) {
                return c.json({ code: 40004, field: 'email', message: 'email not sign up or not verify.' }, 400);
            }

            return c.body(null, 200);
        } catch (err: any) {
            console.error('[AuthController.verifyCheck]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/login/sign_up/verify/resend?email=...
    static async verifyResend(c: Context) {
        const emailRaw = c.req.query('email');
        const email = typeof emailRaw === 'string'
            ? emailRaw.toLowerCase().replace(/\s+/g, '')
            : undefined;

        if (!email) {
            return c.json({ code: 1, field: 'email', message: 'email is required' }, 400);
        }

        try {
            const useCase = container.resolve(VerifyEmailResend);
            await useCase.execute(email);
            return c.body(null, 200);
        } catch (err: any) {
            if (err.code === 'NOT_FOUND') {
                return c.json({ code: 40004, field: 'email', message: 'email not sign up or verify success.' }, 400);
            }
            if (err.code === 'EMAIL_RATE_LIMIT') {
                return c.json({ code: 5, field: 'email', message: 'send email limit 15 minutes.' }, 400);
            }
            console.error('[AuthController.verifyResend]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // POST /v1/login/forget/reset
    static async reset(c: Context) {
        let body: any;
        try {
            body = await c.req.json();
        } catch {
            return c.json({ code: 40000, field: 'body', message: 'Invalid JSON body' }, 400);
        }

        const email = typeof body.email === 'string'
            ? body.email.toLowerCase().replace(/\s+/g, '')
            : undefined;
        const verifyCode = typeof body.verify_code === 'string' ? body.verify_code.trim() : undefined;
        const password = typeof body.password === 'string' ? body.password : undefined;

        if (!email) {
            return c.json({ code: 1, field: 'email', message: 'email is required' }, 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return c.json({ code: 3, field: 'email', message: 'email must be in email format' }, 400);
        }

        if (!verifyCode) {
            return c.json({ code: 1, field: 'verify_code', message: 'verify_code is required' }, 400);
        }

        if (!password) {
            return c.json({ code: 1, field: 'password', message: 'password is required' }, 400);
        }

        // Password validation: min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
        const passwordRegex = /^(?=(?:.*[A-Z])+)(?=(?:.*[a-z])+)(?=(?:.*\d)+)(?=(?:.*[!@#$%^&*_()+\-=\[\]{}|])+)([A-Za-z0-9!@#$%^&*_()+\-=\[\]{}|]{12,})$/;
        if (!passwordRegex.test(password)) {
            return c.json({ code: 3, field: 'password', message: 'password does not match the required format' }, 400);
        }

        try {
            const useCase = container.resolve(ResetPassword);
            await useCase.execute(email, verifyCode, password);
            return c.body(null, 200);
        } catch (err: any) {
            if (err.code === 'NOT_FOUND') {
                return c.json({ code: 6, field: 'email', message: 'Not found' }, 400);
            }
            if (err.code === 'UNAUTHORIZED') {
                return c.json({ code: 40001, field: 'email', message: 'Unauthorized' }, 400);
            }
            console.error('[AuthController.reset]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // POST /v1/login/change_password  (requires login access token)
    static async changePassword(c: Context) {
        const ctxUser = c.get('user') as { email: string; token: string | null } | undefined;
        if (!ctxUser?.email) {
            return c.json({ code: 40001, message: 'Unauthorized' }, 401);
        }

        let body: any;
        try {
            body = await c.req.json();
        } catch {
            return c.json({ code: 40000, field: 'body', message: 'Invalid JSON body' }, 400);
        }

        const oldPassword = typeof body.old_password === 'string' ? body.old_password : undefined;
        const newPassword = typeof body.new_password === 'string' ? body.new_password : undefined;

        if (!oldPassword) {
            return c.json({ code: 1, field: 'old_password', message: 'old_password is required' }, 400);
        }
        if (!newPassword) {
            return c.json({ code: 1, field: 'new_password', message: 'new_password is required' }, 400);
        }

        // Same password policy as sign-up/reset: 12+ chars, upper, lower, digit, special.
        const passwordRegex = /^(?=(?:.*[A-Z])+)(?=(?:.*[a-z])+)(?=(?:.*\d)+)(?=(?:.*[!@#$%^&*_()+\-=\[\]{}|])+)([A-Za-z0-9!@#$%^&*_()+\-=\[\]{}|]{12,})$/;
        if (!passwordRegex.test(newPassword)) {
            return c.json({ code: 3, field: 'new_password', message: 'password does not match the required format' }, 400);
        }

        try {
            const useCase = container.resolve(ChangePassword);
            await useCase.execute(ctxUser.email, oldPassword, newPassword);
            return c.body(null, 200);
        } catch (err: any) {
            if (err.code === 'NOT_FOUND') {
                return c.json({ code: 40004, field: 'email', message: 'Not found' }, 400);
            }
            if (err.code === 'INCORRECT_PASSWORD') {
                return c.json({ code: 40005, field: 'old_password', message: 'incorrect password' }, 400);
            }
            if (err.code === 'SAME_PASSWORD') {
                return c.json({ code: 40006, field: 'new_password', message: 'new password must differ from the old one' }, 400);
            }
            console.error('[AuthController.changePassword]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // POST /v1/login/sign_in/file_up_load
    static async fileUpLoad(c: Context) {
        try {
            const ctxUser = c.get('user') as { email: string; token: string };
            const body = await c.req.parseBody();
            const file = body['file'];

            if (!file || !(file instanceof File)) {
                return c.json({ code: 40000, field: 'file', message: 'file is required' }, 400);
            }

            const type = file.type.split('/').pop() || 'bin';
            const uploadPath = getUploadPathWithEmail('login_access', ctxUser.email, type);
            const buffer = Buffer.from(await file.arrayBuffer());

            const url = await uploadFile(uploadPath, buffer, file.type);

            return c.json({ url }, 200);
        } catch (err: any) {
            console.error('[AuthController.fileUpLoad]', err);
            return c.json({ code: 99999, message: 'Service unavailable, please try again later' }, 500);
        }
    }

    // GET /v1/login/providers
    static async getLoginProviders(c: Context) {
        return c.json({ email: true }, 200);
    }
}
