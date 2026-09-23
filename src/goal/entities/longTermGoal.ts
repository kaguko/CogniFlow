// Goal Entities
import type { GoalCategory, GoalConstraints, GoalHorizon, GoalMilestone, GoalSprint } from '../valueObjects';

export interface LongTermGoal {
  id: string;
  userId?: string;
  title: string;
  vision: string;
  category: GoalCategory;
  horizon: GoalHorizon;
  deadline: string;
  milestones: GoalMilestone[];
  constraints: GoalConstraints;
  linkedTaskIds: string[];
  progress: number;
  driftScore: number;
  status: 'active' | 'completed' | 'paused';
  lastReviewedAt: string;
  alignedMicroStepsCount?: number;
  misalignedMicroStepsCount?: number;
}

// Computed properties
export function getGoalProgress(goal: LongTermGoal): number {
  if (goal.milestones.length === 0) return 0;
  const totalProgress = goal.milestones.reduce((sum, m) => sum + m.progress, 0);
  return Math.round(totalProgress / goal.milestones.length);
}

export function getDriftStatus(goal: LongTermGoal, alignedCount: number, misalignedCount: number): { driftScore: number; hasWarning: boolean } {
  const total = alignedCount + misalignedCount;
  const driftScore = total > 0 ? Math.round((misalignedCount / total) * 100) : 0;
  return {
    driftScore,
    hasWarning: driftScore >= 20
  };
}
