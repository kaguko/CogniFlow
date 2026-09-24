import { test, expect } from '@playwright/test';
import { buildSmartFallbackSemanticDrift } from '../src/lib/geminiResilience';

const rabbitHoleGoldens = [
  { id: 'rh_01', label: true, title: 'Thiết kế Kubernetes cluster cho MVP mới trong 2 ngày' },
  { id: 'rh_02', label: true, title: 'Triển khai microservices và service mesh cho API nhỏ chưa có user' },
  { id: 'rh_03', label: true, title: 'Tối ưu microsecond latency trước khi có traffic thực tế' },
  { id: 'rh_04', label: true, title: 'Viết lại custom auth framework từ đầu thay vì dùng Firebase Auth' },
  { id: 'rh_05', label: true, title: 'Cài dark mode toàn bộ app trước khi hoàn thiện CRUD cốt lõi' },
  { id: 'rh_06', label: true, title: 'Chỉnh theme, logo, icon mới cho landing page thay vì nộp MVP' },
  { id: 'rh_07', label: true, title: 'Tự viết ORM custom cho 3 model dữ liệu' },
  { id: 'rh_08', label: true, title: 'Dùng k8s để deploy cho local dev và staging' },
  { id: 'rh_09', label: true, title: 'Tách thành 8 microservice khi chưa có khách hàng nào' },
  { id: 'rh_10', label: true, title: 'Tối ưu query từ 20ms xuống 2ms trước khi có load test' },
  { id: 'rh_11', label: true, title: 'Thiết kế toàn bộ architecture CQRS với command bus cho tính năng đăng nhập' },
  { id: 'rh_12', label: true, title: 'Xây dựng custom auth framework dài 400 dòng thay vì dùng thư viện chuẩn' },
  { id: 'rh_13', label: true, title: 'Chỉnh màu nền, gradient và animation cho dashboard' },
  { id: 'rh_14', label: true, title: 'Đổi logo và banner marketing trước khi có checkout flow' },
  { id: 'rh_15', label: true, title: 'Bắt đầu tự phát triển custom cache đa tầng cho bảng user' },
  { id: 'rh_16', label: true, title: 'Dựng Redis cluster và shard dữ liệu dù còn chưa có 10 người dùng' },
  { id: 'rh_17', label: true, title: 'Tối ưu microsecond bằng precompute và memoization cho app nhỏ' },
  { id: 'rh_18', label: true, title: 'Cài đặt theme system với 50 biến màu trước khi ship core 기능' },
  { id: 'rh_19', label: true, title: 'Tự phát triển custom datepicker thay vì dùng thư viện chuẩn' },
  { id: 'rh_20', label: true, title: 'Tạo task mới làm banner, theme và animation thay vì fix bug login' },
  { id: 'rh_21', label: true, title: 'Deploy lên Kubernetes để chạy trên localhost cho test vật lý' },
  { id: 'rh_22', label: true, title: 'Triển khai multi-region setup cho hệ thống chưa có khách hàng' },
  { id: 'rh_23', label: true, title: 'Chỉnh dark mode cho modal và sidebar trước khi có validation flow' },
  { id: 'rh_24', label: true, title: 'Tự viết orm cho bảng order và customer' },
  { id: 'rh_25', label: true, title: 'Tối ưu microsecond cho hàm format số tiền dù app chưa có user' },
  { id: 'rh_26', label: true, title: 'Xây dựng logo, landing page, theme hàng tuần trong khi chưa có MVP' },
  { id: 'rh_27', label: true, title: 'Tạo custom auth framework với session management riêng' },
  { id: 'rh_28', label: true, title: 'Tách app thành microservice cho 3 service nhỏ' },
  { id: 'rh_29', label: true, title: 'Tối ưu microsecond bằng inlining và preallocation trước khi có benchmark' },
  { id: 'rh_30', label: true, title: 'Cài đặt theme, brand colors, logo và landing page polish cho sản phẩm chưa có user' },
  { id: 'rh_31', label: true, title: 'Tự xây dựng custom cache và data layer thay vì dùng Redis' },
  { id: 'rh_32', label: true, title: 'Thiết kế Kubernetes manifest và helm chart cho một app nhỏ' },
  { id: 'rh_33', label: true, title: 'Chế thêm dark mode, light mode, palette và animation cho dashboard' },
  { id: 'rh_34', label: true, title: 'Tự viết custom auth framework cho hệ thống đăng nhập cơ bản' },
  { id: 'rh_35', label: true, title: 'Tối ưu microsecond cho function sort một mảng 10 phần tử' },
  { id: 'rh_36', label: true, title: 'Xây dựng custom datepicker hoàn chỉnh thay vì dùng library' },
  { id: 'rh_37', label: true, title: 'Chỉnh theme và icon trên toàn bộ app trong lúc chưa có người dùng thực' },
  { id: 'rh_38', label: true, title: 'Dùng microservice architecture cho backend có 2 endpoint' },
  { id: 'rh_39', label: true, title: 'Dựng custom auth framework với session và role management riêng' },
  { id: 'rh_40', label: true, title: 'Tối ưu microsecond bằng cache thủ công cho API đơn giản' },
  { id: 'nv_01', label: false, title: 'Viết API login bằng Firebase Auth chuẩn cho MVP' },
  { id: 'nv_02', label: false, title: 'Tạo test case cho hàm validate email' },
  { id: 'nv_03', label: false, title: 'Fix lỗi token expired khi refresh session' },
  { id: 'nv_04', label: false, title: 'Thêm validation đầu vào cho form đăng ký' },
  { id: 'nv_05', label: false, title: 'Refactor hàm mapUserToResponse để dễ đọc hơn' },
  { id: 'nv_06', label: false, title: 'Viết migration schema cho bảng users' },
  { id: 'nv_07', label: false, title: 'Thêm unit test cho checkout flow' },
  { id: 'nv_08', label: false, title: 'Sửa lỗi null pointer khi đọc profile' },
  { id: 'nv_09', label: false, title: 'Tạo endpoint GET /api/users/me' },
  { id: 'nv_10', label: false, title: 'Ổn định job cron gửi email nhắc nhở' },
  { id: 'nv_11', label: false, title: 'Fix lỗi 500 khi lưu order hàng' },
  { id: 'nv_12', label: false, title: 'Dùng Zod để validate payload đăng ký' },
  { id: 'nv_13', label: false, title: 'Viết query lấy recent orders theo user id' },
  { id: 'nv_14', label: false, title: 'Giảm lag trong UI bằng memoization hợp lý' },
  { id: 'nv_15', label: false, title: 'Tạo migration cho index user_email' },
  { id: 'nv_16', label: false, title: 'Sửa bug type mismatch khi đọc cart' },
  { id: 'nv_17', label: false, title: 'Thêm logging cho request auth header' },
  { id: 'nv_18', label: false, title: 'Review code review comment cho endpoint order' },
  { id: 'nv_19', label: false, title: 'Xây dựng API CRUD đơn giản cho project board' },
  { id: 'nv_20', label: false, title: 'Fix bug duplicate rows khi insert user' },
  { id: 'nv_21', label: false, title: 'Thêm guard auth vào route /admin' },
  { id: 'nv_22', label: false, title: 'Viết test hết cả happy path cho login' },
  { id: 'nv_23', label: false, title: 'Tối ưu query tìm kiếm theo tên user' },
  { id: 'nv_24', label: false, title: 'Sửa lỗi route API trả 404 cho product detail' },
  { id: 'nv_25', label: false, title: 'Tạo release note cho sprint này' },
  { id: 'nv_26', label: false, title: 'Reset password flow với email verification' },
  { id: 'nv_27', label: false, title: 'Cấu hình Redis cache cho session token' },
  { id: 'nv_28', label: false, title: 'Fix địa chỉ callback dùng trong OAuth login' },
  { id: 'nv_29', label: false, title: 'Chạy smoke test cho checkout và payment' },
  { id: 'nv_30', label: false, title: 'Thêm endpoint soft delete cho product' },
  { id: 'nv_31', label: false, title: 'Refactor auth middleware để loại null' },
  { id: 'nv_32', label: false, title: 'Tạo API submit feedback cho người dùng' },
  { id: 'nv_33', label: false, title: 'Fix lỗi concurrency trên hàng đợi task' },
  { id: 'nv_34', label: false, title: 'Thêm retry policy khi call external API' },
  { id: 'nv_35', label: false, title: 'Viết test cho cơ chế retry để giảm lỗi' },
  { id: 'nv_36', label: false, title: 'Xử lý lỗi transaction roll back cho order' },
  { id: 'nv_37', label: false, title: 'Tạo analytics event cho đăng ký user' },
  { id: 'nv_38', label: false, title: 'Fix hash password trong auth service' },
  { id: 'nv_39', label: false, title: 'Thêm API lấy số lượng order trong ngày' },
  { id: 'nv_40', label: false, title: 'Viết migration cho schema profile avatar' },
  { id: 'nv_41', label: false, title: 'Sửa bug duplicate event khi click nút buy' },
  { id: 'nv_42', label: false, title: 'Refactor component UserTable để dễ maintain' },
  { id: 'nv_43', label: false, title: 'Thêm rate limiting cho route /api/auth/login' },
  { id: 'nv_44', label: false, title: 'Tạo cron cleanup expired sessions' },
  { id: 'nv_45', label: false, title: 'Fix 401 trên API lấy thông tin user' },
  { id: 'nv_46', label: false, title: 'Hoàn thành feature export CSV cho admin' },
  { id: 'nv_47', label: false, title: 'Viết test integration cho onboarding flow' },
  { id: 'nv_48', label: false, title: 'Tối ưu database query lấy top products' },
  { id: 'nv_49', label: false, title: 'Thêm cache cho danh sách category' },
  { id: 'nv_50', label: false, title: 'Fix bug vòng lặp render trong component list' },
  { id: 'nv_51', label: false, title: 'Thêm endpoint tạo review cho product' },
  { id: 'nv_52', label: false, title: 'Viết log clear khi qua 3 retry' },
  { id: 'nv_53', label: false, title: 'Thêm timeout cho outbound API call' },
  { id: 'nv_54', label: false, title: 'Sửa lỗi parse JSON trong checkout' },
  { id: 'nv_55', label: false, title: 'Triển khai tối ưu query để giảm latency truy vấn' },
  { id: 'nv_56', label: false, title: 'Tạo endpoint confirm email sau signup' },
  { id: 'nv_57', label: false, title: 'Fix lỗi thiếu dữ liệu khi render profile page' },
  { id: 'nv_58', label: false, title: 'Refactor service auth để tách validation' },
  { id: 'nv_59', label: false, title: 'Thêm pagination cho danh sách orders' },
  { id: 'nv_60', label: false, title: 'Sửa lỗi sort trong bảng danh sách user' },
];

