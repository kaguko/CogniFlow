import { ProjectContext, PredictionPayload, LongTermGoal } from '../types';

export const DEFAULT_LONG_TERM_GOALS: LongTermGoal[] = [
  {
    id: 'goal_senior_engineer',
    title: 'Trở thành Senior Software Engineer & System Architect',
    vision: 'Làm chủ kiến trúc phân tán (Distributed Systems), Clean Architecture, tối ưu hiệu năng cao và năng lực dẫn dắt kỹ thuật trong 12 tháng.',
    category: 'career',
    horizon: '12_months',
    deadline: 'Tháng 9/2027',
    progress: 38,
    driftScore: 12, // Mức lệch mục tiêu hiện tại: 12% (rất tốt < 15%)
    status: 'active',
    lastReviewedAt: 'Tuần này',
    constraints: {
      hoursPerWeek: 10,
      budget: 600,
      primarySkills: ['System Design', 'Clean Architecture', 'Redis/Kafka', 'Performance Tuning'],
      priority: 'critical',
    },
    linkedTaskIds: ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'],
    milestones: [
      {
        id: 'ms_q1_sysdesign',
        title: 'Nắm Vững System Design & Refactor Architecture',
        quarterOrMonth: 'Q1 (Tháng 1-3)',
        due: 'Hết Tháng 11/2026',
        status: 'on_track',
        progress: 65,
        keyDeliverable: 'Đọc DDIA chương 1-7, viết 3 bản thiết kế hệ thống, tái cấu trúc an toàn 2 module phức tạp.',
        dependencies: ['Unit Testing Mastery'],
        linkedTaskIds: ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'],
        sprints: [
          { id: 'sp_1', title: 'Characterization Test & Boundary Isolation', targetWeek: 'Tuần 1-2', tasksCount: 5, completedCount: 3 },
          { id: 'sp_2', title: 'Data Layer Decoupling & Repository Pattern', targetWeek: 'Tuần 3-4', tasksCount: 4, completedCount: 1 },
          { id: 'sp_3', title: 'Distributed Caching & High Availability', targetWeek: 'Tuần 5-6', tasksCount: 6, completedCount: 0 },
        ],
      },
      {
        id: 'ms_q2_opensource',
        title: 'Đóng Góp Open-Source & Tối Ưu Realtime Event Pipeline',
        quarterOrMonth: 'Q2 (Tháng 4-6)',
        due: 'Hết Tháng 2/2027',
        status: 'on_track',
        progress: 25,
        keyDeliverable: 'Đóng góp 2 PR merge vào repository open-source lớn; tối ưu pipeline 50k events/s.',
        dependencies: ['Q1 System Design'],
      },
      {
        id: 'ms_q3_lead_project',
        title: 'Lead 1 Dự Án Nội Bộ Quan Trọng & Tối Ưu Latency/Chi Phí',
        quarterOrMonth: 'Q3 (Tháng 7-9)',
        due: 'Hết Tháng 5/2027',
        status: 'at_risk',
        progress: 10,
        keyDeliverable: 'Chủ trì thiết kế kiến trúc cho dịch vụ thanh toán/realtime mới, giảm chi phí cloud 20%.',
        dependencies: ['Q2 Open-Source'],
      },
      {
        id: 'ms_q4_promotion',
        title: 'Chuẩn Bị Portfolio, Mock Interviews & Báo Cáo Thăng Cấp',
        quarterOrMonth: 'Q4 (Tháng 10-12)',
        due: 'Tháng 9/2027',
        status: 'on_track',
        progress: 0,
        keyDeliverable: 'Hoàn thành 5 buổi mock interview kiến trúc cấp Senior, nộp hồ sơ đánh giá năng lực.',
        dependencies: ['Q3 Lead Project'],
      },
    ],
  },
  {
    id: 'goal_saas_platform',
    title: 'Xây Dựng & Ra Mắt Nền Tảng SaaS Developer Tooling (MVP)',
    vision: 'Phát triển một sản phẩm công nghệ độc lập có 100 khách hàng trả phí đầu tiên trong vòng 6 tháng.',
    category: 'startup_product',
    horizon: '6_months',
    deadline: 'Tháng 3/2027',
    progress: 45,
    driftScore: 28, // Mức lệch mục tiêu: 28% (cần chú ý!)
    status: 'active',
    lastReviewedAt: 'Hôm qua',
    constraints: {
      hoursPerWeek: 15,
      budget: 1200,
      primarySkills: ['Fullstack TypeScript', 'PostgreSQL', 'Stripe Billing', 'Product Analytics'],
      priority: 'high',
    },
    linkedTaskIds: [],
    milestones: [
      {
        id: 'ms_saas_m1',
        title: 'MVP Core Engine, Authentication & Idempotent Payment',
        quarterOrMonth: 'M1-M2 (Tháng 1-2)',
        due: 'Tháng 11/2026',
        status: 'on_track',
        progress: 75,
        keyDeliverable: 'Core API chạy ổn định, webhook Stripe thanh toán không duplicate, Auth JWT an toàn.',
        dependencies: ['Spec Ready'],
      },
      {
        id: 'ms_saas_m2',
        title: 'Onboarding Tự Động & Thử Nghiệm Với 20 Alpha Users',
        quarterOrMonth: 'M3-M4 (Tháng 3-4)',
        due: 'Tháng 1/2027',
        status: 'at_risk',
        progress: 30,
        keyDeliverable: 'Thu thập 20 feedback tích cực, giải quyết triệt để 5 friction points trong luồng setup.',
        dependencies: ['MVP Core Ready'],
      },
      {
        id: 'ms_saas_m3',
        title: 'Public Launch trên ProductHunt & Chạm Mốc 100 Khách Hàng',
        quarterOrMonth: 'M5-M6 (Tháng 5-6)',
        due: 'Tháng 3/2027',
        status: 'on_track',
        progress: 0,
        keyDeliverable: 'ARR đạt $3,000, tỷ lệ churn < 5%, hệ thống auto-scale mượt mà.',
        dependencies: ['Alpha Feedback Closed'],
      },
    ],
  },
];

