import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { rateLimiter } from '../utils/smartCacheRateLimitEngine';
import { evaluateAndTriggerCircuitBreaker } from '../lib/circuitBreaker';
import { AuthRequest } from '../middleware/auth';
import { getOrCreateUserRecord } from '../db/rag';
import { insertPredictionSnapshot } from '../db/predictions';
import { getDriftCalibrationStats } from './driftFeedbackStore';
import { ai } from '../lib/ai';

// Helper to extract client identifier (IP / Auth Token)
export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'client_default';
}

// Rate Limiting Express Middleware Factory
export function createRateLimitMiddleware(tierKey: string = 'general_api', cost: number = 1) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = getClientIdentifier(req);
    const result = rateLimiter.check(clientId, tierKey, cost);

    res.setHeader('X-RateLimit-Limit', result.maxTokens);
    res.setHeader('X-RateLimit-Remaining', result.remainingTokens);
    res.setHeader('X-RateLimit-Reset', result.resetTimeSec);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSec);
      return res.status(429).json({
        error: 'Too Many Requests (Rate Limit Exceeded)',
        message: `Bạn đã gửi yêu cầu quá nhanh. Vui lòng thử lại sau ${result.retryAfterSec} giây.`,
        retryAfterSec: result.retryAfterSec,
        tier: tierKey,
      });
    }

    next();
  };
}

export function pickTopPredictionPath(timelines: any[]): 'optimal' | 'drift' | 'bottleneck' {
  const candidates = timelines
    .filter((timeline) => timeline && ['optimal', 'drift', 'bottleneck'].includes(timeline.pathType))
    .map((timeline) => ({ path: timeline.pathType, probability: Number(timeline.probability) || 0 }));
  const top = candidates.sort((a, b) => b.probability - a.probability)[0];
  return top?.path || 'optimal';
}

export function persistPredictionBestEffort(
  req: AuthRequest,
  context: any,
  payload: any,
  startedAt: number
) {
  const predictionId = randomUUID();
  const timelines = Array.isArray(payload?.timelines) ? payload.timelines : [];
  const probabilityFor = (pathType: string) =>
    Number(timelines.find((timeline: any) => timeline?.pathType === pathType)?.probability) || 0;

  void (async () => {
    const userUid = req.user?.uid ?? null;
    if (userUid) {
      const userEmail = 'email' in (req.user || {}) ? req.user?.email : undefined;
      if (userEmail) await getOrCreateUserRecord(userUid, userEmail);
    }
    await insertPredictionSnapshot({
      id: predictionId,
      userUid,
      sessionId: typeof req.headers['x-session-id'] === 'string' ? req.headers['x-session-id'] : null,
      context,
      payload,
      driftProb: probabilityFor('drift'),
      crashProb: probabilityFor('bottleneck'),
      flowProb: probabilityFor('optimal'),
      predictedPath: pickTopPredictionPath(timelines),
      modelVersion: payload?._meta?.model || (ai ? 'gemini' : 'smart-fallback'),
      promptVersion: 'v1',
      latencyMs: Date.now() - startedAt,
    });
  })().catch((error) => {
    console.error('[predict] persistence failed:', error?.message || error);
  });

  return predictionId;
}

export function getMeaningfulGoalTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff]+/gi, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4)
  );
}

export function addSemanticGuardrailMetadata(result: any, threshold = 40) {
  const driftScore = Math.min(100, Math.max(0, 100 - Number(result?.overallAlignmentPercent ?? 100)));
  const baseDecision = driftScore >= threshold ? 'BLOCK' : driftScore >= threshold / 2 ? 'WARN' : 'ALLOW';
  const requestId = result?.requestId || `req_${randomUUID().slice(0, 8)}`;
  const agentId = result?.agentId || 'agent_client';

  const circuitEval = evaluateAndTriggerCircuitBreaker({
    agentId,
    requestId,
    driftScore,
    decision: baseDecision,
    detectedPatterns: (result?.detectedRabbitHoles || []).map((rh: any) => rh.type || rh.taskTitle),
    recommendedAction: result?.recommendations?.[0] || 'Gỡ rối tác vụ và quay lại Core Goal',
  });

  const finalDecision = circuitEval.triggered ? 'BLOCK' : baseDecision;

  return {
    ...result,
    contractVersion: 'semantic-drift.v1',
    requestId,
    driftScore,
    guardrailThreshold: threshold,
    guardrailStatus: finalDecision,
    decision: finalDecision,
    circuitBreaker: {
      triggered: circuitEval.triggered,
      circuitStatus: circuitEval.circuitStatus,
      reason: circuitEval.reason,
    },
  };
}
