import React, { useState } from 'react';
import { DEFAULT_PRESET_CONTEXTS, INITIAL_PREDICTION_DATA, DEFAULT_LONG_TERM_GOALS } from './data/defaultPresets';
import { Eye, EyeOff, Sparkles, X, Keyboard } from 'lucide-react';

// Global Keyboard Shortcuts
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { ShortcutHelpModal } from './components/ShortcutHelpModal';

// Domain Bounded Contexts - Public APIs
import { ProjectContext, ContextEditorModal, ZoomLevel } from './projectContext';
import { GoalCanvasView, useGoals, LongTermGoal } from './goal';
import { PredictiveHorizonView, usePrediction, PredictionPayload } from './prediction';
import { MicroStepsTracker, MicroStep } from './microStep';
import { BottleneckRadarView } from './bottleneck';
import { WhyFirstDecisionCopilot } from './decisionCopilot';
import { BehavioralAnalyticsView } from './behavioral';
import { AgentSwarmDashboard } from './agentSwarm';

// Shared Shell Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ZoomController } from './components/ZoomController';
import { SemanticKnowledgeRagView } from './components/SemanticKnowledgeRagView';
import { JsonbIndexStrategyView } from './components/JsonbIndexStrategyView';
import { AcademicResearchView } from './components/AcademicResearchView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { decomposeOffline } from './services/offlineDecomposer';

