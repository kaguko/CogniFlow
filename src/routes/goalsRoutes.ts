import { Router, Request, Response } from 'express';
import { ai, cleanJsonResponse } from '../lib/ai.ts';
import { buildSmartFallbackGoalPlan, generateContentWithFallback } from '../lib/geminiResilience.ts';

export const goalsRouter = Router();

goalsRouter.post('/plan', async (req: Request, res: Response) => {
  try {
    const { goalTitle, vision, horizon, hoursPerWeek, category, primarySkills } = req.body;
    if (!goalTitle) {
      return res.status(400).json({ error: 'goalTitle is required' });
    }

    if (!ai) {
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

goalsRouter.post('/check-drift', async (req: Request, res: Response) => {
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
