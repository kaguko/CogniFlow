// Goal Value Objects
export type GoalHorizon = '3_months' | '6_months' | '12_months' | '24_months';

export type GoalCategory = 'career' | 'technical_mastery' | 'startup_product' | 'system_architecture' | 'research';

export interface GoalConstraints {
  hoursPerWeek: number;
  budget?: number;
  primarySkills: string[];
  priority?: 'critical' | 'high' | 'medium';
}

export interface GoalSprint {
  id: string;
  title: string;
  targetWeek: string;
  tasksCount: number;
  completedCount: number;
}

export interface GoalMilestone {
  id: string;
  title: string;
  quarterOrMonth: string;
  due: string;
  status: 'on_track' | 'at_risk' | 'completed' | 'delayed';
  progress: number;
  keyDeliverable: string;
  dependencies?: string[];
  sprints?: GoalSprint[];
  linkedTaskIds?: string[];
}

export interface GoalDriftStatus {
  driftScore: number;
  hasWarning: boolean;
  warningMessage?: string;
  unlinkedStepsCount: number;
  recommendation: string;
}