export default function App() {
  const [currentContext, setCurrentContext] = useState<ProjectContext>(DEFAULT_PRESET_CONTEXTS[0]);
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('micro_focus');
  const [activeTab, setActiveTab] = useState<string>('microsteps');
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Global Keyboard Shortcut Manager (react-hotkeys-hook)
  useGlobalShortcuts({
    onSelectTab: (tab) => handleTabChange(tab),
    onOpenChallengeMe: () => {
      handleTabChange('microsteps');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-socratic-challenge'));
      }, 50);
    },
    onToggleFocusMode: () => {
      setIsFocusMode((prev) => !prev);
    },
    onToggleHelpModal: () => {
      setIsShortcutHelpOpen((prev) => !prev);
    },
    onEscape: () => {
      if (isShortcutHelpOpen) setIsShortcutHelpOpen(false);
      else if (isFocusMode) setIsFocusMode(false);
      else if (isContextModalOpen) setIsContextModalOpen(false);
    },
  });

  // Prediction Domain Hook
  const { prediction, setPrediction, isLoading, fetchPrediction } = usePrediction({
    initialData: INITIAL_PREDICTION_DATA.preset_refactor_auth,
  });

  // Goal Domain Hook
  const {
    goals: longTermGoals,
    activeGoalId,
    activeGoal,
    driftScore: currentDriftScore,
    setActiveGoalId,
    addGoal,
    updateGoalProgress,
    updateMilestoneProgress,
  } = useGoals({
    initialGoals: DEFAULT_LONG_TERM_GOALS,
    microSteps: prediction.microSteps,
    onAddMicroSteps: (initialSteps) => {
      setPrediction((prev) => ({
        ...prev,
        microSteps: [...initialSteps, ...prev.microSteps],
      }));
    },
  });

  // Zoom In - Zoom Out switcher handler
  const handleZoomChange = (level: ZoomLevel) => {
    setCurrentZoom(level);
    if (level === 'macro_horizon') {
      setActiveTab('goals');
    } else if (level === 'meso_milestone') {
      setActiveTab('horizon');
    } else if (level === 'micro_focus') {
      setActiveTab('microsteps');
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'goals') setCurrentZoom('macro_horizon');
    else if (tab === 'horizon') setCurrentZoom('meso_milestone');
    else if (tab === 'microsteps') setCurrentZoom('micro_focus');
  };

  // Link an untracked step to the active long-term goal
  const handleLinkStepToGoal = (stepId: string, goalId: string, milestoneId?: string) => {
    const targetGoal = longTermGoals.find((g) => g.id === goalId) || activeGoal;
    const targetMilestone =
      targetGoal?.milestones.find((m) => m.id === milestoneId) || targetGoal?.milestones[0];

    setPrediction((prev) => ({
      ...prev,
      microSteps: prev.microSteps.map((step) => {
        if (step.id === stepId) {
          return {
            ...step,
            goalId: targetGoal?.id,
            goalTitle: targetGoal?.title,
            milestoneId: targetMilestone?.id,
            milestoneTitle: targetMilestone?.quarterOrMonth || targetMilestone?.title,
            isAlignedWithGoal: true,
          };
        }
        return step;
      }),
    }));
  };

  const handleSelectPreset = (preset: ProjectContext) => {
    setCurrentContext(preset);
    if (INITIAL_PREDICTION_DATA[preset.id]) {
      setPrediction(INITIAL_PREDICTION_DATA[preset.id]);
    } else {
      fetchPrediction(preset);
    }
  };

  // Micro-step interactions with domain logic synchronization
  const handleToggleComplete = (stepId: string) => {
    setPrediction((prev) => {
      const updatedSteps = prev.microSteps.map((step) => {
        if (step.id === stepId) {
          const completed = !step.completed;
          return {
            ...step,
            completed,
            completedAt: completed ? 'Vừa xong' : undefined,
          };
        }
        return step;
      });

      // Synchronize Goal Milestone progress
      const targetStep = prev.microSteps.find((s) => s.id === stepId);
      if (targetStep?.goalId) {
        const goalLinkedSteps = updatedSteps.filter((s) => s.goalId === targetStep.goalId);
        const completedGoalSteps = goalLinkedSteps.filter((s) => s.completed).length;
        const newGoalProgress =
          goalLinkedSteps.length > 0
            ? Math.round((completedGoalSteps / goalLinkedSteps.length) * 100)
            : 0;

        updateGoalProgress(targetStep.goalId, newGoalProgress);
        updateMilestoneProgress(targetStep.goalId, 0, 15);
      }

      return {
        ...prev,
        microSteps: updatedSteps,
        behavioralInsights: {
          ...prev.behavioralInsights,
          focusEfficiencyScore: Math.min(98, prev.behavioralInsights.focusEfficiencyScore + 4),
          decisionFrictionIndex: Math.max(15, prev.behavioralInsights.decisionFrictionIndex - 5),
        },
      };
    });
  };

  const handleAddStep = (newStep: MicroStep) => {
    setPrediction((prev) => ({
      ...prev,
      microSteps: [
        ...prev.microSteps,
        {
          ...newStep,
          goalId: newStep.goalId || activeGoal?.id,
          goalTitle: newStep.goalTitle || activeGoal?.title,
          milestoneId: newStep.milestoneId || activeGoal?.milestones[0]?.id,
          milestoneTitle: newStep.milestoneTitle || activeGoal?.milestones[0]?.quarterOrMonth,
          isAlignedWithGoal: true,
        },
      ],
    }));
  };

  const handleDecomposeStep = async (stepId: string, currentFriction: string) => {
    const targetStep = prediction.microSteps.find((s) => s.id === stepId);
    if (!targetStep) return;

    try {
      const res = await fetch('/api/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepTitle: targetStep.title,
          contextFriction: currentFriction,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.nanoSteps) {
          setPrediction((prev) => ({
            ...prev,
            microSteps: prev.microSteps.map((s) =>
              s.id === stepId ? { ...s, nanoSteps: data.nanoSteps } : s
            ),
          }));
          return;
        }
      }
    } catch (err) {
      console.warn('Decompose fallback', err);
    }

    // Fallback nano-steps (3-Stage Zero Cognitive Load Model)
    setPrediction((prev) => ({
      ...prev,
      microSteps: prev.microSteps.map((s) => {
        if (s.id === stepId) {
          const shortTitle = s.title.replace(/^(BƯỚC \d+:|Step \d+:)/i, '').trim();
          return {
            ...s,
            nanoSteps: [
              {
                id: `ns_${Date.now()}_1`,
                text: `Mở đúng 1 file liên quan và định vị hàm/dòng cần xử lý của "${shortTitle.slice(0, 35)}" (2 phút)`,
                done: false,
                minutes: 2,
                actionCategory: 'navigate',
              },
              {
                id: `ns_${Date.now()}_2`,
                text: 'Thêm 1 dòng console.log hoặc khai báo biến mock để quan sát dữ liệu đầu vào (2 phút)',
                done: false,
                minutes: 2,
                actionCategory: 'scratchpad',
              },
              {
                id: `ns_${Date.now()}_3`,
                text: 'Kích hoạt thử nghiệm 1 chạm (chạy npm test hoặc reload) để nhận phản hồi ngay lập tức (2 phút)',
                done: false,
                minutes: 2,
                actionCategory: 'verify',
              },
            ],
          };
        }
        return s;
      }),
    }));
  };

  const handleToggleNanoStep = (stepId: string, nanoId: string) => {
    setPrediction((prev) => ({
      ...prev,
      microSteps: prev.microSteps.map((s) => {
        if (s.id === stepId && s.nanoSteps) {
          return {
            ...s,
            nanoSteps: s.nanoSteps.map((n) =>
              n.id === nanoId ? { ...n, done: !n.done } : n
            ),
          };
        }
        return s;
      }),
    }));
  };

  const handleReorderSteps = (reorderedSteps: MicroStep[]) => {
    setPrediction((prev) => ({
      ...prev,
      microSteps: reorderedSteps,
    }));
  };

  const handleMoveStep = (stepId: string, direction: 'up' | 'down') => {
    setPrediction((prev) => {
      const idx = prev.microSteps.findIndex((s) => s.id === stepId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.microSteps.length) return prev;

      const newSteps = [...prev.microSteps];
      const temp = newSteps[idx];
      newSteps[idx] = newSteps[targetIdx];
      newSteps[targetIdx] = temp;

      return {
        ...prev,
        microSteps: newSteps.map((s, i) => ({ ...s, order: i + 1 })),
      };
    });
  };

  const handleDeleteStep = (stepId: string) => {
    setPrediction((prev) => ({
      ...prev,
      microSteps: prev.microSteps
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const handleSaveContext = (updatedContext: ProjectContext) => {
    setCurrentContext(updatedContext);
    fetchPrediction(updatedContext);
  };

  const pendingMicroStepsCount = prediction.microSteps.filter((s) => !s.completed).length;
  const criticalBottlenecksCount = prediction.bottlenecks.filter(
    (b) => b.severity === 'critical'
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Active Focus Mode Distraction-Free Top Indicator */}
      {isFocusMode && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-500/50 px-4 py-2 flex items-center justify-between text-xs text-indigo-200 animate-in slide-in-from-top duration-300 sticky top-0 z-50 backdrop-blur-md shadow-xl shadow-indigo-500/10">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span className="font-bold tracking-wide">CHẾ ĐỘ TẬP TRUNG TUYỆT ĐỐI (FOCUS MODE)</span>
            <span className="text-slate-400 hidden sm:inline text-[11px]">— Đã ẩn sidebar &amp; thanh điều hướng phụ để triệt tiêu xao nhãng</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-indigo-300 hidden md:inline">
              Bấm <kbd className="px-1.5 py-0.5 rounded bg-indigo-900/80 border border-indigo-700 text-amber-300">Shift + F</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-indigo-900/80 border border-indigo-700 text-amber-300">Esc</kbd> để thoát
            </span>
            <button
              onClick={() => setIsFocusMode(false)}
              className="px-2.5 py-1 rounded bg-indigo-900/80 hover:bg-indigo-800 text-indigo-100 font-semibold text-xs flex items-center gap-1 transition-colors border border-indigo-700/60"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Thoát Focus</span>
            </button>
          </div>
        </div>
      )}

      {/* 3-Zone Top Bar */}
      {!isFocusMode && (
        <Header
          currentContext={currentContext}
          onOpenContextModal={() => setIsContextModalOpen(true)}
          onRefreshPrediction={() => fetchPrediction(currentContext)}
          isLoading={isLoading}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onOpenShortcutModal={() => setIsShortcutHelpOpen(true)}
          isFocusMode={isFocusMode}
        />
      )}

      {/* Version 2.0 Zoom In – Zoom Out Controller */}
      {!isFocusMode && (
        <ZoomController
          currentZoom={currentZoom}
          onZoomChange={handleZoomChange}
          activeGoalTitle={activeGoal?.title}
          driftScore={currentDriftScore}
        />
      )}

      {/* Main Workspace: Sidebar + Viewport */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Navigation Sidebar (Hidden in Focus Mode for Zero Distraction) */}
        {!isFocusMode && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            currentContext={currentContext}
            presets={DEFAULT_PRESET_CONTEXTS}
            onSelectPreset={handleSelectPreset}
            pendingMicroStepsCount={pendingMicroStepsCount}
            criticalBottlenecksCount={criticalBottlenecksCount}
            goalsCount={longTermGoals.length}
            activeGoalTitle={activeGoal?.title}
            driftScore={currentDriftScore}
          />
        )}

        {/* Content Viewport */}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full transition-all ${isFocusMode ? 'py-8' : ''}`}>
          {/* Developer Orientation Bar */}
          {!isFocusMode && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
                  {activeTab === 'goals' && 'Tầng 1 · Macro Goal Planning'}
                  {activeTab === 'horizon' && 'Tầng 2 · Meso Predictive Horizon'}
                  {activeTab === 'microsteps' && 'Tầng 3 · Micro Focus (≤15 Phút)'}
                  {activeTab === 'bottlenecks' && 'Giám Sát Rủi Ro & Drift Radar'}
                  {activeTab === 'whyfirst' && 'Cố Vấn Phản Biện Socratic Why-First'}
                  {activeTab === 'behavioral' && 'Phân Tích Hành Vi & Vận Tốc Code'}
                  {activeTab === 'agent_activity' && 'Điều Phối & Telemetry Đội Ngũ Agent'}
                  {activeTab === 'academic' && 'Khung Nghiên Cứu Khoa Học & Luận Văn'}
                  {activeTab === 'rag' && 'Cơ Sở Tri Thức RAG & pgvector'}
                  {activeTab === 'jsonb_index' && 'Hiệu Năng PostgreSQL Lab'}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">
                  {pendingMicroStepsCount > 0 ? `${pendingMicroStepsCount} vi bước đang mở` : 'Tất cả vi bước đã xong'}
                </span>
                {currentDriftScore > 25 && (
                  <>
                    <span className="text-slate-600">·</span>
                    <button
                      onClick={() => handleTabChange('whyfirst')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium underline underline-offset-2"
                    >
                      ⚠️ Drift {currentDriftScore}%: Kiểm tra bẫy kỹ thuật
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFocusMode(true)}
                  className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 flex items-center gap-1 text-[11px]"
                  title="Ẩn toàn bộ menu để tập trung lập trình (Shift + F)"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Bật Focus Mode</span>
                  <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-slate-800 text-[9px] font-mono text-slate-400">Shift+F</kbd>
                </button>
              </div>
            </div>
          )}

          {/* TẦNG 1: Long-term Goal Planning & Horizon View */}
          {activeTab === 'goals' && (
            <GoalCanvasView
              goals={longTermGoals}
              activeGoalId={activeGoalId}
              onSelectActiveGoal={(id: string) => setActiveGoalId(id)}
              onCreateGoal={addGoal}
              onUpdateGoalProgress={updateGoalProgress}
              onJumpToFocus={() => handleZoomChange('micro_focus')}
              currentMicroSteps={prediction.microSteps}
            />
          )}

          {activeTab === 'horizon' && (
            <PredictiveHorizonView
              currentContext={currentContext}
              prediction={prediction}
              onSelectOptimalTimeline={() => handleZoomChange('micro_focus')}
              onRefreshPrediction={() => fetchPrediction(currentContext)}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'microsteps' && (
            <MicroStepsTracker
              microSteps={prediction.microSteps}
              onToggleComplete={handleToggleComplete}
              onAddStep={handleAddStep}
              onDecomposeStep={handleDecomposeStep}
              onToggleNanoStep={handleToggleNanoStep}
              currentContext={currentContext}
              activeGoal={activeGoal}
              onLinkStepToGoal={handleLinkStepToGoal}
              onSelectPreset={handleSelectPreset}
              onDeleteStep={handleDeleteStep}
              onReorderSteps={handleReorderSteps}
              onMoveStep={handleMoveStep}
            />
          )}

          {activeTab === 'bottlenecks' && (
            <BottleneckRadarView
              bottlenecks={prediction.bottlenecks}
              riskMatrix={prediction.riskMatrix}
              behavioralInsights={prediction.behavioralInsights}
              currentContext={currentContext}
              onJumpToWhyFirst={() => handleTabChange('whyfirst')}
            />
          )}

          {activeTab === 'whyfirst' && (
            <WhyFirstDecisionCopilot currentContext={currentContext} />
          )}

          {activeTab === 'rag' && (
            <SemanticKnowledgeRagView />
          )}

          {activeTab === 'jsonb_index' && (
            <JsonbIndexStrategyView />
          )}

          {activeTab === 'behavioral' && (
            <BehavioralAnalyticsView
              behavioralInsights={prediction.behavioralInsights}
              currentContext={currentContext}
              microSteps={prediction.microSteps}
              driftScore={currentDriftScore}
            />
          )}

          {activeTab === 'academic' && (
            <AcademicResearchView />
          )}

          {activeTab === 'agent_activity' && (
            <AgentSwarmDashboard />
          )}
        </main>
      </div>

      {/* Context Configuration Modal */}
      <ContextEditorModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        currentContext={currentContext}
        onSaveContext={handleSaveContext}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <ShortcutHelpModal
        isOpen={isShortcutHelpOpen}
        onClose={() => setIsShortcutHelpOpen(false)}
      />

      {/* Offline Connectivity & Rule Engine Status Indicator */}
      <OfflineIndicator />
    </div>
  );

}
