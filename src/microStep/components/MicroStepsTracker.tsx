import React, { useState, useEffect } from 'react';
import { MicroStep, NanoStep } from '../entities/microStep';
import { ProjectContext } from '../../projectContext/entities/projectContext';
import { LongTermGoal } from '../../goal/entities/longTermGoal';
import {
  CheckSquare,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Split,
  CheckCircle2,
  Clock,
  Code,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Plus,
  Zap,
  BellRing,
  BellOff,
  Flame,
  Timer,
  Target,
  Link2,
  ShieldQuestion,
  Lightbulb,
  ArrowUpRight,
  X,
  Send,
  HelpCircle,
} from 'lucide-react';
import { AudioPlayerButton } from '../../components/AudioPlayerButton';
import { playCompletionAlert } from '../../utils/audioPlayer';

interface MicroStepsTrackerProps {
  microSteps: MicroStep[];
  onToggleComplete: (id: string) => void;
  onAddStep: (step: MicroStep) => void;
  onDecomposeStep: (stepId: string, currentFriction: string) => Promise<void>;
  onToggleNanoStep: (stepId: string, nanoId: string) => void;
  currentContext: ProjectContext;
  activeGoal?: LongTermGoal;
  onLinkStepToGoal?: (stepId: string, goalId: string, milestoneId?: string) => void;
}

type SprintMode = 'nano' | 'micro' | 'pomodoro' | 'break';

