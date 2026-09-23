import React, { useState } from 'react';
import { BottleneckItem, RiskMatrixItem, BehavioralInsight, ProjectContext } from '../../types';
import {
  AlertTriangle,
  Flame,
  ShieldCheck,
  Brain,
  Activity,
  Layers,
  CheckCircle2,
  HelpCircle,
  Telescope,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AudioPlayerButton } from '../AudioPlayerButton';

interface BottleneckRadarViewProps {
  bottlenecks: BottleneckItem[];
  riskMatrix: RiskMatrixItem[];
  behavioralInsights: BehavioralInsight;
  currentContext: ProjectContext;
  onJumpToWhyFirst: () => void;
}

export const BottleneckRadarView: React.FC<BottleneckRadarViewProps> = ({
  bottlenecks,
  riskMatrix,
  behavioralInsights,
  currentContext,
  onJumpToWhyFirst,
}) => {
  const [filterScope, setFilterScope] = useState<'all' | 'short_term' | 'long_term'>('all');

  const getSeverityStyle = (sev: BottleneckItem['severity']) => {
    switch (sev) {
      case 'critical':
        return {
          label: 'Nghiêm Trọng',
          badge: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
          dot: 'bg-rose-500',
        };
      case 'moderate':
        return {
          label: 'Trung Bình',
          badge: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
          dot: 'bg-amber-500',
        };
      case 'low':
        return {
          label: 'Nhẹ',
          badge: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
          dot: 'bg-emerald-500',
        };
    }
  };

  const getRiskLevelColor = (level: 'High' | 'Medium' | 'Low') => {
    switch (level) {
      case 'High':
        return 'text-rose-400 font-semibold';
      case 'Medium':
        return 'text-amber-400';
      case 'Low':
        return 'text-emerald-400';
    }
  };

  const getLongTermRiskBadge = (type?: BottleneckItem['longTermRiskType']) => {
    switch (type) {
      case 'goal_drift':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/50">
            🎯 Goal Drift (Lệch Mục Tiêu)
          </span>
        );
      case 'milestone_slip':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-700/50">
            🗓️ Milestone Slip (Trễ Cột Mốc)
          </span>
        );
      case 'burnout_risk':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">
            ⚡ Burnout Risk (Quá Tải)
          </span>
        );
      case 'skill_plateau':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-700/50">
            📈 Skill Plateau
          </span>
        );
      case 'priority_conflict':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-950/80 text-orange-300 border border-orange-700/50">
            ⚖️ Priority Conflict
          </span>
        );
      default:
        return null;
    }
  };

  const filteredBottlenecks = bottlenecks.filter((item) => {
    if (filterScope === 'all') return true;
    if (filterScope === 'long_term') return item.scope === 'long_term';
    return item.scope !== 'long_term';
  });

  const filteredRiskMatrix = riskMatrix.filter((item) => {
    if (filterScope === 'all') return true;
    if (filterScope === 'long_term') return item.scope === 'long_term';
    return item.scope !== 'long_term';
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overview & Behavioral Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Focus Efficiency */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Hiệu Quả Tập Trung</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {behavioralInsights.focusEfficiencyScore}%
          </div>
          <p className="text-[10px] text-slate-500">
            Tỷ lệ hoàn thành vi bước chuẩn
          </p>
        </div>

        {/* Metric 2: Long-term Consistency */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Độ Bám Mục Tiêu Dài Hạn</span>
            <Telescope className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
            {behavioralInsights.longTermConsistencyScore ?? 84}%
          </div>
          <p className="text-[10px] text-slate-500">
            Tỷ lệ bám sát các cột mốc quý
          </p>
        </div>

        {/* Metric 3: Decision Friction */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ma Sát Ra Quyết Định</span>
            <Brain className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
            {behavioralInsights.decisionFrictionIndex}
            <span className="text-xs font-normal text-slate-500 ml-1">/ 100</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Mức độ do dự nhận thức
          </p>
        </div>

        {/* Metric 4: Procrastination Risk */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Nguy Cơ Trì Hoãn</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-white">
            {behavioralInsights.procrastinationRisk}
          </div>
          <p className="text-[10px] text-slate-500">
            Chia nhỏ ≤ 10 phút để giữ đà
          </p>
        </div>
      </div>

      {/* FILTER TABS: All vs Short-term vs Long-term */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Bộ lọc rủi ro:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            <button
              onClick={() => setFilterScope('all')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                filterScope === 'all'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất Cả ({bottlenecks.length})
            </button>
            <button
              onClick={() => setFilterScope('short_term')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                filterScope === 'short_term'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ Ngắn Hạn Hôm Nay ({bottlenecks.filter((b) => b.scope !== 'long_term').length})
            </button>
            <button
              onClick={() => setFilterScope('long_term')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                filterScope === 'long_term'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔭 Dài Hạn 6–12 Tháng ({bottlenecks.filter((b) => b.scope === 'long_term').length})
            </button>
          </div>
        </div>

        <AudioPlayerButton
          textToSpeak={`Phân tích rủi ro và điểm nghẽn hệ thống. Phát hiện ${filteredBottlenecks.length} điểm cần lưu ý. Điểm nghẽn quan trọng: ${filteredBottlenecks[0]?.title || ''}. ${filteredBottlenecks[0]?.counterMeasure || ''}`}
          label="Nghe Báo Cáo Voice"
        />
      </div>

      {/* SYSTEM BOTTLENECKS SECTION */}
      <div className="space-y-3">
        <div className="space-y-3">
          {filteredBottlenecks.map((item) => {
            const sev = getSeverityStyle(item.severity);
            const isLongTerm = item.scope === 'long_term';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border space-y-3 shadow-sm transition-colors ${
                  isLongTerm
                    ? 'bg-slate-900/90 border-indigo-800/60 hover:border-indigo-700'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`w-2 h-2 rounded-full ${sev.dot} shrink-0`} />
                    <h3 className="text-sm font-bold text-white tracking-tight">{item.title}</h3>
                    {getLongTermRiskBadge(item.longTermRiskType)}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${sev.badge}`}
                    >
                      {sev.label}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {isLongTerm ? 'Tầng: Dài Hạn' : `Loại: ${item.category}`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Symptom */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      🔍 Triệu Chứng Nhận Biết:
                    </span>
                    <p className="text-slate-300 leading-relaxed">{item.symptom}</p>
                  </div>

                  {/* Root Cause Why */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
                      🎯 Nguyên Nhân Gốc Rễ (Why):
                    </span>
                    <p className="text-slate-300 leading-relaxed">{item.rootCauseWhy}</p>
                  </div>
                </div>

                {/* CounterMeasure action */}
                <div className="p-3 rounded bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                      ⚡ Giải Pháp Gỡ Tắc & Phòng Ngừa:
                    </span>
                    <p className="text-slate-200">{item.counterMeasure}</p>
                  </div>
                  <button
                    onClick={onJumpToWhyFirst}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium whitespace-nowrap shrink-0 transition-colors"
                  >
                    Hỏi Cố Vấn Why
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RISK MATRIX TABLE */}
      <div className="space-y-3 pt-2">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Ma Trận Rủi Ro Kỹ Thuật & Lộ Trình (Risk Matrix)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Đánh giá xác suất (Probability) và tác động (Impact) để chuẩn bị phương án dự phòng
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Mối Nguy Cơ</th>
                <th className="py-2.5 px-3">Phạm Vi</th>
                <th className="py-2.5 px-3">Xác Suất</th>
                <th className="py-2.5 px-3">Tác Động</th>
                <th className="py-2.5 px-4">Biện Pháp Phòng Ngừa</th>
                <th className="py-2.5 px-4">Phương Án Ứng Phó (Contingency)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRiskMatrix.map((rm) => (
                <tr key={rm.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-200">{rm.risk}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        rm.scope === 'long_term'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rm.scope === 'long_term' ? 'Dài hạn' : 'Ngắn hạn'}
                    </span>
                  </td>
                  <td className={`py-3 px-3 tabular-nums ${getRiskLevelColor(rm.probability)}`}>
                    {rm.probability}
                  </td>
                  <td className={`py-3 px-3 tabular-nums ${getRiskLevelColor(rm.impact)}`}>
                    {rm.impact}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{rm.prevention}</td>
                  <td className="py-3 px-4 text-amber-300/90">{rm.contingency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

