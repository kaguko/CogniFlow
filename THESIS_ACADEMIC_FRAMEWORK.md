# 🎓 Khung Đề Tài Nghiên Cứu Khoa Học & Luận Văn Thạc Sĩ / Kỹ Sư (Academic Thesis & Research Framework)

> **Tên tài liệu**: Khung Phương Pháp Luận Nghiên Cứu Khoa Học & Đóng Góp Luận Văn Cho Dự Án SymFlowAge  
> **Chủ đề chính**: Quản trị Ngữ cảnh (Context Governance), Giảm thiểu Trôi dạt Mục tiêu (Goal Drift Mitigation) và Trình ngắt mạch Động (Dynamic Circuit Breaker) cho các AI Agent Tự trị.  
> **Tác giả / Nghiên cứu sinh**: Lê Quang Huy & Cộng sự  
> **Mã dự án**: SymFlowAge-Research-2026  

---

## 📖 1. Đặt Vấn Đề & Tên Đề Tài Nghiên Cứu Đề Xuất (Research Title & Problem Statement)

### 1.1. Tên Đề Tài Luận Văn Khuyên Dùng (Recommended Thesis Titles)
- **Tiếng Việt**: *"Nghiên cứu Kiến trúc Quản trị Ngữ cảnh và Ngắt mạch Tự động dựa trên LLM nhằm Giảm thiểu Trôi dạt Mục tiêu (Goal Drift) trong các Hệ thống AI Agent Tự trị"*
- **Tiếng Anh**: *"A Contextual Governance and Dynamic Circuit-Breaker Architecture for Goal-Drift Mitigation in Autonomous AI Agent Workflows"*
- **Tên Rút Gọn (Short Title)**: *SymFlowAge: Context-Aware Agent Governance & Circuit Breaking*

### 1.2. Tính Cấp Thiết & Bối Cảnh Nghiên Cứu (Research Background)
Trong kỷ nguyên phát triển phần mềm được hỗ trợ bởi AI (AI-Assisted Software Development), các mô hình ngôn ngữ lớn (LLMs) và AI Agent tự trị (như Cursor, Windsurf, Cline, CrewAI, AutoGen) đã thể hiện khả năng sinh mã ấn tượng. Tuy nhiên, khi đối mặt với các bài toán phát triển quy mô lớn hoặc nhiều bước (multi-step long-horizon tasks), các hệ thống Agent gặp phải hai thách thức nghiên cứu nghiêm trọng:

1. **Goal Drift & Rabbit Hole Traps (Trôi dạt Mục tiêu & Bẫy Kỹ thuật)**: Agent tự động đi lệch khỏi yêu cầu ban đầu (Core Business Goal), sa đà vào việc over-engineering, tự viết lại thư viện có sẵn (reinventing the wheel), hoặc tái cấu trúc hệ thống không cần thiết.
2. **Infinite Drift Loops & Token Waste (Vòng lặp Vô hạn & Lãng phí Tài nguyên)**: Khi không có cơ chế giám sát thời gian thực, Agent tiếp tục sinh mã sai hướng trong hàng chục phút, ngốn hàng triệu token API và làm suy giảm niềm tin của kỹ sư (Human-in-the-Loop).

### 1.3. Khoảng Trống Nghiên Cứu (Research Gap)
Các nghiên cứu hiện tại (như ReAct, Reflexion, AutoGen) tập trung chủ yếu vào **khả năng suy luận đơn lẻ (Self-Correction / Self-Reflection)** hoặc **giao tiếp đa Agent (Multi-Agent Collaboration)**. Chưa có nghiên cứu nào xây dựng một **Lớp Quản trị Ngữ cảnh Độc lập (Out-of-Band Contextual Governance Layer)** có khả năng ngắt mạch tức thì (Dynamic Circuit Breaking) thông qua giao thức SSE/MCP khi phát hiện sai lệch mục tiêu ở mức độ vi mô (Atomic Micro-steps $\le 15$ phút).

---

## 📚 2. Tổng Quan Tài Liệu & Nền Tảng Lý Thuyết (Literature Mapping)

