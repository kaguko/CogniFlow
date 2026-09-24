import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality, ThinkingLevel, Type } from '@google/genai';
import { serverConfig } from './serverConfig';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getUserNotes,
  insertNoteWithEmbedding,
  deleteNote,
  searchNotesSemantic,
  getOrCreateUserRecord,
} from './src/db/rag.ts';
import {
  generateContentWithFallback,
  buildSmartFallbackPrediction,
  buildSmartFallbackDecision,
  buildSmartFallbackDecomposition,
  buildSmartFallbackGoalPlan,
} from './src/lib/geminiResilience.ts';
import {
  rateLimiter,
  smartCache,
  classifyTaskComplexity,
  MODEL_TIERS,
} from './src/utils/smartCacheRateLimitEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = serverConfig.port;

app.use(express.json({ limit: '10mb' }));

// Helper to extract client identifier (IP / Auth Token)
function getClientIdentifier(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'client_default';
}

// Rate Limiting Express Middleware Factory
function createRateLimitMiddleware(tierKey: string = 'general_api', cost: number = 1) {
  return (req: Request, res: Response, next: Function) => {
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

const apiKey = serverConfig.geminiApiKey;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Helper to sanitize JSON response from LLM
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/```$/, '');
  }
  return cleaned.trim();
}

/**
 * POST /api/predict
 * Analyzes the user's project context, energy level, constraints, and behavioral flags.
 * Projects 3 future timelines, decomposes work into atomic programmer micro-steps,
 * and identifies critical bottlenecks and risk factors.
 */
app.post('/api/predict', createRateLimitMiddleware('ai_standard', 1), async (req: Request, res: Response) => {
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
      return res.json(cached.data);
    }
    res.setHeader('X-Cache-Status', 'MISS');

    if (!ai) {
      console.warn('[api/predict] GEMINI_API_KEY not configured, returning smart synthesized prediction');
      const fallback = buildSmartFallbackPrediction(context);
      smartCache.set(cacheKey, fallback, 'medium');
      return res.json(fallback);
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
      const parsed = JSON.parse(cleanJsonResponse(text));
      smartCache.set(cacheKey, parsed, 'medium');
      return res.json(parsed);
    } catch (aiErr: any) {
      console.warn(
        '[api/predict] Upstream Gemini model experienced high demand (503) or transient spike. Seamlessly serving smart synthesized forecast:',
        aiErr?.message || aiErr
      );
      const fallback = buildSmartFallbackPrediction(context);
      smartCache.set(cacheKey, fallback, 'medium');
      return res.json(fallback);
    }
  } catch (err: any) {
    console.error('Error in /api/predict:', err);
    return res.json(buildSmartFallbackPrediction(req.body?.context));
  }
});

/**
 * POST /api/socratic-decision
 * Adheres strictly to the WHY-FIRST manifesto:
 * 1. 🎯 WHY #1: Vấn đề thật
 * 2. 🔍 WHY #2: Lựa chọn & phương án bị loại + lý do
 * 3. ⚠️ WHY #3: Đánh đổi & Rủi ro
 * 4. 🛠️ HOW: Phương án tối ưu
 * 5. ✅ Cơ sở kiểm chứng
 * 6. 🧠 Câu hỏi Socratic gợi mở tư duy cá nhân của lập trình viên
 */
app.post('/api/socratic-decision', async (req: Request, res: Response) => {
  try {
    const { dilemma, context } = req.body;
    if (!dilemma) {
      return res.status(400).json({ error: 'Dilemma or decision query is required' });
    }

    if (!ai) {
      console.warn('[api/socratic-decision] GEMINI_API_KEY not configured, serving smart fallback decision');
      return res.json(buildSmartFallbackDecision(dilemma, context));
    }

    const systemInstruction = `
Bạn là Cố Vấn Quyết Định Trưởng (Lead Decision Architect) tuân thủ triệt để nguyên tắc WHY-FIRST:
Mọi quyết định kỹ thuật phải đi qua 3 tầng WHY trước khi đưa ra HOW:
1. WHY #1 — Vấn đề thật: Yêu cầu này thực chất đang giải quyết điều gì? Nếu không làm thì hậu quả/thiếu sót là gì?
2. WHY #2 — Lựa chọn: Vì sao chọn cách tiếp cận này mà không phải cách khác? Liệt kê tối thiểu 2 alternative đã cân nhắc và lý do bị loại.
3. WHY #3 — Hệ quả: Làm theo cách này thì được gì, đánh đổi gì, rủi ro/giới hạn gì cần biết trước?
4. HOW — Phương án tối ưu và kế hoạch vi bước cụ thể.
5. VÌ SAO TIN ĐƯỢC — Cơ sở kiểm chứng logic, nguyên lý khoa học máy tính hoặc đo lường thực nghiệm.
6. CÂU HỎI SOCRATIC — Đặt 2-3 câu hỏi gợi mở để người dùng tự suy ngẫm, giữ vững tư duy độc lập chứ không thụ động làm theo AI.

Ngôn ngữ: Tiếng Việt chuẩn mực, sắc bén, lập luận logic cao.
`;

    const prompt = `
Tình huống / Khúc mắc cần ra quyết định:
"${dilemma}"

Ngữ cảnh liên quan (nếu có):
${context ? JSON.stringify(context) : 'Không có ngữ cảnh bổ sung'}

Hãy phân tích và trả về đối tượng JSON có các trường:
{
  "dilemma": "${dilemma}",
  "whyRootProblem": "🎯 WHY #1: Phân tích sâu vấn đề thật sự đằng sau khúc mắc này (2-4 câu)",
  "alternativesEvaluated": [
    {
      "name": "Tên phương án alternative 1",
      "pros": "Ưu điểm",
      "cons": "Nhược điểm",
      "rejectionReason": "Lý do bị loại cụ thể trong ngữ cảnh này"
    },
    {
      "name": "Tên phương án alternative 2",
      "pros": "Ưu điểm",
      "cons": "Nhược điểm",
      "rejectionReason": "Lý do bị loại cụ thể trong ngữ cảnh này"
    }
  ],
  "tradeOffsAndRisks": "⚠️ WHY #3: Đánh đổi gì, giới hạn gì cần lường trước khi chọn phương án này",
  "howRecommendation": "🛠️ HOW: Giải pháp tối ưu cụ thể, rõ ràng",
  "verificationBasis": "✅ VÌ SAO TIN ĐƯỢC: Cơ sở lý thuyết, benchmark hoặc cách test chứng minh",
  "socraticQuestions": [
    "Câu hỏi Socratic 1 kích thích tư duy người dùng...",
    "Câu hỏi Socratic 2 để tự đánh giá ranh giới bài toán..."
  ],
  "microActionPlan": [
    "Vi bước 1 (5 phút)",
    "Vi bước 2 (10 phút)",
    "Vi bước 3 (5 phút)"
  ]
}
`;

    try {
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(cleanJsonResponse(text));
      return res.json(parsed);
    } catch (aiErr: any) {
      console.warn(
        '[api/socratic-decision] Upstream Gemini busy/503 spike, serving resilient fallback:',
        aiErr?.message || aiErr
      );
      return res.json(buildSmartFallbackDecision(dilemma, context));
    }
  } catch (err: any) {
    console.error('Error in /api/socratic-decision:', err);
    return res.json(buildSmartFallbackDecision(req.body?.dilemma || '', req.body?.context));
  }
});

/**
 * POST /api/decompose
 * Takes a specific micro-step where user is blocked or overwhelmed,
 * and decomposes it into 3 sub-atomic 2-3 minute nano-steps.
 */
app.post('/api/decompose', async (req: Request, res: Response) => {
  try {
    const { stepTitle, contextFriction } = req.body;
    if (!stepTitle) {
      return res.status(400).json({ error: 'stepTitle is required' });
    }

    if (!ai) {
      console.warn('[api/decompose] GEMINI_API_KEY not configured, serving smart fallback decomposition');
      return res.json(buildSmartFallbackDecomposition(stepTitle, contextFriction));
    }

    const prompt = `
Người dùng đang bị nghẽn (Analysis Paralysis) tại bước: "${stepTitle}".
Ngữ cảnh rào cản: "${contextFriction || 'Cảm thấy phức tạp, chưa biết bắt đầu thế nào'}".

Nhiệm vụ: Áp dụng tư duy lập trình viên (Breakdown & Isolation), phân rã bước này thành ĐÚNG 3 nano-steps cực nhỏ (mỗi nano-step chỉ mất 2-3 phút, dễ đến mức không thể trì hoãn).

Trả về JSON:
{
  "nanoSteps": [
    { "id": "ns_1", "text": "Hành động 2 phút đầu tiên (VD: Mở file X, tìm hàm Y)", "done": false },
    { "id": "ns_2", "text": "Hành động 2 phút tiếp theo (VD: Thêm 1 dòng console.log hoặc assert đơn giản)", "done": false },
    { "id": "ns_3", "text": "Hành động 3 phút chốt hạ để kiểm chứng", "done": false }
  ],
  "unblockMantra": "1 câu châm ngôn gỡ rối tâm lý ngắn gọn"
}
`;

    try {
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(cleanJsonResponse(text));
      return res.json(parsed);
    } catch (aiErr: any) {
      console.warn(
        '[api/decompose] Upstream Gemini 503 spike, serving resilient decomposition:',
        aiErr?.message || aiErr
      );
      return res.json(buildSmartFallbackDecomposition(stepTitle, contextFriction));
    }
  } catch (err: any) {
    console.error('Error in /api/decompose:', err);
    return res.json(
      buildSmartFallbackDecomposition(
        req.body?.stepTitle || 'Vi bước kỹ thuật',
        req.body?.contextFriction
      )
    );
  }
});

/**
 * POST /api/tts
 * Synthesizes audio guidance using gemini-3.1-flash-tts-preview
 */
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const voiceName = voice || 'Kore'; // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: text.slice(0, 500) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS' });
    }

    return res.json({ audio: base64Audio, sampleRate: 24000 });
  } catch (err: any) {
    console.error('Error in /api/tts:', err);
    return res.status(500).json({
      error: 'Failed to synthesize speech: ' + (err.message || String(err)),
    });
  }
});

/**
 * POST /api/goals/plan
 * Version 2.0 Engine ①: LONG-TERM GOAL PLANNER
 * Transforms an ambitious long-term goal (6-12 months) into a visible roadmap:
 * Goal -> Milestones (Quarterly/Monthly) -> Sprints (Weekly) -> Atomic Micro-steps (<= 15 mins).
 */
app.post('/api/goals/plan', async (req: Request, res: Response) => {
  try {
    const { goalTitle, vision, horizon, hoursPerWeek, category, primarySkills } = req.body;
    if (!goalTitle) {
      return res.status(400).json({ error: 'goalTitle is required' });
    }

    if (!ai) {
      // Local fallback with rich schema
      const fallbackGoalId = `goal_${Date.now()}`;
      return res.json({
        id: fallbackGoalId,
        title: goalTitle,
        vision: vision || `Hiện thực hóa mục tiêu ${goalTitle} với kỷ luật phân rã vi bước và phòng ngừa trôi dạt (anti-drift).`,
        category: category || 'career',
        horizon: horizon || '12_months',
        deadline: '12 tháng tới',
        progress: 0,
        driftScore: 0,
        status: 'active',
        lastReviewedAt: 'Hôm nay',
        constraints: {
          hoursPerWeek: Number(hoursPerWeek) || 10,
          budget: 500,
          primarySkills: primarySkills || ['System Architecture', 'Core CS'],
          priority: 'critical',
        },
        linkedTaskIds: ['s1', 's2', 's3'],
        milestones: [
          {
            id: `ms_${fallbackGoalId}_q1`,
            title: `Giai đoạn 1: Nền tảng cốt lõi & Khóa ranh giới (${goalTitle})`,
            quarterOrMonth: 'Q1 (Tháng 1-3)',
            due: '3 tháng tới',
            status: 'on_track',
            progress: 15,
            keyDeliverable: 'Xây dựng khung tư duy, đọc tài liệu trọng yếu và hoàn tất 3 bài kiểm thử thực chiến.',
            dependencies: ['Cam kết giờ cố định mỗi tuần'],
            sprints: [
              { id: 'sp_1', title: 'Khởi động & Thiết lập môi trường', targetWeek: 'Tuần 1-2', tasksCount: 4, completedCount: 1 },
              { id: 'sp_2', title: 'Thực hành các mẫu hình cơ bản', targetWeek: 'Tuần 3-4', tasksCount: 5, completedCount: 0 },
            ],
          },
          {
            id: `ms_${fallbackGoalId}_q2`,
            title: `Giai đoạn 2: Ứng dụng thực chiến & Tăng tốc`,
            quarterOrMonth: 'Q2 (Tháng 4-6)',
            due: '6 tháng tới',
            status: 'on_track',
            progress: 0,
            keyDeliverable: 'Đóng góp vào dự án thực tế, áp dụng vào môi trường công việc hàng ngày.',
            dependencies: ['Vượt qua kiểm tra Q1'],
          },
          {
            id: `ms_${fallbackGoalId}_q3`,
            title: `Giai đoạn 3: Tối ưu chuyên sâu & Đo lường kết quả`,
            quarterOrMonth: 'Q3 (Tháng 7-9)',
            due: '9 tháng tới',
            status: 'on_track',
            progress: 0,
            keyDeliverable: 'Giải quyết các bài toán edge-case, tối ưu hiệu năng và chịu tải.',
            dependencies: ['Hoàn thành Q2'],
          },
          {
            id: `ms_${fallbackGoalId}_q4`,
            title: `Giai đoạn 4: Đích đến & Đánh giá thăng tiến / Bàn giao`,
            quarterOrMonth: 'Q4 (Tháng 10-12)',
            due: '12 tháng tới',
            status: 'on_track',
            progress: 0,
            keyDeliverable: 'Báo cáo thành quả, portfolio hoàn chỉnh và đạt mục tiêu đề ra.',
            dependencies: ['Hoàn thành Q3'],
          },
        ],
        immediateMicroSteps: [
          {
            id: `step_${Date.now()}_1`,
            order: 1,
            title: `Khởi đầu 10 phút: Viết 1 trang tóm tắt mục tiêu "${goalTitle}"`,
            durationMinutes: 10,
            programmerPrinciple: 'Atomic Commit',
            inputRequired: 'Một trang note trắng (Notion/Obsidian/Vim)',
            singleAction: 'Ghi ra 3 kết quả then chốt (Key Results) đo lường được.',
            testCriterion: 'Có 3 gạch đầu dòng rõ ràng, không chung chung.',
            unblockTip: 'Nếu thấy mơ hồ, trả lời câu hỏi: Sau 1 năm, điều gì chứng minh bạn đã đạt được?',
            completed: false,
            goalTitle: goalTitle,
            milestoneTitle: 'Q1: Nền tảng cốt lõi',
            isAlignedWithGoal: true,
          },
          {
            id: `step_${Date.now()}_2`,
            order: 2,
            title: `Xác định 1 tài liệu / đầu việc quan trọng nhất cho tuần này`,
            durationMinutes: 12,
            programmerPrinciple: 'Divide & Conquer',
            inputRequired: 'Danh sách chủ đề kỹ thuật cần học',
            singleAction: 'Chọn ra duy nhất 1 cuốn sách/tài liệu và đọc 5 trang đầu tiên.',
            testCriterion: 'Đã bookmark chương mục tiêu và ghi chép 2 insight.',
            unblockTip: 'Đừng tải về 10 cuốn sách; chỉ mở đúng 1 cuốn uy tín nhất.',
            completed: false,
            goalTitle: goalTitle,
            milestoneTitle: 'Q1: Nền tảng cốt lõi',
            isAlignedWithGoal: true,
          },
        ],
      });
    }

    const systemInstruction = `
Bạn là Trưởng Ban Hoạch Định Lộ Trình Kỹ Thuật (Principal Long-term Goal & Roadmap Architect).
Nhiệm vụ: Hiện thực hóa triết lý "Biến mục tiêu dài hạn (6-12 tháng) thành các bước có thể nhìn trước được".
Nguyên tắc:
1. Augment, not Replace: Đề xuất có căn cứ, rõ ràng, không ép buộc.
2. Zoom In - Zoom Out: Mọi cột mốc phải liên kết chặt chẽ:
   Mục Tiêu Dài Hạn -> Milestones (theo tháng/quý) -> Sprints (theo tuần) -> Atomic Steps (<= 15 phút hôm nay).
3. Ràng buộc thực tế: Tôn trọng số giờ/tuần người dùng cam kết để tránh nguy cơ Burnout hoặc Milestone Slip.
4. Sinh kèm 3-4 vi bước nguyên tử (5-15 phút) để người dùng có thể thực thi NGAY HÔM NAY.

Ngôn ngữ: Tiếng Việt sắc sảo, chuẩn xác, giàu tính kỹ thuật.
Trả về dữ liệu JSON thuần túy theo đúng schema.
`;

    const prompt = `
Người dùng đặt mục tiêu dài hạn:
- Tiêu đề mục tiêu: "${goalTitle}"
- Tầm nhìn: "${vision || ''}"
- Khung thời gian (Horizon): "${horizon || '12_months'}"
- Số giờ cam kết mỗi tuần: ${hoursPerWeek || 10} giờ/tuần
- Lĩnh vực: "${category || 'career'}"
- Kỹ năng cốt lõi: ${JSON.stringify(primarySkills || [])}

Hãy xây dựng toàn bộ lộ trình có thể nhìn trước được theo cấu trúc JSON:
{
  "id": "goal_${Date.now()}",
  "title": "${goalTitle}",
  "vision": "Tầm nhìn xúc tích (1-2 câu)",
  "category": "${category || 'career'}",
  "horizon": "${horizon || '12_months'}",
  "deadline": "Thời hạn dự kiến",
  "progress": 0,
  "driftScore": 0,
  "status": "active",
  "lastReviewedAt": "Hôm nay",
  "constraints": {
    "hoursPerWeek": ${hoursPerWeek || 10},
    "budget": 500,
    "primarySkills": ${JSON.stringify(primarySkills || ['Kỹ năng chính'])},
    "priority": "critical"
  },
  "milestones": [
    {
      "id": "ms_q1",
      "title": "Tên Cột mốc Q1 (VD: Nắm vững System Design)",
      "quarterOrMonth": "Q1 (Tháng 1-3)",
      "due": "Thời hạn Q1",
      "status": "on_track",
      "progress": 0,
      "keyDeliverable": "Sản phẩm cụ thể bàn giao ở cuối Q1",
      "dependencies": ["Ràng buộc tiên quyết"],
      "sprints": [
        { "id": "sp_1", "title": "Tên sprint tuần 1-2", "targetWeek": "Tuần 1-2", "tasksCount": 4, "completedCount": 0 },
        { "id": "sp_2", "title": "Tên sprint tuần 3-4", "targetWeek": "Tuần 3-4", "tasksCount": 4, "completedCount": 0 }
      ]
    },
    {
      "id": "ms_q2",
      "title": "Tên Cột mốc Q2",
      "quarterOrMonth": "Q2 (Tháng 4-6)",
      "due": "Thời hạn Q2",
      "status": "on_track",
      "progress": 0,
      "keyDeliverable": "Sản phẩm cụ thể bàn giao ở cuối Q2",
      "dependencies": ["Q1"]
    },
    {
      "id": "ms_q3",
      "title": "Tên Cột mốc Q3",
      "quarterOrMonth": "Q3 (Tháng 7-9)",
      "due": "Thời hạn Q3",
      "status": "on_track",
      "progress": 0,
      "keyDeliverable": "Sản phẩm cụ thể bàn giao ở cuối Q3",
      "dependencies": ["Q2"]
    },
    {
      "id": "ms_q4",
      "title": "Tên Cột mốc Q4",
      "quarterOrMonth": "Q4 (Tháng 10-12)",
      "due": "Thời hạn đích",
      "status": "on_track",
      "progress": 0,
      "keyDeliverable": "Thành tựu cuối cùng để xác nhận hoàn tất mục tiêu",
      "dependencies": ["Q3"]
    }
  ],
  "immediateMicroSteps": [
    {
      "id": "step_init_1",
      "order": 1,
      "title": "Vi bước 1 (5-10 phút) để bắt đầu ngay hôm nay",
      "durationMinutes": 10,
      "programmerPrinciple": "Atomic Commit",
      "inputRequired": "Input cần",
      "singleAction": "Hành động cụ thể đơn lẻ",
      "testCriterion": "Tiêu chí kiểm chứng",
      "unblockTip": "Mẹo gỡ nghẽn",
      "completed": false,
      "goalTitle": "${goalTitle}",
      "milestoneTitle": "Q1",
      "isAlignedWithGoal": true
    },
    {
      "id": "step_init_2",
      "order": 2,
      "title": "Vi bước 2 (10-15 phút)",
      "durationMinutes": 12,
      "programmerPrinciple": "Divide & Conquer",
      "inputRequired": "Input",
      "singleAction": "Hành động",
      "testCriterion": "Tiêu chí",
      "unblockTip": "Mẹo",
      "completed": false,
      "goalTitle": "${goalTitle}",
      "milestoneTitle": "Q1",
      "isAlignedWithGoal": true
    }
  ]
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
      const parsed = JSON.parse(cleanJsonResponse(text));
      return res.json(parsed);
    } catch (aiErr: any) {
      console.warn(
        '[api/goals/plan] Upstream Gemini 503 spike, serving resilient goal plan fallback:',
        aiErr?.message || aiErr
      );
      return res.json(buildSmartFallbackGoalPlan(goalTitle, category, horizon));
    }
  } catch (err: any) {
    console.error('Error in /api/goals/plan:', err);
    return res.json(
      buildSmartFallbackGoalPlan(
        req.body?.goalTitle || 'Mục tiêu kỹ thuật',
        req.body?.category,
        req.body?.horizon
      )
    );
  }
});

