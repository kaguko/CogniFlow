import React, { useState } from 'react';
import { AlertOctagon, CheckCircle2, ShieldAlert, Cpu, Wrench, RefreshCw, Layers, Sparkles, BookOpen } from 'lucide-react';

export type RabbitHoleType =
  | 'over_engineering'
  | 'premature_optimization'
  | 'reinventing_wheel'
  | 'scope_creep'
  | 'bike_shedding';

export interface RabbitHoleAlert {
  id: string;
  type: RabbitHoleType;
  title: string;
  taskTitle: string;
  reason: string;
  remedialAdvice: string;
  detectedAt: string;
  isFalsePositive?: boolean;
}

export interface RabbitHoleCalloutProps {
  activeAlert?: RabbitHoleAlert | null;
  onExemptionGranted?: (alertId: string, ruleText: string) => void;
  onSimulateRabbitHole?: (type: RabbitHoleType) => void;
}

const RABBIT_HOLE_CONFIGS: Record<RabbitHoleType, {
  name: string;
  icon: typeof AlertOctagon;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  description: string;
}> = {
  over_engineering: {
    name: 'Over-Engineering & Hạ Tầng Phức Tạp Sớm',
    icon: Layers,
    color: 'text-rose-400',
    bgColor: 'bg-rose-950/40',
    borderColor: 'border-rose-600/70',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'Agent đang cố gắng cấu hình Event Sourcing / Kafka / Kubernetes cho một module chưa có traffic thực tế.',
  },
  premature_optimization: {
    name: 'Premature Optimization (Tối Ưu Vi Mô Quá Sớm)',
    icon: Cpu,
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/40',
    borderColor: 'border-amber-600/70',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Agent đang viết assembly bitwise hoặc thuật toán custom thay vì sử dụng hàm chuẩn của ngôn ngữ.',
  },
  reinventing_wheel: {
    name: 'Reinventing The Wheel (Tự Viết Lại Thư Viện Sẵn Có)',
    icon: RefreshCw,
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/40',
    borderColor: 'border-orange-600/70',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    description: 'Agent cố gắng tự lập trình parser JWT hoặc cryptographic hashing từ đầu thay vì import lib tiêu chuẩn.',
  },
  scope_creep: {
    name: 'Scope Creep (Trôi Dạt Ranh Giới Tính Năng)',
    icon: Wrench,
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/40',
    borderColor: 'border-purple-600/70',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Agent tự động thêm tính năng xuất PDF hoặc quản lý Avatar người dùng trong khi bài toán chỉ là Auth JWT.',
  },
  bike_shedding: {
    name: 'Bike-Shedding (Tranh Cãi Tiểu Tiết Không Cốt Lõi)',
    icon: AlertOctagon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-blue-600/70',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Agent tiêu tốn vòng lặp tranh cãi đặt tên CSS class hoặc format comment thay vì hoàn thành test case.',
  },
};

