import React, { useState, useMemo } from 'react';
import { BehavioralInsight, ProjectContext, MicroStep } from '../../types';
import {
  Activity,
  Brain,
  Clock,
  Zap,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Flame,
  BarChart3,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { AudioPlayerButton } from '../AudioPlayerButton';

interface BehavioralAnalyticsViewProps {
  behavioralInsights: BehavioralInsight;
  currentContext: ProjectContext;
  microSteps: MicroStep[];
}

export const BehavioralAnalyticsView: React.FC<BehavioralAnalyticsViewProps> = ({
  behavioralInsights,
  currentContext,
  microSteps,
}) => {
  const [chartMetric, setChartMetric] = useState<'steps' | 'minutes'>('steps');

  const completedSteps = microSteps.filter((s) => s.completed);
  const pendingSteps = microSteps.filter((s) => !s.completed);
  const totalCount = microSteps.length;
  const completedCount = completedSteps.length;
  const totalMinutes = microSteps.reduce((acc, s) => acc + s.durationMinutes, 0);
  const completedMinutes = completedSteps.reduce((acc, s) => acc + s.durationMinutes, 0);
  const remainingMinutes = totalMinutes - completedMinutes;

  // Compute Burndown Data
  const burndownData = useMemo(() => {
    if (totalCount === 0) return [];

    // Base start point
    const points = [
      {
        name: 'Bắt đầu',
        label: 'Khởi đầu kế hoạch',
        idealSteps: totalCount,
        actualSteps: totalCount,
        idealMinutes: totalMinutes,
        actualMinutes: totalMinutes,
      },
    ];

    let currentRemainingSteps = totalCount;
    let currentRemainingMinutes = totalMinutes;

    microSteps.forEach((step, index) => {
      const stepIdx = index + 1;
      const idealRemainingSteps = Math.max(
        0,
        Number((totalCount - (totalCount / totalCount) * stepIdx).toFixed(1))
      );
      const idealRemainingMinutes = Math.max(
        0,
        Math.round(totalMinutes - (totalMinutes / totalCount) * stepIdx)
      );

      let stepActualSteps: number | null = null;
      let stepActualMinutes: number | null = null;

      // If step is completed, burn down the remaining work
      if (step.completed) {
        currentRemainingSteps -= 1;
        currentRemainingMinutes -= step.durationMinutes;
        stepActualSteps = currentRemainingSteps;
        stepActualMinutes = currentRemainingMinutes;
      } else if (index === completedCount) {
        // Current frontier point
        stepActualSteps = currentRemainingSteps;
        stepActualMinutes = currentRemainingMinutes;
      }

      points.push({
        name: `B${step.order}`,
        label: `Bước ${step.order}: ${step.title.slice(0, 24)}...`,
        idealSteps: idealRemainingSteps,
        actualSteps: stepActualSteps !== null ? stepActualSteps : (undefined as any),
        idealMinutes: idealRemainingMinutes,
        actualMinutes: stepActualMinutes !== null ? stepActualMinutes : (undefined as any),
      });
    });

    return points;
  }, [microSteps, totalCount, totalMinutes, completedCount]);

  // Velocity calculations
  const velocityStatus = useMemo(() => {
    if (totalCount === 0) {
      return {
        label: 'Chưa có bước',
        description: 'Chưa có vi bước nào trong kế hoạch.',
        color: 'text-slate-400',
        badgeBg: 'bg-slate-950 border-slate-800 text-slate-400',
        icon: Clock,
      };
    }
    const idealCompleted = Math.round((totalCount / 2)); // benchmark midpoint
    const delta = completedCount - (totalCount - (burndownData[completedCount]?.idealSteps ?? totalCount));

    if (completedCount === totalCount) {
      return {
        label: 'Hoàn thành 100% mục tiêu',
        description: 'Đã hoàn tất tất cả vi bước nguyên tử.',
        color: 'text-emerald-400',
        badgeBg: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300',
        icon: CheckCircle2,
      };
    }

    if (completedCount >= 2 && remainingMinutes <= totalMinutes * 0.4) {
      return {
        label: 'Vận tốc cao (Ahead of Curve)',
        description: 'Tiến độ thực thi nhanh hơn kế hoạch lý tưởng.',
        color: 'text-emerald-400',
        badgeBg: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300',
        icon: TrendingUp,
      };
    }

    if (completedCount > 0) {
      return {
        label: 'Ổn định (On Track)',
        description: 'Nhịp độ hoàn thành vi bước đều đặn, duy trì dòng chảy.',
        color: 'text-indigo-400',
        badgeBg: 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300',
        icon: Zap,
      };
    }

    return {
      label: 'Sẵn sàng khởi động',
      description: 'Chưa có bước nào được đánh dấu hoàn thành. Hãy bắt đầu vi bước đầu tiên (10 phút).',
      color: 'text-amber-400',
      badgeBg: 'bg-amber-950/60 border-amber-800/60 text-amber-300',
      icon: Clock,
    };
  }, [completedCount, totalCount, remainingMinutes, totalMinutes, burndownData]);

  const VelocityIcon = velocityStatus.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-indigo-400 font-semibold uppercase tracking-wider">
              Phân Tích Hành Vi & Nhận Thức
            </span>
            <span aria-hidden="true">·</span>
            <span>Biểu Đồ Burndown & Vận Tốc Vi Bước</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Chỉ Số Vận Tốc Nhận Thức & Biểu Đồ Burndown
          </h2>
          <p className="text-xs text-slate-300">
            Trực quan hóa tốc độ đốt cháy công việc (Burndown Velocity) giúp triệt tiêu cảm giác mơ hồ và đo lường tiến độ thực nghiệm.
          </p>
        </div>

        <AudioPlayerButton
          textToSpeak={`Phân tích hành vi. Đã hoàn thành ${completedCount} trên tổng số ${totalCount} vi bước. Vận tốc hiện tại: ${velocityStatus.label}. Hiệu quả tập trung đạt ${behavioralInsights.focusEfficiencyScore}%.`}
          label="Nghe Báo Cáo Hành Vi"
        />
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Thời gian tập trung thực</span>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {completedMinutes} <span className="text-xs font-normal text-slate-500">/ {totalMinutes}m</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Còn lại ~{remainingMinutes} phút ({pendingSteps.length} bước)
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Điểm hiệu suất tập trung</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {behavioralInsights.focusEfficiencyScore}%
          </div>
          <p className="text-[11px] text-slate-500">Duy trì trong ngưỡng tối ưu</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Ma sát ra quyết định</span>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {behavioralInsights.decisionFrictionIndex}
            <span className="text-xs font-normal text-slate-500">/100</span>
          </div>
          <p className="text-[11px] text-slate-500">Mức độ do dự khi chọn hướng đi</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Trạng thái vận tốc</span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <VelocityIcon className={`w-4 h-4 ${velocityStatus.color}`} />
            <span className="text-sm font-bold text-slate-200 truncate">
              {completedCount}/{totalCount} Bước
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">{velocityStatus.label}</p>
        </div>
      </div>

      {/* BURNDOWN VELOCITY CHART SECTION (D3 / Recharts) */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Biểu Đồ Burndown Vi Bước (Micro-Steps Burndown)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              So sánh đường đốt việc thực tế (Actual) với đường tiến độ lý tưởng (Ideal Guideline)
            </p>
          </div>

          {/* Metric Selector & Velocity Pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded bg-slate-950 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setChartMetric('steps')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  chartMetric === 'steps'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Số Bước Còn Lại
              </button>
              <button
                onClick={() => setChartMetric('minutes')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  chartMetric === 'minutes'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Thời Lượng (Phút)
              </button>
            </div>
          </div>
        </div>

        {/* Velocity Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded bg-slate-950/70 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold ${velocityStatus.badgeBg}`}
            >
              <VelocityIcon className="w-3.5 h-3.5" />
              <span>{velocityStatus.label}</span>
            </span>
            <span className="text-slate-400">{velocityStatus.description}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px] shrink-0">
            <div>
              Đã đốt:{' '}
              <span className="text-emerald-400 font-bold">
                {chartMetric === 'steps' ? completedCount : completedMinutes}
              </span>{' '}
              {chartMetric === 'steps' ? 'bước' : 'phút'}
            </div>
            <div>
              Còn lại:{' '}
              <span className="text-indigo-400 font-bold">
                {chartMetric === 'steps' ? totalCount - completedCount : remainingMinutes}
              </span>{' '}
              {chartMetric === 'steps' ? 'bước' : 'phút'}
            </div>
          </div>
        </div>

        {/* Recharts LineChart */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={burndownData}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            >
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0]?.payload;
                    return (
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shadow-xl text-xs space-y-1.5 max-w-xs">
                        <div className="font-bold text-white border-b border-slate-800 pb-1">
                          {dataPoint?.label || label}
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex items-center justify-between gap-3 text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-0.5 bg-slate-500 inline-block border-t border-dashed" />
                              Lý tưởng (Ideal):
                            </span>
                            <span className="font-bold text-slate-200">
                              {chartMetric === 'steps'
                                ? `${dataPoint?.idealSteps} bước`
                                : `${dataPoint?.idealMinutes} phút`}
                            </span>
                          </div>

                          {dataPoint?.actualSteps !== undefined && (
                            <div className="flex items-center justify-between gap-3 text-indigo-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                                Thực tế (Actual):
                              </span>
                              <span className="font-bold text-indigo-300">
                                {chartMetric === 'steps'
                                  ? `${dataPoint?.actualSteps} bước còn lại`
                                  : `${dataPoint?.actualMinutes} phút còn lại`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
                formatter={(value) => (
                  <span className="text-slate-300 text-xs mr-2">
                    {value === 'ideal' ? 'Đường Lý Tưởng (Linear Baseline)' : 'Thực Tế Còn Lại (Actual Burndown)'}
                  </span>
                )}
              />
              {/* Ideal Line (Dashed baseline) */}
              <Line
                name="ideal"
                type="linear"
                dataKey={chartMetric === 'steps' ? 'idealSteps' : 'idealMinutes'}
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={{ r: 3, fill: '#64748b' }}
                activeDot={{ r: 5 }}
              />
              {/* Actual Line (Solid vibrant line with glowing dots) */}
              <Line
                name="actual"
                type="monotone"
                dataKey={chartMetric === 'steps' ? 'actualSteps' : 'actualMinutes'}
                stroke="#818cf8"
                strokeWidth={3}
                connectNulls={false}
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#e0e7ff' }}
                activeDot={{ r: 6, fill: '#a5b4fc', stroke: '#ffffff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Explanatory Note */}
        <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-800/60 pt-2.5">
          <span>
            💡 <strong>Mẹo vận tốc:</strong> Nếu đường Thực tế nằm dưới đường Lý tưởng, bạn đang vượt tiến độ. Nếu nằm trên, hãy cân nhắc phân rã tiếp các bước thành nano-step 2 phút.
          </span>
          <span className="text-slate-600 hidden sm:inline">Cập nhật theo thời gian thực</span>
        </div>
      </div>

      {/* Observed Behavioral Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Patterns */}
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Mẫu Hình Hành Vi Ghi Nhận (Behavioral Patterns)
            </h3>
          </div>
          <div className="space-y-2">
            {behavioralInsights.observedPatterns.map((pattern, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{pattern}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cognitive Recommendations */}
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Gợi Ý Cải Thiện Thói Quen (Actionable Advice)
            </h3>
          </div>
          <div className="space-y-2">
            {behavioralInsights.cognitiveRecommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-slate-950 border border-slate-800/80 text-xs text-slate-200 flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Context Behavioral Flags */}
      <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Cờ Hành Vi Đang Được Giám Sát Trong Ngữ Cảnh:
        </span>
        <div className="flex flex-wrap gap-2 text-xs">
          {currentContext.behavioralFlags.map((flag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono"
            >
              #{flag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