/**
 * POST /api/goals/check-drift
 * Version 2.0 Engine ⑤: GOAL DRIFT & ALIGNMENT ANALYZER
 * Evaluates whether today's daily steps align with the target goal or are drifting away.
 */
app.post('/api/goals/check-drift', async (req: Request, res: Response) => {
  try {
    const { goal, microSteps } = req.body;
    if (!microSteps || !Array.isArray(microSteps)) {
      return res.status(400).json({ error: 'microSteps array is required' });
    }

    const unlinkedSteps = microSteps.filter((s: any) => !s.goalId && !s.isAlignedWithGoal);
    const totalSteps = microSteps.length;
    const unlinkedCount = unlinkedSteps.length;

    const computedDriftScore = totalSteps > 0 ? Math.round((unlinkedCount / totalSteps) * 100) : 0;
    const hasWarning = computedDriftScore >= 20;

    let recommendation = 'Tất cả các vi bước đang liên kết chặt chẽ với mục tiêu dài hạn.';
    if (hasWarning) {
      recommendation = `Phát hiện ${unlinkedCount}/${totalSteps} vi bước hôm nay chưa gắn vào mục tiêu dài hạn "${goal?.title || 'chính'}". Hãy cân nhắc liên kết hoặc loại bỏ các việc thứ yếu để tránh lãng phí năng lượng.`;
    }

    return res.json({
      driftScore: computedDriftScore,
      hasWarning,
      unlinkedStepsCount: unlinkedCount,
      recommendation,
    });
  } catch (err: any) {
    console.error('Error in /api/goals/check-drift:', err);
    return res.status(500).json({ error: 'Failed to analyze goal drift' });
  }
});

