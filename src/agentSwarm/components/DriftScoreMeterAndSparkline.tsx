import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertCircle, TrendingDown, TrendingUp, ShieldAlert, CheckCircle, Gauge, Activity } from 'lucide-react';

export interface DriftScoreMeterProps {
  currentDriftScore: number;
  averageDriftScore: number;
  history?: Array<{
    cycle: number;
    step: string;
    driftScore: number;
    tool: string;
    status: 'safe' | 'warning' | 'critical';
  }>;
  threshold?: number;
  circuitBreakerThreshold?: number;
}

export function DriftScoreMeterAndSparkline({
  currentDriftScore,
  averageDriftScore,
  history,
  threshold = 40,
  circuitBreakerThreshold = 65,
}: DriftScoreMeterProps) {
  // Default history series if not provided
  const chartData = useMemo(() => {
    if (history && history.length > 0) return history;
    return [
      { cycle: 1, step: 'Decompose', driftScore: 4, tool: 'decompose_task', status: 'safe' as const },
      { cycle: 2, step: 'Contract', driftScore: 6, tool: 'write_interface', status: 'safe' as const },
      { cycle: 3, step: 'Pure Entity', driftScore: 8, tool: 'write_entity', status: 'safe' as const },
      { cycle: 4, step: 'Redis Adapter', driftScore: 14, tool: 'implement_repo', status: 'safe' as const },
      { cycle: 5, step: 'Verify Logic', driftScore: currentDriftScore, tool: 'verify_revocation', status: currentDriftScore >= 40 ? 'warning' as const : 'safe' as const },
    ];
  }, [history, currentDriftScore]);

  // Determine trend: comparing last point with previous point
  const isTrendImproving = useMemo(() => {
    if (chartData.length < 2) return true;
    const last = chartData[chartData.length - 1].driftScore;
    const prev = chartData[chartData.length - 2].driftScore;
    return last <= prev;
  }, [chartData]);

  // Risk Level Category
  const riskCategory = useMemo(() => {
    if (currentDriftScore >= circuitBreakerThreshold) {
      return {
        label: 'Ngắt Mạch Khẩn Cấp (Circuit Breaker HALT)',
        color: 'text-rose-400',
        bg: 'bg-rose-950/60 border-rose-600',
        barColor: 'from-rose-600 to-rose-500',
        badge: 'bg-rose-500 text-white',
        icon: ShieldAlert,
        description: 'Độ trôi dạt vượt ranh giới an toàn nghiêm trọng. AI Swarm bị ngắt mạch để ngăn ngừa ảo giác và chi phí token.',
      };
    }
    if (currentDriftScore >= threshold) {
      return {
        label: 'Vùng Nguy Hiểm (High Drift Risk)',
        color: 'text-amber-400',
        bg: 'bg-amber-950/50 border-amber-600',
        barColor: 'from-amber-600 to-amber-500',
        badge: 'bg-amber-500 text-slate-950',
        icon: AlertCircle,
        description: 'Tác vụ bắt đầu xuất hiện dấu hiệu mở rộng scope hoặc over-engineering. Socratic Guardrail đang giám sát.',
      };
    }
    if (currentDriftScore >= 15) {
      return {
        label: 'Độ Lệch Chấp Nhận Được (Acceptable Drift)',
        color: 'text-yellow-300',
        bg: 'bg-yellow-950/30 border-yellow-700/60',
        barColor: 'from-yellow-500 to-amber-400',
        badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
        icon: Activity,
        description: 'Agent đang điều chỉnh ngữ cảnh kỹ thuật, chưa phát hiện bẫy sa đà nghiêm trọng.',
      };
    }
    return {
      label: 'Quỹ Đạo Tối Ưu (Zero Drift - An Toàn Tuyệt Đối)',
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/30 border-emerald-800/60',
      barColor: 'from-emerald-500 to-teal-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      icon: CheckCircle,
      description: 'Agent bám sát 100% mục tiêu cốt lõi (Core Goal Canvas), tuân thủ nguyên tắc Atomic Commit.',
    };
  }, [currentDriftScore, threshold, circuitBreakerThreshold]);

  const IconComponent = riskCategory.icon;

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-5 space-y-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Đồng Hồ Đo Nguy Cơ & Lệch Hướng (Drift Score Meter)
              </h3>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${riskCategory.badge}`}>
                {currentDriftScore}%
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Giám sát độ trôi dạt mục tiêu qua từng nhịp gọi tool của AI Agent
            </p>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          {isTrendImproving ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <TrendingDown className="w-4 h-4" />
              Đang Tự Hồi Quy Quỹ Đạo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <TrendingUp className="w-4 h-4" />
              Xu Hướng Tăng Độ Trôi Dạt
            </span>
          )}
        </div>
      </div>

      {/* Main Gauge Visual Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">Chỉ số Hiện Tại:</span>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${riskCategory.color}`}>{riskCategory.label}</span>
            <span className="text-slate-500 font-mono">·</span>
            <span className="text-slate-300">Trung bình: {averageDriftScore}%</span>
          </div>
        </div>

        {/* Segmented Gradient Gauge Bar */}
        <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
          {/* Target Zone Backgrounds */}
          <div className="absolute inset-0 flex">
            {/* Safe Zone (0 - 15%) */}
            <div className="w-[15%] bg-emerald-500/20 border-r border-slate-800"></div>
            {/* Moderate Zone (15% - 40%) */}
            <div className="w-[25%] bg-yellow-500/20 border-r border-slate-800"></div>
            {/* Danger Zone (40% - 65%) */}
            <div className="w-[25%] bg-amber-500/20 border-r border-slate-800"></div>
            {/* Circuit Breaker Zone (65% - 100%) */}
            <div className="w-[35%] bg-rose-500/20"></div>
          </div>

          {/* Active Fill Level */}
          <div
            className={`h-full rounded-full bg-gradient-to-r ${riskCategory.barColor} transition-all duration-700 relative z-10`}
            style={{ width: `${Math.min(100, Math.max(3, currentDriftScore))}%` }}
          />
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
          <span className="text-emerald-400">0% (Lý Tưởng)</span>
          <span className="text-yellow-400">15% (Lưu Tâm)</span>
          <span className="text-amber-400">40% (Cảnh Báo)</span>
          <span className="text-rose-400">65%+ (Ngắt Mạch)</span>
        </div>
      </div>

      {/* Mini Recharts Sparkline Area Chart */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Biến Thiên Drift Score Qua Các Nhịp Tool</span>
          <span className="text-indigo-400">Recharts Sparkline Stream</span>
        </div>

        <div className="h-28 w-full bg-slate-950/70 p-2 rounded-lg border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="step" stroke="#475569" fontSize={9} tickLine={false} />
              <YAxis stroke="#475569" fontSize={9} domain={[0, 100]} tickLine={false} />
              <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" />
              <ReferenceLine y={65} stroke="#ef4444" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2 rounded text-[11px] font-mono space-y-1 shadow-xl">
                        <div className="font-bold text-white flex items-center justify-between gap-3">
                          <span>Nhịp {data.cycle}: {data.step}</span>
                          <span className="text-indigo-300">{data.driftScore}%</span>
                        </div>
                        <div className="text-slate-400">Tool: {data.tool}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="driftScore"
                stroke="#818cf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#driftGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Explanation Card */}
      <div className={`p-3.5 rounded-lg border ${riskCategory.bg} flex items-start gap-3`}>
        <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${riskCategory.color}`} />
        <div className="space-y-1">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <span>{riskCategory.label}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {riskCategory.description}
          </p>
        </div>
      </div>
    </div>
  );
}