export function RabbitHoleCalloutAndFalsePositive({
  activeAlert: initialAlert,
  onExemptionGranted,
  onSimulateRabbitHole,
}: RabbitHoleCalloutProps) {
  const [currentAlert, setCurrentAlert] = useState<RabbitHoleAlert | null>(
    initialAlert || {
      id: 'alert_demo_1',
      type: 'over_engineering',
      title: 'Phát hiện bẫy: Cấu hình Distributed Redis Cluster thay vì Single Node',
      taskTitle: 'Thiết lập Redis Multi-Master Sharding cho phiên kiểm tra token blacklist',
      reason: 'Hệ thống hiện tại chỉ phục vụ phiên dev và tải trung bình. Cấu hình cluster phức tạp hóa ranh giới mã nguồn và làm chậm tốc độ hoàn tất vi bước.',
      remedialAdvice: 'Dùng in-memory fallback hoặc single redis instance. Áp dụng nguyên tắc Minimal Surface (YAGNI).',
      detectedAt: '10:04:12',
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exemptionSuccess, setExemptionSuccess] = useState(false);
  const [activeExemptionsCount, setActiveExemptionsCount] = useState(1);

  const handleReportFalsePositive = async () => {
    if (!currentAlert) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/agent/feedback/false-positive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: currentAlert.id,
          taskTitle: currentAlert.taskTitle,
          detectedType: currentAlert.type,
          reason: 'Người dùng xác nhận tác vụ này là chiến lược cần thiết cho hệ thống phân tán, không phải sa đà.',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExemptionSuccess(true);
        setActiveExemptionsCount((prev) => prev + 1);

        if (onExemptionGranted) {
          onExemptionGranted(
            currentAlert.id,
            `Sau outcome DRIFT, ghi nhận ngoại lệ cho ${currentAlert.taskTitle}`
          );
        }

        setTimeout(() => {
          // Clear active alert after feedback
          setCurrentAlert(null);
          setExemptionSuccess(false);
        }, 3500);
      }
    } catch (err) {
      console.warn('Failed to submit false positive feedback', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerPreset = (type: RabbitHoleType) => {
    const config = RABBIT_HOLE_CONFIGS[type];
    setCurrentAlert({
      id: `alert_${Date.now()}`,
      type,
      title: `Cảnh Báo Sa Đà: ${config.name}`,
      taskTitle: config.description,
      reason: 'Độ trôi dạt mục tiêu tăng lên 48%. Tiêu tốn nhiều nhịp suy luận mà không sinh mã nguồn cốt lõi.',
      remedialAdvice: 'Thu hẹp ranh giới về đúng 1 file duy nhất và bổ sung single test assertion.',
      detectedAt: new Date().toLocaleTimeString('vi-VN'),
    });
    setExemptionSuccess(false);
    if (onSimulateRabbitHole) onSimulateRabbitHole(type);
  };

  if (!currentAlert) {
    return (
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">
                Rào Chắn Chống Sa Đà (Rabbit-Hole Callout & Calibration)
              </h3>
              <p className="text-xs text-slate-400">
                Hiện tại không phát hiện bẫy sa đà nào. Toàn bộ Agent Swarm đang chạy trong vùng an toàn.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-800/60">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{activeExemptionsCount} Quy Tắc Ngoại Lệ Đã Nạp</span>
          </div>
        </div>

        {/* Quick simulator buttons */}
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-medium">
            🧪 Thử nghiệm mô phỏng phát hiện bẫy kỹ thuật:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTriggerPreset('over_engineering')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>🏗️</span> Over-Engineering
            </button>
            <button
              onClick={() => handleTriggerPreset('reinventing_wheel')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>🔄</span> Reinventing Wheel
            </button>
            <button
              onClick={() => handleTriggerPreset('premature_optimization')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>⚡</span> Premature Optimization
            </button>
            <button
              onClick={() => handleTriggerPreset('scope_creep')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>📈</span> Scope Creep
            </button>
          </div>
        </div>
      </div>
    );
  }

  const config = RABBIT_HOLE_CONFIGS[currentAlert.type];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-5 space-y-4 shadow-xl transition-all`}>
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-slate-950/80 border border-slate-800 ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${config.badgeColor}`}>
                {config.name}
              </span>
              <span className="text-slate-500 font-mono text-xs">·</span>
              <span className="text-slate-400 font-mono text-xs">{currentAlert.detectedAt}</span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">
              {currentAlert.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-rose-300 bg-rose-950 px-2 py-1 rounded border border-rose-800">
            Drift Score: 48% (Cảnh Báo)
          </span>
        </div>
      </div>

      {/* Alert Body Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
            Tác Vụ Bị Nghi Ngờ Sa Đà
          </span>
          <p className="text-slate-200 font-medium leading-relaxed">
            {currentAlert.taskTitle}
          </p>
          <p className="text-slate-400 pt-1 text-[11px]">
            {currentAlert.reason}
          </p>
        </div>

        <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] uppercase font-mono text-amber-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Khuyến Nghị Gỡ Nghẽn Socratic
          </span>
          <p className="text-slate-300 leading-relaxed">
            {currentAlert.remedialAdvice}
          </p>
          <div className="pt-2 text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span>Nguyên tắc: Minimal Surface / Boundary Isolation</span>
          </div>
        </div>
      </div>

      {/* Success Notification if false positive granted */}
      {exemptionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>ĐÃ XÁC NHẬN FALSE POSITIVE THÀNH CÔNG:</strong> Quy tắc ngoại lệ đã được lưu vào bộ nhớ <code>calibrationMemory</code>. Rào chắn sẽ không ngắt mạch cho nhóm tác vụ này.
          </span>
        </div>
      )}

      {/* Action Bar: 1-Click "Báo False Positive" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-400">
          Nếu đây là hành vi chủ đích cần thiết cho dự án, bấm nút để ghi nhận ngoại lệ và đưa Dashboard về trạng thái an toàn:
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReportFalsePositive}
            disabled={isSubmitting || exemptionSuccess}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Đang Đồng Bộ Bộ Nhớ...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Báo False Positive & Nạp Ngoại Lệ (1-Chạm)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