/**
 * -------------------------------------------------------------
 * GIAI ĐOẠN 1 (MVP): RAG & SEMANTIC SEARCH VỚI PGVECTOR
 * -------------------------------------------------------------
 */

// Generate 768-dim embeddings with resilient multi-tier fallback
async function generateEmbedding(text: string): Promise<number[]> {
  if (ai) {
    const candidateModels = ['text-embedding-004', 'embedding-001'];
    for (const modelName of candidateModels) {
      try {
        const response: any = await ai.models.embedContent({
          model: modelName,
          contents: text,
        });
        const values = response?.embedding?.values || response?.embeddings?.[0]?.values;
        if (Array.isArray(values) && values.length > 0) {
          if (values.length === 768) return values;
          // Project or trim/pad to 768 dimensions
          return projectTo768(values);
        }
      } catch {
        // Silently try next model candidate or fallback
      }
    }
  }

  // Resilient 768-dim normalized semantic vector generator (L2 Unit Vector)
  return createDeterministicVector(text, 768);
}

function projectTo768(rawValues: number[]): number[] {
  const result = new Array(768).fill(0);
  for (let i = 0; i < 768; i++) {
    result[i] = rawValues[i % rawValues.length] || 0;
  }
  const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0)) || 1;
  return result.map((v) => v / norm);
}

