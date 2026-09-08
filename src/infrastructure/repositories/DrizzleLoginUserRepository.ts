import { db } from '../database/drizzle/index.js';
import { loginUsers } from '../database/drizzle/schema/index.js';
import { ILoginUserRepository } from '../../domain/repositories/ILoginUserRepository.js';
import { LoginUser } from '../../domain/entities/LoginUser.js';
import { eq } from 'drizzle-orm';
import { generateId } from '../../shared/utils/id-generator.js';

function toLoginUser(res: any): LoginUser {
    return {
        id: res.id,
        email: res.email,
        password: res.password || undefined,
        customerId: res.customerId,
        isVerify: res.isVerify || false,
        authId: res.authId,
        name: res.name,
        avatarUrl: res.avatarUrl,
        tokenLogin: res.tokenLogin,
        profile: res.profile,
        verifyCode: res.verifyCode ?? null,
        verifyExpiredAt: res.verifyExpiredAt ?? null,
        providerType: res.providerType ?? 'email',
        providerId: res.providerId ?? null,
        createdAt: res.createdAt || new Date(),
        updatedAt: res.updatedAt || new Date(),
    };
}

export class DrizzleLoginUserRepository implements ILoginUserRepository {
    async findByEmail(email: string): Promise<LoginUser | null> {
        const results = await db.select().from(loginUsers).where(eq(loginUsers.email, email)).limit(1);
        return results.length ? toLoginUser(results[0]) : null;
    }

    async findById(id: string): Promise<LoginUser | null> {
        const results = await db.select().from(loginUsers).where(eq(loginUsers.id, id)).limit(1);
        return results.length ? toLoginUser(results[0]) : null;
    }

    async findByAuthId(authId: string): Promise<LoginUser | null> {
        const results = await db.select().from(loginUsers).where(eq(loginUsers.authId, authId)).limit(1);
        return results.length ? toLoginUser(results[0]) : null;
    }

    async create(data: Partial<LoginUser>): Promise<LoginUser> {
        const [inserted] = await db.insert(loginUsers).values({
            id: data.id || generateId('lu'),
            email: data.email!,
            password: data.password,
            customerId: data.customerId,
            isVerify: data.isVerify,
            authId: data.authId,
            name: data.name,
            avatarUrl: data.avatarUrl,
            tokenLogin: data.tokenLogin,
            profile: data.profile,
            verifyCode: data.verifyCode,
            verifyExpiredAt: data.verifyExpiredAt,
            providerType: data.providerType ?? 'email',
            providerId: data.providerId,
        }).returning();
        return toLoginUser(inserted);
    }

    async update(id: string, data: Partial<LoginUser>): Promise<LoginUser | null> {
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (data.password !== undefined) updateData.password = data.password;
        if (data.isVerify !== undefined) updateData.isVerify = data.isVerify;
        if (data.verifyCode !== undefined) updateData.verifyCode = data.verifyCode;
        if (data.verifyExpiredAt !== undefined) updateData.verifyExpiredAt = data.verifyExpiredAt;
        if (data.customerId !== undefined) updateData.customerId = data.customerId;
        if (data.name !== undefined) updateData.name = data.name;
        if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

        const results = await db.update(loginUsers)
            .set(updateData)
            .where(eq(loginUsers.id, id))
            .returning();
        return results.length ? toLoginUser(results[0]) : null;
    }

}