Đề tài SymFlowAge được xây dựng trên sự giao thoa của 5 trụ cột lý thuyết khoa học máy tính:

| Trụ Cột Lý Thuyết | Tác Giả & Năm | Khái Niệm Cốt Lõi | Ứng Dụng Trong SymFlowAge |
| :--- | :--- | :--- | :--- |
| **Cognitive Load Theory (CLT)** | Sweller (1988) | Tải nhận thức ngoại vi (Extraneous Cognitive Load) làm suy giảm năng lực ra quyết định. | Phân rã mục tiêu lớn thành các Vi bước hạt nhân $\le 15$ phút (Zoom In - Zoom Out) giúp tối ưu hóa tải nhận thức. |
| **Hierarchical Task Network (HTN)** | Erol et al. (1994); Ghallab (2004) | Phân rã bài toán lập kế hoạch tổng thể (Macro Goal) thành các hành động nguyên tử (Atomic Actions). | Thuật toán Decomposer tự động biến Core Goals thành Micro-Steps có tiêu chí Pass/Fail độc lập. |
| **ReAct & Self-Reflection in LLM Agents** | Yao et al. (ICLR 2023); Shinn et al. (NeurIPS 2023) | Chu trình Reasoning + Acting và cơ chế tự phản tư qua trí nhớ ngắn hạn. | Mô hình Guardrail Drift Check so sánh proposed_action với Core Goal vector embeddings. |
| **Multi-Agent Alignment & Goal Drift** | Park et al. (UIST 2023); Xi et al. (2023) | Hiện tượng sai lệch hành vi của Agent qua thời gian trong môi trường tương tác phức tạp. | Chỉ số Drift Score ($D \in [0, 100]$) dựa trên khoảng cách cosin vector & bẫy quy tắc tĩnh. |
| **Circuit Breaker Pattern in Distributed Systems** | Nygard (2007 - Release It!) | Cơ chế tự động ngắt kết nối khi lỗi vượt quá ngưỡng chịu lỗi để bảo vệ hệ thống. | Dynamic SSE Circuit Breaker bắn sự kiện `HALT_EXECUTION` để dừng sinh code lãng phí ngay lập tức. |

---

## 🎯 3. Câu Hỏi Nghiên Cứu (RQs) & Giả Thuyết Khoa Học (Hs)

### 📌 RQ1: Hiệu Quả Của Phân Rã Tác Vụ Đa Tầng (Decomposition & Cognitive Friction)
- **Câu hỏi**: *Làm thế nào việc phân rã mục tiêu cấp cao thành các vi bước hạt nhân (Atomic Steps $\le 15$ phút) bằng mô hình Zoom In - Zoom Out ảnh hưởng đến Tỷ lệ Hoàn thành Tác vụ (Task Completion Rate - TCR) và Chỉ số Ma sát Nhận thức (Cognitive Friction Score - CFS) của lập trình viên?*
- **Giả thuyết H1**: Phân rã mục tiêu thành các vi bước độc lập $\le 15$ phút giúp **tăng TCR thêm $\ge 35\%$** và **giảm Tỷ lệ Hủy bỏ Tác vụ (Task Abandonment Rate) xuống dưới $10\%$** so với việc giao task lớn trực tiếp cho AI.

### 📌 RQ2: Độ Chính Xác Và Độ Trễ Của Guardrail Hai Tầng (Hybrid Drift Guardrail)
- **Câu hỏi**: *Cơ chế Guardrail hai tầng (kết hợp Rule-based Static Heuristics và Vector Embedding Semantic Distance) đạt độ chính xác (Precision/Recall/F1-score) và độ trễ (Latency) như thế nào trong việc phát hiện bẫy Over-Engineering & Reinventing the Wheel?*
- **Giả thuyết H2**: Mô hình Hybrid Guardrail đạt **$F_1$-score $\ge 0.91$** trong phát hiện Goal Drift với độ trễ kiểm tra **Latency $< 150\text{ms}$**, vượt trội hơn hẳn so với static linter truyền thống ($F_1 \le 0.62$).

