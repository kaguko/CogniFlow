import React, { useState, useEffect } from 'react';
import { MicroStep, ProjectContext } from '../types';
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
  Bell,
  BellOff,
  BellRing,
  Coffee,
  Flame,
  Minus,
  Timer,
  Volume2,
  Target,
  Link2,
} from 'lucide-react';
import { AudioPlayerButton } from './AudioPlayerButton';
import { playCompletionAlert } from '../utils/audioPlayer';
import { LongTermGoal } from '../types';

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

  // New step form state
  const [newTitle, setNewTitle] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newCriterion, setNewCriterion] = useState('');
  const [newMinutes, setNewMinutes] = useState(10);
  const [newPrinciple, setNewPrinciple] = useState<MicroStep['programmerPrinciple']>('Divide & Conquer');

  // Pomodoro / Execution Sprint Timer State
  const activeStep = microSteps.find((s) => s.id === activeStepId) || microSteps[0];
  const [sprintMode, setSprintMode] = useState<SprintMode>('nano');
  const [targetedNanoId, setTargetedNanoId] = useState<string | null>(null);
  const [targetedNanoText, setTargetedNanoText] = useState<string>('');
  const [totalSprintSeconds, setTotalSprintSeconds] = useState<number>(120); // 2 mins for nano-step sprint
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(true);
  const [showCompletionAlert, setShowCompletionAlert] = useState<boolean>(false);

  // When active step changes, reset context
  useEffect(() => {
    if (activeStep) {
      if (sprintMode === 'micro') {
        const secs = (activeStep.durationMinutes || 10) * 60;
        setTotalSprintSeconds(secs);
        setTimeLeft(secs);
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
    let seconds = 120;
    if (mode === 'nano') {
      seconds = 120; // 2 minutes for breaking procrastination on nano-steps
    } else if (mode === 'micro') {
      seconds = (activeStep?.durationMinutes || 10) * 60;
    } else if (mode === 'pomodoro') {
      seconds = 25 * 60; // 25 minutes classic pomodoro
    } else if (mode === 'break') {
      seconds = 5 * 60; // 5 minutes recovery rest
    }
    setTotalSprintSeconds(seconds);
    setTimeLeft(seconds);
    setIsTimerRunning(false);
  };

  // Launch a 2-minute timed sprint for a specific nano step
  const handleStartNanoSprint = (nanoId: string, nanoText: string) => {
    setSprintMode('nano');
    setTargetedNanoId(nanoId);
    setTargetedNanoText(nanoText);
    setTotalSprintSeconds(120);
    setTimeLeft(120);
    setIsTimerRunning(true);
    setShowCompletionAlert(false);
  };

  // Adjust time by +/- 1 minute
  const handleAdjustTime = (deltaSeconds: number) => {
    setTimeLeft((prev) => {
      const next = Math.max(10, prev + deltaSeconds);
      if (next > totalSprintSeconds) {
        setTotalSprintSeconds(next);
      }
      return next;
    });
  };

  // Timer interval & completion sound alert
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      if (soundAlertEnabled) {
        playCompletionAlert();
      }
      setShowCompletionAlert(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, timeLeft, soundAlertEnabled]);

  const toggleExpand = (id: string) => {
    setExpandedStepIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDecomposeActive = async () => {
    if (!activeStep) return;
    try {
      setIsDecomposing(true);
      await onDecomposeStep(activeStep.id, currentContext.currentFriction);
      // Auto expand to see nano steps
      setExpandedStepIds((prev) => ({ ...prev, [activeStep.id]: true }));
    } finally {
      setIsDecomposing(false);
    }
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Flow-State Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-indigo-400 font-semibold uppercase tracking-wider">
              Bộ Công Cụ Phân Rã Vi Bước
            </span>
            <span aria-hidden="true">·</span>
            <span>Pomodoro Focus Sprints (Timed Execution)</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Xử Lý Từng Bước Nhỏ 5–15 Phút & Pomodoro Nano Sprints
          </h2>
          <p className="text-xs text-slate-300">
            Tránh tê liệt phân tích: Thực thi các phiên sprint định giờ 2–15 phút kết hợp chuông báo hoàn tất âm thanh.
          </p>
        </div>

        {/* Progress summary */}
        <div className="flex items-center gap-6 sm:border-l sm:border-slate-800 sm:pl-6 shrink-0">
          <div>
            <div className="text-[11px] text-slate-400">Tiến độ vi bước</div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {completedCount} / {totalCount}{' '}
              <span className="text-xs text-indigo-400 font-normal">({progressPercent}%)</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400">Thời gian ước tính còn</div>
            <div className="text-base font-bold font-mono text-emerald-400 tabular-nums">
              ~{remainingMinutes} <span className="text-xs font-normal text-slate-400">phút</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
        <div
          className="bg-indigo-500 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ACTIVE STEP SPOTLIGHT (Trọng tâm hiện tại) */}
      {activeStep && (
        <div className="p-5 rounded-lg bg-slate-900 border-2 border-indigo-600/70 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                BƯỚC {activeStep.order} / {totalCount}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activeStep.durationMinutes} phút
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-amber-300 font-medium">
                Nguyên lý: {activeStep.programmerPrinciple}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pomodoro Focus Station</span>
              </span>
            </div>
          </div>

          {/* Traceability: Long-term Goal Linkage */}
          <div className="flex items-center justify-between gap-3 text-xs bg-slate-950/70 p-2.5 rounded border border-slate-800">
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
                <div className="flex items-center gap-1.5 text-amber-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold text-[11px]">Cảnh báo Drift:</span>
                  <span className="text-slate-400 text-[11px]">Bước này chưa gắn vào mục tiêu dài hạn</span>
                </div>
              )}
            </div>

            {!activeStep.goalTitle && activeGoal && onLinkStepToGoal && (
              <button
                onClick={() =>
                  onLinkStepToGoal(
                    activeStep.id,
                    activeGoal.id,
                    activeGoal.milestones[0]?.id
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 shrink-0 transition-colors"
                title={`Gán vào ${activeGoal.title}`}
              >
                <Link2 className="w-3 h-3" />
                <span>Gán vào "{activeGoal.title.slice(0, 18)}..."</span>
              </button>
            )}
          </div>

          {/* POMODORO FOCUS TIMER WIDGET */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-indigo-900/60 space-y-3 shadow-inner">
            {/* Mode Presets & Sound Alert Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleSelectSprintMode('nano')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    sprintMode === 'nano'
                      ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300 shadow-sm font-semibold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>⚡ Nano Sprint (2m)</span>
                </button>

                <button
                  onClick={() => handleSelectSprintMode('micro')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    sprintMode === 'micro'
                      ? 'bg-indigo-500/20 border border-indigo-500/60 text-indigo-300 shadow-sm font-semibold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>🎯 Vi Bước ({activeStep.durationMinutes}m)</span>
                </button>

                <button
                  onClick={() => handleSelectSprintMode('pomodoro')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    sprintMode === 'pomodoro'
                      ? 'bg-rose-500/20 border border-rose-500/60 text-rose-300 shadow-sm font-semibold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>🍅 Pomodoro (25m)</span>
                </button>

                <button
                  onClick={() => handleSelectSprintMode('break')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    sprintMode === 'break'
                      ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 shadow-sm font-semibold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                  <span>☕ Nghỉ Nhanh (5m)</span>
                </button>
              </div>

              {/* Sound & Alert Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundAlertEnabled(!soundAlertEnabled)}
                  className={`p-1.5 rounded flex items-center gap-1 text-xs border transition-colors ${
                    soundAlertEnabled
                      ? 'bg-indigo-950/80 border-indigo-800 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                  }`}
                  title={soundAlertEnabled ? 'Chuông âm thanh: BẬT' : 'Chuông âm thanh: TẮT'}
                >
                  {soundAlertEnabled ? <BellRing className="w-3.5 h-3.5 text-amber-400" /> : <BellOff className="w-3.5 h-3.5" />}
                  <span className="text-[11px] hidden sm:inline">
                    {soundAlertEnabled ? 'Chuông Bật' : 'Tắt Chuông'}
                  </span>
                </button>

                <button
                  onClick={() => playCompletionAlert()}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] transition-colors flex items-center gap-1"
                  title="Phát thử âm thanh chuông kết thúc sprint"
                >
                  <Volume2 className="w-3 h-3 text-slate-400" />
                  <span>Thử Âm</span>
                </button>
              </div>
            </div>

            {/* Timer Center Display & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tabular-nums tracking-wider drop-shadow-sm">
                    {formatTimer(timeLeft)}
                  </div>

                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isTimerRunning
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse'
                          : timeLeft === 0
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isTimerRunning ? 'Đang Tập Trung' : timeLeft === 0 ? 'Hết Giờ Sprint' : 'Sẵn Sàng'}
                    </span>
                    <div className="text-[11px] text-slate-400">
                      {sprintMode === 'nano' && 'Nano Sprint phá băng trì hoãn'}
                      {sprintMode === 'micro' && 'Thực thi vi bước nguyên tử'}
                      {sprintMode === 'pomodoro' && 'Trạng thái tập trung sâu (Deep Work)'}
                      {sprintMode === 'break' && 'Thư giãn nhận thức ngắn'}
                    </div>
                  </div>
                </div>

                {/* Target context label */}
                <div className="text-xs text-slate-300 flex items-center gap-1.5 pt-1">
                  <span className="text-slate-500 font-medium">🎯 Mục tiêu phiên:</span>
                  <span className="text-indigo-300 font-medium truncate max-w-sm">
                    {targetedNanoText ? `Nano: "${targetedNanoText}"` : activeStep.title}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAdjustTime(-60)}
                  disabled={timeLeft <= 60}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-slate-800 transition-colors"
                  title="Giảm 1 phút"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-4 py-2 rounded font-bold text-xs flex items-center gap-2 shadow-md transition-all ${
                    isTimerRunning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Tạm Dừng</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{timeLeft < totalSprintSeconds ? 'Tiếp Tục' : 'Bắt Đầu Sprint'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleAdjustTime(60)}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                  title="Tăng 1 phút"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setTimeLeft(totalSprintSeconds);
                    setIsTimerRunning(false);
                    setShowCompletionAlert(false);
                  }}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                  title="Đặt lại đồng hồ"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sprint Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/80">
                <div
                  className={`h-full transition-all duration-300 ${
                    sprintMode === 'break' ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${sprintProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Tiến độ sprint: {sprintProgressPercent}%</span>
                <span>Còn lại: {formatTimer(timeLeft)}</span>
              </div>
            </div>
          </div>

          {/* AUDIBLE SPRINT COMPLETION ALERT BANNER */}
          {showCompletionAlert && (
            <div className="p-4 rounded-lg bg-emerald-950/80 border-2 border-emerald-500/80 shadow-lg space-y-3 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <BellRing className="w-4 h-4 text-amber-300 animate-bounce" />
                  <span>Sprint Kết Thúc! Chuông Báo Đã Kêu 🔔</span>
                </div>
                <button
                  onClick={() => setShowCompletionAlert(false)}
                  className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-0.5 rounded bg-emerald-900/50"
                >
                  Đóng
                </button>
              </div>

              <p className="text-xs text-slate-200">
                Bạn đã hoàn thành phiên tập trung vừa rồi. Hãy kiểm tra kết quả ngay:
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {targetedNanoId && (
                  <button
                    onClick={() => {
                      onToggleNanoStep(activeStep.id, targetedNanoId);
                      setShowCompletionAlert(false);
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đánh Dấu Xong Nano-Step Này</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onToggleComplete(activeStep.id);
                    setShowCompletionAlert(false);
                  }}
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Hoàn Thành Luôn Bước #{activeStep.order}</span>
                </button>

                <button
                  onClick={() => handleSelectSprintMode('break')}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nghỉ Ngơi 5 Phút</span>
                </button>

                <button
                  onClick={() => {
                    setTimeLeft(120);
                    setTotalSprintSeconds(120);
                    setIsTimerRunning(true);
                    setShowCompletionAlert(false);
                  }}
                  className="px-3 py-1.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-xs flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thêm 2 Phút Sprint</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Step Content */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-bold text-white tracking-tight">
                {activeStep.title}
              </h3>
              <AudioPlayerButton
                textToSpeak={`Bước ${activeStep.order}: ${activeStep.title}. Hành động cần làm ngay: ${activeStep.singleAction}. Tiêu chí hoàn thành: ${activeStep.testCriterion}`}
                label="Voice Hướng Dẫn"
              />
            </div>

            {/* Single Action Box */}
            <div className="p-3 rounded bg-slate-950 border border-indigo-900/60 space-y-1">
              <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Hành Động Cụ Thể Duy Nhất (Single Action)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-mono leading-relaxed">
                {activeStep.singleAction}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Test Criterion */}
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                  ✅ Tiêu Chuẩn Kiểm Chứng (Test Criterion)
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {activeStep.testCriterion}
                </p>
              </div>

              {/* Unblock Tip */}
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                  ⚡ Mẹo Gỡ Nghẽn (Nếu Kẹt &gt;3 Phút)
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {activeStep.unblockTip}
                </p>
              </div>
            </div>

            {/* Nano Steps (If decomposed) */}
            {activeStep.nanoSteps && activeStep.nanoSteps.length > 0 && (
              <div className="p-3.5 rounded bg-slate-950/90 border border-indigo-800/50 space-y-2.5">
                <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Split className="w-3.5 h-3.5 text-indigo-400" />
                    <span>3 Nano-Steps (2 Phút Mỗi Bước - Đập Tan Do Dự):</span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-mono">Bấm Sprint 2m để chạy giờ</span>
                </div>
                <div className="space-y-2">
                  {activeStep.nanoSteps.map((nano) => {
                    const isTargeted = targetedNanoId === nano.id;
                    return (
                      <div
                        key={nano.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded border transition-all ${
                          isTargeted
                            ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <button
                          onClick={() => onToggleNanoStep(activeStep.id, nano.id)}
                          className="flex items-center gap-2.5 text-left min-w-0 flex-1 text-xs"
                        >
                          {nano.done ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span
                            className={nano.done ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}
                          >
                            {nano.text}
                          </span>
                        </button>

                        <button
                          onClick={() => handleStartNanoSprint(nano.id, nano.text)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all shrink-0 ${
                            isTargeted && isTimerRunning
                              ? 'bg-amber-600 text-white shadow animate-pulse'
                              : 'bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800'
                          }`}
                          title="Bắt đầu phiên Sprint 2 phút cho nano-step này"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>{isTargeted && isTimerRunning ? 'Đang Chạy...' : 'Sprint 2m'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons on Active Step */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={handleDecomposeActive}
              disabled={isDecomposing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-950/80 border border-amber-800/60 rounded transition-colors disabled:opacity-50"
            >
              <Split className={`w-3.5 h-3.5 ${isDecomposing ? 'animate-spin' : ''}`} />
              <span>{isDecomposing ? 'Đang phân rã...' : 'Đang Kẹt? Chia Nhỏ Thành 3 Nano-Steps (2 Phút)'}</span>
            </button>

            <button
              onClick={() => onToggleComplete(activeStep.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded transition-colors shadow ${
                activeStep.completed
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{activeStep.completed ? 'Đánh Dấu Chưa Xong' : 'Hoàn Thành Bước Này!'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ALL STEPS SEQUENCE LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Danh Sách Trình Tự Vi Bước ({microSteps.length})
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Vi Bước Thủ Công</span>
          </button>
        </div>

        <div className="space-y-2">
          {microSteps.map((step) => {
            const isSelected = step.id === activeStepId;
            const isExpanded = !!expandedStepIds[step.id];

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  step.completed
                    ? 'bg-slate-950/40 border-slate-900 opacity-75'
                    : isSelected
                    ? 'bg-slate-900/90 border-indigo-600/70 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => onToggleComplete(step.id)}
                      className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                    >
                      {step.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>

                    <button
                      onClick={() => setActiveStepId(step.id)}
                      className="text-left min-w-0 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          #{step.order}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            step.completed
                              ? 'line-through text-slate-500'
                              : isSelected
                              ? 'text-indigo-300'
                              : 'text-slate-200 group-hover:text-white'
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                        <span className="font-mono tabular-nums">{step.durationMinutes}m</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-400">{step.programmerPrinciple}</span>
                        {step.goalTitle ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-indigo-400 font-medium">🎯 {step.goalTitle}</span>
                          </>
                        ) : (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-400 font-medium">⚠️ Chưa gắn mục tiêu</span>
                          </>
                        )}
                        {step.nanoSteps && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-indigo-400">
                              {step.nanoSteps.filter((n) => n.done).length}/{step.nanoSteps.length} nano-steps
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActiveStepId(step.id)}
                      className={`text-xs px-2.5 py-1 rounded transition-colors ${
                        isSelected
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isSelected ? 'Đang chọn' : 'Thực hiện'}
                    </button>
                    <button
                      onClick={() => toggleExpand(step.id)}
                      className="text-slate-500 hover:text-slate-300 p-1"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 font-medium">Hành động duy nhất: </span>
                      <span className="font-mono text-slate-200">{step.singleAction}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Tiêu chí kiểm chứng: </span>
                      <span>{step.testCriterion}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Mẹo gỡ nghẽn: </span>
                      <span className="text-amber-300/80">{step.unblockTip}</span>
                    </div>

                    {step.nanoSteps && (
                      <div className="pt-2 space-y-1">
                        <div className="text-[11px] font-semibold text-slate-400">Nano-steps:</div>
                        {step.nanoSteps.map((ns) => (
                          <div
                            key={ns.id}
                            className="flex items-center justify-between gap-2 text-xs p-1.5 rounded hover:bg-slate-900/60"
                          >
                            <button
                              onClick={() => onToggleNanoStep(step.id, ns.id)}
                              className="flex items-center gap-2 text-left flex-1"
                            >
                              {ns.done ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              )}
                              <span className={ns.done ? 'line-through text-slate-500' : 'text-slate-300'}>
                                {ns.text}
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveStepId(step.id);
                                handleStartNanoSprint(ns.id, ns.text);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/80 hover:bg-indigo-900"
                            >
                              Sprint 2m
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Step Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Thêm Vi Bước Lập Trình Mới</h3>
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
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
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
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Thời gian (phút):</label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nguyên lý lập trình:</label>
                  <select
                    value={newPrinciple}
                    onChange={(e) => setNewPrinciple(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-white"
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
                <label className="block text-slate-400 mb-1">Tiêu chuẩn kiểm chứng hoàn thành:</label>
                <input
                  type="text"
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  placeholder="VD: npm test chạy pass không lỗi"
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-white placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
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

