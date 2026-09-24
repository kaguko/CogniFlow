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

export interface InMemoryPredictionRecord {
  id: string;
  userUid?: string | null;
  sessionId?: string | null;
  context: unknown;
  payload: unknown;
  driftProb: number;
  crashProb: number;
  flowProb: number;
  predictedPath: PersistedPredictionPath;
  modelVersion: string;
  promptVersion: string;
  latencyMs: number;
  createdAt: Date;
}

export interface InMemoryOutcomeRecord {
  id: string;
  predictionId: string;
  userUid?: string | null;
  actualPath: PersistedPredictionPath;
  actualDriftScore?: number | null;
  source: PredictionOutcomeSource;
  notes?: string | null;
  evaluatedAt: Date;
}

const inMemoryPredictions = new Map<string, InMemoryPredictionRecord>();
const inMemoryOutcomes = new Map<string, InMemoryOutcomeRecord>();

export async function insertPredictionSnapshot(input: InsertPredictionInput) {
  const record: InMemoryPredictionRecord = {
    id: input.id,
    userUid: input.userUid ?? null,
    sessionId: input.sessionId ?? null,
    context: input.context,
    payload: input.payload,
    driftProb: input.driftProb,
    crashProb: input.crashProb,
    flowProb: input.flowProb,
    predictedPath: input.predictedPath,
    modelVersion: input.modelVersion ?? 'gemini-2.0-flash',
    promptVersion: input.promptVersion ?? 'v1',
    latencyMs: input.latencyMs ?? 150,
    createdAt: input.createdAt ?? new Date(),
  };

  inMemoryPredictions.set(input.id, record);

  try {
    await db.insert(predictions).values({
      ...input,
      userUid: input.userUid ?? null,
      sessionId: input.sessionId ?? null,
      modelVersion: input.modelVersion ?? null,
      promptVersion: input.promptVersion ?? null,
      latencyMs: input.latencyMs ?? null,
      createdAt: record.createdAt,
    });
  } catch (err: any) {
    // In-memory fallback active
  }

  return input.id;
}

export async function getPredictionById(predictionId: string) {
  const mem = inMemoryPredictions.get(predictionId);
  if (mem) return mem;

  try {
    const rows = await db
      .select()
      .from(predictions)
      .where(eq(predictions.id, predictionId))
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    return null;
  }
}

export async function getPredictionForUser(predictionId: string, userUid: string) {
  const mem = inMemoryPredictions.get(predictionId);
  if (mem && (mem.userUid === userUid || !mem.userUid)) return mem;

  try {
    const rows = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.id, predictionId), eq(predictions.userUid, userUid)))
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    return mem ?? null;
  }
}

export async function insertPredictionOutcome(input: {
  id: string;
  predictionId: string;
  userUid?: string | null;
  actualPath: PersistedPredictionPath;
  actualDriftScore?: number | null;
  source?: PredictionOutcomeSource;
  notes?: string | null;
  evaluatedAt?: Date;
}) {
  const prediction = await getPredictionById(input.predictionId);

  const outcomeRecord: InMemoryOutcomeRecord = {
    id: input.id,
    predictionId: input.predictionId,
    userUid: input.userUid ?? prediction?.userUid ?? null,
    actualPath: input.actualPath,
    actualDriftScore: input.actualDriftScore ?? null,
    source: input.source ?? 'user',
    notes: input.notes ?? null,
    evaluatedAt: input.evaluatedAt ?? new Date(),
  };

  inMemoryOutcomes.set(input.id, outcomeRecord);

  try {
    await db.insert(outcomes).values({
      id: input.id,
      predictionId: input.predictionId,
      userUid: outcomeRecord.userUid,
      actualPath: input.actualPath,
      actualDriftScore: input.actualDriftScore ?? null,
      source: outcomeRecord.source,
      notes: outcomeRecord.notes,
      evaluatedAt: outcomeRecord.evaluatedAt,
    });
  } catch (err) {
    // In-memory outcome active
  }

  return input.id;
}

export async function listBacktestRows(window: { from: Date; to: Date; cutoff: Date }) {
  let dbRows: any[] = [];
  try {
    dbRows = await db
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
  } catch (err) {
    dbRows = [];
  }

  // Merge with in-memory records
  const inMemoryJoined: any[] = [];
  for (const outcome of inMemoryOutcomes.values()) {
    const pred = inMemoryPredictions.get(outcome.predictionId);
    if (pred) {
      inMemoryJoined.push({
        id: pred.id,
        predictedPath: pred.predictedPath,
        modelVersion: pred.modelVersion,
        createdAt: pred.createdAt,
        actualPath: outcome.actualPath,
        evaluatedAt: outcome.evaluatedAt,
      });
    }
  }

  // Deduplicate by prediction ID
  const seen = new Set<string>();
  const combined = [];
  for (const row of [...dbRows, ...inMemoryJoined]) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      combined.push(row);
    }
  }

  return combined;
}
