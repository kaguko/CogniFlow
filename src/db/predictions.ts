import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from './index.ts';
import { outcomes, predictions } from './schema.ts';

export type PersistedPredictionPath = 'optimal' | 'drift' | 'bottleneck';
export type PredictionOutcomeSource = 'auto' | 'user' | 'manual';

export interface InsertPredictionInput {
  id: string;
  userUid?: string | null;
  sessionId?: string | null;
  context: unknown;
  payload: unknown;
  driftProb: number;
  crashProb: number;
  flowProb: number;
  predictedPath: PersistedPredictionPath;
  modelVersion?: string | null;
  promptVersion?: string | null;
  latencyMs?: number | null;
  createdAt?: Date;
}

export async function insertPredictionSnapshot(input: InsertPredictionInput) {
  await db.insert(predictions).values({
    ...input,
    userUid: input.userUid ?? null,
    sessionId: input.sessionId ?? null,
    modelVersion: input.modelVersion ?? null,
    promptVersion: input.promptVersion ?? null,
    latencyMs: input.latencyMs ?? null,
    createdAt: input.createdAt ?? new Date(),
  });
  return input.id;
}

export async function getPredictionForUser(predictionId: string, userUid: string) {
  const rows = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.id, predictionId), eq(predictions.userUid, userUid)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertPredictionOutcome(input: {
  id: string;
  predictionId: string;
  userUid: string;
  actualPath: PersistedPredictionPath;
  actualDriftScore?: number | null;
  source?: PredictionOutcomeSource;
  notes?: string | null;
  evaluatedAt?: Date;
}) {
  const prediction = await getPredictionForUser(input.predictionId, input.userUid);
  if (!prediction) return null;

  await db.insert(outcomes).values({
    id: input.id,
    predictionId: input.predictionId,
    userUid: input.userUid,
    actualPath: input.actualPath,
    actualDriftScore: input.actualDriftScore ?? null,
    source: input.source ?? 'user',
    notes: input.notes ?? null,
    evaluatedAt: input.evaluatedAt ?? new Date(),
  });
  return input.id;
}

export async function listBacktestRows(window: { from: Date; to: Date; cutoff: Date }) {
  return db
    .select({
      id: predictions.id,
      predictedPath: predictions.predictedPath,
      modelVersion: predictions.modelVersion,
      createdAt: predictions.createdAt,
      actualPath: outcomes.actualPath,
      evaluatedAt: outcomes.evaluatedAt,
    })
    .from(predictions)
    .innerJoin(outcomes, eq(outcomes.predictionId, predictions.id))
    .where(
      and(
        gte(predictions.createdAt, window.from),
        lte(predictions.createdAt, window.to),
        lte(predictions.createdAt, window.cutoff)
      )
    );
}