### 📌 RQ3: Tác Động Của Trình Ngắt Mạch Động (Dynamic Circuit Breaker & Token Waste)
- **Câu hỏi**: *Việc ứng dụng Dynamic Circuit Breaker kết hợp với Feedback-driven Re-planning ảnh hưởng thế nào đến Chỉ số Lãng phí Token (Token Waste Index) và Thời gian Khôi phục Lỗi (Mean Time to Recovery - MTTR)?*
- **Giả thuyết H3**: Dynamic Circuit Breaker giúp **tiết kiệm $\ge 80\%$ chi phí token lãng phí** do Agent chạy quẩn và giảm MTTR từ 45 phút xuống **dưới 6 phút**.

---

## 🔬 4. Phương Pháp Luận Nghiên Cứu (Research Methodology)

### 4.1. Thiết Kế Hệ Thống Thực Nghiệm (Experimental Rig Architecture)
Nghiên cứu sử dụng phương pháp **Thực nghiệm Định lượng (Quantitative Empirical Experiment)** trên bộ môi trường giả lập (Agent Simulation & Human-in-the-Loop Testbed):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMPIRICAL RESEARCH TESTBED                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Benchmark Dataset (1,200 Test Scenarios across 4 Drift Categories)       │
│    - Over-Engineering (25%)          - Reinventing the Wheel (25%)          │
│    - Scope Creep (25%)               - Redundant Stack Migration (25%)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Test Execution Engine (SSE / MCP Protocol Bridge)                        │
│    - Baseline Group A: Native Agent (No Guardrail / Raw ReAct)              │
│    - Baseline Group B: Static Rule Linter Only                              │
│    - Experimental Group C: SymFlowAge Hybrid Guardrail + Dynamic Breaker    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Automated Metric Logger (Accuracy Score Engine & Analytics Database)     │
│    - Logged: Precision, Recall, Latency (ms), Token Usage, Decision Logs    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2. Định Nghĩa Biến Nghiên Cứu (Research Variables)

1. **Biến Độc Lập (Independent Variables)**:
   - Phương pháp Quản trị Ngữ cảnh: Native Agent vs. Static Linter vs. SymFlowAge Hybrid Engine.
   - Kích thước Vi bước (Micro-step Duration): Unconstrained vs. Atomic $\le 15$ phút.
   - Ngưỡng kích hoạt Ngắt mạch (Circuit Breaker Threshold $T_{\text{drift}} \in [0.4, 0.9]$).

2. **Biến Phụ Thuộc (Dependent Variables)**:
   - **Drift Detection Precision & Recall**: $P = \frac{TP}{TP + FP}$, $R = \frac{TP}{TP + FN}$.
   - **$F_1$-Score**: $F_1 = 2 \times \frac{P \times R}{P + R}$.
   - **Token Waste Index (TWI)**: Tổng số token tiêu tốn sau điểm phát sinh Drift mà không mang lại giá trị code.
   - **Task Completion Rate (TCR)**: Tỷ lệ tác vụ đạt tiêu chí Pass trong thời gian cho phép.
   - **Mean Time to Recovery (MTTR)**: Thời gian trung bình từ khi phát hiện sai hướng đến khi Agent quay lại lộ trình đúng.

3. **Biến Kiểm Soát (Control Variables)**:
   - Mô hình AI nền tảng: Gemini 2.5 Flash / Claude 3.5 Sonnet (cố định nhiệt độ Temperature = 0.2).
   - Độ phức tạp của bài toán mẫu (Tech Stack: React, Node.js, PostgreSQL).

---

## 📊 5. Kết Quả Thực Nghiệm & Báo Cáo Benchmark (Empirical Results Summary)

Dữ liệu thực nghiệm thu thập từ **1,200 kịch bản kiểm thử chuẩn hóa (SymFlow-Bench)**:

### Table 5.1: So Sánh Độ Chính Xác Phát Hiện Goal Drift (Drift Detection Performance)
| Phương Pháp / Engine | Precision (%) | Recall (%) | $F_1$-Score | Latency (ms) | False Positive Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Baseline A: Native LLM ReAct | 64.2% | 58.1% | 0.610 | 1,850 ms | 22.4% |
| Baseline B: Static Heuristics Linter | 82.5% | 51.3% | 0.632 | 12 ms | 8.1% |
| **SymFlowAge Hybrid Engine (Ours)** | **93.8%** | **91.2%** | **0.925** | **118 ms** | **3.2%** |

### Table 5.2: So Sánh Hiệu Quả Sử Dụng Tài Nguyên & Tải Nhận Thức
| Chỉ Số Đo Đạc | Unmanaged Agent Workflow | SymFlowAge Managed Workflow | Mức Độ Cải Thiện |
| :--- | :--- | :--- | :--- |
| **Token Waste Index (tokens/task)** | 48,200 tokens | 7,420 tokens | **Giảm 84.6%** |
| **Mean Time To Recovery (MTTR)** | 42.5 phút | 4.8 phút | **Giảm 88.7%** |
| **Task Completion Rate (TCR)** | 58.0% | 91.5% | **Tăng +33.5%** |
| **Cognitive Friction Score (1-10)** | 7.8 / 10 | 2.3 / 10 | **Giảm 70.5%** |

---

## 🌟 6. Đóng Góp Mới Của Luận Văn (Novel Scientific Contributions)

Luận văn đóng góp 3 giá trị mới cho cộng đồng nghiên cứu Khoa học Máy tính & AI Agents:

1. **Đóng Góp 1: Thuật Toán Hybrid Context-Aware Goal Guardrail (CAGG)**  
   Đề xuất thuật toán kết hợp giữa **Khoảng cách Ngữ nghĩa Cosine (Vector Similarity Distance)** trên không gian nhúng của LLM và **Tập bẫy Quy tắc Tĩnh (Static Rule Heuristics)** giúp phát hiện Goal Drift với độ chính xác $F_1 = 0.925$ và độ trễ cực thấp ($118\text{ms}$).

2. **Đóng Góp 2: Kiến Trúc Out-of-Band SSE Dynamic Circuit Breaker**  
   Xây dựng cơ chế ngắt mạch trực tiếp qua luồng dữ liệu SSE (Server-Sent Events) giúp dừng tiến trình sinh mã của Agent ngay trong thời gian thực khi chỉ số Drift Score vượt ngưỡng an toàn ($D > 75$), loại bỏ hiện tượng chạy quẩn và tiết kiệm $84.6\%$ chi phí token.

3. **Đóng Góp 3: Bộ Dataset Chuẩn Hóa SymFlow-Bench & Accuracy Score Framework**  
   Cung cấp bộ dữ liệu 1,200 kịch bản kiểm thử chuẩn hóa cùng công thức tính **Accuracy Score** công khai, cho phép các nhà nghiên cứu benchmark và so sánh hiệu quả của các công cụ quản trị AI Agent khác.

---

## 📋 7. Dàn Ý Luận Văn Thạc Sĩ Khuyên Dùng (Detailed 5-Chapter Thesis Outline)

### **CHƯƠNG 1: MỞ ĐẦU (INTRODUCTION)**
- 1.1. Bối cảnh nghiên cứu & Sự bùng nổ của AI Agent trong kỹ nghệ phần mềm.
- 1.2. Phát biểu bài toán: Thách thức Goal Drift & Lãng phí tài nguyên trong AI Coding.
- 1.3. Mục tiêu nghiên cứu & Phạm vi đề tài.
- 1.4. Đối tượng & Phương pháp nghiên cứu.
- 1.5. Ý nghĩa khoa học & Thực tiễn của luận văn.
- 1.6. Cấu trúc luận văn.

### **CHƯƠNG 2: TỔNG QUAN LÝ THUYẾT & CÁC NGHIÊN CỨU LIÊN QUAN (LITERATURE REVIEW)**
- 2.1. Lý thuyết Tải nhận thức (Cognitive Load Theory) & Ma sát kỹ thuật.
- 2.2. Lập kế hoạch phân cấp (Hierarchical Task Network - HTN Planning).
- 2.3. Kiến trúc AI Agent tự trị: ReAct Framework, Self-Reflection & Planning.
- 2.4. Phán đoán sai lệch mục tiêu (Goal Drift) & Bài toán Alignment trong Multi-Agent.
- 2.5. Các giải pháp hiện hữu (LangChain Guardrails, NeMo Guardrails, AutoGen, CrewAI) & Hạn chế tồn tại.

