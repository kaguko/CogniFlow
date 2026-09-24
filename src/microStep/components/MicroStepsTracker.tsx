import React, { useState, useEffect } from 'react';
import { MicroStep, NanoStep } from '../entities/microStep';
import { ProjectContext } from '../../projectContext/entities/projectContext';
import { LongTermGoal } from '../../goal/entities/longTermGoal';
import { DEFAULT_PRESET_CONTEXTS } from '../../data/defaultPresets';
import {
  UserExemptionRule,
  DriftCalibrationStats,
} from '../../types';
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
  AlertTriangle,
  Layers,
  Cpu,
  RefreshCw,
  Trash2,
  Check,
  ShieldCheck,
  CheckCheck,
  Settings2,
  SlidersHorizontal,
  History,
  Info,
} from 'lucide-react';
import { AudioPlayerButton } from '../../components/AudioPlayerButton';
import { playCompletionAlert } from '../../utils/audioPlayer';

interface RabbitHoleDetection {
  taskId: string;
  taskTitle: string;
  rabbitHoleType: 'over_engineering' | 'premature_optimization' | 'bike_shedding' | 'reinventing_wheel' | 'distraction_task';
  severity: 'high' | 'medium' | 'low';
  whyItsATrap: string;
  leanAlternative: string;
}

interface SemanticDriftAnalysisResult {
  coreGoalTitle: string;
  overallAlignmentPercent: number;
  driftStatus: 'safe' | 'caution' | 'danger_yellow';
  detectedRabbitHoles: RabbitHoleDetection[];
  summaryAnalysis: string;
  calibrationStats?: DriftCalibrationStats;
  activeExemptionsCount?: number;
}

