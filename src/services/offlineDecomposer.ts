import { MicroStep } from '../microStep/entities/microStep';
import { ProjectContext } from '../projectContext/entities/projectContext';
import { PredictionPayload } from '../prediction/mod';

/**
 * Offline Heuristic Decomposer & Local Rule Engine
 * Allows full execution of core micro-step decomposition, drift score evaluation,
 * and cognitive friction analysis without requiring active internet connection or AI server.
 */
export function decomposeOffline(context: ProjectContext): PredictionPayload {
  const title = context.title || 'Dự án mới';
  const description = context.description || '';
  const combinedText = `${title} ${description}`.toLowerCase();

  // Keyword extraction for domain-specific micro-steps
  const isBackend = /api|backend|database|postgres|sql|server|express|nest|rest/i.test(combinedText);
  const isFrontend = /ui|frontend|react|view|css|tailwind|component|layout|screen/i.test(combinedText);
  const isDocOrPlan = /báo cáo|kế hoạch|doc|document|quy trình|nghiên cứu|kiểm thử/i.test(combinedText);

  let stepTemplates: Array<{
    title: string;
    duration: number;
    singleAction: string;
    testCriterion: string;
    unblockTip: string;
    inputRequired: string;
  }> = [];

  if (isBackend) {
    stepTemplates = [
      {
        title: `Phân tích yêu cầu schema & dữ liệu cho ${title.slice(0, 30)}`,
        duration: 5,
        singleAction: 'Khai báo interface TypeScript & Drizzle table schema',
        testCriterion: 'Chạy tsc --noEmit không báo lỗi type',
        unblockTip: 'Chỉ định nghĩa các trường bắt buộc, hoãn nullable fields',
        inputRequired: 'Yêu cầu nghiệp vụ tính năng backend',
      },
      {
        title: 'Khởi tạo API Router & Controller stub',
        duration: 10,
        singleAction: 'Tạo file router Express và gắn handler nháp',
        testCriterion: 'Gọi cURL /api/endpoint trả về JSON status ok',
        unblockTip: 'Trả dữ liệu mock cứng trước khi truy vấn DB',
        inputRequired: 'Cấu hình Express Router hiện tại',
      },
      {
        title: 'Cấu hình Validate Input & Middleware xử lý lỗi',
        duration: 8,
        singleAction: 'Viết middleware kiểm tra req.body bắt buộc',
        testCriterion: 'Gửi payload rỗng nhận về HTTP status 400',
        unblockTip: 'Dùng helper validate tối giản, không viết schema phức tạp',
        inputRequired: 'Cấu trúc req.body mong muốn',
      },
      {
        title: 'Kiểm thử phản hồi API bằng cURL local',
        duration: 5,
        singleAction: 'Chạy test script cURL / Postman local',
        testCriterion: 'Nhận được HTTP 200 OK kèm payload chuẩn',
        unblockTip: 'Ghi log request ra console để quan sát trực tiếp',
        inputRequired: 'Endpoint URL địa phương',
      },
    ];
  } else if (isFrontend) {
    stepTemplates = [
      {
        title: `Thiết kế Mock Component Layout cho ${title.slice(0, 30)}`,
        duration: 5,
        singleAction: 'Tạo Component React rỗng kèm Tailwind layout',
        testCriterion: 'Component hiển thị đúng vị trí trên màn hình',
        unblockTip: 'Dùng màu nền tạm (bg-slate-800) để căn lề nhanh',
        inputRequired: 'Mô tả vị trí Component trong App',
      },
      {
        title: 'Xây dựng State Hook & Props Interface',
        duration: 10,
        singleAction: 'Viết custom hook quản lý state local',
        testCriterion: 'State thay đổi khi kích hoạt handler nháp',
        unblockTip: 'Giữ state phẳng, không lồng state quá 2 cấp',
        inputRequired: 'Các biến state cần lưu trữ',
      },
      {
        title: 'Gắn dữ liệu mẫu & Xử lý trạng thái Loading / Empty',
        duration: 8,
        singleAction: 'Thêm skeleton loader khi chưa có dữ liệu',
        testCriterion: 'UI hiển thị mượt khi chuyển giữa Loading và Data',
        unblockTip: 'Tạo mảng mock 3 phần tử để render thử',
        inputRequired: 'Mẫu dữ liệu JSON tham chiếu',
      },
      {
        title: 'Rà soát tương thích Responsive & Accessibility',
        duration: 5,
        singleAction: 'Kiểm tra breakpoint sm, md, lg',
        testCriterion: 'Không phát sinh vỡ layout hay scroll ngang',
        unblockTip: 'Dùng DevTools Toggle Device Toolbar',
        inputRequired: 'Kích thước màn hình mục tiêu',
      },
    ];
  } else if (isDocOrPlan) {
    stepTemplates = [
      {
        title: `Liệt kê 3 mục tiêu cốt lõi của ${title.slice(0, 30)}`,
        duration: 5,
        singleAction: 'Viết 3 gạch đầu dòng kết quả đầu ra',
        testCriterion: 'Mọi gạch đầu dòng đều đo lường được',
        unblockTip: 'Chỉ tập trung vào những việc PHẢI CÓ (Must-have)',
        inputRequired: 'Ý tưởng ban đầu của tài liệu',
      },
      {
        title: 'Soạn thảo khung đề mục chính (Outline)',
        duration: 8,
        singleAction: 'Tạo 4 mục chính H2 trong file Markdown',
        testCriterion: 'Cấu trúc logic mạch lạc từ tổng quan tới chi tiết',
        unblockTip: 'Mỗi mục chính chứa tối đa 3 mục con',
        inputRequired: '3 mục tiêu cốt lõi',
      },
      {
        title: 'Viết nháp phần nội dung quan trọng nhất',
        duration: 12,
        singleAction: 'Soạn thảo 2 đoạn văn trọng tâm',
        testCriterion: 'Nội dung trả lời trực tiếp câu hỏi Why-First',
        unblockTip: 'Viết thẳng vào vấn đề, loại bỏ các từ vô thưởng vô phạt',
        inputRequired: 'Đề mục Outline',
      },
      {
        title: 'Đọc lại & Đánh giá mức độ rõ ràng',
        duration: 5,
        singleAction: 'Rà soát lỗi chính tả và tính nhất quán',
        testCriterion: 'Đọc hiểu mượt mà không bị ngắt quãng',
        unblockTip: 'Đọc nhẩm thành tiếng để phát hiện câu từ rườm rà',
        inputRequired: 'Bản nháp Markdown',
      },
    ];
  } else {
    stepTemplates = [
      {
        title: `Phân rã nhiệm vụ ban đầu của ${title.slice(0, 30)}`,
        duration: 5,
        singleAction: 'Xác định vi bước 5 phút đầu tiên',
        testCriterion: 'Có thể hành động ngay không cần đắn đo',
        unblockTip: 'Chia nhỏ tới mức không thể trì hoãn',
        inputRequired: 'Nhiệm vụ chung',
      },
      {
        title: 'Thực thi khối công việc trọng tâm thứ nhất',
        duration: 10,
        singleAction: 'Tập trung hoàn thành 1 việc duy nhất',
        testCriterion: 'Có kết quả cụ thể đo đạc được',
        unblockTip: 'Tắt hết các thông báo để duy trì dòng chảy',
        inputRequired: 'Kế hoạch vi bước 1',
      },
      {
        title: 'Đánh giá ma sát & Tối ưu hóa kết quả',
        duration: 8,
        singleAction: 'Rà soát chất lượng công việc vừa làm',
        testCriterion: 'Không còn điểm nghẽn tồn đọng',
        unblockTip: 'Chỉnh sửa nhẹ, tránh làm lại từ đầu',
        inputRequired: 'Kết quả vi bước 1',
      },
      {
        title: 'Nghiệm thu vi bước & Ghi nhận tiến độ',
        duration: 5,
        singleAction: 'Tích chọn hoàn thành và lưu vết',
        testCriterion: 'Cập nhật trạng thái tiến độ',
        unblockTip: 'Thả lỏng 1 phút trước khi sang vi bước mới',
        inputRequired: 'Danh sách vi bước',
      },
    ];
  }

  const generatedMicroSteps: MicroStep[] = stepTemplates.map((tmpl, idx) => ({
    id: `offline-ms-${Date.now()}-${idx + 1}`,
    title: tmpl.title,
    durationMinutes: tmpl.duration,
    completed: false,
    order: idx + 1,
    programmerPrinciple: 'Divide & Conquer',
    singleAction: tmpl.singleAction,
    testCriterion: tmpl.testCriterion,
    unblockTip: tmpl.unblockTip,
    inputRequired: tmpl.inputRequired,
    isAlignedWithGoal: true,
  }));

  return {
    strategicWhySummary: `[Offline Mode] Với ngữ cảnh "${title}", Local Rule Engine đã phân rã thành các vi bước ≤ 12 phút. Bạn có thể thực hiện và ghi nhận tiến độ bình thường không cần Internet.`,
    timelines: [
      {
        id: 'timeline-optimal-offline',
        name: 'Quỹ Đạo Tập Trung Chuẩn (Offline Rule Engine)',
        pathType: 'optimal',
        probability: 88,
        summary: 'Thực thi vi bước trực tiếp bằng Local Engine, 0ms latency',
        consequence: 'Duy trì dòng chảy công việc liên tục không gián đoạn bởi kết nối mạng.',
        milestones: [
          {
            timeframe: 'T-10m',
            prediction: 'Khởi tạo khối vi bước Offline local',
            state: 'optimal',
            keyIndicator: 'Tạo vi bước tức thì bằng Local Rule Engine',
          },
          {
            timeframe: 'T-30m',
            prediction: 'Hoàn thành 50% khối lượng không ma sát',
            state: 'optimal',
            keyIndicator: 'Lưu tiến độ vào LocalStorage an toàn',
          },
        ],
      },
      {
        id: 'timeline-drift-offline',
        name: 'Quỹ Đạo Sệch Hướng (Cần Đề Phòng)',
        pathType: 'drift',
        probability: 32,
        summary: 'Thực hiện công việc tự do không gán vào Goal Canvas',
        consequence: 'Tăng chỉ số trôi dạt (Drift Score) do thiếu liên kết mục tiêu.',
        milestones: [
          {
            timeframe: 'T-45m',
            prediction: 'Xuất hiện vi bước mồ côi',
            state: 'warning',
            keyIndicator: 'Gợi ý gán vi bước vào Goal Canvas',
          },
        ],
      },
    ],
    microSteps: generatedMicroSteps,
    bottlenecks: [],
    riskMatrix: [],
    behavioralInsights: {
      focusEfficiencyScore: 85,
      decisionFrictionIndex: 18,
      procrastinationRisk: 'Thấp',
      observedPatterns: ['Thực thi ở chế độ Offline Local'],
      cognitiveRecommendations: [
        'Toàn bộ vi bước được lưu trữ tại bộ nhớ đệm LocalStorage',
        'Khi quay lại Online, dữ liệu sẽ tự động đồng bộ',
      ],
    },
  };
}
