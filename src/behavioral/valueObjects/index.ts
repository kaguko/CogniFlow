// Behavioral Value Objects
export type ProcrastinationRisk = 'Thấp' | 'Trung bình' | 'Cao';

export type GoalAbandonmentRisk = 'Thấp' | 'Trung bình' | 'Cao';

export interface BehavioralPatterns {
  observedPatterns: string[];
  cognitiveRecommendations: string[];
}

export function getFocusEfficiencyLabel(score: number): string {
  if (score >= 80) return 'Cao';
  if (score >= 60) return 'Trung bình';
  return 'Thấp';
}

export function getProcrastinationRiskLabel(score: number): ProcrastinationRisk {
  if (score < 30) return 'Thấp';
  if (score < 60) return 'Trung bình';
  return 'Cao';
}
