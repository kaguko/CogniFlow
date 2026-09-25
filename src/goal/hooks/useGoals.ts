import { useState, useMemo, useCallback, useEffect } from 'react';
import { LongTermGoal } from '../entities/longTermGoal';
import { MicroStep } from '../../microStep/entities/microStep';
import { offlineDb } from '../../services/indexedDbService';

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

  // Restore stored goals from IndexedDB
  useEffect(() => {
    let isMounted = true;
    offlineDb.getItem<any>('domain_stores', 'long_term_goals').then((stored) => {
      if (isMounted && stored && Array.isArray(stored.data) && stored.data.length > 0) {
        setGoals(stored.data);
        if (stored.activeGoalId) {
          setActiveGoalId(stored.activeGoalId);
        }
      }
    }).catch((err) => {
      console.warn('[useGoals] Failed reading from IndexedDB:', err);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Save goals to IndexedDB
  useEffect(() => {
    if (goals.length > 0) {
      offlineDb.setItem('domain_stores', {
        id: 'long_term_goals',
        data: goals,
        activeGoalId,
        updatedAt: Date.now(),
      }).catch((e) => console.warn('[useGoals] Failed saving to IndexedDB:', e));
    }
  }, [goals, activeGoalId]);

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
