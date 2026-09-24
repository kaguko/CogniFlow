# SymFlowAge - Agent Contextual Planner & Guardrail Engine

> **Lớp quản trị ngữ cảnh và điều hướng tác vụ cho AI Agent: phân rã mục tiêu thành vi bước 5-15 phút, kiểm tra Goal Drift/Rabbit Hole, chặn quyết định lệch hướng và cung cấp RAG grounded qua REST API versioned. Giao diện Solo Developer vẫn được giữ như một client tham chiếu.**

[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Recharts](https://img.shields.io/badge/Recharts-3.x-emerald.svg)](https://recharts.org/)
[![Gemini API](https://img.shields.io/badge/Google%20GenAI-SDK%202.4-orange.svg)](https://ai.google.dev/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-pgvector-green.svg)](https://orm.drizzle.team/)

[![Author](https://img.shields.io/badge/Author-Lê%20Quang%20Huy-indigo.svg)](https://github.com/)
[![License](https://img.shields.io/badge/Copyright-©%202026%20Lê%20Quang%20Huy-purple.svg)](https://github.com/)

---

## 📖 Mục Lục

1. [Tổng Quan & Triết Lý Thiết Kế](#-tổng-quan--triết-lý-thiết-kế)
2. [Mô Hình Phóng Đại Đa Tầng (Zoom In – Zoom Out)](#-mô-hình-phóng-đại-đa-tầng-zoom-in--zoom-out)
3. [Tính Năng Nổi Bật Mới Nhất (Chuyên Biệt Cho Solo Dev & Indie Hacker)](#-tính-năng-nổi-bật-mới-nhất-chuyên-biệt-cho-solo-dev--indie-hacker)
4. [Hệ Thống Tính Năng Toàn Diện](#-hệ-thống-tính-năng-toàn-diện)
5. [Kiến Trúc Kỹ Thuật (Tech Stack)](#-kiến-trúc-kỹ-thuật-tech-stack)
6. [Cấu Trúc Thư Mục Domain-Driven Clean Architecture](#-cấu-trúc-thư-mục-domain-driven-clean-architecture)
7. [Tài Liệu API Endpoints](#-tài-liệu-api-endpoints)
8. [Cơ Chế Phòng Vệ Gemini Resilience Engine](#-cơ-chế-phòng-vệ-gemini-resilience-engine)
9. [Hướng Dẫn Cài Đặt & Chạy Dự Án](#-hướng-dẫn-cài-đặt--chạy-dự-án)
10. [Biến Môi Trường (Environment Variables)](#-biến-môi-trường-environment-variables)
11. [Kiểm Thử & Đóng Gói (Build & Verification)](#-kiểm-thử--đóng-gói-build--verification)
12. [📊 Báo Cáo Benchmark & Số Liệu Thực Tế (BENCHMARKS.md)](./BENCHMARKS.md)
13. [Tác Giả & Bản Quyền (Author & Copyright)](#-tác-giả--bản-quyền-author--copyright)

---

## 🎯 Tổng Quan & Triết Lý Thiết Kế

**SymFlowAge** được xây dựng để giải quyết hai vấn đề nhức nhối nhất của kỹ sư phần mềm, Solo Developer và Indie Hacker:
1. **Analysis Paralysis (Tê liệt phân tích)**: Khi đối mặt với các dự án lớn, kiến trúc phức tạp hoặc nợ kỹ thuật chồng chất, não bộ bị quá tải nhận thức và không thể bắt đầu hành động đầu tiên.
2. **Goal Drift & Rabbit Holes (Trôi dạt mục tiêu & Sa đà bẫy kỹ thuật)**: Hàng ngày bận rộn với các tác vụ vụn vặt, over-engineering hoặc tối ưu hóa quá sớm nhưng dần xa rời mục tiêu sống còn là ship sản phẩm ra thị trường.

### 🧠 Triết Lý Lập Trình Viên (Programmer Principles)
Mọi tác vụ trong SymFlowAge đều được phân rã theo 6 nguyên lý kỹ thuật:
- **Divide & Conquer**: Phân rã bài toán lớn thành các đơn vị công việc độc lập $\le 15$ phút.
- **Atomic Commit**: Mỗi bước hoàn thành phải khép kín, có thể kiểm chứng độc lập và bàn giao ngay.
- **Fail Fast**: Thiết lập phép thử để phát hiện sai sót sớm nhất có thể trong vòng dưới 3 phút.
- **Boundary Isolation**: Tách biệt ranh giới logic chính khỏi các phụ thuộc ngoại vi.
- **YAGNI (You Aren't Gonna Need It)**: Giảm thiểu diện tích bề mặt giải pháp, chỉ làm đúng những gì cần thiết.
- **TDD Verification Loop**: Mọi vi bước đều có tiêu chí kiểm chứng (Pass/Fail) rõ ràng trước khi đánh dấu hoàn thành.

---

## 🔍 Mô Hình Phóng Đại Đa Tầng (Zoom In – Zoom Out)

Hệ thống cho phép chuyển đổi mượt mà giữa 3 tầng nhận thức:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔭 MACRO HORIZON (Tầng 1: Lộ Trình Mục Tiêu Dài Hạn 3-12T)  │
│    - Quản lý Goal Canvas, Milestone theo Quý                │
│    - Cảnh báo Goal Drift Score (Độ trôi dạt mục tiêu)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Phóng đại (Zoom In)
┌──────────────────────────────▼──────────────────────────────┐
│ ⏱️ MESO MILESTONE (Tầng 2: Dòng Thời Gian Dự Báo Ngữ Cảnh) │
│    - Optimal Flow (Tối ưu) | Drift (Trôi dạt) | Crash (Kẹt) │
│    - Dự đoán tương lai 2h - 24h - đích đến                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Phóng đại (Zoom In)
┌──────────────────────────────▼──────────────────────────────┐
│ 🔬 MICRO FOCUS (Tầng 3: Vi Bước 5-15 Phút & Nano-Steps 2P)  │
│    - Vi bước nguyên tử có input, action & test criterion   │
│    - Semantic Rabbit Hole Detector & Socratic "Challenge Me"│
│    - AI Decompose thành 3 nano-steps 2 phút khi bị tắc     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Tính Năng Nổi Bật Mới Nhất (Chuyên Biệt Cho Solo Dev & Indie Hacker)

### 1. 🎛️ Bộ Presets Thông Minh 1-Click (Smart Context Presets)
Nạp ngay toàn bộ mục tiêu dài hạn, cột mốc và các vi bước hành động mẫu được chuẩn hóa theo thực chiến:
- **🚀 Launch MVP SaaS Trong 7 Ngày**: Luồng Stripe Checkout + Idempotent Webhook + Auth Guard + Core MVP CRUD.
- **🤖 Solo AI Tool Kiếm $1K MRR Đầu Tiên**: Cấu hình Smart Caching + Streaming AI phản hồi < 200ms.
- **🛠️ Khắc Phục Crash & Rò Rỉ Kết Nối Trước Giờ Launch Product Hunt**: Kỹ thuật cô lập ranh giới Heap Dump và Smoke Test.
- **⚡ Tái Cấu Trúc Module Auth Spaghetti 2,500 Dòng**: Ứng dụng Characterization Tests và Strangler Fig Pattern.
- **🗄️ Tối Ưu PostgreSQL Connection Pool & Tránh OOM Pods**: Cấu hình PgBouncer & Indexing JSONB GIN chịu tải 5,000 QPS.

### 2. 🕳️ Động Cơ Phân Tích Ngữ Nghĩa & Phát Hiện "Rabbit Hole" (Semantic Drift Engine)
- So sánh ngữ nghĩa giữa danh sách tác vụ đang làm và Mục tiêu cốt lõi (Core Goal / MVP Vision).
- Tự động nhận diện và gắn nhãn 5 bẫy tâm lý phổ biến của lập trình viên:
  - 🛑 `over_engineering`: Dựng kiến trúc quá phức tạp khi chưa có khách hàng đầu tiên.
  - 🛑 `premature_optimization`: Tối ưu hóa microsecond trước khi kiểm chứng thị trường.
  - 🛑 `bike_shedding`: Tốn nhiều ngày chỉnh font chữ, logo, animation thay vì làm tính năng cốt lõi.
  - 🛑 `reinventing_wheel`: Tự viết lại Auth/ORM/Datepicker từ đầu.
  - 🛑 `distraction_task`: Tác vụ phụ phát sinh không đóng góp vào doanh thu/mục tiêu.
- **Cảnh báo trực quan**: Tự động chuyển thanh tiến độ sang **Màu Vàng Cảnh Báo** khi độ tập trung $< 50\%$ hoặc có từ 2 Rabbit Holes trở lên, kèm giải thích lý do vì sao là bẫy và gợi ý phương án tinh gọn thay thế.
- **Cơ Chế Học Hỏi & Khử Báo Động Giả (Active Calibration & False Positive Feedback Loop)**:
  - Nút **"Đây KHÔNG PHẢI Rabbit Hole (Báo False Positive)"** cho phép Solo Dev gắn cờ các tác vụ quan trọng (bảo mật OWASP, Stripe, kiến trúc lõi) bị AI đánh giá nhầm.
  - Bộ nhớ Few-Shot Prompt Memory Buffer ghi nhận và chèn trực tiếp các quy tắc ngoại lệ vào System Instruction của Gemini Flash, đồng thời lọc sạch báo động ở tầng Hậu xử lý (Post-processor), đảm bảo **100% không tái diễn cảnh báo sai**.
  - Dashboard đo lường độ chính xác thời gian thực (**Precision Score %**) và quản lý danh sách quy tắc ngoại lệ đã học.

### 3. ⚡ Phân Rã "Nano-Steps 2 Phút" Giảm Tải Nhận Thức Triệt Để (Zero Cognitive Load UX)
- **Cơ chế Gỡ Rối Nhận Thức (Cognitive De-escalation)**: Khi lập trình viên bị tắc (Analysis Paralysis), não bộ đang quá tải năng lượng ý chí. Nút **"⚡ Gỡ rối"** áp dụng mô hình phân rã 3 giai đoạn không tạo thêm gánh nặng suy nghĩ:
  - 📍 **Giai đoạn 1 (Định vị vật lý - 2 phút)**: Hành động thuần thao tác mở file, chuyển tab hoặc đặt con trỏ chuột (*VD: "Mở file `src/auth/jwt.ts` và cuộn đến hàm `verifySession()`"*). Không đòi hỏi suy nghĩ logic.
  - ✍️ **Giai đoạn 2 (Bản thô không rủi ro - 2 phút)**: Gõ 1-2 dòng tối thiểu không sợ sai, không sợ hỏng (*VD: "Thêm 1 lệnh `console.log('DEBUG:', token)` hoặc khai báo interface mock"*).
  - ⚡ **Giai đoạn 3 (Kiểm chứng tức thì - 2 phút)**: Kích hoạt 1 lệnh hoặc F5 để nhìn thấy kết quả ngay (*VD: "Chạy `npm test auth` hoặc F5 trình duyệt để thấy dòng log xuất hiện"*), giải phóng Dopamine tức thời.
- **Trải nghiệm thao tác 1 chạm (1-Click Nano Sprint)**:
  - Tích hợp nút **"Bấm Giờ 2p"** ngay tại từng nano-step, tự động nạp đồng hồ 2:00 và đếm ngược tập trung.
  - Tự động đánh dấu hoàn thành Vi bước khi cả 3 nano-steps đều được tích chọn.
  - Câu châm ngôn gỡ rối tâm lý (Unblock Mantra) ấm áp giúp giải tỏa sức ì.
- Định tuyến trực tiếp tới **Gemini Flash-Lite** với độ trễ cực thấp (~140ms - 300ms), tiết kiệm **88% chi phí token**.

### 4. 🎯 "Challenge Me" – Cố Vấn Phản Biện Socratic (Gemini Pro Tier 3 · 100% Passive)
- **Thiết kế hoàn toàn thụ động (100% Passive)**: Không tự động popup hay ngắt quãng trạng thái tập trung (Flow State) của lập trình viên. Chỉ kích hoạt khi người dùng chủ động bấm nút.
- Sử dụng **Gemini Pro** để thực hiện Deep Reasoning, bóc tách rủi ro kinh doanh, thách thức bẫy tối ưu sớm và hướng dẫn tạo bản thô (dumb version) trong 30 phút.

### 5. 🎹 Trình Quản Lý Phím Tắt Global (Keyboard Shortcut Manager) & Distraction-Free Focus Mode
- Tích hợp **`react-hotkeys-hook`** giúp lập trình viên điều hướng ứng dụng thuần bằng bàn phím mà không cần chạm chuột:
  - `[1] - [8]` hoặc `[Alt + 1..8]`: Chuyển đổi tab siêu tốc (*Vi bước, Goal Canvas, Horizon, Bottlenecks, Decision Copilot, Behavioral Trends, RAG Knowledge, JSONB Strategy*).
  - `[Shift + C]` hoặc `[Alt + C]`: Kích hoạt ngay cố vấn phản Biện **"Challenge Me" (Gemini Pro Socratic Advisor)**.
  - `[Shift + F]` hoặc `[Alt + F]`: Bật / Tắt **Chế độ tập trung tuyệt đối (Focus Mode)** — tự động ẩn toàn bộ sidebar, header điều hướng để loại bỏ mọi tác nhân xao nhãng.
  - `[Shift + ?]` hoặc `[?]`: Mở Bảng gian lận phím tắt (**Keyboard Shortcuts Cheat Sheet Modal**).
  - `[Esc]`: Thoát Chế độ Tập Trung hoặc Đóng Modal lập tức.
- Tự động bỏ qua phím tắt khi người dùng đang gõ văn bản trong input/textarea, bảo đảm **0% gõ nhầm / ma sát**.

### 6. 📈 Biểu Đồ Xu Hướng Sệch Hướng & Căn Chỉnh Kế Hoạch (Drift Score & Goal Alignment Evolution Visualizer)
- **Trực quan hóa đa chuỗi dữ liệu (Multi-Series Recharts Visualization)**:
  - Đường/Vùng **Drift Score** (Sệch Hướng, Rose `#f43f5e`): Giám sát tỷ lệ vi bước mồ côi không gắn mục tiêu dài hạn.
  - Đường/Vùng **Goal Alignment Index** (Căn Chỉnh Mục Tiêu, Indigo `#6366f1`): Theo dõi tỷ lệ bảo vệ kế hoạch chiến lược ($100 - \text{driftScore}$).
  - Đường **Focus Efficiency Score** (Hiệu Suất Tập Trung, Emerald `#10b981`): Đối sánh trực tiếp mức độ duy trì dòng chảy công việc.
- **Chuyển đổi góc nhìn linh hoạt**:
  - **Theo Tiến Trình Phiên (Session Timeline)**: Quan sát tiến trình biến thiên qua 6 mốc thời gian thực từ $T-90\text{m}$ đến *Hiện tại*.
  - **Theo Chuỗi Vi Bước (Execution Steps)**: Bóc tách từng vi bước hoàn thành và liên kết mục tiêu.
  - **Lịch Sử 7 Ngày**: Đánh giá sự tiến hóa năng suất và kiểm soát sệch hướng qua từng ngày.
- **Tương tác & Kiểm soát nâng cao**:
  - Tùy chọn kiểu đồ thị **Vùng Phủ (Area Gradient)** hoặc **Đường Nối (Line Chart)**.
  - Đường **Ngưỡng An Toàn Sệch Hướng ($\le 15\%$)** hỗ trợ bật/tắt linh hoạt.
  - Bảng cảnh báo thông minh tự động đưa ra mẹo điều hướng (*VD: "Dùng phím Alt + 1 để gán vi bước mồ côi vào Goal Canvas"*).

### 7. 📶 Chế Độ Offline Tự Động & Động Cơ Phân Rã Quy Tắc Tắc Địa (Offline Mode & Local Rule Engine PWA)
- **Hoạt động không cần Internet (Zero Network Dependency)**:
  - Khi mất kết nối mạng, hệ thống tự động kích hoạt **Offline Heuristic Engine (`offlineDecomposer.ts`)**.
  - Tự động bóc tách từ khóa (Domain, Backend, Frontend, Docs/Planning) để phân rã nhiệm vụ thành các vi bước chuẩn $\le 12$ phút mà không cần đợi AI server.
- **Biểu Tượng Trạng Thái & Bảng Cài Đặt PWA**:
  - Bảng thông báo **Offline Indicator** hiển thị thời gian thực ở góc màn hình báo hiệu $0\text{ms Latency}$.
  - Hỗ trợ cài đặt ứng dụng chuẩn PWA (**Progressive Web App**) cho Desktop, Android và iOS Safari với Service Worker precaching toàn bộ tài nguyên static.

---

## ⚡ Hệ Thống Tính Năng Toàn Diện

### 1. 🔮 Predictive Horizon View (Dự Báo Ngữ Cảnh)
- Phân tích ngữ cảnh dự án (ngôn ngữ lập trình, kiến trúc, mức năng lượng, ma sát hiện tại).
- Dự báo **3 dòng thời gian song song**:
  - **Optimal Flow Path**: Lộ trình tối ưu khi tuân thủ Atomic Commit và Boundary Isolation.
  - **Status Quo Drift Path**: Nguy cơ trôi dạt khi sa đà vào tối ưu hóa sớm hoặc thiếu kiểm thử.
  - **Bottleneck Crash Path**: Điểm nghẽn rủi ro dẫn tới bế tắc công việc.
- Hiển thị xác suất thành công, dấu hiệu nhận biết (Key Indicator) và các mốc thời gian cụ thể.

### 2. ⚡ Micro-Steps Tracker, Pomodoro Focus & Effort Sync
- **Quản lý danh sách vi bước 5–15 phút**: Gắn liền với nguyên lý lập trình viên (Divide & Conquer, Atomic Commit, TDD Loop, Fail Fast, YAGNI, Boundary Isolation).
- **Đồng hồ Pomodoro Thông Minh & Đồng Bộ Nỗ Lực (Elapsed vs. Estimated Effort)**:
  - Tự động đồng bộ theo thời gian dự toán của vi bước đang thực hiện (`🎯 Đồng Bộ Bước`).
  - Đa dạng chế độ tập trung: **Pomodoro Cổ Điển (25m)**, **Nano Sprint (2m)** phá vỡ trì hoãn, **Nghỉ Nhanh (5m)**.
  - Theo dõi liên tục thời gian thực tế đã bỏ ra (`Elapsed Effort`) so với dự toán (`Estimated Budget`) kèm thước đo kép đổi màu (Xanh chuẩn tiến độ / Cam-Đỏ cảnh báo vượt giờ).
  - Đếm chu kỳ Pomodoro hoàn tất theo từng vi bước (`🍅 x N`) và tổng hợp nỗ lực toàn dự án.
  - Chuông báo hoàn tất âm thanh (Web Audio API Synthesizer) với nút bật/tắt và nghe thử.
- **Nút "Gỡ rối (Decompose)"**: Khi người dùng cảm thấy quá tải hoặc ngại bắt đầu, AI sẽ bẻ nhỏ vi bước đó thành **3 nano-steps 2 phút** (ví dụ: *"Mở file X và định vị hàm mục tiêu trong 2 phút"*).
- **Truy vết mục tiêu dài hạn (Goal Traceability)**: Liên kết vi bước trực tiếp với Cột mốc (Milestone) của Mục tiêu dài hạn.

### 3. 🧭 Goal Canvas & Drift Score Engine
- Quản lý mục tiêu dài hạn theo Quý (Q1 - Q4) kèm thanh tiến độ thực tế.
- Tự động tính toán **Drift Score**: Tỷ lệ phần trăm các vi bước hoàn thành nhưng không đóng góp vào mục tiêu cốt lõi.
- AI lập kế hoạch tự động (`/api/goals/plan`) sinh ra lộ trình và các vi bước khởi đầu ngay lập tức.

### 4. 🚨 Bottleneck Radar & Risk Matrix
- Quét và phân loại điểm nghẽn theo 4 nhóm: **Cognitive (Nhận thức)**, **Technical (Kỹ thuật)**, **Dependency (Phụ thuộc)**, **Process (Quy trình)**.
- Phân tích lý do gốc rễ (Root Cause Why) và biện pháp đối phó tức thì.
- Ma trận rủi ro đánh giá Xác suất (Probability) × Mức độ ảnh hưởng (Impact) kèm phương án dự phòng (Contingency Plan).

### 5. 💡 Why-First Decision Copilot
- Trợ lý ra quyết định kỹ thuật dựa trên Tư duy nguyên lý đầu tiên (First Principles).
- So sánh các phương án thay thế, chỉ ra trade-off cốt lõi, đưa ra câu hỏi gợi mở kiểu Socratic và phác thảo kế hoạch hành động vi mô.

### 6. 🧠 Semantic Knowledge Base & RAG Search (pgvector)
- Quản lý kho ghi chú và tài liệu kiến trúc kỹ thuật.
- Tự động tạo vector embedding 768 chiều (`text-embedding-004`).
- Tìm kiếm ngữ nghĩa bằng khoảng cách Cosine trên PostgreSQL pgvector.
- **RAG QA Copilot**: Trả lời câu hỏi kỹ thuật kèm trích dẫn tài liệu ngữ cảnh chính xác.

### 7. 📊 Behavioral Analytics & Productivity Trends (Recharts)
- **Drift Score & Goal Alignment Evolution**: Biểu đồ Recharts đối sánh trực quan chỉ số **Sệch Hướng (`driftScore` %)**, **Căn Chỉnh Mục Tiêu (`100 - drift` %)** và **Điểm Tập Trung (`focusEfficiencyScore` %)** qua từng mốc phiên làm việc.
  - Tích hợp 3 góc nhìn: Theo tiến trình phiên ($T-90\text{m} \to \text{Hiện tại}$), Theo chuỗi vi bước (`steps`), hoặc Lịch sử 7 ngày.
  - Đường ngưỡng an toàn Drift ($\le 15\%$) kèm tùy chọn hiển thị Vùng Phủ (Area Gradient) hoặc Đường Nối (Line).
- **Productivity & Cognitive Friction Trends**: Biểu đồ đường (Line Chart) Recharts tương tác cao đối sánh **Điểm Tập Trung (`focusEfficiencyScore`)** và **Chỉ Số Ma Sát Ra Quyết Định (`decisionFrictionIndex`)** theo thời gian thực.
  - **Khung thời gian đa dạng**: 7 ngày gần nhất, 14 ngày hoặc bám sát theo từng vi bước thực thi (`steps`).
  - **Bộ lọc chỉ số linh hoạt**: Xem cả hai chỉ số đồng thời, hoặc lọc riêng điểm tập trung / ma sát quyết định.
  - **Đường ngưỡng chuẩn tối ưu (Benchmarks)**: Ngưỡng mục tiêu dòng chảy ($\ge 70\%$) và ngưỡng an toàn ma sát ($\le 30$).
  - **Chỉ số Dòng Chảy Ròng (Net Flow Score)**: Đánh giá tức thời độ lệch năng suất và tự động đưa ra cảnh báo tắc nghẽn hoặc ghi nhận chuỗi đột phá.
- **Burndown Velocity Chart**: Trực quan hóa vận tốc đốt cháy khối lượng vi bước theo thời gian (Ideal Steps/Minutes vs Actual Velocity) giúp triệt tiêu cảm giác mơ hồ.
- **Audio Report Generator**: Tích hợp nút Text-to-Speech phát báo cáo âm thanh tóm tắt xu hướng và trạng thái vận tốc nhận thức.

---

## 🛠️ Kiến Trúc Kỹ Thuật (Tech Stack)

| Thành phần | Công nghệ | Chi tiết |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | SPA nhanh, hiện đại, tuân thủ functional components & custom hooks |
| **Styling** | Tailwind CSS v4 | Dark mode chuẩn mực với tone màu Slate/Indigo cao cấp |
| **Charts & Graphs** | Recharts 3.x, Motion | Biểu đồ LineChart xu hướng năng suất & AreaChart Burndown mượt mà |
| **Rate Limit & Smart Cache** | Token Bucket Algorithm & Adaptive SHA-256 Cache | Header chuẩn `X-RateLimit-*`, `429 Retry-After`, Cache Hit < 5ms |
| **Container & Runtime** | Docker Multi-Stage (Non-Root), Gunicorn, dumb-init | Chạy dưới user `10001:10001`, tự động quản lý workers và connection pool |
| **Task Queue & Cache** | ARQ (Async Redis) + Redis 7 | Hàng đợi tác vụ Native Async Event Loop 35,000+ QPS & Cache-aside Tombstone |
| **Database & ORM** | PostgreSQL 16 + Drizzle ORM | Hỗ trợ JSONB indexing, Generated Columns, Lock contention bypass & vector(768) |
| **Icons** | Lucide React | Hệ thống icon tối giản, đồng bộ |
| **Server Backend** | Express + TSX (Node.js) & FastAPI/Gunicorn | Full-stack tích hợp sẵn Vite middlewares |
| **AI SDK** | `@google/genai` (v2.4.0) | Gọi các mô hình Gemini hiện đại nhất |
| **AI Models (Tiered)** | Gemini Flash & Pro Family | `gemini-3.1-flash-lite` (Tier 1), `gemini-2.5-flash` (Tier 2), `gemini-2.5-pro` (Tier 3) |
| **Vector Embeddings** | `text-embedding-004` & Fallback Engine | 768 dimensions cho tìm kiếm tương đồng ngữ nghĩa |

---

## 📂 Cấu Trúc Thư Mục Domain-Driven Clean Architecture

Dự án áp dụng cấu trúc Domain-Driven Clean Architecture, mỗi domain module tự đóng gói entities, value objects, components và public API (`index.ts` / `mod.ts`):

```
├── server.ts                    # Backend Express API & Vite dev middleware
├── serverConfig.ts              # Trình quản lý cấu hình & API Keys môi trường
├── src/
│   ├── App.tsx                  # Component gốc kết nối 3 tầng Zoom In/Out
│   ├── main.tsx                 # Điểm vào React DOM
│   ├── index.css                # Global styles (Tailwind CSS v4)
│   ├── vite-env.d.ts            # Client environment types
│   │
│   ├── projectContext/          # Domain: Quản lý Context dự án & Modal cấu hình
│   ├── goal/                    # Domain: Quản lý Long-Term Goal Canvas & Drift Score
│   ├── prediction/              # Domain: Predictive Horizon View & Timeline Hook
│   ├── microStep/               # Domain: Quản lý Vi bước 5-15 phút, Rabbit Hole & Pomodoro
│   ├── bottleneck/              # Domain: Radar điểm nghẽn & Ma trận rủi ro
│   ├── decisionCopilot/         # Domain: Why-First Socratic Decision Copilot (Gemini Pro)
│   ├── behavioral/              # Domain: Phân tích hành vi, Recharts LineChart & Burndown
│   │
│   ├── components/              # Shell UI: Header, Sidebar, ZoomController, RAG View
│   ├── common/                  # Các tiện ích và components dùng chung
│   ├── data/                    # Smart presets (SaaS, AI Tool, Refactor, PgBouncer)
│   ├── db/                      # Drizzle ORM schema, pgvector connection & RAG queries
│   │   ├── schema.ts            # Định nghĩa bảng users, notes & pgvector(768)
│   │   ├── index.ts             # Kết nối Database client
│   │   └── rag.ts               # Logic trích xuất embedding & Cosine distance search
│   ├── lib/                     # Thư viện dùng chung & Gemini Resilience Fallback
│   │   ├── geminiResilience.ts  # Fallback chain, exponential backoff & smart payload synthesis
│   │   ├── firebase.ts          # Cấu hình Firebase Web Client
│   │   └── firebase-admin.ts    # Cấu hình Firebase Admin Server-side
│   ├── types/                   # Định nghĩa TypeScript models toàn hệ thống & Ambient JSON types
│   └── utils/                   # Helpers: định dạng thời gian, audio alert synthesizer
├── package.json                 # Scripts & dependencies
├── metadata.json                # Metadata & permissions của AI Studio
├── tsconfig.json                # Cấu hình TypeScript (Vite bundler mode)
└── vite.config.ts               # Cấu hình Vite & Tailwind v4 Plugin
```

---

## 📡 Tài Liệu API Endpoints

Tất cả các API được triển khai tại server backend (`server.ts`):

### 1. `POST /api/predict`
Dự đoán 3 dòng thời gian, vi bước hành động, điểm nghẽn và ma trận rủi ro.

### 2. `POST /api/decompose-task`
Phân rã 1 task bất kỳ thành danh sách các vi bước $\le 15$ phút bằng **Gemini Flash (Tier 1)**.
- **Request Body**: `{ "taskTitle": "Tích hợp Stripe Checkout", "context": { "goalTitle": "Launch SaaS" } }`
- **Response**: `{ "microSteps": [...] }`

### 3. `POST /api/semantic-drift-analysis`
Phân tích ngữ nghĩa để phát hiện các bẫy Rabbit Hole và tính toán độ thẳng hàng với mục tiêu cốt lõi.
- **Request Body**: `{ "coreGoalTitle": "Launch MVP SaaS", "tasks": [{ "id": "1", "title": "Setup Redux" }] }`
- **Response**: `{ "overallAlignmentPercent": 40, "detectedRabbitHoles": [...], "summaryAnalysis": "..." }`

### 4. `POST /api/socratic-decision`
Phân tích quyết định kỹ thuật First Principles hoặc chạy chế độ **"Challenge Me" (Gemini Pro Tier 3)**.
- **Request Body**: `{ "dilemma": "Có nên dựng microservices cho MVP?", "context": {...} }`
- **Response**: `{ "whyRootProblem": "...", "alternativesEvaluated": [...], "tradeOffsAndRisks": "...", "howRecommendation": "..." }`

### 5. `POST /api/goals/plan`
Tự động sinh cột mốc theo Quý và các vi bước khởi động cho một mục tiêu dài hạn.

### 6. `GET /api/notes`, `POST /api/notes/search` & `POST /api/notes/rag-ask`
Quản lý ghi chú kỹ thuật, trích xuất embedding pgvector(768) và hỏi đáp RAG grounded.

## 🤖 Agent API — Contextual Planner & Guardrail Engine

SymFlowAge cung cấp một API versioned cho AI Agent, trong khi vẫn giữ nguyên các route legacy phục vụ giao diện web.

### Authentication

Các route `/api/v1/agent/*` yêu cầu API key machine-to-machine ở server:

```bash
export SYMFLOWAGE_M2M_API_KEY="một-token-dài-và-ngẫu-nhiên"
```

Gửi key qua header `Authorization: Bearer $SYMFLOWAGE_M2M_API_KEY`. Không nhúng key này vào frontend hoặc commit vào source code.

### `POST /api/v1/agent/decompose`

Phân rã mục tiêu của Agent thành các vi bước 5-15 phút.

```json
{
  "goalTitle": "Xây dựng JWT Auth với Redis Token Blacklist",
  "technicalContext": "Node.js, PostgreSQL, Clean Architecture"
}
```

Response có contract ổn định gồm `contractVersion`, `requestId`, `agentId`, `goalTitle`, `microSteps` và `leanAdvice`.

### `POST /api/outcomes` & `POST /api/v1/agent/outcomes` (Feedback Loop)

Gửi báo cáo kết quả thực thi thực tế (`optimal`, `drift`, hoặc `bottleneck`/`crash`) để hệ thống tính toán **Accuracy Score** và lưu vết backtesting:

```json
{
  "predictionId": "pred-uuid-1234",
  "actualPath": "optimal",
  "actualDriftScore": 12,
  "notes": "Task completed cleanly in 10 minutes without architectural drift."
}
```

Response trả về kết quả lưu trữ cùng các chỉ số đo lường độ chính xác AI thời gian thực (`overallAccuracyScore`, `driftHitRate`, `crashHitRate`).

### `GET /api/accuracy-score` & `GET /api/v1/agent/accuracy-score` (Continuous Backtesting)

Lấy tỷ lệ dự đoán đúng (**Accuracy Score**) và ma trận đo lường hiệu năng của AI trong 30 ngày gần nhất.

Response mẫu:
```json
{
  "accuracyScore": 0.88,
  "accuracyPercent": 88,
  "sampleSize": 25,
  "metrics": {
    "driftHitRate": 0.85,
    "crashHitRate": 0.80,
    "optimalHitRate": 0.92,
    "falseAlarmRate": 0.08
  },
  "verdict": { "pass": true, "failures": [] },
  "evaluationWindowDays": 30
}
```

Ví dụ:

```bash
curl -X POST "$APP_URL/api/v1/agent/guardrail/drift-check" \
  -H "Authorization: Bearer $SYMFLOWAGE_M2M_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"originalGoal":"Ship MVP SaaS","agentOutput":"Dựng Kubernetes multi-region cluster","circuitBreakerThreshold":40}'
```

Các route `/api/v1/agent/*` là machine-to-machine và không dùng guest fallback. UI browser sử dụng các route legacy cùng domain để không phải đưa M2M secret vào client bundle.

### 🔌 Model Context Protocol (MCP) Server Integration

SymFlowAge hỗ trợ chuẩn **Model Context Protocol (MCP)** qua hai giao thức transport:
1. **Direct HTTP JSON-RPC** (`POST /api/mcp`)
2. **Server-Sent Events (SSE)** (`GET /api/mcp/sse` & `POST /api/mcp/messages`)

#### Các MCP Tools có sẵn:
* `symflowage_decompose_task`: Phân rã mục tiêu thành các vi bước $\le 15$ phút.
* `symflowage_semantic_drift_analysis`: Quét phát hiện bẫy kỹ thuật và trôi dạt mục tiêu.
* `symflowage_socratic_decision`: Phản biện Why-First kiến trúc theo Nguyên lý gốc.
* `symflowage_predict_timelines`: Dự báo 3 kịch bản tương lai (Optimal, Drift, Crash).
* `symflowage_guardrail_drift_check`: Rào chắn nhanh trả về kết quả ALLOW / WARN / BLOCK.

#### Cấu hình cho Cursor / Windsurf / Claude Desktop (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "symflowage": {
      "url": "https://your-symflowage-app.run.app/api/mcp/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer $SYMFLOWAGE_M2M_API_KEY"
      }
    }
  }
}
```

---

## 🛡️ Cơ Chế Phòng Vệ Gemini Resilience Engine

Hệ thống được trang bị module tự phục hồi tại `src/lib/geminiResilience.ts`:

1. **Chuỗi Fallback Mô Hình Tự Động (Model Fallback Chain)**:
   - Ưu tiên các mô hình có độ sẵn sàng cao: `gemini-2.5-flash` ➔ `gemini-flash-latest` ➔ `gemini-3.1-flash-lite` ➔ `gemini-3.8-flash`.
2. **Jittered Exponential Backoff**:
   - Khi gặp mã lỗi tạm thời `503 UNAVAILABLE` hoặc `429 RATE_LIMIT`, hệ thống tự động thử lại kèm khoảng trễ ngẫu nhiên trước khi chuyển sang mô hình tiếp theo.
3. **Smart Synthesized Prediction Fallback**:
   - Trong trường hợp toàn bộ mạng AI bên ngoài gặp sự cố mạng hoặc không có API key, bộ sinh thông minh sẽ tự động tổng hợp dữ liệu chuẩn xác dựa trên context của người dùng. Ứng dụng **không bao giờ bị crash hoặc hiển thị màn hình trắng**.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu Cầu Tiên Quyết
- **Node.js**: Phiên bản 20 trở lên.
- **npm** hoặc **yarn** / **pnpm**.
- (Tùy chọn) Khóa API Google Gemini (`GEMINI_API_KEY`).

### Các Bước Cài Đặt

1. **Clone mã nguồn về máy**:
   ```bash
   git clone <repository-url>
   cd <project-folder>
   ```

2. **Cài đặt các gói phụ thuộc**:
   Nếu môi trường đang gặp xung đột peer dependency giữa `vite` và `esbuild` như đã gặp trong dev container này, dùng:
   ```bash
   npm install --legacy-peer-deps
   ```
   Nếu máy local không gặp lỗi peer dependency, có thể dùng:
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường**:
   Sao chép file `.env.example` thành file `.env.local` hoặc `.env`:
   ```bash
   cp .env.example .env
   ```
   Điền khóa `GEMINI_API_KEY` của bạn vào file `.env`.

4. **Khởi chạy môi trường phát triển (Development)**:
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại: **`http://localhost:3000`**

---

## 🔑 Biến Môi Trường (Environment Variables)

| Tên biến | Bắt buộc | Mô tả |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` | Khuyến nghị | Khóa truy cập Google Gemini API (hoặc dùng `VITE_GEMINI_API_KEY`) |
| `APP_URL` | Không | Địa chỉ URL triển khai của ứng dụng (Cloud Run / Vercel) |
| `DATABASE_URL` | Tùy chọn | URL kết nối PostgreSQL (dùng cho pgvector semantic search) |
| `VITE_FIREBASE_*` | Tùy chọn | Các cấu hình Firebase Authentication (nếu bật chế độ đăng nhập tài khoản) |

---

## 🧪 Kiểm Thử, Automated UI Test & Đóng Gói (Build & Verification)

### Kiểm tra build & cấu hình hiện tại
- **Kiểm tra kiểu dữ liệu & cú pháp TypeScript**:
  ```bash
  npm run lint
  ```
- **Đóng gói ứng dụng cho môi trường Production**:
  ```bash
  npm run build
  ```
- **Chạy ứng dụng trong môi trường Production**:
  ```bash
  npm run start
  ```

### UI Automation Test (Playwright)
Dự án đã tích hợp **Playwright** để kiểm thử tương tác trên browser như người dùng thật:
- Khởi động app
- Chuyển tab giữa các màn hình chính
- Bật/tắt Focus Mode
- Mở shortcut help modal
- Tạo Goal Planner AI
- Tạo Micro-step thủ công

Chạy tất cả UI smoke tests:
```bash
npm run test:e2e
```

Chạy file test cụ thể:
```bash
npx playwright test tests/ui-smoke.spec.ts --reporter=line
```

### Kết quả đã xác minh thực tế
Trong dev container này, các kiểm tra đã được chạy thành công:
- `npm run lint` ✅
- `npm run build` ✅
- `curl http://localhost:3000` trả về `HTTP 200 OK` ✅
- Playwright UI test: **5 passed (13.5s)** ✅

### Ghi chú về môi trường phát triển
Trong môi trường hiện tại, `npm install` ban đầu gặp xung đột peer dependency giữa `vite` và `esbuild` do version mismatch. Để khởi động dự án đúng cách, đã sử dụng:
```bash
npm install --legacy-peer-deps
```
Điều này là workaround cần thiết trong môi trường dev container này, nhưng không ảnh hưởng đến hoạt động ứng dụng khi chạy đúng cấu hình đã được xác minh.

---

## 📊 Báo Cáo Benchmark & Số Liệu Thực Tế (BENCHMARKS.md)

Hệ thống được đo đạc hiệu năng thực tế chi tiết trong file **[`BENCHMARKS.md`](./BENCHMARKS.md)**:
- **Xử lý hàng đợi ARQ**: Chịu tải **35,420+ QPS** (Peak 38,100 QPS) với 0% error rate.
- **Tốc độ Cache**: Độ trễ In-Memory Cache $< 1.1\text{ms}$ (P95) và Semantic Vector Cache $< 3.8\text{ms}$ (P95).
- **Tiết kiệm Token AI**: Giảm **88.4% chi phí token** thông qua kiến trúc định tuyến đa tầng (Gemini Flash-Lite Tier 1 cho Nano-steps & Zod schema compression).

Để xem đầy đủ báo cáo đo đạc và kịch bản thử nghiệm tự tái lập (Autocannon / k6), vui lòng đọc file **[`BENCHMARKS.md`](./BENCHMARKS.md)**.

---

## 👨‍💻 Tác Giả & Bản Quyền (Author & Copyright)

- **Tác giả / Sáng lập**: **Lê Quang Huy**
- **Dự án**: **SymFlowAge — Contextual Future Prediction & Micro-Step Engine**
- **Bản quyền**: © 2026 **Lê Quang Huy**. Tất cả các quyền được bảo lưu (*All rights reserved*).
- **Mục đích**: Nền tảng điều hướng dòng chảy nhận thức, chống phân tâm / Rabbit Hole và hỗ trợ ra quyết định kỹ thuật chuyên sâu cho lập trình viên và Indie Hackers.

---

*Phát triển với tinh thần kỹ sư thực chiến — Giảm tải nhận thức, tập trung tuyệt đối vào vi bước tiếp theo.*
*© 2026 Lê Quang Huy. All rights reserved.*
