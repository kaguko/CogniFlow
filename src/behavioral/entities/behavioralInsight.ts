// Behavioral Entities
import type { ProcrastinationRisk, GoalAbandonmentRisk } from '../valueObjects';

export interface BehavioralInsight {
  focusEfficiencyScore: number;
  decisionFrictionIndex: number;
  procrastinationRisk: ProcrastinationRisk;
  observedPatterns: string[];
  cognitiveRecommendations: string[];
  longTermConsistencyScore?: number;
  goalAbandonmentRisk?: GoalAbandonmentRisk;
  effectiveHoursPerWeek?: number;
}

export interface BehavioralAnalyticsRequest {
  microSteps: Array<{
    completed: boolean;
    completedAt?: string;
  }>;
  context: string;
}

export function calculateBehavioralInsight(params: {
  completedSteps: number;
  totalSteps: number;
  effectiveHours: number;
  consistencyScore?: number;
}): BehavioralInsight {
  const { completedSteps, totalSteps, effectiveHours, consistencyScore } = params;
  
  const completionRate = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  
  return {
    focusEfficiencyScore: Math.round(completionRate),
    decisionFrictionIndex: Math.round(100 - completionRate * 0.7),
    procrastinationRisk: totalSteps > 0 && completedSteps / totalSteps < 0.5 ? 'Cao' : 'Trung bình',
    observedPatterns: [],
    cognitiveRecommendations: [
      'Áp dụng tư duy lập trình viên: Bài toán lớn là tổng của các bài toán 10 dòng code',
      'Luôn đảm bảo bước nhỏ hôm nay có thể truy vết ngược lên mục tiêu dài hạn',
      'Đặt đồng hồ Pomodoro 15 phút cho mỗi micro-step',
    ],
    longTermConsistencyScore: consistencyScore || 0,
    effectiveHoursPerWeek: effectiveHours,
    goalAbandonmentRisk: completionRate < 30 ? 'Cao' : 'Thấp',
  };
}