const dataset = rabbitHoleGoldens;

test('Rabbit Hole Detector golden dataset meets precision/recall/F1 thresholds', () => {
  const detected = buildSmartFallbackSemanticDrift('Ship MVP SaaS trong 30 ngày', dataset.map((task) => ({
    id: task.id,
    title: task.title,
  })));

  const predicted = new Set(detected.detectedRabbitHoles.map((item: any) => item.taskId));
  const actual = new Set(dataset.filter((task) => task.label).map((task) => task.id));

  const tp = [...actual].filter((id) => predicted.has(id)).length;
  const fp = [...predicted].filter((id) => !actual.has(id)).length;
  const fn = [...actual].filter((id) => !predicted.has(id)).length;

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  expect(dataset.filter((task) => task.label).length).toBe(40);
  expect(dataset.filter((task) => !task.label).length).toBe(60);
  expect(tp).toBe(40);
  expect(fp).toBe(0);
  expect(fn).toBe(0);
  expect(precision).toBeGreaterThanOrEqual(0.85);
  expect(recall).toBeGreaterThanOrEqual(0.75);
  expect(f1).toBeGreaterThanOrEqual(0.80);
  expect(detected.overallAlignmentPercent).toBe(60);
  expect(detected.summaryAnalysis).toContain('Rabbit Hole');
});
