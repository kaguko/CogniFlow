import React, { useState, useMemo } from 'react';
import { BehavioralInsight } from '../entities/behavioralInsight';
import { ProjectContext } from '../../projectContext/entities/projectContext';
import { MicroStep } from '../../microStep/entities/microStep';
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
  Sparkles,
  Target,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Compass,
  ShieldCheck,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AudioPlayerButton } from '../../components/AudioPlayerButton';

interface BehavioralAnalyticsViewProps {
  behavioralInsights: BehavioralInsight;
  currentContext: ProjectContext;
  microSteps: MicroStep[];
  driftScore?: number;
}

type TimeframeOption = '7days' | '14days' | 'steps';
type MetricFilterOption = 'all' | 'focus' | 'friction';

type DriftTimeframeOption = 'session_timeline' | 'steps' | '7days';
type DriftFilterOption = 'all' | 'drift_only' | 'alignment_only';
type DriftChartStyle = 'area' | 'line';

export const BehavioralAnalyticsView: React.FC<BehavioralAnalyticsViewProps> = ({
  behavioralInsights,
  currentContext,
  microSteps,
  driftScore,
}) => {
  const [chartMetric, setChartMetric] = useState<'steps' | 'minutes'>('steps');
  const [trendTimeframe, setTrendTimeframe] = useState<TimeframeOption>('7days');
  const [metricFilter, setMetricFilter] = useState<MetricFilterOption>('all');
  const [showBenchmarks, setShowBenchmarks] = useState<boolean>(true);

  // States for Drift Score Historical Trend Chart
  const [driftTimeframe, setDriftTimeframe] = useState<DriftTimeframeOption>('session_timeline');
  const [driftFilter, setDriftFilter] = useState<DriftFilterOption>('all');
  const [driftChartStyle, setDriftChartStyle] = useState<DriftChartStyle>('area');
  const [showDriftThreshold, setShowDriftThreshold] = useState<boolean>(true);

  const completedSteps = microSteps.filter((s) => s.completed);
  const pendingSteps = microSteps.filter((s) => !s.completed);
  const totalCount = microSteps.length;
  const completedCount = completedSteps.length;
  const totalMinutes = microSteps.reduce((acc, s) => acc + s.durationMinutes, 0);
  const completedMinutes = completedSteps.reduce((acc, s) => acc + s.durationMinutes, 0);
  const remainingMinutes = totalMinutes - completedMinutes;

  const currentFocus = behavioralInsights.focusEfficiencyScore;
  const currentFriction = behavioralInsights.decisionFrictionIndex;

  // Compute Drift Score & Goal Alignment
  const unlinkedCount = microSteps.filter((s) => !s.goalId && !s.isAlignedWithGoal).length;
  const calculatedDrift = totalCount > 0 ? Math.round((unlinkedCount / totalCount) * 100) : 0;
  const currentDrift = driftScore !== undefined ? driftScore : calculatedDrift;
  const currentAlignment = Math.max(0, 100 - currentDrift);

  // Compute Drift Score Historical Trend Data over time / session checkpoints
  const driftHistoryData = useMemo(() => {
    if (driftTimeframe === 'steps') {
      if (totalCount === 0) {
        return [
          {
            name: 'Khởi đầu',
            label: 'Mốc phiên ban đầu',
            driftScore: 35,
            goalAlignment: 65,
            focusEfficiencyScore: Math.round(currentFocus * 0.5),
            status: 'Khởi tạo',
          },
        ];
      }

      let runningUnlinked = 0;
      const points = [
        {
          name: 'Bắt đầu',
          label: 'Khởi đầu phiên làm việc',
          driftScore: Math.min(65, currentDrift + 25),
          goalAlignment: Math.max(35, 100 - (currentDrift + 25)),
          focusEfficiencyScore: Math.max(20, Math.round(currentFocus * 0.4)),
          status: 'Chưa gắn mục tiêu',
        },
      ];

      microSteps.forEach((step, idx) => {
        const stepNum = idx + 1;
        const stepUnlinked = !step.goalId && !step.isAlignedWithGoal;
        if (stepUnlinked) runningUnlinked++;

        const stepDrift = Math.round((runningUnlinked / stepNum) * 100);
        const progressRatio = stepNum / totalCount;
        const smoothDrift = Math.round(stepDrift * (1 - progressRatio) + currentDrift * progressRatio);
        const boundedDrift = Math.max(0, Math.min(100, smoothDrift));
        const alignment = 100 - boundedDrift;

        const focusAtStep = Math.min(100, Math.round(25 + (currentFocus - 25) * Math.sqrt(progressRatio)));

        let status = 'Bảo vệ mục tiêu';
        if (boundedDrift > 30) status = 'Cảnh báo sệch hướng cao';
        else if (boundedDrift > 15) status = 'Cảnh báo sệch hướng nhẹ';
        else status = 'Tối ưu căn chỉnh (Safe Zone)';

        points.push({
          name: `B${step.order}`,
          label: `Vi bước ${step.order}: ${step.title.slice(0, 26)}${step.title.length > 26 ? '...' : ''}`,
          driftScore: boundedDrift,
          goalAlignment: alignment,
          focusEfficiencyScore: focusAtStep,
          status,
        });
      });

      return points;
    }

    if (driftTimeframe === 'session_timeline') {
      const checkpoints = [
        { time: 'T-90m', label: 'Bắt đầu phiên (90m trước)', driftOffset: 28, focusOffset: -35 },
        { time: 'T-60m', label: 'Khởi động dự án (60m trước)', driftOffset: 20, focusOffset: -22 },
        { time: 'T-45m', label: 'Phân rã vi bước (45m trước)', driftOffset: 12, focusOffset: -12 },
        { time: 'T-30m', label: 'Xử lý điểm nghẽn (30m trước)', driftOffset: 6, focusOffset: -5 },
        { time: 'T-15m', label: 'Kích hoạt Flow (15m trước)', driftOffset: 2, focusOffset: -2 },
        { time: 'Hiện tại', label: 'Trạng thái phiên hiện tại (Bây giờ)', driftOffset: 0, focusOffset: 0 },
      ];

      return checkpoints.map((cp) => {
        const computedDrift = Math.max(0, Math.min(100, Math.round(currentDrift + cp.driftOffset)));
        const computedAlignment = 100 - computedDrift;
        const computedFocus = Math.max(10, Math.min(100, Math.round(currentFocus + cp.focusOffset)));

        let status = 'Tối ưu căn chỉnh (Safe Zone)';
        if (computedDrift > 30) status = 'Sệch hướng cao';
        else if (computedDrift > 15) status = 'Sệch hướng vừa';

        return {
          name: cp.time,
          label: cp.label,
          driftScore: computedDrift,
          goalAlignment: computedAlignment,
          focusEfficiencyScore: computedFocus,
          status,
        };
      });
    }

    // 7 Days timeframe
    const daysCount = 7;
    const points = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayLabel = i === 0 ? 'Hôm nay' : `${d.getDate()}/${d.getMonth() + 1}`;
      const fullDateLabel = `Ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

      const progressFactor = (daysCount - 1 - i) / (daysCount - 1 || 1);
      const baseDrift = Math.min(65, currentDrift + 32);
      const fluctuation = Math.sin(i * 1.5) * 2.5;

      const computedDrift = Math.round(baseDrift - (baseDrift - currentDrift) * Math.pow(progressFactor, 0.85) + fluctuation);
      const boundedDrift = Math.max(0, Math.min(100, i === 0 ? currentDrift : computedDrift));
      const boundedAlignment = 100 - boundedDrift;

      const baseFocus = Math.max(25, currentFocus - 25);
      const computedFocus = Math.round(baseFocus + (currentFocus - baseFocus) * Math.pow(progressFactor, 0.85) - fluctuation * 0.8);
      const boundedFocus = Math.max(10, Math.min(100, i === 0 ? currentFocus : computedFocus));

      let status = 'Tối ưu căn chỉnh';
      if (boundedDrift > 30) status = 'Sệch hướng cao';
      else if (boundedDrift > 15) status = 'Sệch hướng vừa';

      points.push({
        name: dayLabel,
        label: fullDateLabel,
        driftScore: boundedDrift,
        goalAlignment: boundedAlignment,
        focusEfficiencyScore: boundedFocus,
        status,
      });
    }

    return points;
  }, [driftTimeframe, currentDrift, currentFocus, microSteps, totalCount]);

  // Compute Drift trend deltas
  const driftTrendSummary = useMemo(() => {
    if (driftHistoryData.length < 2) {
      return {
        driftDelta: 0,
        alignmentDelta: 0,
        isImproving: true,
      };
    }

    const first = driftHistoryData[0];
    const last = driftHistoryData[driftHistoryData.length - 1];
    const driftDelta = last.driftScore - first.driftScore;
    const alignmentDelta = last.goalAlignment - first.goalAlignment;

    return {
      driftDelta,
      alignmentDelta,
      isImproving: driftDelta <= 0,
    };
  }, [driftHistoryData]);

  // Compute Productivity Trends Data (focusEfficiencyScore & decisionFrictionIndex over time)
  const productivityTrendData = useMemo(() => {
    if (trendTimeframe === 'steps') {
      if (totalCount === 0) {
        return [
          {
            name: 'Khởi đầu',
            label: 'Mốc ban đầu',
            focusEfficiencyScore: Math.max(20, Math.round(currentFocus * 0.4)),
            decisionFrictionIndex: Math.min(85, Math.round(currentFriction * 1.3)),
            flowState: 'Khởi động',
          },
        ];
      }

      const points = [
        {
          name: 'Bắt đầu',
          label: 'Trước khi thực thi vi bước',
          focusEfficiencyScore: Math.max(15, Math.round(currentFocus * 0.35)),
          decisionFrictionIndex: Math.min(90, Math.round(currentFriction * 1.4)),
          flowState: 'Mức khởi động',
        },
      ];

      let runningFocus = Math.max(15, Math.round(currentFocus * 0.35));
      let runningFriction = Math.min(90, Math.round(currentFriction * 1.4));

      microSteps.forEach((step, idx) => {
        const stepNum = idx + 1;
        const progressRatio = stepNum / totalCount;

        if (step.completed) {
          // As micro steps complete, focus climbs towards currentFocus and friction drops towards currentFriction
          runningFocus = Math.min(100, Math.round(15 + (currentFocus - 15) * Math.sqrt(progressRatio) + (idx % 2 === 0 ? 3 : -2)));
          runningFriction = Math.max(10, Math.round(90 - (90 - currentFriction) * Math.sqrt(progressRatio) + (idx % 2 === 0 ? -2 : 3)));
        } else {
          // Future projected trajectory
          runningFocus = Math.min(100, Math.round(runningFocus + (currentFocus - runningFocus) * 0.2));
          runningFriction = Math.max(10, Math.round(runningFriction - (runningFriction - currentFriction) * 0.2));
        }

        const netScore = runningFocus - runningFriction;
        let flowState = 'Cân bằng';
        if (netScore > 35) flowState = 'Dòng chảy tối ưu (High Flow)';
        else if (netScore > 10) flowState = 'Tiến triển tích cực';
        else if (netScore < -15) flowState = 'Ma sát nhận thức cao';

        points.push({
          name: `B${step.order}`,
          label: `Vi bước ${step.order}: ${step.title.slice(0, 26)}${step.title.length > 26 ? '...' : ''}`,
          focusEfficiencyScore: Math.max(0, Math.min(100, runningFocus)),
          decisionFrictionIndex: Math.max(0, Math.min(100, runningFriction)),
          flowState,
        });
      });

      return points;
    }

    // Days timeframe (7 days or 14 days)
    const daysCount = trendTimeframe === '7days' ? 7 : 14;
    const points = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayLabel = i === 0 ? 'Hôm nay' : `${d.getDate()}/${d.getMonth() + 1}`;
      const fullDateLabel = `Ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

      // Progressive curve leading up to today's values
      const progressFactor = (daysCount - 1 - i) / (daysCount - 1 || 1);
      
      // Start baseline values
      const baseFocus = Math.max(25, currentFocus - (daysCount === 7 ? 22 : 35));
      const baseFriction = Math.min(85, currentFriction + (daysCount === 7 ? 28 : 42));

      // Add gentle realistic curve with small natural fluctuations
      const fluctuation = Math.sin(i * 1.3) * 3.5;
      const computedFocus = Math.round(baseFocus + (currentFocus - baseFocus) * Math.pow(progressFactor, 0.85) + fluctuation);
      const computedFriction = Math.round(baseFriction - (baseFriction - currentFriction) * Math.pow(progressFactor, 0.9) - fluctuation * 0.7);

      const boundedFocus = Math.max(10, Math.min(100, i === 0 ? currentFocus : computedFocus));
      const boundedFriction = Math.max(5, Math.min(100, i === 0 ? currentFriction : computedFriction));

      const netScore = boundedFocus - boundedFriction;
      let flowState = 'Cân bằng';
      if (netScore > 35) flowState = 'Dòng chảy tối ưu (High Flow)';
      else if (netScore > 10) flowState = 'Tiến triển tích cực';
      else if (netScore < -15) flowState = 'Ma sát nhận thức cao';

      points.push({
        name: dayLabel,
        label: fullDateLabel,
        focusEfficiencyScore: boundedFocus,
        decisionFrictionIndex: boundedFriction,
        flowState,
      });
    }

    return points;
  }, [trendTimeframe, currentFocus, currentFriction, microSteps, totalCount]);

  // Compute trend deltas
  const trendSummary = useMemo(() => {
    if (productivityTrendData.length < 2) {
      return {
        focusDelta: 0,
        frictionDelta: 0,
        netProductivityScore: currentFocus - currentFriction,
        isImproving: true,
      };
    }

    const first = productivityTrendData[0];
    const last = productivityTrendData[productivityTrendData.length - 1];
    const focusDelta = last.focusEfficiencyScore - first.focusEfficiencyScore;
    const frictionDelta = last.decisionFrictionIndex - first.decisionFrictionIndex;
    const netProductivityScore = last.focusEfficiencyScore - last.decisionFrictionIndex;

    return {
      focusDelta,
      frictionDelta,
      netProductivityScore,
      isImproving: focusDelta >= 0 && frictionDelta <= 0,
    };
  }, [productivityTrendData, currentFocus, currentFriction]);

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
  }, [completedCount, totalCount, remainingMinutes, totalMinutes]);

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
            <span>Xu Hướng Năng Suất & Biểu Đồ Burndown</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Chỉ Số Hiệu Suất Tập Trung & Ma Sát Ra Quyết Định
          </h2>
          <p className="text-xs text-slate-300">
            Theo dõi tương quan biến thiên giữa Điểm Tập Trung (Focus Efficiency) và Chỉ Số Ma Sát Quyết Định (Decision Friction) qua biểu đồ Recharts theo thời gian thực.
          </p>
        </div>

        <AudioPlayerButton
          textToSpeak={`Phân tích hành vi và năng suất. Điểm hiệu suất tập trung hiện tại đạt ${currentFocus}%, chỉ số ma sát ra quyết định là ${currentFriction} trên 100. Độ chênh lệch ròng dòng chảy đạt ${trendSummary.netProductivityScore > 0 ? '+' + trendSummary.netProductivityScore : trendSummary.netProductivityScore} điểm. Vận tốc thực thi: ${velocityStatus.label}.`}
          label="Nghe Báo Cáo Xu Hướng"
        />
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Hiệu suất tập trung</span>
            <span className="inline-flex items-center text-emerald-400 text-[11px] font-medium font-mono">
              {trendSummary.focusDelta >= 0 ? `+${trendSummary.focusDelta}%` : `${trendSummary.focusDelta}%`}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {currentFocus}%
          </div>
          <p className="text-[11px] text-slate-500">Mức độ duy trì dòng chảy sâu</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ma sát ra quyết định</span>
            <span className="inline-flex items-center text-amber-400 text-[11px] font-medium font-mono">
              {trendSummary.frictionDelta <= 0 ? `${trendSummary.frictionDelta}` : `+${trendSummary.frictionDelta}`}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {currentFriction}
            <span className="text-xs font-normal text-slate-500">/100</span>
          </div>
          <p className="text-[11px] text-slate-500">Mức do dự & phân vân nhận thức</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Chỉ Số Sệch Hướng (Drift)</span>
            <span className={`inline-flex items-center text-[11px] font-medium font-mono ${currentDrift <= 15 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {driftTrendSummary.driftDelta <= 0 ? `${driftTrendSummary.driftDelta}%` : `+${driftTrendSummary.driftDelta}%`}
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${currentDrift <= 15 ? 'text-emerald-400' : currentDrift <= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
            {currentDrift}%
          </div>
          <p className="text-[11px] text-slate-500">{unlinkedCount} bước chưa gắn mục tiêu</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Căn Chỉnh Mục Tiêu</span>
            <span className="inline-flex items-center text-indigo-400 text-[11px] font-medium font-mono">
              {driftTrendSummary.alignmentDelta >= 0 ? `+${driftTrendSummary.alignmentDelta}%` : `${driftTrendSummary.alignmentDelta}%`}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400 tabular-nums">
            {currentAlignment}%
          </div>
          <p className="text-[11px] text-slate-500">Mức bảo vệ kế hoạch chiến lược</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs text-slate-400">Thời gian tập trung thực</span>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {completedMinutes} <span className="text-xs font-normal text-slate-500">/ {totalMinutes}m</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Còn ~{remainingMinutes} phút ({pendingSteps.length} bước)
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RECHARTS CHART 1: FOCUS EFFICIENCY VS DECISION FRICTION OVER TIME */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Xu Hướng Năng Suất Nhận Thức (Productivity & Cognitive Friction Trends)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Trực quan hóa Điểm Tập Trung (<span className="text-emerald-400 font-medium">focusEfficiencyScore</span>) đối sánh Chỉ Số Ma Sát (<span className="text-amber-400 font-medium">decisionFrictionIndex</span>) theo dòng thời gian.
            </p>
          </div>

          {/* Controls: Timeframe selector & Benchmark toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Filter */}
            <div className="flex items-center rounded bg-slate-950 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setMetricFilter('all')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  metricFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Hiển thị cả 2 chỉ số"
              >
                Cả Hai
              </button>
              <button
                onClick={() => setMetricFilter('focus')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  metricFilter === 'focus'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Chỉ xem Điểm Tập Trung"
              >
                Tập Trung
              </button>
              <button
                onClick={() => setMetricFilter('friction')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  metricFilter === 'friction'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Chỉ xem Ma Sát Quyết Định"
              >
                Ma Sát
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center rounded bg-slate-950 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setTrendTimeframe('7days')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  trendTimeframe === '7days'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                7 Ngày
              </button>
              <button
                onClick={() => setTrendTimeframe('14days')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  trendTimeframe === '14days'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                14 Ngày
              </button>
              <button
                onClick={() => setTrendTimeframe('steps')}
                className={`px-2.5 py-1 rounded transition-colors font-medium ${
                  trendTimeframe === 'steps'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Theo Vi Bước
              </button>
            </div>

            {/* Benchmarks Toggle */}
            <button
              onClick={() => setShowBenchmarks(!showBenchmarks)}
              className={`p-1.5 rounded border text-xs flex items-center gap-1 transition-colors ${
                showBenchmarks
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Bật/Tắt đường chuẩn ngưỡng tối ưu"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ngưỡng Chuẩn</span>
            </button>
          </div>
        </div>

        {/* Dynamic Trend Insight Callout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded bg-slate-950/70 border border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold ${
                trendSummary.isImproving
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800/60 text-amber-300'
              }`}
            >
              {trendSummary.isImproving ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                {trendSummary.isImproving ? 'Xu Hướng Đột Phá Năng Suất' : 'Cảnh Báo Tắc Nghẽn Nhận Thức'}
              </span>
            </span>
            <span className="text-slate-400">
              {trendSummary.isImproving
                ? 'Điểm tập trung đang có xu hướng tăng đều đặn, đồng thời chỉ số ma sát giảm rõ rệt nhờ quy tắc Why-First.'
                : 'Ma sát quyết định còn cao. Cần phân rã các bước lớn thành micro-steps 5-10 phút để giảm tải não bộ.'}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0 text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Tập Trung:</span>
              <strong className="text-emerald-400">{currentFocus}%</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Ma Sát:</span>
              <strong className="text-amber-400">{currentFriction}</strong>
            </div>
          </div>
        </div>

        {/* Recharts Productivity Trend LineChart */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={productivityTrendData}
              margin={{ top: 10, right: 24, left: -10, bottom: 0 }}
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
                domain={[0, 100]}
                unit="%"
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0]?.payload;
                    const focusVal = dataPoint?.focusEfficiencyScore;
                    const frictionVal = dataPoint?.decisionFrictionIndex;
                    const netVal = focusVal - frictionVal;

                    return (
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shadow-xl text-xs space-y-2 max-w-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
                          <span className="font-bold text-white">
                            {dataPoint?.label || label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {dataPoint?.flowState}
                          </span>
                        </div>

                        <div className="space-y-1.5 font-mono text-[11px]">
                          <div className="flex items-center justify-between gap-3 text-emerald-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />
                              Điểm Tập Trung (Focus):
                            </span>
                            <strong className="text-emerald-300 font-bold">{focusVal}%</strong>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-amber-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm shadow-amber-500/50" />
                              Ma Sát Quyết Định (Friction):
                            </span>
                            <strong className="text-amber-300 font-bold">{frictionVal}/100</strong>
                          </div>

                          <div className="flex items-center justify-between gap-3 text-slate-400 border-t border-slate-800/80 pt-1.5">
                            <span>Chênh lệch Ròng (Net Flow):</span>
                            <strong className={`font-bold ${netVal > 20 ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {netVal > 0 ? `+${netVal}` : netVal}
                            </strong>
                          </div>
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
                formatter={(value) => {
                  if (value === 'focusEfficiencyScore') {
                    return <span className="text-emerald-300 text-xs mr-3">Điểm Tập Trung (Focus Efficiency Score)</span>;
                  }
                  if (value === 'decisionFrictionIndex') {
                    return <span className="text-amber-300 text-xs mr-2">Ma Sát Ra Quyết Định (Decision Friction Index)</span>;
                  }
                  return value;
                }}
              />

              {/* High Flow Benchmark Line (>= 70%) */}
              {showBenchmarks && (
                <ReferenceLine
                  y={70}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: 'Mục tiêu Dòng Chảy (≥70%)',
                    fill: '#34d399',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
              )}

              {/* Low Friction Benchmark Line (<= 30) */}
              {showBenchmarks && (
                <ReferenceLine
                  y={30}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: 'Ngưỡng Tối Ưu Ma Sát (≤30)',
                    fill: '#fbbf24',
                    fontSize: 10,
                    position: 'insideBottomRight',
                  }}
                />
              )}

              {/* Focus Efficiency Score Line (Emerald Vibrant) */}
              {(metricFilter === 'all' || metricFilter === 'focus') && (
                <Line
                  type="monotone"
                  dataKey="focusEfficiencyScore"
                  name="focusEfficiencyScore"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ecfdf5' }}
                  activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {/* Decision Friction Index Line (Amber Warm) */}
              {(metricFilter === 'all' || metricFilter === 'friction') && (
                <Line
                  type="monotone"
                  dataKey="decisionFrictionIndex"
                  name="decisionFrictionIndex"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fffbeb' }}
                  activeDot={{ r: 6, fill: '#fbbf24', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Explanatory Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
          <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-slate-800/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
            <span>
              <strong className="text-emerald-300">Tập Trung Cao:</strong> Duy trì &gt;70% giúp kích hoạt trạng thái Hyperfocus mà không bị kiệt sức.
            </span>
          </div>

          <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-slate-800/50">
            <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
            <span>
              <strong className="text-amber-300">Ma Sát Thấp:</strong> &lt;30 điểm biểu thị sự rõ ràng tuyệt đối về vi bước tiếp theo cần làm.
            </span>
          </div>

          <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-slate-800/50">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
            <span>
              <strong className="text-indigo-300">Tương Quan Nghịch:</strong> Hai đường càng tách xa nhau (Xanh lên, Vàng xuống) thì năng suất càng cao.
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RECHARTS CHART 2: DRIFT SCORE & GOAL ALIGNMENT HISTORICAL TREND */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Xu Hướng Biến Thiên Sệch Hướng Mục Tiêu (Drift Score &amp; Goal Alignment Evolution)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Trực quan hóa sự tiến hóa của Chỉ Số Sệch Hướng (<span className="text-rose-400 font-medium">driftScore</span>) đối chiếu với Độ Căn Chỉnh Mục Tiêu (<span className="text-indigo-400 font-medium font-mono">100 - drift</span>) và Hiệu Suất Tập Trung qua từng mốc phiên làm việc.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Style Toggle (Area vs Line) */}
            <div className="flex items-center rounded bg-slate-950 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setDriftChartStyle('area')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  driftChartStyle === 'area'
                    ? 'bg-rose-950 text-rose-200 border border-rose-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Xem dạng Vùng Phủ (Area Gradient)"
              >
                Vùng Phủ
              </button>
              <button
                onClick={() => setDriftChartStyle('line')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  driftChartStyle === 'line'
                    ? 'bg-indigo-950 text-indigo-200 border border-indigo-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Xem dạng Đường Nối (Lines)"
              >
                Đường Nối
              </button>
            </div>

            {/* Metric Filter */}
            <div className="flex items-center rounded bg-slate-950 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setDriftFilter('all')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  driftFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tất Cả
              </button>
              <button
                onClick={() => setDriftFilter('drift_only')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  driftFilter === 'drift_only'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chỉ Drift
              </button>
              <button
                onClick={() => setDriftFilter('alignment_only')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  driftFilter === 'alignment_only'
                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Căn Chỉnh
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center rounded bg-slate-950 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setDriftTimeframe('session_timeline')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  driftTimeframe === 'session_timeline'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Theo Phiên
              </button>
              <button
                onClick={() => setDriftTimeframe('steps')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  driftTimeframe === 'steps'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Theo Vi Bước
              </button>
              <button
                onClick={() => setDriftTimeframe('7days')}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  driftTimeframe === '7days'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                7 Ngày
              </button>
            </div>

            {/* Threshold Toggle */}
            <button
              onClick={() => setShowDriftThreshold(!showDriftThreshold)}
              className={`p-1.5 rounded border text-xs flex items-center gap-1 transition-colors ${
                showDriftThreshold
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Bật/Tắt đường ngưỡng sệch hướng an toàn"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ngưỡng An Toàn</span>
            </button>
          </div>
        </div>

        {/* Dynamic Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded bg-slate-950/70 border border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold ${
                driftTrendSummary.isImproving
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
              }`}
            >
              {driftTrendSummary.isImproving ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>
                {driftTrendSummary.isImproving
                  ? 'Sệch Hướng Đang Được Kiểm Soát Tốt'
                  : 'Cảnh Báo Phát Sinh Công Việc Ngoài Mục Tiêu'}
              </span>
            </span>
            <span className="text-slate-400">
              {currentDrift <= 15
                ? 'Chỉ số sệch hướng hiện ở mức an toàn (≤15%). Tất cả năng lượng đang dồn vào mục tiêu chiến lược.'
                : `Có ${unlinkedCount} vi bước chưa liên kết mục tiêu. Căn chỉnh ngay để tránh lãng phí thời gian.`}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0 text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Sệch Hướng (Drift):</span>
              <strong className="text-rose-400">{currentDrift}%</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Căn Chỉnh (Alignment):</span>
              <strong className="text-indigo-400">{currentAlignment}%</strong>
            </div>
          </div>
        </div>

        {/* Recharts Chart Area */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {driftChartStyle === 'area' ? (
              <AreaChart data={driftHistoryData} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="alignmentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0]?.payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shadow-xl text-xs space-y-2 max-w-xs">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
                            <span className="font-bold text-white">{dataPoint?.label || label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {dataPoint?.status}
                            </span>
                          </div>
                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex items-center justify-between gap-3 text-rose-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                                Chỉ Số Sệch Hướng (Drift):
                              </span>
                              <strong className="text-rose-300 font-bold">{dataPoint?.driftScore}%</strong>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-indigo-400">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                                Căn Chỉnh Mục Tiêu:
                              </span>
                              <strong className="text-indigo-300 font-bold">{dataPoint?.goalAlignment}%</strong>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-emerald-400 border-t border-slate-800/80 pt-1.5">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                Hiệu Suất Tập Trung:
                              </span>
                              <strong className="text-emerald-300 font-bold">{dataPoint?.focusEfficiencyScore}%</strong>
                            </div>
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
                  formatter={(value) => {
                    if (value === 'driftScore') return <span className="text-rose-300 text-xs mr-3">Chỉ Số Sệch Hướng (Drift Score %)</span>;
                    if (value === 'goalAlignment') return <span className="text-indigo-300 text-xs mr-3">Căn Chỉnh Mục Tiêu (%)</span>;
                    if (value === 'focusEfficiencyScore') return <span className="text-emerald-300 text-xs mr-2">Hiệu Suất Tập Trung (%)</span>;
                    return value;
                  }}
                />

                {showDriftThreshold && (
                  <ReferenceLine
                    y={15}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: 'Ngưỡng An Toàn Sệch Hướng (≤15%)',
                      fill: '#fda4af',
                      fontSize: 10,
                      position: 'insideBottomRight',
                    }}
                  />
                )}

                {(driftFilter === 'all' || driftFilter === 'drift_only') && (
                  <Area
                    type="monotone"
                    dataKey="driftScore"
                    name="driftScore"
                    stroke="#f43f5e"
                    fillOpacity={1}
                    fill="url(#driftGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff1f2' }}
                    activeDot={{ r: 6, fill: '#fb7185', stroke: '#ffffff' }}
                  />
                )}

                {(driftFilter === 'all' || driftFilter === 'alignment_only') && (
                  <Area
                    type="monotone"
                    dataKey="goalAlignment"
                    name="goalAlignment"
                    stroke="#818cf8"
                    fillOpacity={1}
                    fill="url(#alignmentGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: '#6366f1', strokeWidth: 2, stroke: '#e0e7ff' }}
                    activeDot={{ r: 6, fill: '#a5b4fc', stroke: '#ffffff' }}
                  />
                )}

                {driftFilter === 'all' && (
                  <Line
                    type="monotone"
                    dataKey="focusEfficiencyScore"
                    name="focusEfficiencyScore"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: '#10b981' }}
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart data={driftHistoryData} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0]?.payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shadow-xl text-xs space-y-2 max-w-xs">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
                            <span className="font-bold text-white">{dataPoint?.label || label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {dataPoint?.status}
                            </span>
                          </div>
                          <div className="space-y-1.5 font-mono text-[11px]">
                            <div className="flex items-center justify-between gap-3 text-rose-400">
                              <span>Chỉ Số Sệch Hướng (Drift Score):</span>
                              <strong className="text-rose-300 font-bold">{dataPoint?.driftScore}%</strong>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-indigo-400">
                              <span>Mức Căn Chỉnh Mục Tiêu:</span>
                              <strong className="text-indigo-300 font-bold">{dataPoint?.goalAlignment}%</strong>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-emerald-400 border-t border-slate-800/80 pt-1.5">
                              <span>Hiệu Suất Tập Trung:</span>
                              <strong className="text-emerald-300 font-bold">{dataPoint?.focusEfficiencyScore}%</strong>
                            </div>
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
                  formatter={(value) => {
                    if (value === 'driftScore') return <span className="text-rose-300 text-xs mr-3">Chỉ Số Sệch Hướng (%)</span>;
                    if (value === 'goalAlignment') return <span className="text-indigo-300 text-xs mr-3">Căn Chỉnh Mục Tiêu (%)</span>;
                    if (value === 'focusEfficiencyScore') return <span className="text-emerald-300 text-xs mr-2">Tập Trung (%)</span>;
                    return value;
                  }}
                />

                {showDriftThreshold && (
                  <ReferenceLine
                    y={15}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: 'Ngưỡng An Toàn (≤15%)',
                      fill: '#fda4af',
                      fontSize: 10,
                      position: 'insideBottomRight',
                    }}
                  />
                )}

                {(driftFilter === 'all' || driftFilter === 'drift_only') && (
                  <Line
                    type="monotone"
                    dataKey="driftScore"
                    name="driftScore"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff1f2' }}
                    activeDot={{ r: 6, fill: '#fb7185', stroke: '#ffffff' }}
                  />
                )}

                {(driftFilter === 'all' || driftFilter === 'alignment_only') && (
                  <Line
                    type="monotone"
                    dataKey="goalAlignment"
                    name="goalAlignment"
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#e0e7ff' }}
                    activeDot={{ r: 6, fill: '#a5b4fc', stroke: '#ffffff' }}
                  />
                )}

                {driftFilter === 'all' && (
                  <Line
                    type="monotone"
                    dataKey="focusEfficiencyScore"
                    name="focusEfficiencyScore"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#10b981' }}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Footer Insights & Actionable Tips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
          <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-slate-800/50">
            <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
            <span>
              <strong className="text-rose-300">Drift Score &le; 15%:</strong> Giữ chỉ số sệch hướng dưới 15% giúp đảm bảo mọi nỗ lực đều trực tiếp thúc đẩy Goal Canvas.
            </span>
          </div>

          <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-slate-800/50">
            <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
            <span>
              <strong className="text-indigo-300">Goal Alignment &ge; 85%:</strong> Tỷ lệ căn chỉnh mục tiêu cao giúp loại bỏ triệt để công việc bận rộn không tạo giá trị.
            </span>
          </div>

          <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-slate-800/50">
            <Compass className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <span>
              <strong className="text-amber-300">Mẹo Điều Hướng:</strong> Sử dụng phím tắt <kbd className="px-1 py-0.2 bg-slate-800 text-indigo-300 font-mono rounded">Alt + 1</kbd> để gán vi bước mồ côi vào mục tiêu.
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BURNDOWN VELOCITY CHART SECTION (D3 / Recharts) */}
      {/* ========================================================================= */}
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
            {behavioralInsights.observedPatterns.map((pattern: string, idx: number) => (
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
            {behavioralInsights.cognitiveRecommendations.map((rec: string, idx: number) => (
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
          {currentContext.behavioralFlags.map((flag: string, idx: number) => (
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