export const DEFAULT_PRESET_CONTEXTS: ProjectContext[] = [
  {
    id: 'preset_refactor_auth',
    title: 'Tái cấu trúc Module Auth Spaghetti 2,500 Dòng Mã',
    description: 'Module xác thực cũ đan xen logic session, JWT, database query trực tiếp và logging. Cần tách thành Clean Architecture mà không gây downtime hoặc regression bugs.',
    domain: 'software',
    deadlineHorizon: '3 ngày tới',
    energyLevel: 'medium',
    currentFriction: 'Sợ đụng vào đâu cũng vỡ (Fear of breaking unknown side effects), tê liệt phân tích không biết bắt đầu từ dòng nào.',
    behavioralFlags: ['analysis_paralysis', 'over_engineering', 'fear_of_regression'],
    techStack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Jest'],
    lastUpdated: 'Vừa xong',
    linkedGoalId: 'goal_senior_engineer',
    linkedMilestoneId: 'ms_q1_sysdesign',
  },
  {
    id: 'preset_realtime_scaling',
    title: 'Thiết Kế & Tối Ưu Hệ Thống Realtime Event Pipeline',
    description: 'Hệ thống nhận 50,000 WebSocket events/giây, database Redis đang chạm trần CPU 85%. Cần giảm tải và chia nhỏ kiến trúc xử lý.',
    domain: 'system_architecture',
    deadlineHorizon: '24 giờ tới',
    energyLevel: 'high',
    currentFriction: 'Phân vân giữa chuyển sang Kafka, RabbitMQ hay tối ưu Redis pipeline trước; rủi ro over-engineering rất cao.',
    behavioralFlags: ['over_engineering', 'context_switching'],
    techStack: ['Node.js', 'Redis Cluster', 'Go', 'Docker', 'Prometheus'],
    lastUpdated: '1 giờ trước',
    linkedGoalId: 'goal_senior_engineer',
    linkedMilestoneId: 'ms_q2_opensource',
  },
  {
    id: 'preset_memory_leak_prod',
    title: 'Truy Tìm & Khắc Phục Memory Leak Trong Production Pods',
    description: 'Pod Kubernetes bị OOMKilled mỗi 6 tiếng. Nghi ngờ rò rỉ heap do event listener hoặc unclosed database connection pool.',
    domain: 'devops_cloud',
    deadlineHorizon: 'Hôm nay (Gấp)',
    energyLevel: 'depleted',
    currentFriction: 'Áp lực thời gian, thiếu heap dump chi tiết, có xu hướng đoán mò (cargo-cult debugging) thay vì cô lập bài toán.',
    behavioralFlags: ['fatigue_bias', 'cargo_cult_guessing'],
    techStack: ['Kubernetes', 'Node.js V8 Inspector', 'Grafana', 'Linux perf'],
    lastUpdated: '2 giờ trước',
    linkedGoalId: 'goal_senior_engineer',
    linkedMilestoneId: 'ms_q1_sysdesign',
  },
  {
    id: 'preset_mvp_payment',
    title: 'Tích Hợp Cổng Thanh Toán Webhook & Idempotency Key',
    description: 'Triển khai luồng thanh toán Stripe / MoMo với cơ chế bảo đảm không trừ tiền hai lần (Strict Idempotency) và retry exponential backoff.',
    domain: 'software',
    deadlineHorizon: '2 ngày tới',
    energyLevel: 'high',
    currentFriction: 'Dễ sa đà vào việc viết framework idempotency tổng quát thay vì giải quyết case cụ thể cần thiết.',
    behavioralFlags: ['premature_generalization'],
    techStack: ['React', 'Express', 'Stripe API', 'PostgreSQL'],
    lastUpdated: 'Hôm qua',
    linkedGoalId: 'goal_saas_platform',
    linkedMilestoneId: 'ms_saas_m1',
  }
];

