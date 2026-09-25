import React, { useState } from 'react';
import { Compass, CheckCircle2, AlertTriangle, ShieldX, ArrowRight, Lock, Zap } from 'lucide-react';

export interface TrajectoryMilestone {
  timeframe: string;
  prediction: string;
  indicator: string;
}

export interface TrajectoryPath {
  id: string;
  type: 'optimal' | 'drift' | 'bottleneck';
  name: string;
  probability: number;
  summary: string;
  consequence: string;
  milestones: TrajectoryMilestone[];
  color: string;
  borderColor: string;
  bgColor: string;
  badgeColor: string;
}

export interface PredictiveHorizonTrajectoriesProps {
  onLockOptimal?: () => void;
}

const DEFAULT_TRAJECTORIES: TrajectoryPath[] = [
  {
    id: 'path_optimal',
    type: 'optimal',
    name: '1. Optimal Flow Path (Lộ Trình Tối Ưu)',
    probability: 68,
    summary: 'Áp dụng Divide & Conquer, bẻ nhỏ vi bước 5-15 phút. Không over-engineering.',
    consequence: 'Hoàn tất bàn giao Module Auth trước thời hạn 30%, 100% test case pass, Zero Cognitive Drift.',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-600/70',
    bgColor: 'bg-emerald-950/20',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    milestones: [
      { timeframe: '+2 Giờ', prediction: 'Hoàn tất Pure Entity & Blacklist Interface khép kín.', indicator: '0 external imports trong domain' },
      { timeframe: '+24 Giờ', prediction: 'Tích hợp Redis TTL và vượt qua toàn bộ Boundary Unit Tests.', indicator: 'Code coverage > 95%' },
      { timeframe: 'Đích Đến', prediction: 'Hệ thống Auth sẵn sàng triển khai Production không nợ kỹ thuật.', indicator: 'Zero Drift Alert' },
    ],
  },
  {
    id: 'path_drift',
    type: 'drift',
    name: '2. Status Quo Drift Path (Nguy Cơ Lệch Hướng)',
    probability: 24,
    summary: 'Agent bắt đầu mở rộng scope phụ (quản lý avatar, xuất file log), trì hoãn commit vi bước.',
    consequence: 'Kéo dài thời gian hoàn thành gấp 2.5 lần, tăng chi phí token suy luận thêm 180%.',
    color: 'text-amber-400',
    borderColor: 'border-amber-600/60',
    bgColor: 'bg-amber-950/20',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    milestones: [
      { timeframe: '+2 Giờ', prediction: 'Agent viết thêm hàm xử lý session phức tạp ngoài phạm vi token.', indicator: 'Drift Score tăng lên 35%' },
      { timeframe: '+24 Giờ', prediction: 'Phát sinh lỗi conflict contract giữa các sub-agents.', indicator: 'Refactor tốn thêm 4 chu trình' },
      { timeframe: 'Đích Đến', prediction: 'Dự án chậm tiến độ, phát sinh nợ kiến trúc và code rườm rà.', indicator: 'Warning Alert liên tục' },
    ],
  },
  {
    id: 'path_bottleneck',
    type: 'bottleneck',
    name: '3. Bottleneck Crash Path (Điểm Nghẽn Đổ Vỡ)',
    probability: 8,
    summary: 'Over-engineering cài đặt Distributed Cluster khi chưa cần thiết, kẹt vòng lặp vô tận.',
    consequence: 'Circuit Breaker ngắt mạch khẩn cấp. Buộc Human Operator phải can thiệp thủ công.',
    color: 'text-rose-400',
    borderColor: 'border-rose-600/60',
    bgColor: 'bg-rose-950/20',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    milestones: [
      { timeframe: '+2 Giờ', prediction: 'Lỗi deadlock Redis và import vòng tròn (Circular Dependency).', indicator: 'Drift Score vượt 65%' },
      { timeframe: '+24 Giờ', prediction: 'Tê liệt phân tích (Analysis Paralysis), ngắt mạch an toàn.', indicator: 'Circuit Breaker Tripped' },
      { timeframe: 'Đích Đến', prediction: 'Vỡ kế hoạch sprint, thất thoát token và tài nguyên hệ thống.', indicator: 'Emergency Manual Halt' },
    ],
  },
];

export function PredictiveHorizonTrajectories({ onLockOptimal }: PredictiveHorizonTrajectoriesProps) {
  const [selectedPath, setSelectedPath] = useState<string>('path_optimal');
  const [lockedSuccess, setLockedSuccess] = useState(false);

  const handleLock = () => {
    setLockedSuccess(true);
    if (onLockOptimal) onLockOptimal();
    setTimeout(() => setLockedSuccess(false), 3000);
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Trực Quan Hóa 3 Dòng Thời Gian Tương Lai (Predictive Horizon)
            </h3>
            <p className="text-xs text-slate-400">
              Dự báo đa kịch bản giúp người dùng giữ quyền làm chủ nhận thức và điều hướng AI Agent
            </p>
          </div>
        </div>

        <button
          onClick={handleLock}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{lockedSuccess ? 'Đã Khóa Lộ Trình Tối Ưu!' : 'Khóa Lộ Trình Tối Ưu (Lock Flow)'}</span>
        </button>
      </div>

      {/* 3 Trajectories Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {DEFAULT_TRAJECTORIES.map((path) => (
          <div
            key={path.id}
            onClick={() => setSelectedPath(path.id)}
            className={`rounded-xl border p-4.5 cursor-pointer transition-all flex flex-col justify-between space-y-4 ${path.borderColor} ${path.bgColor} ${
              selectedPath === path.id ? 'ring-2 ring-indigo-500 shadow-xl' : 'hover:bg-slate-900'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${path.badgeColor}`}>
                  Xác suất: {path.probability}%
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {path.type === 'optimal' ? '🟢 Tối Ưu' : path.type === 'drift' ? '🟡 Nguy Cơ' : '🔴 Bế Tắc'}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">{path.name}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{path.summary}</p>
              </div>

              {/* Milestones timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                  Cột Mốc Diễn Biến:
                </div>
                {path.milestones.map((m, idx) => (
                  <div key={idx} className="bg-slate-950/70 p-2 rounded border border-slate-800/80 space-y-0.5">
                    <div className="flex justify-between text-[10px] font-mono text-indigo-300 font-bold">
                      <span>{m.timeframe}</span>
                      <span className="text-slate-400 font-normal">{m.indicator}</span>
                    </div>
                    <div className="text-xs text-slate-200">{m.prediction}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consequence Footer */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold mb-1">
                Hậu Quả Dự Báo:
              </div>
              <p className="text-xs text-slate-300 leading-snug">{path.consequence}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
