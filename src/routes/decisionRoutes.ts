import { Router, Request, Response } from 'express';
import { ai, cleanJsonResponse } from '../lib/ai.ts';
import {
  buildSmartFallbackDecision,
  buildSmartFallbackSemanticDrift,
  generateContentWithFallback,
} from '../lib/geminiResilience.ts';
import { serverDriftFeedbackStore, getDriftCalibrationStats, ServerDriftFeedback } from './driftFeedbackStore.ts';
import {
  createRateLimitMiddleware,
  getMeaningfulGoalTokens,
  addSemanticGuardrailMetadata,
} from './routeHelpers.ts';
import { smartCache } from '../utils/smartCacheRateLimitEngine.ts';

export const decisionRouter = Router();

decisionRouter.post('/socratic-decision', async (req: Request, res: Response) => {
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
        taskComplexity: 'complex',
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

decisionRouter.get('/drift-feedback', (_req: Request, res: Response) => {
  res.json({
    feedbacks: serverDriftFeedbackStore,
    calibrationStats: getDriftCalibrationStats(),
    exemptions: serverDriftFeedbackStore.filter((f) => f.isFalsePositive),
  });
});

decisionRouter.post('/drift-feedback', (req: Request, res: Response) => {
  try {
    const { taskId, taskTitle, coreGoalTitle, detectedType, isFalsePositive, userReason } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: 'taskTitle is required' });
    }

    const newFeedback: ServerDriftFeedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId: taskId || '',
      taskTitle: taskTitle.trim(),
      coreGoalTitle: coreGoalTitle || '',
      detectedType: detectedType || 'over_engineering',
      isFalsePositive: Boolean(isFalsePositive),
      userReason: userReason || (isFalsePositive ? 'Được lập trình viên xác nhận cần thiết cho dự án' : 'Xác nhận là sa đà'),
      timestamp: Date.now(),
    };

    serverDriftFeedbackStore.push(newFeedback);
    smartCache.clear();

    const stats = getDriftCalibrationStats();

    return res.json({
      success: true,
      feedback: newFeedback,
      calibrationStats: stats,
      message: isFalsePositive
        ? 'Đã ghi nhận ngoại lệ (False Positive). AI đã cập nhật bộ nhớ học hỏi và sẽ không báo động giả cho các tác vụ tương tự.'
        : 'Đã xác nhận bẫy Rabbit Hole (True Positive). AI ghi nhận vào độ chính xác.',
    });
  } catch (err: any) {
    console.error('Error in POST /api/drift-feedback:', err);
    return res.status(500).json({ error: 'Failed to record drift feedback' });
  }
});

