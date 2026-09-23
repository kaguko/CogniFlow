import React, { useState } from 'react';
import { WhyFirstDecisionResult, ProjectContext } from '../types';
import {
  Lightbulb,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  GitBranch,
  ArrowRight,
  Brain,
  Quote,
} from 'lucide-react';
import { AudioPlayerButton } from './AudioPlayerButton';

interface WhyFirstDecisionCopilotProps {
  currentContext: ProjectContext;
  onApplyPlanToMicroSteps?: (steps: string[]) => void;
}

const SAMPLE_DECISION_DILEMMAS = [
  'Nên dừng lại viết test & refactor code cũ trước, hay làm tiếp tính năng mới để kịp deadline?',
  'Có nên áp dụng kiến trúc Microservice hay tiếp tục tối ưu Modular Monolith?',
  'Nên tự viết logic caching & rate limiting riêng hay dùng thư viện bên ngoài (Redis / Upstash)?',
  'Làm sao quyết định khi hai lập trình viên tranh luận về 2 giải pháp kỹ thuật khác nhau?',
];

export const WhyFirstDecisionCopilot: React.FC<WhyFirstDecisionCopilotProps> = ({
  currentContext,
  onApplyPlanToMicroSteps,
}) => {
  const [dilemma, setDilemma] = useState(
    'Nên dừng lại viết test & refactor code cũ trước, hay làm tiếp tính năng mới để kịp deadline?'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WhyFirstDecisionResult | null>({
    dilemma: 'Nên dừng lại viết test & refactor code cũ trước, hay làm tiếp tính năng mới để kịp deadline?',
    whyRootProblem:
      'Vấn đề thực sự không phải là cuộc chiến giữa "Chất lượng code" và "Tốc độ bàn giao". Vấn đề gốc rễ là sự thiếu hụt "Lưới an toàn tối thiểu (Minimum Test Safety Net)". Nếu làm tính năng mới trên nền tảng mong manh, thời gian debug hồi quy sẽ cướp đi 70% tốc độ thực tế của bạn.',
    alternativesEvaluated: [
      {
        name: 'Dừng toàn bộ dự án 1 tuần để "Đập đi xây lại" (Full Rewrite)',
        pros: 'Thỏa mãn cảm giác hoàn hảo của lập trình viên.',
        cons: 'Rủi ro trễ hạn 100%, kinh doanh mất cơ hội thị trường, tạo ra các bug mới mà hệ thống cũ đã từng sửa.',
        rejectionReason: 'Bị loại vì chi phí cơ hội quá cao và vi phạm nguyên tắc gia tăng giá trị liên tục.',
      },
      {
        name: 'Bỏ qua hoàn toàn test, lao vào viết tính năng mới ngay',
        pros: 'Cảm giác có tiến độ nhanh trong 24 giờ đầu.',
        cons: 'Dính regression bug ngay khi deploy, phải thức đêm vá lỗi và mất niềm tin của khách hàng.',
        rejectionReason: 'Bị loại vì tạo ra nợ kỹ thuật kép không thể thu hồi.',
      },
    ],
    tradeOffsAndRisks:
      'Chọn phương pháp vi bước bọc test (Strangler / Characterization Test): Bạn sẽ phải dành 20% thời gian ban đầu để viết test bọc kịch bản chính, có thể cảm thấy tốc độ chậm hơn một chút trong 2 giờ đầu, nhưng tốc độ sẽ tăng vọt sau đó.',
    howRecommendation:
      'Áp dụng chiến lược "Campground Rule" (Luật cắm trại) kết hợp "Characterization Test": Dành đúng 15 phút viết 1 test case bao bọc endpoint sắp đụng vào. Sau đó viết tính năng mới bên cạnh, không sửa lan man sang phần khác.',
    verificationBasis:
      'Nguyên lý Martin Fowler về Refactoring: Luôn giữ hành vi hiện hữu được bảo vệ bằng automated assertion trước khi chạm vào bất kỳ dòng mã nào.',
    socraticQuestions: [
      'Điều tồi tệ nhất có thể xảy ra nếu tính năng hiện tại bị vỡ khi deploy là gì?',
      'Bạn có thật sự cần test 100% độ phủ (coverage), hay chỉ cần test 20% luồng quan trọng nhất để an tâm 80%?',
      'Làm thế nào để bạn biết chắc chắn rằng mình đang giải quyết vấn đề chứ không phải đang trốn tránh nó bằng cách dọn dẹp code?',
    ],
    microActionPlan: [
      'Mở file cần sửa và viết 1 test case mô phỏng happy path (10 phút)',
      'Chạy test để xác nhận test PASS với code hiện có (2 phút)',
      'Viết module tính năng mới dưới dạng extension hoặc adapter tách biệt (15 phút)',
    ],
  });

  const handleAnalyze = async () => {
    if (!dilemma.trim()) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/socratic-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dilemma: dilemma.trim(),
          context: {
            title: currentContext.title,
            techStack: currentContext.techStack,
            deadline: currentContext.deadlineHorizon,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Decision copilot server error');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.warn('Using local fallback for Socratic Why-First analysis', err);
      // Local fallback with high quality why-first logic
      setResult({
        dilemma,
        whyRootProblem: `Vấn đề thật sự của "${dilemma}" nằm ở sự bất đối xứng thông tin và nỗi sợ rủi ro vô hình. Khi chưa có tiêu chí đo lường định lượng, não bộ có xu hướng chọn giải pháp quen thuộc thay vì giải pháp tối ưu theo hoàn cảnh.`,
        alternativesEvaluated: [
          {
            name: 'Chọn phương án cực đoan (Over-engineering hoặc Bỏ mặc)',
            pros: 'Dễ quyết định ngắn hạn.',
            cons: 'Hệ lụy kỹ thuật và nợ tích lũy lâu dài.',
            rejectionReason: 'Thiếu tính linh hoạt và không thích ứng với nguồn lực hiện có.',
          },
          {
            name: 'Trì hoãn quyết định để tìm kiếm thêm thông tin vô hạn',
            pros: 'Tránh cảm giác phải chịu trách nhiệm.',
            cons: 'Tê liệt phân tích và lỡ deadline.',
            rejectionReason: 'Quyết định muộn tồi tệ hơn quyết định đúng 80% nhưng sửa nhanh được.',
          },
        ],
        tradeOffsAndRisks:
          'Mọi quyết định đều có đánh đổi. Giải pháp tốt nhất là giải pháp giảm thiểu chi phí đảo ngược (Reversibility Cost).',
        howRecommendation:
          'Chọn giải pháp hai chiều (Two-Way Door): Triển khai thử nghiệm trong phạm vi nhỏ 30 phút, đo lường kết quả thực nghiệm trước khi cam kết diện rộng.',
        verificationBasis:
          'Nguyên tắc Bezos Two-Way Door Decisions & nguyên lý YAGNI (You Aren\'t Gonna Need It).',
        socraticQuestions: [
          'Quyết định này có thể đảo ngược dễ dàng nếu sai hay không?',
          'Giả thuyết quan trọng nhất mà giải pháp này phụ thuộc vào là gì?',
          'Nếu phải giải quyết bài toán này trong vòng 2 giờ thay vì 2 ngày, bạn sẽ cắt bỏ điều gì đầu tiên?',
        ],
        microActionPlan: [
          'Liệt kê tiêu chí thành công tối thiểu có thể đo lường trong 5 phút',
          'Tạo một branch thử nghiệm cô lập để kiểm chứng giả định chính',
          'Đánh giá lại sau 30 phút thực thi thực tế',
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Introduction */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-amber-400 font-semibold uppercase tracking-wider">
            Triết Lý Why-First & Đồng Hành Socratic
          </span>
          <span aria-hidden="true">·</span>
          <span>Bảo Tồn Tư Duy Cá Nhân</span>
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Cố Vấn Ra Quyết Định Nhanh & Đúng Bản Chất
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Không đưa ra kết quả mù quáng: Hệ thống mổ xẻ 3 tầng WHY (Vấn đề thật &rarr; Lựa chọn bị loại &rarr; Đánh đổi rủi ro) và đặt câu hỏi phản biện để bạn làm chủ tư duy giải quyết vấn đề.
        </p>
      </div>

      {/* Dilemma Input Area */}
      <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">
            Khúc Mắc / Bài Toán Kỹ Thuật Bạn Đang Phân Vân:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={dilemma}
              onChange={(e) => setDilemma(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="Nhập quyết định cần cân nhắc..."
              className="flex-1 px-3 py-2 rounded bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !dilemma.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded transition-colors whitespace-nowrap shadow"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Đang Phân Tích...' : 'Mổ Xẻ Why-First'}</span>
            </button>
          </div>
        </div>

        {/* Quick Sample Dilemmas */}
        <div className="space-y-1 pt-1">
          <span className="text-[11px] text-slate-500 font-medium">Gợi ý tình huống mẫu:</span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_DECISION_DILEMMAS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDilemma(sample);
                }}
                className="text-[11px] px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors text-left"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RESULT SECTION (WHY-FIRST 3 TIERS) */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Kết Quả Phân Tích Chuẩn Why-First
            </span>
            <AudioPlayerButton
              textToSpeak={`Mổ xẻ quyết định. ${result.whyRootProblem}. Giải pháp tối ưu: ${result.howRecommendation}`}
              label="Nghe Quyết Định Voice"
            />
          </div>

          {/* TIER 1: 🎯 WHY #1 - VẤN ĐỀ THẬT */}
          <div className="p-4 rounded-lg bg-slate-900 border border-indigo-700/60 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/60">
                🎯 WHY #1
              </span>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Vấn Đề Thật Sự Đằng Sau (Root Problem)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans pl-1">
              {result.whyRootProblem}
            </p>
          </div>

          {/* TIER 2: 🔍 WHY #2 - SO SÁNH & CÁC LỰA CHỌN BỊ LOẠI */}
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800/60">
                🔍 WHY #2
              </span>
              <h3 className="text-sm font-bold text-white tracking-tight">
                So Sánh Phương Án & Lý Do Bị Loại
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.alternativesEvaluated.map((alt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded bg-slate-950 border border-slate-800/80 space-y-2 text-xs"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                    <span>{alt.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div>
                      <span className="text-emerald-400 font-medium">Ưu điểm: </span>
                      {alt.pros}
                    </div>
                    <div>
                      <span className="text-rose-400 font-medium">Nhược điểm: </span>
                      {alt.cons}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-rose-950/30 border border-rose-900/30 text-[11px] text-rose-300">
                    <span className="font-semibold">Vì sao bị loại: </span>
                    {alt.rejectionReason}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TIER 3: ⚠️ WHY #3 - ĐÁNH ĐỔI & RỦI RO */}
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800/60">
                ⚠️ WHY #3
              </span>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Hệ Quả, Đánh Đổi & Rủi Ro Cần Biết Trước
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-1">
              {result.tradeOffsAndRisks}
            </p>
          </div>

          {/* 🛠️ HOW: PHƯƠNG ÁN TỐI ƯU CỤ THỂ */}
          <div className="p-4 rounded-lg bg-slate-900 border border-emerald-700/60 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                🛠️ HOW
              </span>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Giải Pháp Tối Ưu Đề Xuất
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 font-mono leading-relaxed pl-1">
              {result.howRecommendation}
            </p>

            {/* Verification basis */}
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">✅ Vì sao tin được (Cơ sở kiểm chứng): </span>
              {result.verificationBasis}
            </div>

            {/* Quick Action Plan */}
            {result.microActionPlan && result.microActionPlan.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Kế hoạch hành động ngay:
                </span>
                <div className="space-y-1">
                  {result.microActionPlan.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-slate-300 font-mono"
                    >
                      <span className="text-indigo-400 font-bold">{idx + 1}.</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 🧠 SOCRATIC INQUIRY (KÍCH THÍCH TƯ DUY CÁ NHÂN) */}
          <div className="p-4 rounded-lg bg-slate-900/90 border border-purple-800/50 space-y-3">
            <div className="flex items-center gap-2 text-purple-300">
              <Brain className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold tracking-tight">
                Gợi Mở Tư Duy Socratic (Câu Hỏi Để Bạn Tự Quyết Định)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Hệ thống không quyết định thay bạn. Hãy tự vấn 3 câu hỏi này để củng cố tư duy phản biện của chính bạn:
            </p>
            <div className="space-y-2">
              {result.socraticQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded bg-slate-950 border border-purple-900/40 text-xs text-purple-200 flex items-start gap-2.5"
                >
                  <Quote className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{q}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
