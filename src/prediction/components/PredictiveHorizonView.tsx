import React from 'react';
import { ProjectContext } from '../../projectContext/entities/projectContext';
import { FutureTimeline } from '../valueObjects';
import { PredictionPayload } from '../mod';
import { AudioPlayerButton } from '../../components/AudioPlayerButton';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface PredictiveHorizonViewProps {
  currentContext: ProjectContext;
  prediction: PredictionPayload;
  onSelectOptimalTimeline: () => void;
  onRefreshPrediction: () => void;
  isLoading: boolean;
}

export const PredictiveHorizonView: React.FC<PredictiveHorizonViewProps> = ({
  currentContext,
  prediction,
  onSelectOptimalTimeline,
  onRefreshPrediction,
  isLoading,
}) => {
  const getTimelineBadge = (type: FutureTimeline['pathType']) => {
    switch (type) {
      case 'optimal':
        return {
          label: 'Kịch Bản Tối Ưu',
          className: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
          icon: Zap,
        };
      case 'drift':
        return {
          label: 'Kịch Bản Trôi Dạt',
          className: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
          icon: AlertCircle,
        };
      case 'bottleneck':
      default:
        return {
          label: 'Nguy Cơ Đổ Vỡ / Điểm Nghẽn',
          className: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
          icon: Flame,
        };
    }
  };

  const getMilestoneState = (state: string) => {
    switch (state) {
      case 'optimal':
        return 'text-emerald-400 border-l-2 border-emerald-500 bg-emerald-950/20';
      case 'warning':
        return 'text-amber-400 border-l-2 border-amber-500 bg-amber-950/20';
      case 'danger':
        return 'text-rose-400 border-l-2 border-rose-500 bg-rose-950/20';
      default:
        return 'text-slate-400 border-l-2 border-slate-700 bg-slate-900/20';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Visual Architectural Banner */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shadow-md">
        <div className="h-44 sm:h-52 w-full relative">
          <img
            src="/src/assets/images/symflowage_architecture_visual_1790137621456.jpg"
            alt="SymFlowAge Architectural Visual"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity filter contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Mô Hình Dự Báo Ngữ Cảnh</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-indigo-400">Tư Duy Lập Trình Viên</span>
              <span aria-hidden="true">·</span>
              <span>Thời hạn: {currentContext.deadlineHorizon}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {currentContext.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
              {currentContext.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <AudioPlayerButton
              textToSpeak={`Dự báo chiến lược cho ${currentContext.title}. ${prediction.strategicWhySummary}`}
              label="Nghe Dự Báo Voice"
            />
            <button
              onClick={onSelectOptimalTimeline}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors whitespace-nowrap shadow"
            >
              <span>Xem Vi Bước Thực Thi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Strategic Why Summary Box (Bản chất vấn đề thật) */}
      <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-3">
        <div className="p-2 rounded bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <span>🎯 Bản Chất Vấn Đề Thật Sự (Root Why)</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {prediction.strategicWhySummary}
          </p>
          <div className="text-[11px] text-slate-400 pt-1">
            <span className="text-slate-500 font-medium">Lời khuyên của hệ thống:</span> Giữ vững tư duy cá nhân, không nhảy cóc các bước cơ sở, kiểm chứng kết quả từng vi bước trước khi tiếp tục.
          </div>
        </div>
      </div>

      {/* 3 Future Timelines Comparison */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              3 Kịch Bản Tương Lai Dựa Trên Ngữ Cảnh
            </h2>
            <p className="text-xs text-slate-400">
              Mô phỏng xác suất và hệ quả khi người dùng lựa chọn chiến lược hành động khác nhau
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Độ chính xác mô hình: <span className="text-slate-300 font-mono tabular-nums">94.2%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {prediction.timelines.map((timeline: FutureTimeline) => {
            const badge = getTimelineBadge(timeline.pathType);
            const BadgeIcon = badge.icon;
            const isOptimal = timeline.pathType === 'optimal';

            return (
              <div
                key={timeline.id}
                className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                  isOptimal
                    ? 'bg-slate-900/90 border-indigo-700/60 ring-1 ring-indigo-500/20 shadow-md'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${badge.className}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold tabular-nums text-slate-200">
                        {timeline.probability}%
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">xác suất</span>
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">{timeline.name}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{timeline.summary}</p>
                  </div>

                  {/* Milestones in time */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Cột mốc dự báo:
                    </div>
                    {timeline.milestones.map((ms: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2 rounded text-xs space-y-0.5 ${getMilestoneState(
                          ms.state
                        )}`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span className="font-semibold">{ms.timeframe}</span>
                          <span className="text-[10px] opacity-80">{ms.keyIndicator}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{ms.prediction}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Consequence & Action */}
                <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2">
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-500 font-medium">Hệ quả dài hạn: </span>
                    {timeline.consequence}
                  </div>
                  {isOptimal ? (
                    <button
                      onClick={onSelectOptimalTimeline}
                      className="w-full py-1.5 px-3 rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1.5 shadow"
                    >
                      <span>Thực Thi Ngay (Chia Vi Bước)</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic text-center py-1">
                      Cần phòng tránh bằng phân rã vi bước & kỷ luật kiểm thử
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
