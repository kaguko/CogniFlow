import { useState, useMemo, useCallback } from 'react';
import { LongTermGoal } from '../entities/longTermGoal';
import { MicroStep } from '../../microStep/entities/microStep';

export interface UseGoalsProps {
  initialGoals: LongTermGoal[];
  microSteps?: MicroStep[];
  onAddMicroSteps?: (steps: MicroStep[]) => void;
}

export function useGoals({
  initialGoals,
  microSteps = [],
  onAddMicroSteps,
}: UseGoalsProps) {
  const [goals, setGoals] = useState<LongTermGoal[]>(initialGoals);
  const [activeGoalId, setActiveGoalId] = useState<string>(initialGoals[0]?.id || '');

  const activeGoal = useMemo(() => {
    return goals.find((g) => g.id === activeGoalId) || goals[0];
  }, [goals, activeGoalId]);

  // Dynamic Goal Drift calculation (% unlinked microSteps)
  const driftScore = useMemo(() => {
    const total = microSteps.length;
    if (total === 0) return 0;
    const unlinked = microSteps.filter((s) => !s.goalId && !s.isAlignedWithGoal);
    return Math.round((unlinked.length / total) * 100);
  }, [microSteps]);

  const addGoal = useCallback(
    (newGoal: LongTermGoal, initialSteps?: MicroStep[]) => {
      setGoals((prev) => [newGoal, ...prev]);
      setActiveGoalId(newGoal.id);
      if (initialSteps && initialSteps.length > 0 && onAddMicroSteps) {
        onAddMicroSteps(initialSteps);
      }
    },
    [onAddMicroSteps]
  );

  const updateGoalProgress = useCallback((goalId: string, progress: number) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, progress } : g))
    );
  }, []);

  const updateMilestoneProgress = useCallback(
    (goalId: string, milestoneIndex: number, progressDelta: number = 15) => {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          return {
            ...g,
            milestones: g.milestones.map((m, idx) =>
              idx === milestoneIndex
                ? { ...m, progress: Math.min(100, (m.progress || 0) + progressDelta) }
                : m
            ),
          };
        })
      );
    },
    []
  );

  return {
    goals,
    activeGoalId,
    activeGoal,
    driftScore,
    setActiveGoalId,
    addGoal,
    updateGoalProgress,
    updateMilestoneProgress,
    setGoals,
  };
}