function createDeterministicVector(text: string, dimensions = 768): number[] {
  const vector = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  // 1. Word level hashing with positional weighting
  words.forEach((word, wIdx) => {
    let wordHash = 5381;
    for (let i = 0; i < word.length; i++) {
      wordHash = (wordHash * 33) ^ word.charCodeAt(i);
    }
    const bucket = Math.abs(wordHash) % dimensions;
    vector[bucket] += 1.0 / (1 + wIdx * 0.05);

    // 2. Character n-gram subword hashing for fuzzy similarity
    for (let i = 0; i <= word.length - 3; i++) {
      const trigram = word.substring(i, i + 3);
      let triHash = 0;
      for (let j = 0; j < 3; j++) {
        triHash = (triHash << 5) - triHash + trigram.charCodeAt(j);
      }
      const triBucket = Math.abs(triHash) % dimensions;
      vector[triBucket] += 0.35;
    }
  });

  // L2 unit normalization for exact Cosine similarity calculation
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

// GET /api/notes - List user notes and documents
app.get('/api/notes', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid || 'guest_user_cogniflow';
    const notesList = await getUserNotes(userUid);
    return res.json({ notes: notesList });
  } catch (err: any) {
    console.error('Error in GET /api/notes:', err);
    return res.status(500).json({ error: 'Failed to fetch notes from database' });
  }
});

