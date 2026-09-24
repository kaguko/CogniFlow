// Goal module exports
export * from './entities/longTermGoal';
export * from './valueObjects';
export * from './components';
export * from './hooks/useGoals';

import type { LongTermGoal } from './entities/longTermGoal';
import type { GoalDriftStatus, GoalMilestone } from './valueObjects';

export interface GoalPlanRequest {
  contextTitle: string;
  contextDescription: string;
  domain: string;
  deadlineHorizon: string;
  energyLevel: string;
  currentFriction: string;
  behavioralFlags: string[];
  techStack: string[];
}

export interface GoalPlanResponse {
  goals: LongTermGoal[];
}

export function calculateDriftStatus(goal: LongTermGoal, microSteps: Array<{ goalId?: string; isAlignedWithGoal?: boolean }>): GoalDriftStatus {
  const totalMicroSteps = microSteps.length;
  const unlinkedSteps = microSteps.filter((s) => !s.goalId && !s.isAlignedWithGoal);
  const unlinkedStepsCount = unlinkedSteps.length;
  
  const driftScore = totalMicroSteps > 0 
    ? Math.round((unlinkedStepsCount / totalMicroSteps) * 100) 
    : 0;
  
  const hasWarning = driftScore >= 20;
  
  let recommendation = 'Tất cả các vi bước đang liên kết chặt chẽ với mục tiêu dài hạn.';
  if (hasWarning) {
    recommendation = `Phát hiện ${unlinkedStepsCount}/${totalMicroSteps} vi bước hôm nay chưa gắn vào mục tiêu dài hạn "${goal.title || 'chính'}". Hãy cân nhắc liên kết hoặc loại bỏ các việc thứ yếu để tránh lãng phí năng lượng.`;
  }
  
  return {
    driftScore,
    hasWarning,
    unlinkedStepsCount,
    recommendation
  };
}

export interface GoalAlignmentIndexInput {
  goalId: string;
  previousGoalId?: string;
  milestones: Array<GoalMilestone & { completedAt?: string }>;
  microSteps: Array<{ goalId?: string; isAlignedWithGoal?: boolean }>;
  now?: string;
}

export function calculateGoalAlignmentIndex({
  goalId,
  previousGoalId,
  milestones,
  microSteps,
  now = new Date().toISOString(),
}: GoalAlignmentIndexInput): number {
  if (previousGoalId && previousGoalId !== goalId) return 0;

  const alignedTaskCount = microSteps.filter(
    (step) => step.goalId === goalId || step.isAlignedWithGoal === true
  ).length;
  const taskAlignment = microSteps.length > 0
    ? alignedTaskCount / microSteps.length
    : 0;

  const completedOnTimeCount = milestones.filter((milestone) => {
    if (milestone.status !== 'completed') return false;
    const completedAt = milestone.completedAt || now;
    return completedAt <= milestone.due;
  }).length;
  const milestoneAlignment = milestones.length > 0
    ? completedOnTimeCount / milestones.length
    : 0;

  return Math.max(0, Math.min(100, Math.round((milestoneAlignment * 60 + taskAlignment * 40))));
}
