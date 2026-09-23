import React, { useState } from 'react';
import {
  ProjectContext,
  PredictionPayload,
  MicroStep,
  LongTermGoal,
  ZoomLevel,
} from './types';
import { DEFAULT_PRESET_CONTEXTS, INITIAL_PREDICTION_DATA, DEFAULT_LONG_TERM_GOALS } from './data/defaultPresets';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ZoomController } from './components/ZoomController';
import { GoalCanvasView } from './components/GoalCanvasView';
import { PredictiveHorizonView } from './components/PredictiveHorizonView';
import { MicroStepsTracker } from './components/MicroStepsTracker';
import { BottleneckRadarView } from './components/BottleneckRadarView';
import { WhyFirstDecisionCopilot } from './components/WhyFirstDecisionCopilot';
import { BehavioralAnalyticsView } from './components/BehavioralAnalyticsView';
import { SemanticKnowledgeRagView } from './components/SemanticKnowledgeRagView';
import { ContextEditorModal } from './components/ContextEditorModal';

export default function App() {
  const [currentContext, setCurrentContext] = useState<ProjectContext>(DEFAULT_PRESET_CONTEXTS[0]);
  const [prediction, setPrediction] = useState<PredictionPayload>(
    INITIAL_PREDICTION_DATA.preset_refactor_auth
  );
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>(DEFAULT_LONG_TERM_GOALS);
  const [activeGoalId, setActiveGoalId] = useState<string>(DEFAULT_LONG_TERM_GOALS[0]?.id || '');
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('micro_focus');
  const [activeTab, setActiveTab] = useState<string>('horizon');
  const [isLoading, setIsLoading] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  // Active goal object
  const activeGoal = longTermGoals.find((g) => g.id === activeGoalId) || longTermGoals[0];

  // Calculate dynamic Goal Drift score (% of micro-steps unlinked to any goal)
  const totalMicroSteps = prediction.microSteps.length;
  const unlinkedSteps = prediction.microSteps.filter((s) => !s.goalId && !s.isAlignedWithGoal);
  const currentDriftScore =
    totalMicroSteps > 0 ? Math.round((unlinkedSteps.length / totalMicroSteps) * 100) : 0;

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

  // Add a newly planned long term goal
  const handleCreateGoal = (newGoal: LongTermGoal, initialSteps?: MicroStep[]) => {
    setLongTermGoals((prev) => [newGoal, ...prev]);
    setActiveGoalId(newGoal.id);
    if (initialSteps && initialSteps.length > 0) {
      setPrediction((prev) => ({
        ...prev,
        microSteps: [...initialSteps, ...prev.microSteps],
      }));
    }
  };

  const handleUpdateGoalProgress = (goalId: string, progress: number) => {
    setLongTermGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, progress } : g))
    );
  };

  // Trigger contextual future prediction via backend API
  const handleRefreshPrediction = async (contextToPredict = currentContext) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: contextToPredict }),
      });

      if (!res.ok) {
        throw new Error('Predict API error');
      }

      const data = await res.json();
      if (data && data.timelines) {
        setPrediction(data);
      }
    } catch (err) {
      console.warn('Using intelligent local forecast engine fallback', err);
      // Generate enhanced fallback tailored to the context
      setPrediction((prev) => ({
        ...prev,
        strategicWhySummary: `Vấn đề thực sự của "${contextToPredict.title}" là giảm tải nhận thức và cô lập các biến số rủi ro. Thay vì cố gắng giải quyết toàn diện cùng lúc, hãy chia bài toán thành các phân vùng kiểm thử 10 phút.`,
        timelines: prev.timelines.map((tl) => ({
          ...tl,
          probability: tl.pathType === 'optimal' ? 82 : tl.pathType === 'drift' ? 40 : 20,
        })),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: ProjectContext) => {
    setCurrentContext(preset);
    if (INITIAL_PREDICTION_DATA[preset.id]) {
      setPrediction(INITIAL_PREDICTION_DATA[preset.id]);
    } else {
      handleRefreshPrediction(preset);
    }
  };

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

        setLongTermGoals((goals) =>
          goals.map((g) =>
            g.id === targetStep.goalId
              ? {
                  ...g,
                  progress: Math.max(g.progress, newGoalProgress),
                  milestones: g.milestones.map((m, idx) =>
                    idx === 0
                      ? { ...m, progress: Math.min(100, m.progress + 15) }
                      : m
                  ),
                }
              : g
          )
        );
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

    // Fallback nano-steps
    setPrediction((prev) => ({
      ...prev,
      microSteps: prev.microSteps.map((s) => {
        if (s.id === stepId) {
          return {
            ...s,
            nanoSteps: [
              { id: `ns_${Date.now()}_1`, text: 'Mở đúng 1 file liên quan và định vị hàm mục tiêu (2 phút)', done: false },
              { id: `ns_${Date.now()}_2`, text: 'Viết 1 dòng assert hoặc log để xác nhận input đầu vào (2 phút)', done: false },
              { id: `ns_${Date.now()}_3`, text: 'Chạy kiểm thử nhanh để xác thực bước giải phóng (3 phút)', done: false },
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
    handleRefreshPrediction(updatedContext);
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
        onOpenContextModal={() => setIsContextModalOpen(true)}
        onRefreshPrediction={() => handleRefreshPrediction()}
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
              onSelectActiveGoal={(id) => setActiveGoalId(id)}
              onCreateGoal={handleCreateGoal}
              onUpdateGoalProgress={handleUpdateGoalProgress}
              onJumpToFocus={() => handleZoomChange('micro_focus')}
              currentMicroSteps={prediction.microSteps}
            />
          )}

          {activeTab === 'horizon' && (
            <PredictiveHorizonView
              currentContext={currentContext}
              prediction={prediction}
              onSelectOptimalTimeline={() => handleZoomChange('micro_focus')}
              onRefreshPrediction={() => handleRefreshPrediction()}
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
