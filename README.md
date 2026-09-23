# CogniFlow - Contextual Future Prediction & Micro-Step Engine

> **Hệ thống AI dự đoán tương lai theo ngữ cảnh, phân rã vi bước kỹ thuật (5-15 phút), radar nhận diện điểm nghẽn và trợ lý ra quyết định Why-First tích hợp RAG ngữ nghĩa & phân tích xu hướng năng suất Recharts.**

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
3. [Tính Năng Cốt Lõi](#-tính-năng-cốt-lõi)
4. [Kiến Trúc Kỹ Thuật (Tech Stack)](#-kiến-trúc-kỹ-thuật-tech-stack)
5. [Cấu Trúc Thư Mục Domain-Driven Clean Architecture](#-cấu-trúc-thư-mục-domain-driven-clean-architecture)
6. [Tài Liệu API Endpoints](#-tài-liệu-api-endpoints)
7. [Cơ Chế Phòng Vệ Gemini Resilience Engine](#-cơ-chế-phòng-vệ-gemini-resilience-engine)
8. [Hướng Dẫn Cài Đặt & Chạy Dự Án](#-hướng-dẫn-cài-đặt--chạy-dự-án)
9. [Biến Môi Trường (Environment Variables)](#-biến-môi-trường-environment-variables)
10. [Kiểm Thử & Đóng Gói (Build & Verification)](#-kiểm-thử--đóng-gói-build--verification)
11. [Tác Giả & Bản Quyền (Author & Copyright)](#-tác-giả--bản-quyền-author--copyright)

---

## 🎯 Tổng Quan & Triết Lý Thiết Kế

**CogniFlow** được xây dựng để giải quyết hai vấn đề nhức nhối nhất của kỹ sư phần mềm và người làm việc trí óc:
1. **Analysis Paralysis (Tê liệt phân tích)**: Khi đối mặt với các dự án lớn, kiến trúc phức tạp hoặc nợ kỹ thuật chồng chất, não bộ bị quá tải nhận thức và không thể bắt đầu hành động đầu tiên.
2. **Goal Drift (Trôi dạt mục tiêu)**: Hàng ngày bận rộn với các tác vụ vụn vặt nhưng dần mất liên kết với các mục tiêu dài hạn quan trọng.

### 🧠 Triết Lý Lập Trình Viên (Programmer Principles)
Mọi tác vụ trong CogniFlow đều được phân rã theo 6 nguyên lý kỹ thuật:
- **Divide & Conquer**: Phân rã bài toán lớn thành các đơn vị công việc độc lập.
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
│    - AI Decompose thành 3 nano-steps 2 phút khi bị tắc     │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Tính Năng Cốt Lõi

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
| **Icons** | Lucide React | Hệ thống icon tối giản, đồng bộ |
| **Server Backend** | Express + TSX (Node.js) | Full-stack tích hợp sẵn Vite middlewares |
| **AI SDK** | `@google/genai` (v2.4.0) | Gọi các mô hình Gemini hiện đại nhất |
| **AI Models** | Gemini Flash & Lite Family | `gemini-2.5-flash`, `gemini-flash-latest`, `gemini-3.1-flash-lite`, `gemini-3.8-flash` |
| **Vector Embeddings** | `text-embedding-004` | 768 dimensions cho tìm kiếm tương đồng ngữ nghĩa |
| **Database & ORM** | PostgreSQL + Drizzle ORM | Hỗ trợ kiểu dữ liệu `vector(768)` và schema type-safe |

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
│   ├── microStep/               # Domain: Quản lý Vi bước 5-15 phút & Nano-steps
│   ├── bottleneck/              # Domain: Radar điểm nghẽn & Ma trận rủi ro
│   ├── decisionCopilot/         # Domain: Why-First Socratic Decision Copilot
│   ├── behavioral/              # Domain: Phân tích hành vi, Recharts LineChart & Burndown
│   │
│   ├── components/              # Shell UI: Header, Sidebar, ZoomController, RAG View
│   ├── common/                  # Các tiện ích và components dùng chung
│   ├── data/                    # Preset contexts & Mock prediction data dự phòng
│   ├── db/                      # Drizzle ORM schema, pgvector connection & RAG queries
│   │   ├── schema.ts            # Định nghĩa bảng users, notes & pgvector(768)
│   │   ├── index.ts             # Kết nối Database client
│   │   └── rag.ts               # Logic trích xuất embedding & Cosine distance search
│   ├── lib/                     # Thư viện dùng chung & Gemini Resilience Fallback
│   │   ├── geminiResilience.ts  # Fallback chain, exponential backoff & smart payload synthesis
│   │   ├── firebase.ts          # Cấu hình Firebase Web Client
│   │   └── firebase-admin.ts    # Cấu hình Firebase Admin Server-side
│   ├── types/                   # Định nghĩa TypeScript models toàn hệ thống & Ambient JSON types
│   └── utils/                   # Helpers: định dạng thời gian, tính toán điểm số
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
- **Request Body**:
  ```json
  {
    "context": {
      "title": "Refactor Auth sang OAuth2",
      "description": "Tách token provider độc lập",
      "techStack": ["React", "TypeScript", "Node.js"],
      "energyLevel": "high",
      "currentFriction": "Sợ làm gãy luồng refresh token cũ"
    }
  }
  ```
- **Response**: Trả về `PredictionPayload` chứa `timelines`, `microSteps`, `bottlenecks`, `riskMatrix`, `behavioralInsights`.

### 2. `POST /api/decompose`
Phân rã 1 vi bước bị bế tắc thành 3 nano-steps (mỗi bước ~2 phút).
- **Request Body**: `{ "stepTitle": "string", "contextFriction": "string" }`
- **Response**: `{ "nanoSteps": [...], "unblockMantra": "string" }`

### 3. `POST /api/socratic-decision`
Phân tích quyết định kỹ thuật theo tư duy First Principles.
- **Request Body**: `{ "dilemma": "Nên dùng PostgreSQL pgvector hay Pinecone?", "context": {...} }`
- **Response**: `{ "whyRootProblem": "...", "alternativesEvaluated": [...], "tradeOffsAndRisks": "...", "howRecommendation": "..." }`

### 4. `POST /api/goals/plan`
Tự động sinh cột mốc theo Quý và các vi bước khởi động cho một mục tiêu dài hạn.
- **Request Body**: `{ "goalTitle": "string", "category": "engineering", "horizon": "1_year" }`
- **Response**: `{ "refinedVision": "...", "milestones": [...], "immediateMicroSteps": [...] }`

### 5. `GET /api/notes` & `POST /api/notes`
Lấy danh sách hoặc tạo ghi chú kỹ thuật mới. Khi tạo mới, backend tự động gọi API embedding để lưu vector 768 chiều vào PostgreSQL.

### 6. `POST /api/notes/search` & `POST /api/notes/rag-ask`
Tìm kiếm ngữ nghĩa tài liệu và hỏi đáp RAG grounded trực tiếp từ kho tri thức cá nhân.

---

## 🛡️ Cơ Chế Phòng Vệ Gemini Resilience Engine

Hệ thống được trang bị module tự phục hồi tại `src/lib/geminiResilience.ts`:

1. **Chuỗi Fallback Mô Hình Tự Động (Model Fallback Chain)**:
   - Ưu tiên các mô hình có độ sẵn sàng cao: `gemini-2.5-flash` ➔ `gemini-flash-latest` ➔ `gemini-3.1-flash-lite` ➔ `gemini-3.8-flash`.
2. **Jittered Exponential Backoff**:
   - Khi gặp mã lỗi tạm thời `503 UNAVAILABLE` (quá tải do lưu lượng tăng đột biến) hoặc `429 RATE_LIMIT`, hệ thống tự động thử lại kèm khoảng trễ ngẫu nhiên trước khi chuyển sang mô hình tiếp theo.
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

*Ghi chú: Nếu chưa có `GEMINI_API_KEY`, CogniFlow sẽ tự động chuyển sang chế độ Mô Phỏng Dự Báo Thông Minh (Smart Synthesized Mode) để bạn có thể trải nghiệm toàn bộ giao diện mà không gặp bất kỳ lỗi gián đoạn nào.*

---

## 🧪 Kiểm Thử & Đóng Gói (Build & Verification)

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

---

## 💡 Mẹo Sử Dụng Hiệu Quả (Pro Tips)

1. **Khi cảm thấy lười hoặc bế tắc**: Nhấn vào nút **"Gỡ rối"** trên bất kỳ vi bước nào. 3 việc siêu nhỏ trong 2 phút sẽ giúp não bạn vượt qua ngưỡng ma sát tĩnh ban đầu.
2. **Theo dõi Biểu Đồ Năng Suất Recharts**: Kiểm tra tương quan giữa đường Tập Trung (Xanh) và Ma Sát (Vàng). Khi hai đường tách xa nhau là bạn đang ở trong trạng thái Dòng Chảy tối ưu (Hyperfocus).
3. **Theo dõi Drift Score**: Nếu điểm trôi dạt vượt quá 40%, hãy mở **Tầng 1 (Goal Canvas)** để gắn lại các vi bước vào đúng mục tiêu then chốt của Quý.
4. **Sử dụng Decision Copilot trước khi code**: Trước khi bắt đầu một đợt refactor lớn hoặc chọn thư viện mới, hãy nhập phân vân vào tab **"Quyết Định Why-First"** để nhìn rõ các đánh đổi và rủi ro tiềm ẩn.

---

## 👨‍💻 Tác Giả & Bản Quyền (Author & Copyright)

- **Tác giả / Sáng lập**: **Lê Quang Huy**
- **Dự án**: **CogniFlow — Semantic Flow Platform**
- **Bản quyền**: © 2026 **Lê Quang Huy**. Tất cả các quyền được bảo lưu (*All rights reserved*).
- **Mục đích**: Nền tảng điều hướng dòng chảy nhận thức và hỗ trợ ra quyết định kỹ thuật chuyên sâu theo nguyên lý "Why-First" & Domain-Driven Design (DDD).

---

*Phát triển với tinh thần kỹ sư thực chiến — Giảm tải nhận thức, tập trung tuyệt đối vào vi bước tiếp theo.*
*© 2026 Lê Quang Huy. All rights reserved.*

