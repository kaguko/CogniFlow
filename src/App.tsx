import React, { useState } from 'react';
import { DEFAULT_PRESET_CONTEXTS, INITIAL_PREDICTION_DATA, DEFAULT_LONG_TERM_GOALS } from './data/defaultPresets';

// Domain Bounded Contexts - Public APIs
import { ProjectContext, ContextEditorModal, ZoomLevel } from './projectContext';
import { GoalCanvasView, useGoals, LongTermGoal } from './goal';
import { PredictiveHorizonView, usePrediction, PredictionPayload } from './prediction';
import { MicroStepsTracker, MicroStep } from './microStep';
import { BottleneckRadarView } from './bottleneck';
import { WhyFirstDecisionCopilot } from './decisionCopilot';
import { BehavioralAnalyticsView } from './behavioral';

// Shared Shell Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ZoomController } from './components/ZoomController';
import { SemanticKnowledgeRagView } from './components/SemanticKnowledgeRagView';
import { JsonbIndexStrategyView } from './components/JsonbIndexStrategyView';

export default function App() {
  const [currentContext, setCurrentContext] = useState<ProjectContext>(DEFAULT_PRESET_CONTEXTS[0]);
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('micro_focus');
  const [activeTab, setActiveTab] = useState<string>('microsteps');
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

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
      {/* 3-Zone Top Bar */}
      <Header
        currentContext={currentContext}
        onOpenContextModal={() => setIsContextModalOpen(false || true)}
        onRefreshPrediction={() => fetchPrediction(currentContext)}
        isLoading={isLoading}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />

      {/* Version 2.0 Zoom In – Zoom Out Controller */}
      <ZoomController
        currentZoom={currentZoom}
        onZoomChange={handleZoomChange}
        activeGoalTitle={activeGoal?.title}
        driftScore={currentDriftScore}
      />

      {/* Main Workspace: Sidebar + Viewport */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Navigation Sidebar */}
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

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
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
            />
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
    </div>
  );
}
