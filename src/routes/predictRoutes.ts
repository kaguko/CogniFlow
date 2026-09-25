import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { smartCache } from '../utils/smartCacheRateLimitEngine.ts';
import { ai } from '../lib/ai.ts';
import { buildSmartFallbackPrediction, generateContentWithFallback } from '../lib/geminiResilience.ts';
import { createRateLimitMiddleware, persistPredictionBestEffort } from './routeHelpers.ts';
import { insertPredictionOutcome } from '../db/predictions.ts';
import { runBacktest } from '../lib/backtest.ts';

export const predictRouter = Router();

predictRouter.post('/', createRateLimitMiddleware('ai_standard', 1), requireAuth, async (req: AuthRequest, res: Response) => {
  const startedAt = Date.now();
  try {
    const { context } = req.body;
    if (!context || !context.title) {
      return res.status(400).json({ error: 'Context with title is required' });
    }

    // 1. SMART CACHE CHECK
    const cacheKey = `predict:${context.title}:${context.energyLevel || ''}:${context.domain || ''}:${(context.behavioralFlags || []).join(',')}`;
    const cached = smartCache.get(cacheKey);
    if (cached.hit && cached.data) {
      res.setHeader('X-Cache-Status', 'HIT');
      res.setHeader('X-Cache-Latency-Saved-Ms', cached.latencySavedMs || 0);
      const predictionId = persistPredictionBestEffort(req, context, cached.data, startedAt);
      return res.json({ ...cached.data, predictionId });
    }
    res.setHeader('X-Cache-Status', 'MISS');

    if (!ai) {
      console.warn('[api/predict] GEMINI_API_KEY not configured, returning smart synthesized prediction');
      const fallback = buildSmartFallbackPrediction(context);
      smartCache.set(cacheKey, fallback, 'medium');
      const predictionId = persistPredictionBestEffort(req, context, fallback, startedAt);
      return res.json({ ...fallback, predictionId });
    }

    const systemInstruction = `
Bạn là một Kiến Trúc Sư Phần Mềm Trưởng kiêm Cố Vấn Tư Duy Nhận Thức (Lead Systems Architect & Cognitive Copilot).
Nhiệm vụ của bạn là:
1. Dự đoán tương lai dựa trên ngữ cảnh thực tế của người dùng: mục tiêu, năng lượng, công nghệ, rào cản và thói quen hành vi.
2. Vạch ra 3 dòng thời gian tương lai rõ rệt:
   - Dòng thời gian Tối Ưu (Optimal Flow - áp dụng Divide & Conquer)
   - Dòng thời gian Trôi Dạt (Status Quo Drift - chần chừ, nhảy cóc bước)
   - Dòng thời gian Đổ Vỡ / Điểm Nghẽn (Bottleneck & Burnout Crash - over-engineering hoặc kẹt phụ thuộc)
3. Vạch công việc thành các BƯỚC CỰC NHỎ (Micro-Steps: 5 đến 15 phút/bước), áp dụng tư duy giải quyết vấn đề của lập trình viên:
   - Nguyên lý lập trình: Divide & Conquer, Atomic Commit, TDD Loop, Fail Fast, YAGNI / Minimal Surface, hoặc Boundary Isolation.
   - Mỗi bước có Single Action cụ thể (hành động đơn lập), Input cần có, Tiêu chí kiểm chứng hoàn thành (Test Criterion) và Mẹo gỡ nghẽn (Unblock Tip) nếu bế tắc quá 3 phút.
4. Phân tích điểm tắc nghẽn (Bottlenecks) và ma trận rủi ro (Risk Matrix) của hệ thống.
5. Luôn giữ nguyên tắc: Giúp người dùng giữ vững tư duy cá nhân, tự suy nghĩ được, không ỷ lại mà nắm bắt việc cần làm nhanh và hiệu quả hơn.

Ngôn ngữ: Tiếng Việt tự nhiên, chuẩn kỹ thuật, gãy gọn, không sáo rỗng.
Trả về dữ liệu JSON thuần túy theo đúng cấu trúc yêu cầu.
`;

    const prompt = `
Dưới đây là ngữ cảnh của người dùng:
- Tiêu đề mục tiêu: "${context.title}"
- Mô tả & Bài toán: "${context.description || ''}"
- Lĩnh vực: "${context.domain || 'software'}"
- Khung thời gian hạn chót: "${context.deadlineHorizon || 'sắp tới'}"
- Mức năng lượng / tải nhận thức: "${context.energyLevel || 'medium'}"
- Rào cản hiện tại: "${context.currentFriction || 'Chưa rõ điểm bắt đầu'}"
- Dấu hiệu hành vi: ${JSON.stringify(context.behavioralFlags || [])}
- Công nghệ / Công cụ: ${JSON.stringify(context.techStack || [])}

Hãy phân tích và trả về đối tượng JSON có các trường:
{
  "strategicWhySummary": "Tóm tắt bản chất vấn đề thật sự (2-3 câu ngắn gọn)",
  "timelines": [
    {
      "id": "t_optimal",
      "name": "Dòng thời gian Tối Ưu (Optimal Flow)",
      "pathType": "optimal",
      "probability": 75,
      "summary": "Mô tả ngắn gọn",
      "milestones": [
        { "timeframe": "2 Giờ tới", "prediction": "...", "state": "optimal", "keyIndicator": "..." },
        { "timeframe": "24 Giờ tới", "prediction": "...", "state": "optimal", "keyIndicator": "..." },
        { "timeframe": "Đích đến", "prediction": "...", "state": "optimal", "keyIndicator": "..." }
      ],
      "consequence": "..."
    },
    {
      "id": "t_drift",
      "name": "Dòng thời gian Trôi Dạt (Status Quo Drift)",
      "pathType": "drift",
      "probability": 40,
      "summary": "...",
      "milestones": [...],
      "consequence": "..."
    },
    {
      "id": "t_bottleneck",
      "name": "Dòng thời gian Rủi Ro / Điểm Nghẽn (Bottleneck Crash)",
      "pathType": "bottleneck",
      "probability": 25,
      "summary": "...",
      "milestones": [...],
      "consequence": "..."
    }
  ],
  "microSteps": [
    {
      "id": "step_1",
      "order": 1,
      "title": "Tên vi bước nguyên tử (5-15 phút)",
      "durationMinutes": 10,
      "programmerPrinciple": "Divide & Conquer",
      "inputRequired": "Input đầu vào cần có",
      "singleAction": "Hành động cụ thể duy nhất cần làm ngay",
      "testCriterion": "Tiêu chí kiểm chứng xem đã xong chưa",
      "unblockTip": "Nếu bị kẹt quá 3 phút, làm ngay điều này",
      "completed": false,
      "nanoSteps": [
        { "id": "ns_1", "text": "Vi việc 1", "done": false },
        { "id": "ns_2", "text": "Vi việc 2", "done": false }
      ]
    }
  ],
  "bottlenecks": [
    {
      "id": "bn_1",
      "title": "Tên điểm nghẽn",
      "severity": "critical",
      "category": "cognitive",
      "symptom": "Triệu chứng nhận biết",
      "rootCauseWhy": "Lý do gốc rễ (Why)",
      "counterMeasure": "Biện pháp giải quyết tức thì"
    }
  ],
  "riskMatrix": [
    {
      "id": "rk_1",
      "risk": "Nguy cơ tiềm ẩn",
      "probability": "High",
      "impact": "High",
      "prevention": "Hành động phòng ngừa trước",
      "contingency": "Kế hoạch ứng phó khi sự cố xảy ra"
    }
  ],
  "behavioralInsights": {
    "focusEfficiencyScore": 75,
    "decisionFrictionIndex": 60,
    "procrastinationRisk": "Trung bình",
    "observedPatterns": ["Mẫu hình 1", "Mẫu hình 2"],
    "cognitiveRecommendations": ["Lời khuyên 1", "Lời khuyên 2"]
  }
}
`;

    try {
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);
      smartCache.set(cacheKey, parsed, 'medium');
      const predictionId = persistPredictionBestEffort(req, context, parsed, startedAt);
      return res.json({ ...parsed, predictionId });
    } catch (aiErr: any) {
      console.warn(
        '[api/predict] Upstream Gemini model experienced high demand (503) or transient spike. Seamlessly serving smart synthesized forecast:',
        aiErr?.message || aiErr
      );
      const fallback = buildSmartFallbackPrediction(context);
      smartCache.set(cacheKey, fallback, 'medium');
      const predictionId = persistPredictionBestEffort(req, context, fallback, startedAt);
      return res.json({ ...fallback, predictionId });
    }
  } catch (err: any) {
    console.error('Error in /api/predict:', err);
    const fallback = buildSmartFallbackPrediction(req.body?.context);
    const predictionId = persistPredictionBestEffort(req, req.body?.context, fallback, startedAt);
    return res.json({ ...fallback, predictionId });
  }
});