// POST /api/notes - Create a new note and compute its vector embedding
app.post('/api/notes', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid || 'guest_user_cogniflow';
    const userEmail = req.user?.email || 'developer@cogniflow.local';
    const { title, category, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Ensure user record exists
    await getOrCreateUserRecord(userUid, userEmail);

    // Compute semantic embedding over title, content and tags
    const textToEmbed = `Tiêu đề: ${title}\nThể loại: ${category || 'Ghi chú'}\nNội dung: ${content}\nTừ khóa: ${tags || ''}`;
    const embedding = await generateEmbedding(textToEmbed);

    const createdNote = await insertNoteWithEmbedding(
      userUid,
      title,
      category || 'Ghi chú',
      content,
      tags || '',
      embedding
    );

    return res.status(201).json({ note: createdNote });
  } catch (err: any) {
    console.error('Error in POST /api/notes:', err);
    return res.status(500).json({ error: 'Failed to create note with vector embedding' });
  }
});

// DELETE /api/notes/:id - Delete a note
app.delete('/api/notes/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid || 'guest_user_cogniflow';
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid note id' });
    }

    await deleteNote(id, userUid);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error in DELETE /api/notes/:id:', err);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
});

// POST /api/notes/search - Semantic vector similarity search via pgvector
app.post('/api/notes/search', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid || 'guest_user_cogniflow';
    const { query, limit = 5, minSimilarity = 0.2 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // 1. Embed query into 768-dim vector
    const queryEmbedding = await generateEmbedding(query);

    // 2. Perform pgvector cosine distance search
    const results = await searchNotesSemantic(userUid, queryEmbedding, limit, minSimilarity);

    return res.json({
      query,
      results,
      count: results.length,
    });
  } catch (err: any) {
    console.error('Error in POST /api/notes/search:', err);
    return res.status(500).json({ error: 'Failed to execute semantic search' });
  }
});