decisionRouter.post('/semantic-drift-analysis', createRateLimitMiddleware('ai_simple', 1), async (req: Request, res: Response) => {
  try {
    const { coreGoalTitle, coreGoalVision, tasks, userExemptions = [] } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.json(addSemanticGuardrailMetadata({
        overallAlignmentPercent: 100,
        driftStatus: 'safe',
        detectedRabbitHoles: [],
        summaryAnalysis: 'Chưa có task nào để phân tích.',
        calibrationStats: getDriftCalibrationStats(),
      }));
    }

    const normalizedTasks = tasks
      .filter((task: any) => task && typeof task.title === 'string' && task.title.trim())
      .map((task: any, index: number) => ({
        id: typeof task.id === 'string' && task.id ? task.id : `task_${index + 1}`,
        title: task.title.trim(),
      }));
    if (normalizedTasks.length !== tasks.length) {
      return res.status(400).json({ error: 'every task must contain a non-empty title' });
    }
    if (normalizedTasks.length === 0) {
      return res.status(400).json({ error: 'tasks must contain at least one item with a title' });
    }

    const allExemptions = [
      ...serverDriftFeedbackStore.filter((f) => f.isFalsePositive).map((f) => ({
        taskId: f.taskId,
        taskTitle: f.taskTitle,
        reason: f.userReason,
      })),
      ...(Array.isArray(userExemptions) ? userExemptions : []),
    ];

    const cacheKey = `drift_analysis:${(coreGoalTitle || '').toLowerCase()}:${normalizedTasks
      .map((task: any) => `${task.id}:${task.title.toLowerCase()}`)
      .join('|')}:ex_${allExemptions.length}`;
    const cached = smartCache.get(cacheKey);
    if (cached.hit && cached.data) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.json(addSemanticGuardrailMetadata({
        ...cached.data,
        calibrationStats: getDriftCalibrationStats(),
      }));
    }
    res.setHeader('X-Cache-Status', 'MISS');

    if (!ai) {
      const fallback = buildSmartFallbackSemanticDrift(coreGoalTitle, normalizedTasks, allExemptions);
      smartCache.set(cacheKey, fallback, 'simple');
      return res.json(addSemanticGuardrailMetadata({
        ...fallback,
        calibrationStats: getDriftCalibrationStats(),
      }));
    }

    const exemptionsPromptText =
      allExemptions.length > 0
        ? `\nQUY TẮC HIỆU CHỈNH TRÁNH BÁO ĐỘNG GIẢ (CALIBRATION / FALSE POSITIVES TỪ LẬP TRÌNH VIÊN):\n` +
          allExemptions
            .map(
              (e, idx) =>
                `${idx + 1}. Tác vụ "${e.taskTitle}" => ĐÃ ĐƯỢC XÁC NHẬN LÀ HỢP LỆ VÀ CẦN THIẾT (Lý do: "${e.reason || 'Kỹ sư yêu cầu'}").`
            )
            .join('\n') +
          `\nQUY TẮC BẮT BUỘC: Tuyệt đối KHÔNG gắn bất kỳ nhãn Rabbit Hole nào cho các tác vụ trên hoặc các tác vụ tương tự. Hãy đánh giá chúng 100% thẳng hàng với Core Goal.\n`
        : '';

    const systemInstruction = `
Bạn là Hệ Thống Phân Tích Ngữ Nghĩa Phát Hiện "Rabbit Hole" (Semantic Drift Engine) dành riêng cho Solo Developer / Indie Hacker.
Mục tiêu sống còn của Solo Dev: Ship MVP nhanh nhất, kiểm chứng với khách hàng thực tế và tránh lãng phí thời gian.

Các loại Rabbit Hole phổ biến:
1. "over_engineering": Dựng kiến trúc quá phức tạp (Kubernetes, microservices, CQRS, multi-region) khi chưa có traffic.
2. "premature_optimization": Tối ưu microsecond latency, custom cache phức tạp khi DB chỉ vài chục dòng.
3. "bike_shedding": Tốn thời gian chỉnh màu sắc, animation, logo, dark mode thay vì hoàn thiện core CRUD.
4. "reinventing_wheel": Tự code lại Auth, ORM, Datepicker từ đầu thay vì dùng thư viện chuẩn.
5. "distraction_task": Task phụ trợ ngoài luồng không ai yêu cầu.
${exemptionsPromptText}
Nhiệm vụ: So sánh từng task trong danh sách với Core Goal:
- Core Goal: "${coreGoalTitle || 'Xây dựng MVP'}"
- Vision: "${coreGoalVision || 'Ra mắt sản phẩm có paying user đầu tiên'}"

Đánh giá xem mỗi task có phục vụ Core Goal không và có rơi vào Rabbit Hole không.
Trả về JSON thuần:
{
  "coreGoalTitle": "${coreGoalTitle || 'Core Goal'}",
  "overallAlignmentPercent": 80,
  "driftStatus": "safe",
  "detectedRabbitHoles": [
    {
      "taskId": "step_id",
      "taskTitle": "Tên task",
      "rabbitHoleType": "over_engineering",
      "severity": "high",
      "whyItsATrap": "Giải thích ngắn gọn tại sao đây là bẫy sa đà",
      "leanAlternative": "Gợi ý cách làm tinh gọn hơn hoặc hoãn lại"
    }
  ],
  "summaryAnalysis": "Nhận xét tổng quan 1-2 câu về mức độ tập trung của Solo Dev"
}
Lưu ý: driftStatus: "safe" (>=70%), "caution" (50-69%), "danger_yellow" (<50%).
`;

    const prompt = `Phân tích danh sách ${normalizedTasks.length} task này:\n${JSON.stringify(normalizedTasks, null, 2)}`;

    try {
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        taskComplexity: 'simple',
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(cleanJsonResponse(text));

      const exemptionTitles = allExemptions.map((e) => (e.taskTitle || '').toLowerCase().trim());
      const filteredRabbitHoles = (parsed.detectedRabbitHoles || []).filter((rh: any) => {
        const rhTitle = (rh.taskTitle || '').toLowerCase().trim();
        return !exemptionTitles.some((ex) => rhTitle.includes(ex) || ex.includes(rhTitle));
      });

      const totalTasks = Math.max(1, normalizedTasks.length);
      const alignedCount = totalTasks - filteredRabbitHoles.length;
      const recalculatedAlignment = Math.min(100, Math.max(0, Math.round((alignedCount / totalTasks) * 100)));

      const finalResult = {
        ...parsed,
        detectedRabbitHoles: filteredRabbitHoles,
        overallAlignmentPercent: recalculatedAlignment,
        driftStatus: recalculatedAlignment < 50 ? 'danger_yellow' : recalculatedAlignment < 75 ? 'caution' : 'safe',
        summaryAnalysis:
          filteredRabbitHoles.length > 0
            ? parsed.summaryAnalysis
            : allExemptions.length > 0
            ? `Tất cả các tác vụ đang bám sát Core Goal (đã tự động áp dụng ${allExemptions.length} quy tắc học hỏi từ phản hồi của bạn).`
            : 'Tất cả các tác vụ đang bám sát mục tiêu cốt lõi.',
        calibrationStats: getDriftCalibrationStats(),
        activeExemptionsCount: allExemptions.length,
      };

      smartCache.set(cacheKey, finalResult, 'simple');
      return res.json(addSemanticGuardrailMetadata(finalResult));
    } catch (aiErr: any) {
      console.warn('[api/semantic-drift-analysis] Fallback to resilient heuristic:', aiErr?.message || aiErr);
      const fallback = buildSmartFallbackSemanticDrift(coreGoalTitle, normalizedTasks, allExemptions);
      const fallbackWithStats = {
        ...fallback,
        calibrationStats: getDriftCalibrationStats(),
      };
      smartCache.set(cacheKey, fallbackWithStats, 'simple');
      return res.json(addSemanticGuardrailMetadata(fallbackWithStats));
    }
  } catch (err: any) {
    console.error('Error in /api/semantic-drift-analysis:', err);
    return res.json(addSemanticGuardrailMetadata({
      ...buildSmartFallbackSemanticDrift(req.body?.coreGoalTitle || '', req.body?.tasks || []),
      calibrationStats: getDriftCalibrationStats(),
    }));
  }
});
