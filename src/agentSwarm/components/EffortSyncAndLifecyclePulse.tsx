import React, { useState, useEffect } from 'react';
import { Clock, Hourglass, Shield, AlertTriangle, Play, Pause, CheckCircle } from 'lucide-react';

export type LifecyclePhase = 'DECOMPOSING' | 'EXECUTING' | 'GUARDRAIL_CHECK' | 'HALT_EXECUTION' | 'IDLE';

export interface EffortSyncProps {
  currentPhase: LifecyclePhase;
  activeTaskTitle: string;
  estimatedMinutes: number;
  initialElapsedSeconds?: number;
  isSimulating?: boolean;
}

const LIFECYCLE_CONFIGS: Record<LifecyclePhase, {
  name: string;
  subtext: string;
  ledColor: string;
  ringColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  DECOMPOSING: {
    name: 'DECOMPOSING (Phân Rã)',
    subtext: 'PM Agent đang bẻ nhỏ mục tiêu thành vi bước 5-15 phút',
    ledColor: 'bg-cyan-400',
    ringColor: 'ring-cyan-500/50',
    textColor: 'text-cyan-300',
    bgColor: 'bg-cyan-950/20',
    borderColor: 'border-cyan-800/50',
  },
  EXECUTING: {
    name: 'EXECUTING (Thực Thi Vi Bước)',
    subtext: 'Coder Agent đang gõ code khép kín 1 vi bước tại một thời điểm',
    ledColor: 'bg-emerald-400',
    ringColor: 'ring-emerald-500/50',
    textColor: 'text-emerald-300',
    bgColor: 'bg-emerald-950/20',
    borderColor: 'border-emerald-800/50',
  },
  GUARDRAIL_CHECK: {
    name: 'GUARDRAIL CHECK (Quét Rào Chắn)',
    subtext: 'Socratic Guardrail đo Drift Score và kiểm tra nguy cơ ảo giác',
    ledColor: 'bg-amber-400',
    ringColor: 'ring-amber-500/50',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-950/20',
    borderColor: 'border-amber-800/50',
  },
  HALT_EXECUTION: {
    name: 'HALT_EXECUTION (Ngắt Mạch)',
    subtext: 'Circuit Breaker đã dừng Agent để bảo vệ an toàn hệ thống',
    ledColor: 'bg-rose-500',
    ringColor: 'ring-rose-500/60',
    textColor: 'text-rose-300',
    bgColor: 'bg-rose-950/30',
    borderColor: 'border-rose-800/70',
  },
  IDLE: {
    name: 'IDLE (Sẵn Sàng)',
    subtext: 'Đội quân Agent đang chờ nạp mục tiêu hoặc lệnh phân rã tiếp theo',
    ledColor: 'bg-slate-400',
    ringColor: 'ring-slate-500/30',
    textColor: 'text-slate-300',
    bgColor: 'bg-slate-900/60',
    borderColor: 'border-slate-800',
  },
};

export function EffortSyncAndLifecyclePulse({
  currentPhase = 'EXECUTING',
  activeTaskTitle = 'Viết hàm verifyRevocation() kiểm tra TTL Token',
  estimatedMinutes = 10,
  initialElapsedSeconds = 420, // 7 mins
  isSimulating = true,
}: EffortSyncProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isSimulating || isPaused || currentPhase === 'IDLE' || currentPhase === 'HALT_EXECUTION') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimulating, isPaused, currentPhase]);

  const estimatedSeconds = estimatedMinutes * 60;
  const progressRatio = Math.min(1.5, elapsedSeconds / estimatedSeconds);
  const progressPercent = Math.round((elapsedSeconds / estimatedSeconds) * 100);
  const isOverBudget = elapsedSeconds > estimatedSeconds;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}m ${remaining < 10 ? '0' : ''}${remaining}s`;
  };

  const config = LIFECYCLE_CONFIGS[currentPhase];

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-5 space-y-4 shadow-lg transition-all`}>
      {/* Top Bar: Lifecycle Pulse LED & Phase Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {/* Status Pulse LED with halo wave */}
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-950 border border-slate-800">
            <span className={`absolute w-4 h-4 rounded-full ${config.ledColor} opacity-75 animate-ping`} />
            <span className={`relative w-3.5 h-3.5 rounded-full ${config.ledColor} ring-4 ${config.ringColor}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold uppercase tracking-wider ${config.textColor}`}>
                Đèn Báo Vòng Đời Tác Tử (Status Pulse LED)
              </span>
              <span className="text-slate-500 font-mono text-xs">·</span>
              <span className="text-white text-xs font-bold">{config.name}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{config.subtext}</p>
          </div>
        </div>

        {/* Live Active Task Title */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden md:block">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Tác vụ đang chạy:</div>
            <div className="text-xs font-semibold text-slate-200 truncate max-w-[240px]">
              {activeTaskTitle}
            </div>
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isPaused ? 'Tiếp tục đếm nỗ lực' : 'Tạm dừng đếm'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Dual Effort Bar Comparison */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Hourglass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Thước Đo Nỗ Lực Thực Tế vs Ngân Sách Dự Toán:</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={`font-bold ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
              Đã dùng: {formatTime(elapsedSeconds)}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">
              Ngân sách vi bước: {estimatedMinutes} phút
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${isOverBudget ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-indigo-500/20 text-indigo-300'}`}>
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Visual Dual Comparison Progress Bar */}
        <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 relative">
          {/* 100% budget marker line */}
          <div className="absolute top-0 bottom-0 left-[66%] w-0.5 bg-slate-600 z-20" title="Ngưỡng 100% ngân sách"></div>

          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverBudget
                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600'
                : progressPercent > 70
                ? 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                : 'bg-indigo-500'
            }`}
            style={{ width: `${Math.min(100, (elapsedSeconds / (estimatedSeconds * 1.5)) * 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>0m (Bắt đầu)</span>
          <span>{Math.round(estimatedMinutes * 0.5)}m (Nửa chặng)</span>
          <span className="text-slate-300 font-bold">{estimatedMinutes}m (Ngân Sách Tối Đa 1 Vi Bước)</span>
          <span className="text-rose-400">{Math.round(estimatedMinutes * 1.5)}m (Quá Giờ)</span>
        </div>
      </div>

      {/* Over-budget Warning Advice if exceeded */}
      {isOverBudget && (
        <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-600 text-rose-200 text-xs flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>VƯỢT QUÁ KHUNG THỜI GIAN DỰ KIẾN ({progressPercent}%):</strong> Vi bước đang tốn quá 15 phút. Khuyến nghị kích hoạt <code>Decompose Nano-Step</code> để bẻ nhỏ tiếp thành các nhịp 2 phút.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