predictRouter.post('/:predictionId/outcomes', requireAuth, async (req: AuthRequest, res: Response) => {
  const actualPath = req.body?.actualPath === 'crash' ? 'bottleneck' : req.body?.actualPath;
  if (!['optimal', 'drift', 'bottleneck'].includes(actualPath)) {
    return res.status(400).json({ error: 'actualPath must be optimal, drift, or crash' });
  }
  if (!req.user?.uid) return res.status(401).json({ error: 'authentication_required' });

  try {
    const outcomeId = await insertPredictionOutcome({
      id: randomUUID(),
      predictionId: req.params.predictionId,
      userUid: req.user.uid,
      actualPath,
      actualDriftScore: typeof req.body?.actualDriftScore === 'number' ? req.body.actualDriftScore : null,
      source: ['auto', 'user', 'manual'].includes(req.body?.source) ? req.body.source : 'user',
      notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
    });
    if (!outcomeId) return res.status(404).json({ error: 'prediction_not_found' });

    const backtest = await runBacktest({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
      minAgeHours: 0,
    });

    return res.status(201).json({
      success: true,
      outcomeId,
      predictionId: req.params.predictionId,
      actualPath,
      accuracyMetrics: {
        overallAccuracyScore: backtest.overallAccuracyScore,
        overallAccuracyPercent: backtest.overallAccuracyPercent,
        sampleSize: backtest.sampleSize,
        driftHitRate: backtest.driftHitRate,
        crashHitRate: backtest.crashHitRate,
      },
    });
  } catch (error: any) {
    console.error('[predictions/outcomes] persistence failed:', error?.message || error);
    return res.status(500).json({ error: 'outcome_persistence_failed' });
  }
});
