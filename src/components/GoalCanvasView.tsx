import React, { useState } from 'react';
import {
  LongTermGoal,
  GoalMilestone,
  GoalHorizon,
  GoalCategory,
  MicroStep,
  GoalDriftStatus,
  GoalSprint,
} from '../types';
import {
  Telescope,
  Sparkles,
  PlusCircle,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Layers,
  ArrowUpRight,
  Check,
  ShieldAlert,
  Loader2,
  X,
} from 'lucide-react';

interface GoalCanvasViewProps {
  goals: LongTermGoal[];
  activeGoalId?: string;
  onSelectActiveGoal: (goalId: string) => void;
  onCreateGoal: (newGoal: LongTermGoal, initialSteps?: MicroStep[]) => void;
  onUpdateGoalProgress: (goalId: string, progress: number) => void;
  onJumpToFocus: () => void;
  currentMicroSteps: MicroStep[];
}

export const GoalCanvasView: React.FC<GoalCanvasViewProps> = ({
  goals,
  activeGoalId,
  onSelectActiveGoal,
  onCreateGoal,
  onJumpToFocus,
  currentMicroSteps,
}) => {
  const [expandedGoalIds, setExpandedGoalIds] = useState<string[]>([
    activeGoalId || (goals[0]?.id ?? ''),
  ]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPlanningLoading, setIsPlanningLoading] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formVision, setFormVision] = useState('');
  const [formHorizon, setFormHorizon] = useState<GoalHorizon>('12_months');
  const [formCategory, setFormCategory] = useState<GoalCategory>('career');
  const [formHours, setFormHours] = useState(10);
  const [formSkills, setFormSkills] = useState('System Architecture, Clean Code');

  const toggleExpand = (id: string) => {
    setExpandedGoalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const activeGoal = goals.find((g) => g.id === activeGoalId) || goals[0];

  // Calculate high-level stats
  const totalHoursCommitted = goals.reduce(
    (acc, g) => acc + (g.constraints?.hoursPerWeek || 0),
    0
  );
  const avgDriftScore =
    goals.length > 0
      ? Math.round(
          goals.reduce((acc, g) => acc + (g.driftScore || 0), 0) / goals.length
        )
      : 0;

  // Unlinked micro-steps detection
  const unlinkedMicroSteps = currentMicroSteps.filter(
    (s) => !s.goalId && !s.isAlignedWithGoal
  );

  const handleGenerateGoalPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsPlanningLoading(true);
    try {
      const skillsArray = formSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await fetch('/api/goals/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalTitle: formTitle,
          vision: formVision,
          horizon: formHorizon,
          hoursPerWeek: formHours,
          category: formCategory,
          primarySkills: skillsArray,
        }),
      });

      if (!response.ok) {
        throw new Error('Không thể lập lộ trình mục tiêu');
      }

      const plannedData = await response.json();

      const newGoal: LongTermGoal = {
        id: plannedData.id || `goal_${Date.now()}`,
        title: plannedData.title || formTitle,
        vision: plannedData.vision || formVision,
        category: plannedData.category || formCategory,
        horizon: plannedData.horizon || formHorizon,
        deadline: plannedData.deadline || '12 tháng tới',
        milestones: plannedData.milestones || [],
        constraints: plannedData.constraints || {
          hoursPerWeek: formHours,
          budget: 500,
          primarySkills: skillsArray,
          priority: 'critical',
        },
        linkedTaskIds: [],
        progress: 0,
        driftScore: 0,
        status: 'active',
        lastReviewedAt: 'Vừa tạo',
      };

      const initialSteps: MicroStep[] = (plannedData.immediateMicroSteps || []).map(
        (st: any, idx: number) => ({
          ...st,
          id: st.id || `step_gen_${Date.now()}_${idx}`,
          goalId: newGoal.id,
          goalTitle: newGoal.title,
          milestoneId: newGoal.milestones[0]?.id,
          milestoneTitle: newGoal.milestones[0]?.title || 'Q1',
          isAlignedWithGoal: true,
        })
      );

      onCreateGoal(newGoal, initialSteps);
      setIsCreateModalOpen(false);
      setFormTitle('');
      setFormVision('');
    } catch (err) {
      console.error('Error generating goal plan:', err);
      // Fallback local creation
      const fallbackGoal: LongTermGoal = {
        id: `goal_${Date.now()}`,
        title: formTitle,
        vision: formVision || `Hiện thực hóa mục tiêu ${formTitle} với lộ trình vi bước rõ ràng.`,
        category: formCategory,
        horizon: formHorizon,
        deadline: '12 tháng tới',
        milestones: [
          {
            id: `ms_${Date.now()}_1`,
            title: `Q1: Nắm vững nguyên lý nền tảng (${formTitle})`,
            quarterOrMonth: 'Q1 (Tháng 1-3)',
            due: '3 tháng tới',
            status: 'on_track',
            progress: 10,
            keyDeliverable: 'Hoàn thành 3 đề án kiến trúc và đọc tài liệu chuyên sâu.',
            dependencies: ['Cam kết giờ đều đặn'],
          },
          {
            id: `ms_${Date.now()}_2`,
            title: 'Q2: Áp dụng thực chiến vào dự án công việc',
            quarterOrMonth: 'Q2 (Tháng 4-6)',
            due: '6 tháng tới',
            status: 'on_track',
            progress: 0,
            keyDeliverable: 'Đóng góp giải pháp tối ưu trực tiếp cho sản phẩm.',
            dependencies: ['Q1 Hoàn thành'],
          },
        ],
        constraints: {
          hoursPerWeek: formHours,
          budget: 500,
          primarySkills: [formSkills],
          priority: 'critical',
        },
        linkedTaskIds: [],
        progress: 0,
        driftScore: 0,
        status: 'active',
        lastReviewedAt: 'Vừa tạo',
      };
      onCreateGoal(fallbackGoal);
      setIsCreateModalOpen(false);
    } finally {
      setIsPlanningLoading(false);
    }
  };

  const getStatusBadge = (status: GoalMilestone['status']) => {
    switch (status) {
      case 'on_track':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
            Đúng tiến độ
          </span>
        );
      case 'at_risk':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40">
            Nguy cơ trễ
          </span>
        );
      case 'completed':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40">
            Đã hoàn thành
          </span>
        );
      case 'delayed':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/40">
            Chậm trễ
          </span>
        );
    }
  };

  const getHorizonLabel = (h: GoalHorizon) => {
    switch (h) {
      case '3_months':
        return '3 Tháng';
      case '6_months':
        return '6 Tháng';
      case '12_months':
        return '12 Tháng (1 Năm)';
      case '24_months':
        return '24 Tháng (2 Năm)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/30 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                <Telescope className="w-4 h-4" />
              </span>
              <h1 className="text-base font-bold text-white tracking-tight">
                Tầng Hoạch Định Mục Tiêu Dài Hạn (Horizon 6–12 Tháng)
              </h1>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mọi vi bước lập trình hôm nay <strong>phải truy vết được</strong> lên một mục tiêu dài hạn. Nếu không có liên kết, hệ thống sẽ cảnh báo <em>"việc này đang lệch mục tiêu (Goal Drift)"</em> để giúp bạn giữ vững định hướng và tránh kiệt sức vì những việc thứ yếu.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lập Mục Tiêu AI (Planner)</span>
            </button>
            <button
              onClick={onJumpToFocus}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            >
              <span>Vào Focus Mode Hôm Nay</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* High level Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
            <div className="text-[10px] text-slate-400 font-medium">Mục Tiêu Đang Bám Sát</div>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              {goals.length} <span className="text-xs text-slate-500 font-normal">mục tiêu</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
            <div className="text-[10px] text-slate-400 font-medium">Cam Kết Nỗ Lực</div>
            <div className="text-base font-bold text-indigo-300 font-mono mt-0.5">
              {totalHoursCommitted} <span className="text-xs text-slate-500 font-normal">giờ/tuần</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
            <div className="text-[10px] text-slate-400 font-medium">Chỉ Số Lệch Mục Tiêu (Drift)</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-base font-bold font-mono ${
                  avgDriftScore > 25
                    ? 'text-rose-400'
                    : avgDriftScore > 15
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {avgDriftScore}%
              </span>
              <span className="text-[10px] text-slate-500">
                {avgDriftScore <= 15 ? '(Rất tập trung)' : '(Có độ phân tán)'}
              </span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
            <div className="text-[10px] text-slate-400 font-medium">Mục Tiêu Neo Hiện Tại</div>
            <div className="text-xs font-semibold text-slate-200 truncate mt-1">
              🎯 {activeGoal?.title || 'Chưa chọn'}
            </div>
          </div>
        </div>
      </div>

      {/* Goal Drift Warning Banner if unlinked steps exist */}
      {unlinkedMicroSteps.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-300">
              Cảnh Báo Lệch Mục Tiêu (Goal Drift Warning): Có {unlinkedMicroSteps.length} vi bước hôm nay chưa liên kết mục tiêu lớn
            </div>
            <p className="text-amber-200/80">
              Hệ thống phát hiện một số đầu việc chưa gắn vào cột mốc cụ thể nào của mục tiêu "{activeGoal?.title}". Hãy gắn chúng vào Cột mốc tương ứng hoặc loại bỏ để bảo toàn vận tốc và năng lượng nhận thức.
            </p>
            <button
              onClick={onJumpToFocus}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-white underline mt-1"
            >
              <span>Xem và liên kết vi bước tại Focus View</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* List of Goals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Danh Sách Mục Tiêu Dài Hạn & Lộ Trình Cột Mốc
          </div>
          <span className="text-[11px] text-slate-500">
            Nhấn vào mục tiêu để mở rộng chi tiết Cột Mốc (Milestones)
          </span>
        </div>

        {goals.map((goal) => {
          const isExpanded = expandedGoalIds.includes(goal.id);
          const isActive = goal.id === activeGoalId;

          return (
            <div
              key={goal.id}
              className={`rounded-lg border transition-all ${
                isActive
                  ? 'bg-slate-900/90 border-indigo-600/80 shadow-md shadow-indigo-950/20'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Goal Card Header */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleExpand(goal.id)}
                        className="text-left font-bold text-sm sm:text-base text-white hover:text-indigo-300 transition-colors flex items-center gap-2"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="truncate">{goal.title}</span>
                      </button>

                      {isActive && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          Mục Tiêu Đang Neo (Active)
                        </span>
                      )}

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {getHorizonLabel(goal.horizon)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 pl-6">
                      {goal.vision}
                    </p>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pl-6 sm:pl-0">
                    {!isActive && (
                      <button
                        onClick={() => onSelectActiveGoal(goal.id)}
                        className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        Đặt làm Active
                      </button>
                    )}

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-indigo-400">
                        {goal.progress}% xong
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Hạn: {goal.deadline}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar & constraints row */}
                <div className="mt-3.5 pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{goal.constraints.hoursPerWeek} giờ / tuần</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>{goal.milestones.length} Cột mốc</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-slate-500" />
                      <span>Kỹ năng: {goal.constraints.primarySkills.slice(0, 2).join(', ')}</span>
                    </span>
                  </div>

                  <div className="w-full sm:w-48 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, goal.progress)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Milestones Expansion */}
              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Lộ Trình Cột Mốc Chi Tiết (Milestones Breakdown)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Đạt từng cột mốc để tích lũy kết quả thực nghiệm
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {goal.milestones.map((ms: GoalMilestone, idx: number) => (
                      <div
                        key={ms.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-md p-3.5 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-mono text-indigo-400 font-semibold">
                              {ms.quarterOrMonth}
                            </div>
                            <div className="text-xs font-bold text-slate-200 mt-0.5">
                              {ms.title}
                            </div>
                          </div>
                          {getStatusBadge(ms.status)}
                        </div>

                        <div className="text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded border border-slate-800/50">
                          <span className="text-slate-500 font-medium">Bàn giao then chốt:</span>{' '}
                          {ms.keyDeliverable}
                        </div>

                        {ms.dependencies && ms.dependencies.length > 0 && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <span>Phụ thuộc:</span>
                            <span className="text-slate-400">{ms.dependencies.join(', ')}</span>
                          </div>
                        )}

                        {/* Sprints if present */}
                        {ms.sprints && ms.sprints.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                            <div className="text-[10px] text-slate-500 font-medium">
                              Sprints tuần:
                            </div>
                            <div className="space-y-1">
                              {ms.sprints.map((sp: GoalSprint) => (
                                <div
                                  key={sp.id}
                                  className="flex items-center justify-between text-[11px] bg-slate-950/40 px-2 py-1 rounded"
                                >
                                  <span className="text-slate-300 truncate max-w-[200px]">
                                    {sp.title}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                    {sp.targetWeek} ({sp.completedCount}/{sp.tasksCount})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Milestone progress bar */}
                        <div className="pt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
                          <span>Tiến độ cột mốc</span>
                          <span className="text-indigo-300 font-semibold">{ms.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-400 h-full rounded-full transition-all"
                            style={{ width: `${ms.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Goal Planner Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-indigo-600/20 text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">
                Long-Term Goal Planner (Engine ① AI)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nhập mục tiêu lớn của bạn. AI sẽ phân tích và lập lộ trình nhìn trước được từ Cột mốc (Quý) đến Sprints (Tuần) và sinh ngay 3 vi bước nguyên tử (≤ 15 phút) để bạn khởi động hôm nay.
            </p>

            <form onSubmit={handleGenerateGoalPlan} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mục tiêu lớn muốn đạt được
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trở thành Principal Engineer, Tối ưu chi phí Cloud $50k/tháng..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tầm nhìn cụ thể (Vision / Tại sao làm điều này?)
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Đạt được tự do kỹ thuật, làm chủ kiến trúc lớn và không bị động khi hệ thống mở rộng..."
                  value={formVision}
                  onChange={(e) => setFormVision(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Khung thời gian (Horizon)
                  </label>
                  <select
                    value={formHorizon}
                    onChange={(e) => setFormHorizon(e.target.value as GoalHorizon)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="3_months">3 Tháng</option>
                    <option value="6_months">6 Tháng</option>
                    <option value="12_months">12 Tháng (1 Năm)</option>
                    <option value="24_months">24 Tháng (2 Năm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Số giờ/tuần cam kết
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={40}
                    value={formHours}
                    onChange={(e) => setFormHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kỹ năng hoặc công nghệ cần trui rèn
                </label>
                <input
                  type="text"
                  placeholder="Distributed Systems, Redis, Kafka, DDD, Rust..."
                  value={formSkills}
                  onChange={(e) => setFormSkills(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPlanningLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 rounded transition-colors shadow-sm"
                >
                  {isPlanningLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang Lập Lộ Trình AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tạo & Lập Lộ Trình Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
