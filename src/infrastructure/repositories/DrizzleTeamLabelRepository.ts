import { injectable } from 'tsyringe';
import { ITeamLabelRepository } from '../../domain/repositories/ITeamLabelRepository.js';
import { TeamLabel } from '../../domain/entities/TeamLabel.js';
import { db } from '../database/drizzle/index.js';
import { teamLabels } from '../database/drizzle/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import { generateId } from '../../shared/utils/id-generator.js';

@injectable()
export class DrizzleTeamLabelRepository implements ITeamLabelRepository {
    async create(data: Partial<TeamLabel>): Promise<TeamLabel> {
        const id = data.id || generateId('tlb');
        const [inserted] = await db.insert(teamLabels).values({
            ...data,
            id,
            publicId: data.publicId || id,
        } as any).returning();
        return inserted as unknown as TeamLabel;
    }

    async findById(id: string): Promise<TeamLabel | null> {
        const result = await db.select().from(teamLabels).where(eq(teamLabels.id, id)).limit(1);
        return result.length ? (result[0] as unknown as TeamLabel) : null;
    }

    async listByTeam(teamId: string, offset: number = 0, limit: number = 20): Promise<TeamLabel[]> {
        const result = await db.select().from(teamLabels)
            .where(eq(teamLabels.teamId, teamId))
            .limit(limit).offset(offset);
        return result as unknown as TeamLabel[];
    }

    async countByTeam(teamId: string): Promise<number> {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(teamLabels)
            .where(eq(teamLabels.teamId, teamId));
        return Number(result[0]?.count || 0);
    }

    async update(id: string, data: Partial<TeamLabel>): Promise<TeamLabel | null> {
        const [updated] = await db.update(teamLabels)
            .set({ ...data, updatedAt: new Date() } as any)
            .where(eq(teamLabels.id, id))
            .returning();
        return updated ? (updated as unknown as TeamLabel) : null;
    }

    async delete(id: string): Promise<boolean> {
        const [deleted] = await db.delete(teamLabels).where(eq(teamLabels.id, id)).returning();
        return !!deleted;
    }
}