export const INITIAL_PREDICTION_DATA: Record<string, PredictionPayload> = {
  preset_refactor_auth: {
    strategicWhySummary: 'Vấn đề thực sự không phải là code xấu 2,500 dòng, mà là thiếu ranh giới kiểm thử (test safety net). Nếu tái cấu trúc mà không có Characterization Tests trước, bạn sẽ tốn 80% thời gian để mò lại các edge-case ngầm.',
    longTermGoals: DEFAULT_LONG_TERM_GOALS,
    activeGoalId: 'goal_senior_engineer',
    driftStatus: {
      driftScore: 12,
      hasWarning: false,
      unlinkedStepsCount: 0,
      recommendation: 'Các vi bước hôm nay liên kết chặt chẽ 100% với Cột mốc Q1 (System Design & Clean Refactoring) của Mục tiêu Senior Engineer. Tốc độ thực thi tối ưu.',
    },
    timelines: [
      {
        id: 't_optimal',
        name: 'Dòng thời gian Tối Ưu (Divide & Conquer)',
        pathType: 'optimal',
        probability: 78,
        summary: 'Áp dụng kỹ thuật Strangler Fig pattern: Giữ nguyên code cũ, viết integration test bọc ngoài, trích xuất từng hàm thuần (pure function) nhỏ 10 phút/bước.',
        milestones: [
          { timeframe: '2 Giờ tới', prediction: 'Có bộ 5 Characterization Tests phủ kín các đường dẫn đăng nhập chính. Tự tin 100% khi sửa code.', state: 'optimal', keyIndicator: 'Green test suite' },
          { timeframe: '24 Giờ tới', prediction: 'Tách xong TokenProvider độc lập, giảm 600 dòng spaghetti khỏi file auth chính.', state: 'optimal', keyIndicator: 'Zero regression reported' },
          { timeframe: '48 Giờ tới', prediction: 'Toàn bộ auth chuyển sang service mới với adapter ngược tương thích, deploy an toàn.', state: 'optimal', keyIndicator: 'Full deployment without downtime' }
        ],
        consequence: 'Dự án bàn giao đúng hạn, code sạch có test bảo vệ, tâm lý người lập trình thư thái và đóng góp trực tiếp vào mục tiêu Senior Architect.'
      },
      {
        id: 't_drift',
        name: 'Dòng thời gian Trôi Dạt (Status Quo / Nhảy cóc)',
        pathType: 'drift',
        probability: 45,
        summary: 'Bắt đầu sửa trực tiếp vào file cũ, đổi tên biến và tách class mà chưa có test bọc. Liên tục gặp lỗi ngầm và phải rollback.',
        milestones: [
          { timeframe: '2 Giờ tới', prediction: 'Mở 8 file cùng lúc, sửa dở dang 4 nơi, code ở trạng thái không chạy được.', state: 'warning', keyIndicator: 'Broken local build' },
          { timeframe: '24 Giờ tới', prediction: 'Phát hiện lỗi session bị mất trên mobile, phải thức khuya debug thủ công.', state: 'warning', keyIndicator: 'Manual regression chasing' },
          { timeframe: '48 Giờ tới', prediction: 'Chưa xong module mới, buộc phải commit bản chắp vá để kịp deadline.', state: 'danger', keyIndicator: 'Tech debt doubled' }
        ],
        consequence: 'Tốn gấp 3 lần thời gian, mệt mỏi và làm chậm tiến độ cột mốc Q1 của mục tiêu dài hạn.'
      },
      {
        id: 't_bottleneck',
        name: 'Dòng thời gian Đổ Vỡ (Over-engineering Crash)',
        pathType: 'bottleneck',
        probability: 25,
        summary: 'Cố gắng áp dụng kiến trúc phức tạp quá mức (Hexagonal, Event Sourcing, Micro-auth service) ngay từ ngày đầu khi chưa cần thiết.',
        milestones: [
          { timeframe: '2 Giờ tới', prediction: 'Loay hoay viết 12 interfaces, generics và dependency injection boilerplate.', state: 'warning', keyIndicator: 'Zero business logic executed' },
          { timeframe: '24 Giờ tới', prediction: 'Mắc kẹt ở cấu hình build tool, DI container và mocking framework.', state: 'danger', keyIndicator: 'Mental exhaustion & delay' },
          { timeframe: '48 Giờ tới', prediction: 'Trễ hạn nghiêm trọng, phải quay lại code cũ ban đầu trong hoảng loạn.', state: 'danger', keyIndicator: 'Project rollback' }
        ],
        consequence: 'Kiệt sức nhận thức (Burnout), mất niềm tin từ team, vi phạm nguyên lý YAGNI.'
      }
    ],
    microSteps: [
      {
        id: 'step_1',
        order: 1,
        title: 'Khóa ranh giới: Viết 1 End-to-End Characterization Test cho Auth Login',
        durationMinutes: 10,
        programmerPrinciple: 'TDD Loop',
        inputRequired: 'File authController.ts và test runner Jest hiện có',
        singleAction: 'Chạy một request login thành công với payload mẫu và assert đúng token JWT trả về, KHÔNG chỉnh sửa logic production.',
        testCriterion: 'Lệnh `npm test auth.spec.ts` vượt qua với status 200 OK và JWT payload hợp lệ.',
        unblockTip: 'Nếu test DB khó setup, hãy mock tầng repository trước bằng 1 hardcoded mock user.',
        completed: true,
        completedAt: '15 phút trước',
        goalId: 'goal_senior_engineer',
        goalTitle: 'Senior Software Engineer',
        milestoneId: 'ms_q1_sysdesign',
        milestoneTitle: 'Q1: System Design & Clean Refactoring',
        isAlignedWithGoal: true,
        nanoSteps: [
          { id: 'ns_1', text: 'Tạo file auth.characterization.spec.ts', done: true },
          { id: 'ns_2', text: 'Gửi request POST /login với valid credentials', done: true },
          { id: 'ns_3', text: 'Assert expect(res.body.token).toBeDefined()', done: true }
        ]
      },
      {
        id: 'step_2',
        order: 2,
        title: 'Trích xuất hàm thuần: Tách logic kiểm tra định dạng mật khẩu',
        durationMinutes: 8,
        programmerPrinciple: 'Boundary Isolation',
        inputRequired: 'Đoạn regex và validation rule nằm rải rác trong file auth 2,500 dòng',
        singleAction: 'Cắt đoạn if-else kiểm tra password vào file riêng `passwordPolicy.ts` dưới dạng pure function `isValidPassword(pwd: string): boolean`.',
        testCriterion: 'Viết 3 test case đơn vị (empty, weak, strong) và chạy `npm test passwordPolicy` pass 100%.',
        unblockTip: 'Đừng sửa đổi rule nào, chỉ copy nguyên bản code hiện có sang hàm mới.',
        completed: false,
        goalId: 'goal_senior_engineer',
        goalTitle: 'Senior Software Engineer',
        milestoneId: 'ms_q1_sysdesign',
        milestoneTitle: 'Q1: System Design & Clean Refactoring',
        isAlignedWithGoal: true,
        nanoSteps: [
          { id: 'ns_4', text: 'Tạo utils/passwordPolicy.ts', done: false },
          { id: 'ns_5', text: 'Di chuyển regex validation sang', done: false },
          { id: 'ns_6', text: 'Gọi hàm mới từ file auth cũ để đảm bảo backward compatibility', done: false }
        ]
      },
      {
        id: 'step_3',
        order: 3,
        title: 'Cô lập Token Signer: Tạo interface ITokenService tối thiểu',
        durationMinutes: 12,
        programmerPrinciple: 'YAGNI / Minimal Surface',
        inputRequired: 'Logic `jwt.sign()` và secret key đang đọc từ `process.env` trực tiếp',
        singleAction: 'Tạo class `JwtTokenService` chỉ gồm đúng 2 method: `generate(userId)` và `verify(token)`.',
        testCriterion: 'Unit test kiểm tra hàm generate trả về string có 3 phần tách bằng dấu chấm (header.payload.sig).',
        unblockTip: 'Chưa cần thêm refresh token hay redis blacklist vào lúc này, chỉ tái hiện đúng hành vi hiện có.',
        completed: false,
        goalId: 'goal_senior_engineer',
        goalTitle: 'Senior Software Engineer',
        milestoneId: 'ms_q1_sysdesign',
        milestoneTitle: 'Q1: System Design & Clean Refactoring',
        isAlignedWithGoal: true,
        nanoSteps: [
          { id: 'ns_7', text: 'Định nghĩa interface TokenService với 2 methods', done: false },
          { id: 'ns_8', text: 'Viết unit test cho generate & verify', done: false },
          { id: 'ns_9', text: 'Thay thế jwt.sign trực tiếp bằng tokenService.generate', done: false }
        ]
      },
      {
        id: 'step_4',
        order: 4,
        title: 'Atomic Commit: Lưu trữ cột mốc bảo an toàn',
        durationMinutes: 5,
        programmerPrinciple: 'Atomic Commit',
        inputRequired: 'Git status sạch, tất cả tests đều xanh (Passing)',
        singleAction: 'Chạy commit nhỏ với message rõ ràng: "refactor(auth): extract password policy and token service behind boundary tests".',
        testCriterion: 'Git log có commit mới, CI / local linter không báo lỗi.',
        unblockTip: 'Nếu còn dở dang việc khác, dùng `git stash` để commit chỉ phần vừa hoàn tất.',
        completed: false,
        goalId: 'goal_senior_engineer',
        goalTitle: 'Senior Software Engineer',
        milestoneId: 'ms_q1_sysdesign',
        milestoneTitle: 'Q1: System Design & Clean Refactoring',
        isAlignedWithGoal: true
      },
      {
        id: 'step_5',
        order: 5,
        title: 'Tách Tầng Dữ Liệu: Chuyển SQL Query trực tiếp sang AuthRepository',
        durationMinutes: 15,
        programmerPrinciple: 'Divide & Conquer',
        inputRequired: 'Các câu lệnh `db.query("SELECT * FROM users...")` nằm trong handler',
        singleAction: 'Tạo `findUserByEmail(email)` trong UserRepository và trỏ handler sang repository mới.',
        testCriterion: 'Chạy lại E2E Characterization Test ở Bước 1 và thấy kết quả vẫn xanh không đổi.',
        unblockTip: 'Không thay đổi cấu trúc bảng hay kiểu dữ liệu trả về trong bước này.',
        completed: false,
        goalId: 'goal_senior_engineer',
        goalTitle: 'Senior Software Engineer',
        milestoneId: 'ms_q1_sysdesign',
        milestoneTitle: 'Q1: System Design & Clean Refactoring',
        isAlignedWithGoal: true
      }
    ],
    bottlenecks: [
      {
        id: 'bn_1',
        title: 'Tê liệt phân tích do bề mặt thay đổi quá lớn (Analysis Paralysis)',
        severity: 'critical',
        category: 'cognitive',
        scope: 'short_term',
        symptom: 'Ngồi nhìn file code 2,500 dòng hơn 45 phút mà không gõ được dòng code nào vì sợ vỡ hệ thống.',
        rootCauseWhy: 'Thiếu lưới an toàn (Safety Net / Characterization Test). Khi não không có bằng chứng khách quan rằng code sửa không làm vỡ tính năng cũ, hạch hạnh nhân (amygdala) sẽ kích hoạt phản xạ do dự.',
        counterMeasure: 'Dừng ngay việc đọc lướt cả file. Chỉ tập trung viết 1 test bọc duy nhất cho kịch bản quan trọng nhất (Happy path) trong 10 phút.'
      },
      {
        id: 'bn_drift_longterm',
        title: 'Nguy cơ Trôi Dạt Mục Tiêu (Goal Drift - Lạc Vào Chi Tiết Vụn Vặt)',
        severity: 'critical',
        category: 'process',
        scope: 'long_term',
        longTermRiskType: 'goal_drift',
        symptom: 'Dành 3 ngày tối ưu lặt vặt (formatting, rename biến không cần thiết) thay vì đạt được deliverable chính của Cột mốc Q1.',
        rootCauseWhy: 'Thiếu cơ chế zoom out đối chiếu: khi làm việc hàng ngày, lập trình viên thường bị cuốn vào những việc dễ và quen thuộc (Comfort Zone Trap) thay vì việc tạo đòn bẩy cao.',
        counterMeasure: 'Trước khi bắt đầu bất kỳ micro-step nào, hệ thống bắt buộc kiểm tra xem bước này trực tiếp giải quyết deliverable nào của Milestone Q1. Nếu không liên kết, đánh cờ Drift Warning.'
      },
      {
        id: 'bn_milestone_slip',
        title: 'Nguy cơ Trễ Cột Mốc Quý (Milestone Slip Risk: Q1 System Design)',
        severity: 'moderate',
        category: 'process',
        scope: 'long_term',
        longTermRiskType: 'milestone_slip',
        symptom: 'Tiến độ hoàn thành task trong sprint 2 đang chậm 4 ngày so với kế hoạch ban đầu.',
        rootCauseWhy: 'Phát sinh các bài toán refactor ngoài dự kiến chưa được chia thành bước nhỏ ≤ 15 phút.',
        counterMeasure: 'Chạy Task Decomposition Engine để phân rã 2 task đang bị nghẽn thành vi bước 5-10 phút để lấy lại đà vận tốc.'
      },
      {
        id: 'bn_burnout_risk',
        title: 'Nguy cơ Quá Tải Nhận Thức Kéo Dài (Cognitive Overload / Burnout Risk)',
        severity: 'moderate',
        category: 'cognitive',
        scope: 'long_term',
        longTermRiskType: 'burnout_risk',
        symptom: 'Làm việc liên tục qua đêm với các bài toán refactor phức tạp mà không có thời gian phục hồi năng lượng.',
        rootCauseWhy: 'Cường độ làm việc không bền vững (unhealthy sprint pacing), vi phạm nguyên lý giới hạn 10 giờ/tuần.',
        counterMeasure: 'Giữ nghiêm ngặt giới hạn 10 giờ/tuần cho mục tiêu phát triển bản thân; kích hoạt các phiên nghỉ 5 phút giữa các Pomodoro sprint.'
      },
      {
        id: 'bn_2',
        title: 'Cạm bẫy Tái cấu trúc kết hợp Thêm tính năng (Scope Creep Coupling)',
        severity: 'moderate',
        category: 'process',
        scope: 'short_term',
        symptom: 'Vừa muốn tách code vừa muốn tiện tay thêm tính năng OAuth Google mới.',
        rootCauseWhy: 'Xu hướng gom việc để tối ưu cảm giác hiệu quả giả tạo, nhưng thực tế làm tăng số lượng biến số rủi ro theo cấp số nhân.',
        counterMeasure: 'Quy tắc vàng: Tái cấu trúc là thay đổi cấu trúc mà GIỮ NGUYÊN hành vi. Mọi tính năng mới phải để sang branch riêng sau khi refactor xong.'
      },
      {
        id: 'bn_3',
        title: 'Phụ thuộc ẩn vào Global State / Biến môi trường',
        severity: 'moderate',
        category: 'technical',
        scope: 'short_term',
        symptom: 'Một số hàm đọc `process.env.JWT_SECRET` trực tiếp ở tầng sâu, khiến việc viết unit test độc lập bị vấp.',
        rootCauseWhy: 'Thiếu Dependency Injection cơ bản ở các phiên bản code cũ.',
        counterMeasure: 'Truyền config qua constructor hoặc function argument thay vì đọc biến toàn cục.'
      }
    ],
    riskMatrix: [
      {
        id: 'risk_1',
        risk: 'Hỏng token validation của các client cũ (Mobile App v1.2) không hỗ trợ định dạng mới',
        probability: 'Medium',
        impact: 'High',
        scope: 'short_term',
        prevention: 'Viết test case sử dụng chính payload mẫu từ mobile app log.',
        contingency: 'Giữ endpoint `/api/v1/auth` cũ chạy song song (Strangler pattern) trong 30 ngày.'
      },
      {
        id: 'risk_longterm_drift',
        risk: 'Bỏ dở mục tiêu Senior Engineer sau tháng thứ 3 do mất định hướng và động lực',
        probability: 'Medium',
        impact: 'High',
        scope: 'long_term',
        prevention: 'Hệ thống hiển thị thanh tiến độ Milestone trực quan và đối chiếu hàng tuần (Weekly Retrospective Feedback Loop).',
        contingency: 'Tự động kích hoạt Socratic Decision Copilot để tái cấu trúc lại lộ trình milestone khả thi hơn.'
      },
      {
        id: 'risk_2',
        risk: 'Quá hạn 3 ngày do sa đà vào viết Clean Architecture quá trừu tượng',
        probability: 'High',
        impact: 'Medium',
        scope: 'short_term',
        prevention: 'Giới hạn thời gian mỗi vi bước tối đa 15 phút. Nếu bước nào vượt 15 phút, bắt buộc phân rã nhỏ tiếp.',
        contingency: 'Chỉ dừng lại ở cấp độ chia file theo chức năng, không vội áp dụng DI container phức tạp.'
      },
      {
        id: 'risk_3',
        risk: 'Rò rỉ kết nối Database khi trích xuất AuthRepository',
        probability: 'Low',
        impact: 'High',
        scope: 'short_term',
        prevention: 'Sử dụng chung connection pool đã quản lý thay vì tạo client mới trong từng hàm.',
        contingency: 'Cài đặt liveness check và alert số lượng connection pool trong Grafana.'
      }
    ],
    behavioralInsights: {
      focusEfficiencyScore: 72,
      decisionFrictionIndex: 65,
      procrastinationRisk: 'Trung bình',
      longTermConsistencyScore: 84,
      goalAbandonmentRisk: 'Thấp',
      effectiveHoursPerWeek: 9.5,
      observedPatterns: [
        'Xu hướng mở nhiều tab và đọc tài liệu kiến trúc khi gặp đoạn code khó hiểu',
        'Cảm giác do dự xuất hiện mạnh nhất ở bước đầu tiên khi chưa có test case nào',
        'Tốc độ tăng vọt sau khi bước 1 có test xanh (Dopamine boost từ phản hồi nhanh)',
        'Độ bám mục tiêu dài hạn (Long-term consistency) ổn định ở mức 84% khi có liên kết vi bước rõ ràng'
      ],
      cognitiveRecommendations: [
        'Áp dụng tư duy lập trình viên: Bài toán lớn là tổng của các bài toán 10 dòng code',
        'Luôn đảm bảo bước nhỏ hôm nay có thể truy vết ngược lên Cột mốc Q1 của mục tiêu dài hạn',
        'Đặt đồng hồ Pomodoro 15 phút cho mỗi micro-step; tuyệt đối không mở Reddit hay Slack trong 15 phút này',
        'Tự hỏi câu hỏi Why trước mỗi lần muốn thêm một interface trừu tượng mới'
      ]
    }
  }
};