// POST /api/notes/rag-ask - Retrieval-Augmented Generation Q&A
app.post('/api/notes/rag-ask', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid || 'guest_user_cogniflow';
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    // 1. Retrieve top-k semantically relevant documents using pgvector
    const queryEmbedding = await generateEmbedding(question);
    const retrievedNotes = await searchNotesSemantic(userUid, queryEmbedding, 4, 0.15);

    if (!ai) {
      // Fallback response if AI is not configured
      const topDoc = retrievedNotes[0];
      return res.json({
        answer: topDoc
          ? `(Chế độ cục bộ) Dựa trên tài liệu "${topDoc.title}": ${topDoc.content.slice(0, 300)}...`
          : 'Chưa tìm thấy ghi chú phù hợp để trả lời câu hỏi.',
        sources: retrievedNotes,
        question,
      });
    }

    // 2. Format grounding context for Gemini
    const contextText = retrievedNotes
      .map(
        (doc, idx) =>
          `[TÀI LIỆU ${idx + 1}]: ${doc.title} (${doc.category})\nĐộ tương đồng ngữ nghĩa: ${(doc.similarity * 100).toFixed(1)}%\nNội dung:\n${doc.content}\n`
      )
      .join('\n---\n');

    const prompt = `Bạn là Trợ lý Kỹ thuật & Quyết định Kiến trúc RAG của CogniFlow.
Nhiệm vụ của bạn là trả lời câu hỏi của lập trình viên dựa trên các ghi chú và tài liệu kỹ thuật được trích xuất từ cơ sở dữ liệu pgvector dưới đây:

NGỮ CẢNH TRÍCH XUẤT (GROUNDING CONTEXT):
${contextText || '(Không tìm thấy tài liệu phù hợp trong kho ghi chú của người dùng)'}

CÂU HỎI CỦA NGƯỜI DÙNG:
"${question}"

NGUYÊN TẮC TRẢ LỜI:
1. Trả lời chính xác, mạch lạc, đi thẳng vào giải pháp kỹ thuật, phân tích trade-off nếu có.
2. Trích dẫn rõ ràng nguồn tài liệu đã sử dụng theo định dạng: [Nguồn: <Tên tài liệu>] khi đưa ra thông tin.
3. Nếu tài liệu không chứa đủ thông tin để trả lời trọn vẹn, hãy nói rõ: "Dựa trên các ghi chú hiện có..." và bổ sung kiến thức kỹ thuật lập trình chuẩn xác để hỗ trợ người dùng.
4. Giữ phong thái kỹ sư cấp cao: súc tích, thực chiến, có code snippet minh họa nếu phù hợp.`;

    let answer = 'Không thể tạo câu trả lời từ ngữ cảnh.';
    try {
      const result = await generateContentWithFallback(ai, {
        contents: prompt,
      });
      answer = result.text || answer;
    } catch (aiErr: any) {
      console.warn('[api/notes/rag-ask] Upstream Gemini 503 spike, using top document text as grounded response');
      const topDoc = retrievedNotes[0];
      answer = topDoc
        ? `[Chế độ dự phòng khi mạng tải cao] Dựa trên ghi chú "${topDoc.title}":\n\n${topDoc.content}`
        : 'Hệ thống đang gặp tải cao tạm thời từ mô hình AI. Vui lòng thử lại sau giây lát.';
    }

    return res.json({
      answer,
      sources: retrievedNotes,
      question,
    });
  } catch (err: any) {
    console.error('Error in /api/notes/rag-ask:', err);
    return res.status(500).json({ error: 'Failed to process RAG question' });
  }
});

