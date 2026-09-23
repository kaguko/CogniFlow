import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality, ThinkingLevel, Type } from '@google/genai';
import { serverConfig } from './serverConfig';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = serverConfig.port;

app.use(express.json({ limit: '10mb' }));

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
app.post('/api/predict', async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    if (!context || !context.title) {
      return res.status(400).json({ error: 'Context with title is required' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Using local fallback.',
      });
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
      "programmerPrinciple": "Divide & Conquer" (hoặc 'Atomic Commit', 'TDD Loop', 'Fail Fast', 'YAGNI / Minimal Surface', 'Boundary Isolation'),
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
      "severity": "critical" | "moderate" | "low",
      "category": "cognitive" | "technical" | "dependency" | "process",
      "symptom": "Triệu chứng nhận biết",
      "rootCauseWhy": "Lý do gốc rễ (Why)",
      "counterMeasure": "Biện pháp giải quyết tức thì"
    }
  ],
  "riskMatrix": [
    {
      "id": "rk_1",
      "risk": "Nguy cơ tiềm ẩn",
      "probability": "High" | "Medium" | "Low",
      "impact": "High" | "Medium" | "Low",
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
  } catch (err: any) {
    console.error('Error in /api/predict:', err);
    return res.status(500).json({
      error: 'Failed to generate contextual prediction: ' + (err.message || String(err)),
    });
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
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Using local fallback.',
      });
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
  } catch (err: any) {
    console.error('Error in /api/socratic-decision:', err);
    return res.status(500).json({
      error: 'Failed to analyze decision: ' + (err.message || String(err)),
    });
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
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(cleanJsonResponse(text));
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/decompose:', err);
    return res.status(500).json({
      error: 'Failed to decompose step: ' + (err.message || String(err)),
    });
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
  } catch (err: any) {
    console.error('Error in /api/goals/plan:', err);
    return res.status(500).json({
      error: 'Failed to generate goal plan: ' + (err.message || String(err)),
    });
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