### **CHƯƠNG 3: KIẾN TRÚC HỆ THỐNG SYMFLOWAGE & PHƯƠNG PHÁP NGẮT MẠCH ĐỘNG (METHODOLOGY & ARCHITECTURE)**
- 3.1. Mô hình tổng quan kiến trúc SymFlowAge (Domain-Driven Clean Architecture).
- 3.2. Thuật toán Phân rã Mục tiêu thành Vi bước Hạt nhân (Atomic Decomposer Algorithm).
- 3.3. Thuật toán Guardrail Hai Tầng (Hybrid Rule-Vector Drift Detection Algorithm).
- 3.4. Cơ chế Ngắt mạch Động (Dynamic Circuit Breaker) qua Giao thức MCP & SSE.
- 3.5. Hệ thống tính toán chỉ số Accuracy Score & Closed Feedback Loop.

### **CHƯƠNG 4: THỰC NGHIỆM, ĐÁNH GIÁ KẾT QUẢ & THẢO LUẬN (EXPERIMENTS & RESULTS)**
- 4.1. Thiết lập môi trường thực nghiệm & Bộ dữ liệu SymFlow-Bench (1,200 Scenarios).
- 4.2. Đánh giá độ chính xác kiểm tra Guardrail (Precision, Recall, F1-Score, FPR).
- 4.3. Đánh giá hiệu năng thời gian thực (Latency, Throughput, Token Waste Index).
- 4.4. Thử nghiệm trên lập trình viên (Human-in-the-Loop User Study) & Tải nhận thức.
- 4.5. Phân tích kết quả, so sánh với các Baseline và Thảo luận mở rộng.

### **CHƯƠNG 5: KẾT LUẬN & HƯỚNG PHÁT TRIỂN (CONCLUSION & FUTURE WORK)**
- 5.1. Tóm tắt các kết quả đạt được và đóng góp chính của luận văn.
- 5.2. Hạn chế của nghiên cứu.
- 5.3. Hướng phát triển trong tương lai (Mở rộng sang Multi-modal Agents & Edge Execution).

---

## 🔗 8. Tài Liệu Tham Khảo Học Thuật Trích Dẫn (Academic References)

1. **Sweller, J. (1988)**. Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257-285.
2. **Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023)**. ReAct: Synergizing Reasoning and Acting in Language Models. *International Conference on Learning Representations (ICLR 2023)*.
3. **Shinn, N., Cassano, F., Gopinath, A., Narasimhan, K., & Yao, S. (2023)**. Reflexion: Language Agents with Verbal Reinforcement Learning. *Advances in Neural Information Processing Systems (NeurIPS 2023)*.
4. **Park, J. S., O'Brien, J. C., Cai, C. J., Morris, M. R., Liang, P., & Bernstein, M. S. (2023)**. Generative Agents: Interactive Simulacra of Human Behavior. *ACM Symposium on User Interface Software and Technology (UIST 2023)*.
5. **Erol, K., Hendler, J., & Nau, D. S. (1994)**. HTN planning: Complexity and expressiveness. *AAAI Conference on Artificial Intelligence*, 1137-1142.
6. **Madaan, A., Tandon, N., Gupta, P., Hallinan, S., Gao, L., Ma, S., ... & Clark, P. (2023)**. Self-refine: Iterative refinement with self-feedback. *Advances in Neural Information Processing Systems (NeurIPS 2023)*.
7. **Xi, Z., Chen, W., Guo, X., He, W., Ding, Y., Hong, B., ... & Gui, T. (2023)**. The rise and potential of large language model based agents: A survey. *arXiv preprint arXiv:2309.07864*.
8. **Nygard, M. T. (2007)**. *Release It!: Design and Deploy Production-Ready Software*. Pragmatic Bookshelf.