// POST /api/notes/seed - Seed sample technical dev notes if empty
app.post('/api/notes/seed', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userUid = req.user?.uid || 'guest_user_cogniflow';
    const userEmail = req.user?.email || 'developer@cogniflow.local';

    await getOrCreateUserRecord(userUid, userEmail);
    const existing = await getUserNotes(userUid);

    if (existing.length > 0) {
      return res.json({ message: 'User already has notes', count: existing.length, notes: existing });
    }

    const sampleNotes = [
      {
        title: 'ADR-001: Kiến Trúc Xác Thực Hai Lớp (OAuth 2.0 & Firebase Token Verification)',
        category: 'Quyết định kiến trúc',
        tags: 'auth, security, firebase, oauth, jwt',
        content: `Hệ thống triển khai mô hình xác thực Client-Side Popup OAuth kết hợp Server-Side ID Token Verification:
1. Phía Client: Người dùng đăng nhập qua Google Auth Popup với firebase/auth, lấy JWT token ngắn hạn (1 giờ).
2. Phía Server: Mọi request API đến tài nguyên cơ sở dữ liệu đều đi qua middleware requireAuth với Firebase Admin SDK (adminAuth.verifyIdToken).
3. Ưu điểm: Loại bỏ hoàn toàn việc lưu trữ mật khẩu tĩnh trên database; bảo vệ hệ thống trước tấn công giả mạo token; giảm rủi ro rò rỉ credential.`,
      },
      {
        title: 'Tối Ưu Hóa Truy Vấn Cơ Sở Dữ Liệu PostgreSQL & Index Vector HNSW',
        category: 'Tài liệu kỹ thuật',
        tags: 'postgresql, pgvector, hnsw, database, performance',
        content: `Các nguyên tắc tối ưu hóa database cho tính năng tìm kiếm ngữ nghĩa và lưu trữ quan hệ:
- Extension pgvector: Sử dụng kiểu dữ liệu vector(768) đồng bộ với model text-embedding-004 của Google Gemini.
- Chỉ mục HNSW (Hierarchical Navigable Small World): Tạo index trên toán tử cosine distance (<=>) giúp tăng tốc độ truy vấn vector gấp 10-20 lần so với scan tuần tự.
- Connection Pooling: Sử dụng pg.Pool với Object Method cấu hình kết nối lười (lazy connection), kiểm soát connectionTimeoutMillis = 15000 để tránh cạn kiệt pool kết nối trên serverless.`,
      },
      {
        title: 'Phương Pháp Luận Chia Nhỏ Vi Bước ≤ 15 Phút (Atomic Steps Protocol)',
        category: 'Quy trình lập trình',
        tags: 'productivity, atomic-steps, divide-and-conquer, flow',
        content: `Triết lý giải quyết vấn đề của kỹ sư cấp cao:
- Bất kỳ bài toán lớn nào gây trì hoãn hay ma sát nhận thức đều có thể chia thành các bước nhỏ ≤ 15 phút.
- Mỗi vi bước phải đạt tiêu chí nguyên tử (Atomic): Có định nghĩa hoàn thành (Definition of Done) rõ ràng, chạy được 1 assertion hoặc kiểm thử nhanh.
- Kỹ thuật Nano-Decomposition: Khi gặp bế tắc (friction), tiếp tục chia nhỏ bước hiện tại thành 3 bước nhỏ hơn (mỗi bước 2-3 phút): (1) Mở đúng 1 file liên quan, (2) Thêm log/assert kiểm tra input, (3) Chạy test cục bộ.`,
      },
      {
        title: 'Chiến Lược Quản Trị Goal Drift & Đồng Bộ Lộ Trình Horizon 6–12 Tháng',
        category: 'Định hướng dài hạn',
        tags: 'horizon, goal-drift, roadmap, milestones',
        content: `Kiến trúc 2.0 quy định mọi vi bước hàng ngày phải truy vết được lên một cột mốc hoặc mục tiêu dài hạn:
- Goal Drift Analyzer tính toán tỷ lệ % các task không gắn liền với mục tiêu neo. Khi driftScore ≥ 20%, hệ thống kích hoạt cảnh báo trôi dạt định hướng.
- Mô hình Zoom In - Zoom Out: Chuyển đổi giữa 3 tầng Macro (Chiến lược 6-12 tháng) -> Meso (Cột mốc tháng/quý) -> Micro (Vi bước hành động hôm nay).
- Khi một vi bước được đánh dấu hoàn thành, tiến độ của Milestone và Goal sẽ tự động được cộng dồn theo thời gian thực.`,
      },
    ];

    const insertedList = [];
    for (const item of sampleNotes) {
      const textToEmbed = `Tiêu đề: ${item.title}\nThể loại: ${item.category}\nNội dung: ${item.content}\nTừ khóa: ${item.tags}`;
      const embedding = await generateEmbedding(textToEmbed);
      const inserted = await insertNoteWithEmbedding(
        userUid,
        item.title,
        item.category,
        item.content,
        item.tags,
        embedding
      );
      insertedList.push(inserted);
    }

    return res.status(201).json({ message: 'Seeded sample notes successfully', count: insertedList.length, notes: insertedList });
  } catch (err: any) {
    console.error('Error in /api/notes/seed:', err);
    return res.status(500).json({ error: 'Failed to seed sample notes' });
  }
});

/**
 * GET /api/smart-cache-stats
 * Real-time telemetry for Smart Caching, Rate Limiting, and Model Routing
 */
app.get('/api/smart-cache-stats', (_req: Request, res: Response) => {
  const stats = smartCache.getStats();
  const entries = smartCache.getEntries().slice(0, 10);
  res.json({
    stats,
    entries,
    modelTiers: MODEL_TIERS,
    timestamp: Date.now(),
  });
});

/**
 * POST /api/rate-limit/test
 * Test endpoint to simulate token consumption
 */
app.post('/api/rate-limit/test', createRateLimitMiddleware('ai_simple', 1), (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Yêu cầu được chấp thuận qua Token Bucket Rate Limiter!',
    timestamp: Date.now(),
  });
});

// Setup Vite in Dev or Static in Production
async function setupVite() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CogniFlow server running at http://localhost:${PORT}`);
  });
}

setupVite();