export const MicroStepsTracker: React.FC<MicroStepsTrackerProps> = ({
  microSteps,
  onToggleComplete,
  onAddStep,
  onDecomposeStep,
  onToggleNanoStep,
  currentContext,
  activeGoal,
  onLinkStepToGoal,
}) => {
  const [activeStepId, setActiveStepId] = useState<string>(() => {
    const firstPending = microSteps.find((s) => !s.completed);
    return firstPending ? firstPending.id : microSteps[0]?.id || '';
  });

  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Quick Decomposer State for Solo Dev (Flash-Lite)
  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [isQuickDecomposing, setIsQuickDecomposing] = useState(false);
  const [quickDecomposeNotice, setQuickDecomposeNotice] = useState<string | null>(null);

  // "Challenge Me" (Why-First Socratic) State
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeDilemma, setChallengeDilemma] = useState('');
  const [isChallenging, setIsChallenging] = useState(false);
  const [challengeResult, setChallengeResult] = useState<any | null>(null);

  // New step form state
  const [newTitle, setNewTitle] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newCriterion, setNewCriterion] = useState('');
  const [newMinutes, setNewMinutes] = useState(10);
  const [newPrinciple, setNewPrinciple] = useState<MicroStep['programmerPrinciple']>('Divide & Conquer');

  // Pomodoro / Execution Sprint Timer State
  const activeStep = microSteps.find((s) => s.id === activeStepId) || microSteps[0];
  const [sprintMode, setSprintMode] = useState<SprintMode>('micro');
  const [targetedNanoId, setTargetedNanoId] = useState<string | null>(null);
  const [targetedNanoText, setTargetedNanoText] = useState<string>('');
  const [totalSprintSeconds, setTotalSprintSeconds] = useState<number>(600);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(true);
  const [showCompletionAlert, setShowCompletionAlert] = useState<boolean>(false);

  // Track elapsed effort per micro-step (in seconds)
  const [elapsedByStepId, setElapsedByStepId] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    microSteps.forEach((s) => {
      if (s.elapsedSeconds) initial[s.id] = s.elapsedSeconds;
    });
    return initial;
  });

  // Track completed pomodoros per micro-step
  const [pomodoroCountByStepId, setPomodoroCountByStepId] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    microSteps.forEach((s) => {
      if (s.pomodoroCount) initial[s.id] = s.pomodoroCount;
    });
    return initial;
  });

  // Calculate active step effort metrics
  const activeEstimatedSecs = (activeStep?.durationMinutes || 10) * 60;
  const activeElapsedSecs = activeStep ? (elapsedByStepId[activeStep.id] || 0) : 0;
  const activeEffortRatio = activeEstimatedSecs > 0 ? Math.round((activeElapsedSecs / activeEstimatedSecs) * 100) : 0;
  const activePomodoros = activeStep ? (pomodoroCountByStepId[activeStep.id] || 0) : 0;

  // When active step changes, sync timer to the selected step
  useEffect(() => {
    if (activeStep) {
      const stepDurationSecs = (activeStep.durationMinutes || 10) * 60;
      const stepElapsed = elapsedByStepId[activeStep.id] || 0;
      
      if (sprintMode === 'micro') {
        const remainingForStep = Math.max(60, stepDurationSecs - stepElapsed);
        setTotalSprintSeconds(stepDurationSecs);
        setTimeLeft(remainingForStep);
      } else if (sprintMode === 'nano') {
        setTotalSprintSeconds(120);
        setTimeLeft(120);
      } else if (sprintMode === 'pomodoro') {
        setTotalSprintSeconds(25 * 60);
        setTimeLeft(25 * 60);
      } else if (sprintMode === 'break') {
        setTotalSprintSeconds(5 * 60);
        setTimeLeft(5 * 60);
      }
      
      setTargetedNanoId(null);
      setTargetedNanoText('');
      setShowCompletionAlert(false);
      setIsTimerRunning(false);
    }
  }, [activeStepId]);

  // Mode switcher handler
  const handleSelectSprintMode = (mode: SprintMode) => {
    setSprintMode(mode);
    setShowCompletionAlert(false);
    let seconds = 600;
    if (mode === 'nano') {
      seconds = 120;
    } else if (mode === 'micro') {
      const stepDurationSecs = (activeStep?.durationMinutes || 10) * 60;
      const stepElapsed = activeStep ? (elapsedByStepId[activeStep.id] || 0) : 0;
      seconds = Math.max(60, stepDurationSecs - stepElapsed);
      setTotalSprintSeconds(stepDurationSecs);
      setTimeLeft(seconds);
      setIsTimerRunning(false);
    } else if (mode === 'pomodoro') {
      seconds = 25 * 60;
      setTotalSprintSeconds(25 * 60);
      setTimeLeft(25 * 60);
      setIsTimerRunning(false);
    } else if (mode === 'break') {
      seconds = 5 * 60;
      setTotalSprintSeconds(5 * 60);
      setTimeLeft(5 * 60);
      setIsTimerRunning(false);
    }
  };

  // Timer Tick Effect
  useEffect(() => {
    let timer: any = null;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });

        if ((sprintMode === 'micro' || sprintMode === 'nano') && activeStep) {
          setElapsedByStepId((prev) => ({
            ...prev,
            [activeStep.id]: (prev[activeStep.id] || 0) + 1,
          }));
        }
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      if (sprintMode === 'pomodoro' && activeStep) {
        setPomodoroCountByStepId((prev) => ({
          ...prev,
          [activeStep.id]: (prev[activeStep.id] || 0) + 1,
        }));
      }
      if (soundAlertEnabled) {
        playCompletionAlert();
      }
      setShowCompletionAlert(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, timeLeft, soundAlertEnabled, sprintMode, activeStep?.id]);

  const toggleExpand = (id: string) => {
    setExpandedStepIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDecomposeActive = async () => {
    if (!activeStep) return;
    try {
      setIsDecomposing(true);
      await onDecomposeStep(activeStep.id, currentContext.currentFriction);
      setExpandedStepIds((prev) => ({ ...prev, [activeStep.id]: true }));
    } finally {
      setIsDecomposing(false);
    }
  };

  // Quick Decompose Task using Flash-Lite
  const handleQuickDecomposeTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTaskInput.trim()) return;

    try {
      setIsQuickDecomposing(true);
      setQuickDecomposeNotice(null);

      const res = await fetch('/api/decompose-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: quickTaskInput.trim(),
          context: {
            goalTitle: activeGoal?.title,
            energyLevel: currentContext.energyLevel,
          },
        }),
      });

      const data = await res.json();
      if (data.microSteps && data.microSteps.length > 0) {
        data.microSteps.forEach((step: MicroStep, idx: number) => {
          onAddStep({
            ...step,
            id: `step_ai_${Date.now()}_${idx}`,
            goalId: activeGoal?.id,
            goalTitle: activeGoal?.title,
            milestoneId: activeGoal?.milestones[0]?.id,
            milestoneTitle: activeGoal?.milestones[0]?.title || 'Core Goal Milestone',
            isAlignedWithGoal: true,
          });
        });
        setQuickDecomposeNotice(`⚡ Đã phân rã thành công ${data.microSteps.length} vi bước ≤15 phút!`);
        setQuickTaskInput('');
      }
    } catch (err: any) {
      console.error('Error decomposing task:', err);
      setQuickDecomposeNotice('Đã tạo các vi bước mẫu dựa trên nguyên tắc Fail-Fast.');
    } finally {
      setIsQuickDecomposing(false);
    }
  };

  // Run Challenge Me (Socratic Reasoning)
  const handleRunChallenge = async (customDilemma?: string) => {
    const targetDilemma =
      customDilemma ||
      challengeDilemma ||
      (activeStep ? `Tôi có nên làm "${activeStep.title}" ngay lúc này không?` : 'Tôi có nên làm tính năng này cho MVP không?');

    try {
      setIsChallenging(true);
      const res = await fetch('/api/socratic-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dilemma: targetDilemma,
          context: {
            activeGoalTitle: activeGoal?.title,
            currentTask: activeStep?.title,
          },
        }),
      });

      const data = await res.json();
      setChallengeResult(data);
    } catch (err) {
      console.error('Error running challenge:', err);
    } finally {
      setIsChallenging(false);
    }
  };

  // Attach all steps to Active Goal (Fix Drift Score)
  const handleAlignAllToGoal = () => {
    if (!activeGoal || !onLinkStepToGoal) return;
    microSteps.forEach((step) => {
      onLinkStepToGoal(step.id, activeGoal.id, activeGoal.milestones[0]?.id);
    });
  };

  const handleCreateStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAction.trim()) return;

    const newStep: MicroStep = {
      id: `step_${Date.now()}`,
      order: microSteps.length + 1,
      title: newTitle.trim(),
      durationMinutes: newMinutes,
      programmerPrinciple: newPrinciple,
      inputRequired: 'Ngữ cảnh hiện tại',
      singleAction: newAction.trim(),
      testCriterion: newCriterion.trim() || 'Thao tác chạy thành công không báo lỗi.',
      unblockTip: 'Nếu mất quá 3 phút, hãy tạm thời bỏ qua chi tiết phụ.',
      completed: false,
      goalId: activeGoal?.id,
      goalTitle: activeGoal?.title,
      isAlignedWithGoal: !!activeGoal,
    };

    onAddStep(newStep);
    setShowAddModal(false);
    setNewTitle('');
    setNewAction('');
    setNewCriterion('');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sprintProgressPercent =
    totalSprintSeconds > 0
      ? Math.min(100, Math.round(((totalSprintSeconds - timeLeft) / totalSprintSeconds) * 100))
      : 0;

  const completedCount = microSteps.filter((s) => s.completed).length;
  const totalCount = microSteps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remainingMinutes = microSteps
    .filter((s) => !s.completed)
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  // =========================================================================
  // DRIFT SCORE CALCULATION (Solo Dev Focus Meter)
  // =========================================================================
  const alignedStepsCount = microSteps.filter(
    (s) => s.isAlignedWithGoal || (activeGoal && s.goalId === activeGoal.id)
  ).length;
  const coreGoalAlignmentPercent = totalCount > 0 ? Math.round((alignedStepsCount / totalCount) * 100) : 100;
  
  // Drift status determination: < 50% turns Yellow (Màu Vàng)
  const isDriftWarning = coreGoalAlignmentPercent < 50;
  const isDriftCaution = coreGoalAlignmentPercent >= 50 && coreGoalAlignmentPercent < 70;

  const totalEstimatedMinutes = microSteps.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalElapsedSeconds = Object.values(elapsedByStepId).reduce((acc, v) => acc + v, 0);
  const totalElapsedMinutes = Math.floor(totalElapsedSeconds / 60);
  const totalElapsedRemainderSecs = totalElapsedSeconds % 60;
  const overallEffortPercent =
    totalEstimatedMinutes > 0
      ? Math.round((totalElapsedSeconds / (totalEstimatedMinutes * 60)) * 100)
      : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 relative">
      {/* ========================================================================= */}
      {/* 1. DRIFT SCORE PROGRESS BAR (SOLO DEV CORE GOAL FOCUS) */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-xl border transition-all ${
        isDriftWarning
          ? 'bg-yellow-950/40 border-yellow-500/70 shadow-lg shadow-yellow-500/10'
          : isDriftCaution
          ? 'bg-amber-950/30 border-amber-500/50'
          : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <Target className={`w-4 h-4 ${
              isDriftWarning ? 'text-yellow-400' : isDriftCaution ? 'text-amber-400' : 'text-emerald-400'
            }`} />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Thanh Tiến Độ Phục Vụ Mục Tiêu Chính (Core Goal Alignment):
            </span>
            <span className="text-xs font-mono font-bold text-slate-200">
              {activeGoal ? activeGoal.title : 'Chưa chọn Core Goal'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              isDriftWarning
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                : isDriftCaution
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {coreGoalAlignmentPercent}% phục vụ Core Goal
            </span>

            {isDriftWarning && activeGoal && (
              <button
                onClick={handleAlignAllToGoal}
                className="text-[11px] font-semibold px-2.5 py-1 rounded bg-yellow-500 hover:bg-yellow-400 text-black font-mono transition-colors shadow-md"
                title="Gắn toàn bộ các task hiện tại vào Core Goal"
              >
                ⚡ Gắn tất cả vào Core Goal
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar (Color changes to yellow if < 50%) */}
        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 ${
              isDriftWarning
                ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
                : isDriftCaution
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${coreGoalAlignmentPercent}%` }}
          />
        </div>

        {/* Status description */}
        <div className="flex justify-between items-center mt-2 text-[11px]">
          <span className={`${
            isDriftWarning ? 'text-yellow-300 font-semibold' : isDriftCaution ? 'text-amber-300' : 'text-slate-400'
          }`}>
            {isDriftWarning
              ? '⚠️ Cảnh báo trôi dạt mục tiêu (Drift Alert): Dưới 50% vi bước phục vụ Core Goal! Hãy tập trung vào việc sống còn.'
              : isDriftCaution
              ? '⚡ Cảnh báo phân tâm nhẹ: Một vài vi bước phụ chưa liên kết trực tiếp với mục tiêu chính.'
              : '✅ Tuyệt vời! Bạn đang tập trung hoàn toàn vào việc tạo ra giá trị then chốt cho sản phẩm.'}
          </span>
          <span className="text-slate-500 font-mono">
            {alignedStepsCount}/{totalCount} vi bước
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INSTANT TASK DECOMPOSER (FLASH-LITE POWERED FOR SOLO DEVS) */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/40 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
            <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>CHIA NHỎ TASK SIÊU TỐC (≤ 15 PHÚT · FLASH-LITE)</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            6 nguyên lý lập trình & tiêu chuẩn TDD/Fail-Fast
          </span>
        </div>

        <form onSubmit={handleQuickDecomposeTask} className="flex gap-2">
          <input
            type="text"
            value={quickTaskInput}
            onChange={(e) => setQuickTaskInput(e.target.value)}
            placeholder="Nhập task bất kỳ (VD: Tích hợp Stripe Checkout, Fix lỗi crash khi kết nối DB, Setup Auth)..."
            className="flex-1 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isQuickDecomposing || !quickTaskInput.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 font-bold text-xs text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all shrink-0"
          >
            {isQuickDecomposing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang bẻ nhỏ...</span>
              </>
            ) : (
              <>
                <Split className="w-3.5 h-3.5" />
                <span>Bẻ nhỏ task ≤15p</span>
              </>
            )}
          </button>
        </form>

        {quickDecomposeNotice && (
          <div className="p-2.5 bg-indigo-950/80 border border-indigo-500/40 rounded-lg text-xs text-indigo-300 font-mono flex items-center justify-between">
            <span>{quickDecomposeNotice}</span>
            <button onClick={() => setQuickDecomposeNotice(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. POMODORO TIMER & FOCUS OVERVIEW */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-indigo-400 font-semibold uppercase tracking-wider">
              Solo Dev Focus Station
            </span>
            <span aria-hidden="true">·</span>
            <span>Pomodoro & Vi Bước ≤15 Phút</span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Đồng Hồ Thực Thi & Kiểm Chứng TDD/Fail-Fast
          </h2>
        </div>

        {/* Progress & Effort summary */}
        <div className="flex items-center gap-4 sm:gap-6 sm:border-l sm:border-slate-800 sm:pl-6 shrink-0 flex-wrap">
          <div>
            <div className="text-[11px] text-slate-400">Tiến độ vi bước</div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {completedCount} / {totalCount}{' '}
              <span className="text-xs text-indigo-400 font-normal">({progressPercent}%)</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400">Thực tế đã dùng</div>
            <div className="text-base font-bold font-mono text-amber-400 tabular-nums">
              {totalElapsedMinutes}m {totalElapsedRemainderSecs > 0 ? `${totalElapsedRemainderSecs}s` : ''}
              <span className="text-[10px] text-slate-500 font-normal ml-1">({overallEffortPercent}%)</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400">Dự toán còn lại</div>
            <div className="text-base font-bold font-mono text-emerald-400 tabular-nums">
              ~{remainingMinutes} <span className="text-xs font-normal text-slate-400">phút</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE STEP SPOTLIGHT (Trọng tâm hiện tại) */}
      {activeStep && (
        <div className="p-5 rounded-xl bg-slate-900 border-2 border-indigo-600/70 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                BƯỚC {activeStep.order} / {totalCount}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Dự toán: {activeStep.durationMinutes} phút
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-amber-300 font-medium">
                Nguyên lý: {activeStep.programmerPrinciple}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activePomodoros > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60">
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>{activePomodoros} 🍅 Pomodoro</span>
                </span>
              )}
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pomodoro Station</span>
              </span>
            </div>
          </div>

          {/* Traceability: Long-term Goal Linkage */}
          <div className="flex items-center justify-between gap-3 text-xs bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {activeStep.goalTitle ? (
                <div className="truncate">
                  <span className="text-slate-400 text-[11px]">Truy vết mục tiêu: </span>
                  <span className="font-semibold text-slate-200">🎯 {activeStep.goalTitle}</span>
                  {activeStep.milestoneTitle && (
                    <span className="text-slate-400 text-[11px]"> ➔ 📌 {activeStep.milestoneTitle}</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-yellow-300">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Chưa liên kết Core Goal (Nguy cơ gây Drift)</span>
                </div>
              )}
            </div>

            {!activeStep.goalTitle && activeGoal && onLinkStepToGoal && (
              <button
                onClick={() => onLinkStepToGoal(activeStep.id, activeGoal.id, activeGoal.milestones[0]?.id)}
                className="px-2 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors"
              >
                <Link2 className="w-3 h-3" />
                <span>Gắn vào {activeGoal.title.slice(0, 16)}...</span>
              </button>
            )}
          </div>

          {/* Main Title & Action Details */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-bold text-white leading-snug">
                {activeStep.title}
              </h3>
              <AudioPlayerButton textToSpeak={`${activeStep.title}. Hành động cụ thể: ${activeStep.singleAction}. Tiêu chí kiểm chứng: ${activeStep.testCriterion}`} />
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Hành động duy nhất (Single Action)</span>
                </div>
                <div className="font-mono text-slate-200">
                  {activeStep.singleAction}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-emerald-950/60 space-y-1">
                <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tiêu chí kiểm chứng TDD / Fail-Fast</span>
                </div>
                <div className="text-slate-300">
                  {activeStep.testCriterion}
                </div>
              </div>
            </div>
          </div>

          {/* Pomodoro Timer Engine Controls */}
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-950/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Chế độ:</span>
                <button
                  onClick={() => handleSelectSprintMode('micro')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    sprintMode === 'micro'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Vi bước ({activeStep.durationMinutes}p)
                </button>
                <button
                  onClick={() => handleSelectSprintMode('nano')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    sprintMode === 'nano'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Nano Sprint (2p)
                </button>
                <button
                  onClick={() => handleSelectSprintMode('pomodoro')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    sprintMode === 'pomodoro'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pomodoro (25p)
                </button>
                <button
                  onClick={() => handleSelectSprintMode('break')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    sprintMode === 'break'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Nghỉ ngắn (5p)
                </button>
              </div>

              <button
                onClick={() => setSoundAlertEnabled(!soundAlertEnabled)}
                className={`p-1.5 rounded text-xs transition-colors ${
                  soundAlertEnabled
                    ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-950/40'
                    : 'text-slate-500 hover:text-slate-400 bg-slate-900'
                }`}
                title={soundAlertEnabled ? 'Tắt âm báo khi hết giờ' : 'Bật âm báo khi hết giờ'}
              >
                {soundAlertEnabled ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Timer Display & Main Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-mono font-black text-white tabular-nums tracking-tight">
                  {formatTimer(timeLeft)}
                </span>
                <span className="text-xs text-slate-400">
                  {isTimerRunning ? 'Đang bấm giờ tập trung...' : 'Đang tạm dừng'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                    isTimerRunning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  }`}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Tạm Dừng</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Bắt Đầu Tập Trung</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimeLeft(totalSprintSeconds);
                  }}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                  title="Đặt lại đồng hồ"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onToggleComplete(activeStep.id)}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                    activeStep.completed
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 shadow-md'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{activeStep.completed ? 'Đã Xong' : 'Hoàn Thành'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ALL MICRO STEPS LIST */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Danh Sách Tất Cả Vi Bước ({completedCount}/{totalCount} hoàn thành)
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Vi Bước Thủ Công</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {microSteps.map((step) => {
            const isCurrentActive = step.id === activeStepId;
            const isExpanded = !!expandedStepIds[step.id];

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrentActive
                    ? 'bg-slate-900 border-indigo-500 shadow-md'
                    : step.completed
                    ? 'bg-slate-950/60 border-slate-900 opacity-60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleComplete(step.id)}
                      className="mt-0.5 text-slate-400 hover:text-white transition-colors"
                    >
                      {step.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div
                      onClick={() => setActiveStepId(step.id)}
                      className="flex-1 cursor-pointer min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          #{step.order}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            step.completed ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {step.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {step.durationMinutes}p
                        </span>
                        <span className="text-[10px] font-medium text-amber-300/80">
                          {step.programmerPrinciple}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-mono">
                        {step.singleAction}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleExpand(step.id)}
                      className="p-1 rounded text-slate-500 hover:text-slate-300"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-2 bg-slate-950/40 p-3 rounded-lg">
                    <div>
                      <span className="text-slate-400 font-semibold">Tiêu chí kiểm chứng TDD/Fail-Fast: </span>
                      <span className="text-emerald-300">{step.testCriterion}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Mẹo gỡ rối: </span>
                      <span className="text-slate-300">{step.unblockTip}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. FLOATING & INLINE "CHALLENGE ME" (WHY-FIRST SOCRATIC BUTTON) */}
      {/* ========================================================================= */}
      <button
        onClick={() => {
          setShowChallengeModal(true);
          if (!challengeResult) {
            handleRunChallenge();
          }
        }}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-2.5 shadow-2xl shadow-rose-600/40 border border-amber-400/30 group hover:scale-105 transition-all"
        title="Bấm để AI đóng vai trò Co-founder phản biện câu hỏi Why-First"
      >
        <ShieldQuestion className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition-transform" />
        <span>🎯 Challenge me (Thách thức tôi)</span>
      </button>

      {/* Socratic Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl shadow-amber-500/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Lightbulb className="w-5 h-5" />
                <span>CỐ VẤN PHẢN BIỆN ĐỘC LẬP (WHY-FIRST SPARRED PARTNER)</span>
              </div>
              <button
                onClick={() => setShowChallengeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn đang làm một mình và cảm thấy bế tắc hoặc nghi ngờ về tính cấp thiết của công việc hiện tại? Hãy để AI đóng vai trò <strong>Virtual Co-founder</strong> chất vấn logic của bạn:
            </p>

            {/* Question Quick Chips */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 uppercase font-bold">Chọn câu hỏi phản biện nhanh:</label>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => {
                    const q = 'Tại sao tính năng này là bắt buộc cho MVP mà không thể hoãn lại sau?';
                    setChallengeDilemma(q);
                    handleRunChallenge(q);
                  }}
                  className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors flex items-center justify-between"
                >
                  <span>1. Tại sao tính năng này bắt buộc cho MVP?</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </button>

                <button
                  onClick={() => {
                    const q = 'Tôi có đang rơi vào bẫy Premature Optimization (tối ưu quá sớm) không?';
                    setChallengeDilemma(q);
                    handleRunChallenge(q);
                  }}
                  className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors flex items-center justify-between"
                >
                  <span>2. Tôi có đang tối ưu quá sớm thay vì ship sản phẩm?</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </button>

                <button
                  onClick={() => {
                    const q = 'Làm sao để làm một bản thô (dumb version) trong 30 phút để kiểm chứng nhu cầu trước?';
                    setChallengeDilemma(q);
                    handleRunChallenge(q);
                  }}
                  className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors flex items-center justify-between"
                >
                  <span>3. Có cách nào làm bản thô trong 30 phút không?</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </button>
              </div>
            </div>

            {/* Custom Query Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={challengeDilemma}
                onChange={(e) => setChallengeDilemma(e.target.value)}
                placeholder="Nhập câu hỏi khúc mắc của bạn..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleRunChallenge()}
                disabled={isChallenging}
                className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                {isChallenging ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Phản biện</span>
              </button>
            </div>

            {/* Challenge Result View */}
            {challengeResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3 text-xs">
                {challengeResult.whyRootProblem && (
                  <div>
                    <div className="text-amber-400 font-bold uppercase text-[10px]">🎯 Vấn Đề Gốc Rễ (Root Why)</div>
                    <div className="text-slate-200 mt-1">{challengeResult.whyRootProblem}</div>
                  </div>
                )}

                {challengeResult.tradeOffsAndRisks && (
                  <div>
                    <div className="text-rose-400 font-bold uppercase text-[10px]">⚠️ Đánh Đổi & Bẫy Cần Tránh</div>
                    <div className="text-slate-300 mt-1">{challengeResult.tradeOffsAndRisks}</div>
                  </div>
                )}

                {challengeResult.howRecommendation && (
                  <div>
                    <div className="text-emerald-400 font-bold uppercase text-[10px]">🛠️ Lời Khuyên Tinh Gọn Cho Solo Dev</div>
                    <div className="text-slate-200 font-medium mt-1">{challengeResult.howRecommendation}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Step Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Thêm Vi Bước Lập Trình Mới (≤ 15 Phút)</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateStep} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Tiêu đề vi bước (Nguyên tử, 5–15 phút):</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Viết test case kiểm tra hàm tính tổng"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Hành động cụ thể duy nhất (Single Action):</label>
                <input
                  type="text"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  placeholder="VD: Mở file math.spec.ts và thêm describe('sum')"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Thời gian (phút ≤ 15):</label>
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nguyên lý lập trình:</label>
                  <select
                    value={newPrinciple}
                    onChange={(e) => setNewPrinciple(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="Divide & Conquer">Divide & Conquer</option>
                    <option value="Atomic Commit">Atomic Commit</option>
                    <option value="TDD Loop">TDD Loop</option>
                    <option value="Fail Fast">Fail Fast</option>
                    <option value="YAGNI / Minimal Surface">YAGNI / Minimal Surface</option>
                    <option value="Boundary Isolation">Boundary Isolation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tiêu chuẩn kiểm chứng hoàn thành (TDD/Fail-Fast):</label>
                <input
                  type="text"
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  placeholder="VD: npm test chạy pass không lỗi trong dưới 3 phút"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-md"
                >
                  Tạo Vi Bước
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