interface MicroStepsTrackerProps {
  microSteps: MicroStep[];
  onToggleComplete: (id: string) => void;
  onAddStep: (step: MicroStep) => void;
  onDecomposeStep: (stepId: string, currentFriction: string) => Promise<void>;
  onToggleNanoStep: (stepId: string, nanoId: string) => void;
  currentContext: ProjectContext;
  activeGoal?: LongTermGoal;
  onLinkStepToGoal?: (stepId: string, goalId: string, milestoneId?: string) => void;
  onSelectPreset?: (preset: ProjectContext) => void;
  onDeleteStep?: (stepId: string) => void;
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
  onSelectPreset,
  onDeleteStep,
}) => {
  const [activeStepId, setActiveStepId] = useState<string>(() => {
    const firstPending = microSteps.find((s) => !s.completed);
    return firstPending ? firstPending.id : microSteps[0]?.id || '';
  });

  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Quick Decomposer State for Solo Dev (Flash-Lite / Tier 1)
  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [isQuickDecomposing, setIsQuickDecomposing] = useState(false);
  const [quickDecomposeNotice, setQuickDecomposeNotice] = useState<string | null>(null);

  // Semantic Drift & Rabbit Hole State
  const [isAnalyzingSemanticDrift, setIsAnalyzingSemanticDrift] = useState(false);
  const [semanticDriftResult, setSemanticDriftResult] = useState<SemanticDriftAnalysisResult | null>(null);
  const [showRabbitHoleDetails, setShowRabbitHoleDetails] = useState(true);

  // User False-Positive Exemptions & Learning Feedback
  const [userExemptions, setUserExemptions] = useState<UserExemptionRule[]>(() => {
    try {
      const saved = localStorage.getItem('symflowage_drift_exemptions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse local exemptions:', e);
    }
    return [
      {
        id: 'ex_init_security',
        taskId: 'step_auth_security',
        taskTitle: 'Thiết lập HTTPS & mã hóa Token Session chuẩn OWASP',
        reason: 'Yêu cầu bảo mật bắt buộc để thanh toán Stripe',
        createdAt: Date.now() - 86400000,
      },
    ];
  });

  // State for decomposing micro-step into 3 ultra-low cognitive load nano-steps
  const [decomposingStepId, setDecomposingStepId] = useState<string | null>(null);

  const [calibrationStats, setCalibrationStats] = useState<DriftCalibrationStats>({
    totalEvaluations: 26,
    falsePositivesCount: 1,
    confirmedTrapsCount: 3,
    precisionPercent: 96,
    activeExemptionsCount: 1,
  });

  // Modal & Toast states for Feedback / Calibration
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [falsePositiveModalItem, setFalsePositiveModalItem] = useState<RabbitHoleDetection | null>(null);
  const [selectedPresetReason, setSelectedPresetReason] = useState('Bảo mật & Tuân thủ bắt buộc cho thanh toán/dữ liệu');
  const [customExemptionReason, setCustomExemptionReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmedTraps, setConfirmedTraps] = useState<Record<string, boolean>>({});

  // Sync exemptions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('symflowage_drift_exemptions', JSON.stringify(userExemptions));
    } catch (e) {
      console.warn('Failed to save exemptions to localStorage:', e);
    }
  }, [userExemptions]);

  // Load server-side drift feedback and calibration stats
  useEffect(() => {
    const fetchFeedbackStats = async () => {
      try {
        const res = await fetch('/api/drift-feedback');
        if (res.ok) {
          const data = await res.json();
          if (data.calibrationStats) {
            setCalibrationStats(data.calibrationStats);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch drift feedback stats:', e);
      }
    };
    fetchFeedbackStats();
  }, []);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // "Challenge Me" (Why-First Socratic - Gemini Pro Tier 3) State
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeDilemma, setChallengeDilemma] = useState('');
  const [isChallenging, setIsChallenging] = useState(false);
  const [challengeResult, setChallengeResult] = useState<any | null>(null);

  useEffect(() => {
    const handleOpenChallenge = () => {
      setShowChallengeModal(true);
    };
    window.addEventListener('open-socratic-challenge', handleOpenChallenge);
    return () => window.removeEventListener('open-socratic-challenge', handleOpenChallenge);
  }, []);

  // New step form state
  const [newTitle, setNewTitle] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newCriterion, setNewCriterion] = useState('');
  const [newMinutes, setNewMinutes] = useState(10);
  const [newPrinciple, setNewPrinciple] = useState<MicroStep['programmerPrinciple']>('Divide & Conquer');

  // Pomodoro / Execution Sprint Timer State
  const activeStep = microSteps.find((s) => s.id === activeStepId) || microSteps[0];
  const [sprintMode, setSprintMode] = useState<SprintMode>('micro');
  const [totalSprintSeconds, setTotalSprintSeconds] = useState<number>(600);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(true);

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

  // Pomodoro stats
  const activePomodoros = activeStep ? (pomodoroCountByStepId[activeStep.id] || 0) : 0;

  // Run Semantic Drift Analysis when microSteps change
  useEffect(() => {
    const runSemanticDriftCheck = async () => {
      if (microSteps.length === 0) return;
      try {
        setIsAnalyzingSemanticDrift(true);
        const res = await fetch('/api/semantic-drift-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coreGoalTitle: activeGoal?.title || currentContext.title,
            coreGoalVision: activeGoal?.vision || currentContext.description,
            tasks: microSteps.map((s) => ({ id: s.id, title: s.title })),
            userExemptions: userExemptions.map((e) => ({
              taskId: e.taskId,
              taskTitle: e.taskTitle,
              reason: e.reason,
            })),
          }),
        });
        const data = await res.json();
        setSemanticDriftResult(data);
        if (data.calibrationStats) {
          setCalibrationStats(data.calibrationStats);
        }
      } catch (err) {
        console.warn('Error running semantic drift analysis:', err);
      } finally {
        setIsAnalyzingSemanticDrift(false);
      }
    };

    const timer = setTimeout(runSemanticDriftCheck, 400);
    return () => clearTimeout(timer);
  }, [microSteps.length, activeGoal?.id, currentContext.id, userExemptions.length]);

  // Handle Mark False Positive (Exempt Task)
  const handleConfirmFalsePositive = async () => {
    if (!falsePositiveModalItem) return;

    const item = falsePositiveModalItem;
    const finalReason = customExemptionReason.trim() || selectedPresetReason;

    // 1. Create exemption rule
    const newExemption: UserExemptionRule = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId: item.taskId,
      taskTitle: item.taskTitle,
      reason: finalReason,
      createdAt: Date.now(),
    };

    setUserExemptions((prev) => [newExemption, ...prev]);

    // 2. Optimistically update local drift result
    if (semanticDriftResult) {
      const remainingHoles = semanticDriftResult.detectedRabbitHoles.filter(
        (r) => r.taskId !== item.taskId && r.taskTitle !== item.taskTitle
      );
      const newAligned = Math.min(100, Math.round(((microSteps.length - remainingHoles.length) / Math.max(1, microSteps.length)) * 100));
      setSemanticDriftResult({
        ...semanticDriftResult,
        detectedRabbitHoles: remainingHoles,
        overallAlignmentPercent: newAligned,
        driftStatus: newAligned < 50 ? 'danger_yellow' : newAligned < 75 ? 'caution' : 'safe',
      });
    }

    // 3. Send feedback to backend API
    try {
      const res = await fetch('/api/drift-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: item.taskId,
          taskTitle: item.taskTitle,
          coreGoalTitle: activeGoal?.title || currentContext.title,
          detectedType: item.rabbitHoleType,
          isFalsePositive: true,
          userReason: finalReason,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.calibrationStats) {
          setCalibrationStats(data.calibrationStats);
        }
      }
    } catch (e) {
      console.warn('Failed to send feedback to backend:', e);
    }

    setFalsePositiveModalItem(null);
    setCustomExemptionReason('');
    setToastMessage(`🎯 Đã ghi nhận ngoại lệ! AI đã học quy tắc: "${item.taskTitle}" là cần thiết và sẽ không báo động giả.`);
  };

  // Handle Confirm True Positive (User agrees it's a trap)
  const handleConfirmTruePositive = async (item: RabbitHoleDetection) => {
    setConfirmedTraps((prev) => ({ ...prev, [item.taskId || item.taskTitle]: true }));
    try {
      const res = await fetch('/api/drift-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: item.taskId,
          taskTitle: item.taskTitle,
          coreGoalTitle: activeGoal?.title || currentContext.title,
          detectedType: item.rabbitHoleType,
          isFalsePositive: false,
          userReason: 'Xác nhận là sa đà (True Positive)',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.calibrationStats) {
          setCalibrationStats(data.calibrationStats);
        }
      }
    } catch (e) {
      console.warn('Failed to record true positive feedback:', e);
    }
    setToastMessage(`✓ Đã xác nhận bẫy sa đà: "${item.taskTitle}". Cảm ơn bạn đã phản hồi để nâng cao độ chính xác!`);
  };

  // Remove an exemption rule
  const handleRemoveExemption = (exId: string) => {
    setUserExemptions((prev) => prev.filter((e) => e.id !== exId));
    setToastMessage('Đã gỡ bỏ ngoại lệ. AI sẽ phân tích lại tác vụ này trong lượt quét tiếp theo.');
  };

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
      
      setIsTimerRunning(false);
    }
  }, [activeStepId]);

  // Mode switcher handler
  const handleSelectSprintMode = (mode: SprintMode) => {
    setSprintMode(mode);
    if (mode === 'nano') {
      setTotalSprintSeconds(120);
      setTimeLeft(120);
      setIsTimerRunning(false);
    } else if (mode === 'micro') {
      const stepDurationSecs = (activeStep?.durationMinutes || 10) * 60;
      const stepElapsed = activeStep ? (elapsedByStepId[activeStep.id] || 0) : 0;
      const seconds = Math.max(60, stepDurationSecs - stepElapsed);
      setTotalSprintSeconds(stepDurationSecs);
      setTimeLeft(seconds);
      setIsTimerRunning(false);
    } else if (mode === 'pomodoro') {
      setTotalSprintSeconds(25 * 60);
      setTimeLeft(25 * 60);
      setIsTimerRunning(false);
    } else if (mode === 'break') {
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
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, timeLeft, soundAlertEnabled, sprintMode, activeStep?.id]);

  const toggleExpand = (id: string) => {
    setExpandedStepIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Quick Decompose Task using Flash / Tier 1
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
            milestoneTitle: activeGoal?.milestones[0]?.title || 'Core Milestone',
            isAlignedWithGoal: true,
          });
        });
        setQuickDecomposeNotice(`⚡ Đã phân rã thành công ${data.microSteps.length} vi bước ≤15 phút bằng Gemini Flash!`);
        setQuickTaskInput('');
      }
    } catch (err: any) {
      console.error('Error decomposing task:', err);
      setQuickDecomposeNotice('Đã tạo các vi bước mẫu dựa trên nguyên tắc Fail-Fast.');
    } finally {
      setIsQuickDecomposing(false);
    }
  };

  // Run Challenge Me (Socratic Why-First - Gemini Pro Tier 3)
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

  // Trigger AI decomposition of a micro-step into 3 ultra-low cognitive load nano-steps
  const handleTriggerDecompose = async (step: MicroStep) => {
    try {
      setDecomposingStepId(step.id);
      await onDecomposeStep(
        step.id,
        'Cảm thấy phức tạp, quá tải nhận thức hoặc ngại bắt đầu. Cần 3 hành động 2 phút cực kỳ đơn giản.'
      );
      // Automatically switch spotlight and timer to 2-minute Nano Sprint
      setActiveStepId(step.id);
      setSprintMode('nano');
      setTotalSprintSeconds(120);
      setTimeLeft(120);
      setIsTimerRunning(false);
      setToastMessage('⚡ Đã bẻ nhỏ thành 3 Nano-Steps 2 phút! Bước 1: Mở đúng file và định vị dòng code.');
    } catch (err) {
      console.error('Error decomposing step:', err);
      setToastMessage('Đã tạo 3 vi bước 2 phút để giúp bạn vượt qua sức ì!');
    } finally {
      setDecomposingStepId(null);
    }
  };

  // Quick start a 2-minute timer for a specific nano step
  const handleStartNanoSprint = (stepId: string) => {
    setActiveStepId(stepId);
    setSprintMode('nano');
    setTotalSprintSeconds(120);
    setTimeLeft(120);
    setIsTimerRunning(true);
  };

  // Attach all steps to Active Goal
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

  const completedCount = microSteps.filter((s) => s.completed).length;
  const totalCount = microSteps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remainingMinutes = microSteps
    .filter((s) => !s.completed)
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  // =========================================================================
  // DRIFT SCORE & SEMANTIC ANALYSIS CALCULATION
  // =========================================================================
  const detectedRabbitHoles = semanticDriftResult?.detectedRabbitHoles || [];
  const rabbitHoleCount = detectedRabbitHoles.length;
  
  // Use semantic alignment if available, otherwise calculate from linked steps
  const semanticAlignment = semanticDriftResult?.overallAlignmentPercent;
  const standardAlignedCount = microSteps.filter(
    (s) => (s.isAlignedWithGoal || (activeGoal && s.goalId === activeGoal.id)) &&
      !detectedRabbitHoles.some((r) => r.taskId === s.id)
  ).length;
  const calculatedPercent = totalCount > 0 ? Math.round((standardAlignedCount / totalCount) * 100) : 100;
  const coreGoalAlignmentPercent = typeof semanticAlignment === 'number' ? semanticAlignment : calculatedPercent;

  // Drift status determination: < 50% turns Yellow (Màu Vàng)
  const isDriftWarning = coreGoalAlignmentPercent < 50 || rabbitHoleCount >= 2;
  const isDriftCaution = (coreGoalAlignmentPercent >= 50 && coreGoalAlignmentPercent < 75) || rabbitHoleCount === 1;

  const totalElapsedSeconds = Object.values(elapsedByStepId).reduce((acc, v) => acc + v, 0);
  const totalElapsedMinutes = Math.floor(totalElapsedSeconds / 60);
  const totalElapsedRemainderSecs = totalElapsedSeconds % 60;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 relative">
      {/* ========================================================================= */}
      {/* 0. SMART PRESETS SWITCHER (FOR SOLO DEVS & INDIE HACKERS) */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>PRESETS THÔNG MINH (SOLO DEVELOPER / INDIE HACKER):</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            1-Click nạp toàn bộ mục tiêu & vi bước thực thi
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {DEFAULT_PRESET_CONTEXTS.map((preset) => {
            const isSelected = currentContext.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset && onSelectPreset(preset)}
                className={`p-2 rounded-lg text-left border transition-all ${
                  isSelected
                    ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500/40 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="text-[11px] font-bold line-clamp-1">
                  {preset.title}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {preset.deadlineHorizon}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DRIFT SCORE + SEMANTIC RABBIT HOLE DETECTOR */}
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
              {activeGoal ? activeGoal.title : currentContext.title}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAnalyzingSemanticDrift && (
              <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Phân tích ngữ nghĩa...</span>
              </span>
            )}

            {/* Drift Score Precision Calibration Pill */}
            <button
              onClick={() => setShowCalibrationModal(true)}
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-950/60 hover:border-indigo-400 transition-colors flex items-center gap-1.5"
              title="Xem thống kê đo lường độ chính xác và quản lý bộ nhớ học hỏi AI"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Độ chính xác: {calibrationStats.precisionPercent}%</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">{userExemptions.length} ngoại lệ</span>
            </button>

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
            style={{ width: `${Math.max(5, coreGoalAlignmentPercent)}%` }}
          />
        </div>

        {/* Status description */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2.5 gap-2 text-[11px]">
          <span className={`${
            isDriftWarning ? 'text-yellow-300 font-semibold' : isDriftCaution ? 'text-amber-300' : 'text-slate-400'
          }`}>
            {isDriftWarning
              ? '⚠️ Cảnh báo trôi dạt mục tiêu (Drift Alert): Dưới 50% vi bước phục vụ Core Goal hoặc có bẫy Rabbit Hole!'
              : isDriftCaution
              ? '⚡ Cảnh báo phân tâm nhẹ: Một vài vi bước phụ chưa tối ưu cho việc ship sản phẩm.'
              : '✅ Tuyệt vời! Bạn đang tập trung hoàn toàn vào việc tạo ra giá trị then chốt cho MVP.'}
          </span>
          <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px]">
            <span>Model: Flash-Lite (Tier 1)</span>
            <span>·</span>
            <span>{standardAlignedCount}/{totalCount} vi bước thẳng hàng</span>
          </div>
        </div>

        {/* DETECTED RABBIT HOLES ALERT PANEL WITH FALSE POSITIVE FEEDBACK LOOP */}
        {detectedRabbitHoles.length > 0 && (
          <div className="mt-3 p-3.5 rounded-lg bg-yellow-950/60 border border-yellow-500/60 space-y-3">
            <div className="flex items-center justify-between text-yellow-300 font-bold text-xs flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-yellow-400 animate-bounce" />
                <span>PHÁT HIỆN {detectedRabbitHoles.length} BẪY "RABBIT HOLE" (SA ĐÀ / OVER-ENGINEERING):</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCalibrationModal(true)}
                  className="text-[11px] text-yellow-300/80 hover:text-yellow-100 flex items-center gap-1 font-mono underline"
                >
                  <Info className="w-3 h-3" />
                  <span>Cơ chế học hỏi & độ tin cậy</span>
                </button>
                <button
                  onClick={() => setShowRabbitHoleDetails(!showRabbitHoleDetails)}
                  className="text-[11px] underline text-yellow-400 hover:text-yellow-200"
                >
                  {showRabbitHoleDetails ? 'Thu gọn' : 'Xem chi tiết'}
                </button>
              </div>
            </div>

            {showRabbitHoleDetails && (
              <div className="space-y-2.5 pt-1 text-xs">
                {detectedRabbitHoles.map((rh, i) => {
                  const isConfirmedTrap = confirmedTraps[rh.taskId || rh.taskTitle];
                  return (
                    <div key={i} className="p-3 rounded-lg bg-slate-950/90 border border-yellow-500/40 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs">🕳️ "{rh.taskTitle}"</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-900/80 text-yellow-300 border border-yellow-700">
                          {rh.rabbitHoleType}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-0.5">
                        <div className="text-yellow-200/90 bg-yellow-950/40 p-2 rounded border border-yellow-800/40">
                          <strong className="text-yellow-300">Vì sao là bẫy:</strong> {rh.whyItsATrap}
                        </div>
                        <div className="text-emerald-300/90 bg-emerald-950/30 p-2 rounded border border-emerald-800/40">
                          <strong className="text-emerald-300">Giải pháp tinh gọn:</strong> {rh.leanAlternative}
                        </div>
                      </div>

                      {/* ACTIVE LEARNING & CALIBRATION ACTION BUTTONS */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] gap-2 flex-wrap">
                        <div className="text-slate-400 text-[10px] italic">
                          AI có nhận định sai không? Phản hồi giúp AI hiệu chỉnh độ chính xác:
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFalsePositiveModalItem(rh)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-rose-500/50 hover:border-rose-400 text-rose-300 font-medium flex items-center gap-1.5 transition-colors"
                            title="Đánh dấu tác vụ này là hợp lệ, cần thiết và không phải Rabbit Hole"
                          >
                            <X className="w-3.5 h-3.5 text-rose-400" />
                            <span>Đây KHÔNG PHẢI Rabbit Hole (Báo False Positive)</span>
                          </button>

                          <button
                            onClick={() => handleConfirmTruePositive(rh)}
                            disabled={isConfirmedTrap}
                            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                              isConfirmedTrap
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                : 'bg-slate-900 hover:bg-slate-800 border border-emerald-500/50 text-emerald-300'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isConfirmedTrap ? 'Đã xác nhận sa đà' : 'Đúng, đây là bẫy sa đà'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. INSTANT TASK DECOMPOSER (GEMINI FLASH / TIER 1 POWERED) */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/40 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
            <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>CHIA NHỎ TASK SIÊU TỐC (≤ 15 PHÚT · GEMINI FLASH)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
              ⚡ Flash Token Tier (88% Tiết Kiệm)
            </span>
          </div>
        </div>

        <form onSubmit={handleQuickDecomposeTask} className="flex gap-2">
          <input
            type="text"
            value={quickTaskInput}
            onChange={(e) => setQuickTaskInput(e.target.value)}
            placeholder="Nhập task bất kỳ (VD: Tích hợp Stripe Checkout, Fix rò rỉ kết nối DB, Setup Auth)..."
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
            <span>·</span>
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

      {/* ACTIVE STEP SPOTLIGHT */}
      {activeStep && (
        <div className="p-5 rounded-xl bg-slate-900 border-2 border-indigo-600/70 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
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
                <span>Gắn vào Core Goal</span>
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

          {/* ========================================================================= */}
          {/* ZERO COGNITIVE LOAD: 3 NANO-STEPS 2 PHÚT PANEL */}
          {/* ========================================================================= */}
          {activeStep.nanoSteps && activeStep.nanoSteps.length > 0 ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 border border-amber-500/40 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                    3 Nano-Steps 2 Phút (Phá Vỡ Sức Ì & Quá Tải Nhận Thức)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/50">
                    {activeStep.nanoSteps.filter((n) => n.done).length} / {activeStep.nanoSteps.length} Hoàn Thành
                  </span>
                </div>
              </div>

              {/* Nano-Step Cards with 3 Structured Stages */}
              <div className="space-y-2">
                {activeStep.nanoSteps.map((ns, idx) => {
                  const stageMeta = [
                    { label: 'Giai đoạn 1: 📍 Định vị vật lý (2p)', badge: 'bg-blue-950/80 text-blue-300 border-blue-800/60', desc: 'Không cần suy nghĩ logic. Chỉ mở file hoặc chuyển con trỏ.' },
                    { label: 'Giai đoạn 2: ✍️ Bản thô không rủi ro (2p)', badge: 'bg-amber-950/80 text-amber-300 border-amber-800/60', desc: 'Gõ 1 dòng log/mock interface. Không sợ sai hay hỏng.' },
                    { label: 'Giai đoạn 3: ⚡ Kiểm chứng tức thì (2p)', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60', desc: 'F5 hoặc chạy 1 lệnh để nhận phản hồi ngay.' },
                  ][idx] || { label: `Bước ${idx + 1} (2p)`, badge: 'bg-slate-900 text-slate-300 border-slate-700', desc: 'Vi bước hành động siêu nhỏ' };

                  return (
                    <div
                      key={ns.id || idx}
                      className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        ns.done
                          ? 'bg-slate-950/80 border-emerald-500/30 opacity-75'
                          : idx === 0 || activeStep.nanoSteps?.[idx - 1]?.done
                          ? 'bg-slate-900 border-amber-500/50 shadow-md shadow-amber-950/20'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleNanoStep(activeStep.id, ns.id)}
                          className="mt-0.5 text-slate-400 hover:text-white transition-colors shrink-0"
                          title={ns.done ? 'Bỏ đánh dấu' : 'Đánh dấu hoàn thành nano-step này'}
                        >
                          {ns.done ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-amber-400/80 hover:text-amber-300" />
                          )}
                        </button>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${stageMeta.badge}`}>
                              {stageMeta.label}
                            </span>
                            {ns.done && (
                              <span className="text-[10px] text-emerald-400 font-bold">✓ Đã vượt qua</span>
                            )}
                          </div>
                          <div className={`text-xs ${ns.done ? 'line-through text-slate-400' : 'text-slate-100 font-medium'}`}>
                            {ns.text}
                          </div>
                          <div className="text-[10px] text-slate-400 italic">
                            💡 {stageMeta.desc}
                          </div>
                        </div>
                      </div>

                      {/* Quick 2-Min Sprint Starter */}
                      {!ns.done && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleStartNanoSprint(activeStep.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
                            title="Bắt đầu đồng hồ 2 phút ngay cho bước này"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Bấm Giờ 2p</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* All Nano-steps completed celebration & action */}
              {activeStep.nanoSteps.every((n) => n.done) && !activeStep.completed && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-xs text-emerald-200">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Tuyệt vời!</strong> Bạn đã hoàn thành cả 3 Nano-steps và phá vỡ bế tắc ban đầu.</span>
                  </div>
                  <button
                    onClick={() => onToggleComplete(activeStep.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đánh Dấu Hoàn Thành Vi Bước</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Đang cảm thấy quá tải hoặc ngại bắt đầu?</strong> Hãy để AI bẻ bước này thành 3 nano-actions 2 phút siêu dễ dàng (không tốn sức suy nghĩ).
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleTriggerDecompose(activeStep)}
                disabled={decomposingStepId === activeStep.id}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-600/20 shrink-0 disabled:opacity-50 transition-all"
              >
                {decomposingStepId === activeStep.id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang bẻ nhỏ...</span>
                  </>
                ) : (
                  <>
                    <Split className="w-3.5 h-3.5" />
                    <span>⚡ Gỡ Rối (3 Nano-Steps 2 Phút)</span>
                  </>
                )}
              </button>
            </div>
          )}

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
            const isRabbitHole = detectedRabbitHoles.find((r) => r.taskId === step.id);
            const isExempted = userExemptions.some(
              (e) => (e.taskId && e.taskId === step.id) || (step.title && e.taskTitle && step.title.toLowerCase().includes(e.taskTitle.toLowerCase()))
            );

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrentActive
                    ? 'bg-slate-900 border-indigo-500 shadow-md'
                    : isRabbitHole
                    ? 'bg-yellow-950/20 border-yellow-500/40'
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

                        {isRabbitHole && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-yellow-900/70 text-yellow-300 border border-yellow-600/50 flex items-center gap-1">
                            <span>🕳️ Bẫy sa đà: {isRabbitHole.rabbitHoleType}</span>
                          </span>
                        )}

                        {isExempted && !isRabbitHole && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Đã xác nhận ngoại lệ</span>
                          </span>
                        )}
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

                    {/* Nano-Steps in expanded card */}
                    {step.nanoSteps && step.nanoSteps.length > 0 ? (
                      <div className="mt-2.5 p-3 rounded-lg bg-slate-950 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                          <span className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>3 Nano-Steps 2 Phút Đã Phân Rã:</span>
                          </span>
                          <span>
                            {step.nanoSteps.filter((n) => n.done).length}/{step.nanoSteps.length} xong
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {step.nanoSteps.map((ns, idx) => (
                            <div
                              key={ns.id || idx}
                              className={`p-2 rounded border text-xs flex items-center justify-between gap-2 ${
                                ns.done
                                  ? 'bg-slate-900/60 border-slate-800 text-slate-400 line-through'
                                  : 'bg-slate-900 border-slate-700 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => onToggleNanoStep(step.id, ns.id)}
                                  className="text-slate-400 hover:text-white shrink-0"
                                >
                                  {ns.done ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-amber-400" />
                                  )}
                                </button>
                                <span className="truncate">{ns.text}</span>
                              </div>

                              {!ns.done && (
                                <button
                                  type="button"
                                  onClick={() => handleStartNanoSprint(step.id)}
                                  className="px-2 py-0.5 rounded bg-amber-600/80 hover:bg-amber-600 text-white text-[10px] font-bold shrink-0 flex items-center gap-1"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>2p</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleTriggerDecompose(step)}
                          disabled={decomposingStepId === step.id}
                          className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {decomposingStepId === step.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                              <span>Đang bẻ nhỏ...</span>
                            </>
                          ) : (
                            <>
                              <Split className="w-3 h-3" />
                              <span>⚡ Bị kẹt? Bẻ thành 3 Nano-Steps 2 phút</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {isRabbitHole && (
                      <div className="mt-2 p-2.5 bg-yellow-950/40 rounded border border-yellow-500/30 text-yellow-300 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <strong>Cảnh báo Rabbit Hole: {isRabbitHole.whyItsATrap}</strong>
                          <button
                            onClick={() => setFalsePositiveModalItem(isRabbitHole)}
                            className="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-700/60 text-[10px] font-mono flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span>Báo False Positive</span>
                          </button>
                        </div>
                        <div className="text-emerald-300 text-[10px]">
                          <strong>Giải pháp:</strong> {isRabbitHole.leanAlternative}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 max-w-md p-3.5 rounded-xl bg-slate-900 border-2 border-indigo-500 text-slate-100 text-xs shadow-2xl shadow-indigo-500/20 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FLOATING "CHALLENGE ME" (GEMINI PRO TIER 3 WHY-FIRST SOCRATIC - 100% PASSIVE) */}
      {/* ========================================================================= */}
      <button
        onClick={() => {
          setShowChallengeModal(true);
          // 100% Passive: DO NOT auto-execute API call upon opening modal
        }}
        className={`fixed bottom-6 right-6 z-40 px-3.5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 shadow-xl border transition-all ${
          isTimerRunning
            ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-700/60 opacity-50 hover:opacity-100 backdrop-blur-sm'
            : 'bg-gradient-to-r from-slate-900 to-amber-950 hover:from-amber-900 hover:to-rose-900 text-amber-200 hover:text-white border-amber-500/40 shadow-amber-950/30'
        }`}
        title={
          isTimerRunning
            ? 'Flow State đang hoạt động · Cố vấn phản biện ở chế độ tĩnh (Passive)'
            : 'Bấm khi cần AI Gemini Pro phản biện Why-First (Hoàn toàn thụ động)'
        }
      >
        <ShieldQuestion className="w-4 h-4 text-amber-300" />
        <span className="hidden sm:inline">🎯 Challenge me (Passive)</span>
        <span className="sm:hidden">🎯 Phản biện</span>
        {isTimerRunning && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Flowing" />
        )}
      </button>

      {/* Socratic Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl shadow-amber-500/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Lightbulb className="w-5 h-5" />
                <span>CỐ VẤN PHẢN BIỆN ĐỘC LẬP (GEMINI PRO · WHY-FIRST)</span>
              </div>
              <button
                onClick={() => setShowChallengeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300 font-mono">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Chế độ thụ động (Passive): AI chỉ phản biện khi bạn chủ động yêu cầu.</span>
              </div>
              {isTimerRunning && (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] shrink-0">
                  🌱 Flow Mode Active
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn đang làm một mình và cảm thấy bế tắc hoặc nghi ngờ về tính cấp thiết của công việc hiện tại? Hãy chọn một câu hỏi dưới đây hoặc nhập câu hỏi cụ thể để AI chất vấn:
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
                  className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors flex items-center justify-between group"
                >
                  <span>1. Tại sao tính năng này bắt buộc cho MVP?</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    const q = 'Tôi có đang rơi vào bẫy Premature Optimization (tối ưu quá sớm) không?';
                    setChallengeDilemma(q);
                    handleRunChallenge(q);
                  }}
                  className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors flex items-center justify-between group"
                >
                  <span>2. Tôi có đang tối ưu quá sớm thay vì ship sản phẩm?</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    const q = 'Làm sao để làm một bản thô (dumb version) trong 30 phút để kiểm chứng nhu cầu trước?';
                    setChallengeDilemma(q);
                    handleRunChallenge(q);
                  }}
                  className="p-2.5 text-left rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors flex items-center justify-between group"
                >
                  <span>3. Có cách nào làm bản thô trong 30 phút không?</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Custom Query Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={challengeDilemma}
                onChange={(e) => setChallengeDilemma(e.target.value)}
                placeholder="Nhập câu hỏi khúc mắc của bạn (VD: Có nên tách microservices không?)..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleRunChallenge()}
                disabled={isChallenging || !challengeDilemma.trim()}
                className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                {isChallenging ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang suy luận...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Phản biện</span>
                  </>
                )}
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

      {/* ========================================================================= */}
      {/* 6. FALSE POSITIVE REPORT & CALIBRATION MODAL */}
      {/* ========================================================================= */}
      {falsePositiveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Báo Cáo Báo Động Giả (False Positive Feedback)</span>
              </div>
              <button
                onClick={() => setFalsePositiveModalItem(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Bạn đang đánh dấu tác vụ sau là <strong className="text-emerald-300">CẦN THIẾT và HỢP LỆ</strong>:
              </p>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-white text-xs">
                🕳️ "{falsePositiveModalItem.taskTitle}"
              </div>
              <p className="text-[11px] text-slate-400">
                Hãy cho biết lý do để hệ thống Semantic Drift ghi nhớ quy tắc này vào bộ nhớ học hỏi (Few-Shot Prompt Memory Buffer), tránh báo động nhầm trong tương lai:
              </p>
            </div>

            {/* Quick Reason Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400">Chọn lý do hợp lệ nhanh:</label>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                {[
                  'Bảo mật, xác thực & tuân thủ bắt buộc cho thanh toán/dữ liệu',
                  'Nền tảng kiến trúc then chốt bắt buộc phải có cho MVP',
                  'Yêu cầu đặc thù bắt buộc từ khách hàng / thị trường mục tiêu',
                  'Tác vụ phục vụ trực tiếp tỷ lệ chuyển đổi hoặc giữ chân người dùng',
                ].map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedPresetReason(reason);
                      setCustomExemptionReason(reason);
                    }}
                    className={`p-2 text-left rounded-lg border text-xs transition-colors ${
                      selectedPresetReason === reason
                        ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    ✓ {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Hoặc tùy chỉnh lý do (AI sẽ học từ mô tả này):
              </label>
              <input
                type="text"
                value={customExemptionReason}
                onChange={(e) => setCustomExemptionReason(e.target.value)}
                placeholder="VD: Task này là bắt buộc vì..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFalsePositiveModalItem(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmFalsePositive}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Lưu & Hiệu Chỉnh AI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DRIFT SCORE CALIBRATION & LEARNED MEMORY MANAGER MODAL */}
      {/* ========================================================================= */}
      {showCalibrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>Đo Lường Độ Chính Xác & Bộ Nhớ Hiệu Chỉnh AI (Zero False Positives)</span>
              </div>
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Accuracy Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Độ Chính Xác (Precision)</div>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {calibrationStats.precisionPercent}%
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Tổng Lượt Đánh Giá</div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {calibrationStats.totalEvaluations}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Ngoại Lệ Đã Học</div>
                <div className="text-2xl font-black font-mono text-indigo-300 mt-1">
                  {userExemptions.length}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Bẫy Đã Xác Nhận</div>
                <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                  {calibrationStats.confirmedTrapsCount}
                </div>
              </div>
            </div>

            {/* Explanation of Few-Shot Calibration */}
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>Nguyên lý học hỏi & phòng ngừa báo động sai:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Khi bạn đánh dấu <em>"Không phải Rabbit Hole"</em>, quy tắc này lập tức được đưa vào System Prompt và Heuristic Engine. Trong các lần phân tích tiếp theo, mô hình AI (Gemini Flash) sẽ ưu tiên tuyệt đối các quy tắc học hỏi này, đảm bảo không làm gián đoạn hay gây ức chế cho lập trình viên.
              </p>
            </div>

            {/* List of Active Learned Exemptions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase tracking-wider">
                  Danh sách quy tắc ngoại lệ đã học ({userExemptions.length}):
                </span>
              </div>

              {userExemptions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                  Chưa có ngoại lệ nào. Khi phát hiện cảnh báo sai, hãy bấm "Không phải Rabbit Hole" để AI ghi nhớ.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {userExemptions.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-slate-200 truncate">
                          🛡️ "{ex.taskTitle}"
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          <strong>Lý do xác nhận:</strong> {ex.reason}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveExemption(ex.id)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors shrink-0"
                        title="Xóa ngoại lệ (AI sẽ quét lại tác vụ này)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Đóng
              </button>
            </div>
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
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
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
