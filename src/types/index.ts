export type DomainType = 'software' | 'system_architecture' | 'devops_cloud' | 'startup_product' | 'research';

export type EnergyLevel = 'high' | 'medium' | 'depleted';

export type ZoomLevel = 'macro_horizon' | 'meso_milestone' | 'micro_focus';

export type GoalHorizon = '3_months' | '6_months' | '12_months' | '24_months';

export type GoalCategory = 'career' | 'technical_mastery' | 'startup_product' | 'system_architecture' | 'research';

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
  quarterOrMonth: string; // e.g. "Q1: Nắm vững System Design", "Q2: Open Source"
  due: string;
  status: 'on_track' | 'at_risk' | 'completed' | 'delayed';
  progress: number; // 0 - 100
  keyDeliverable: string;
  dependencies?: string[];
  sprints?: GoalSprint[];
  linkedTaskIds?: string[];
}

export interface GoalConstraints {
  hoursPerWeek: number;
  budget?: number;
  primarySkills: string[];
  priority?: 'critical' | 'high' | 'medium';
}

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
  progress: number; // 0 - 100
  driftScore: number; // 0 - 100 (tỷ lệ việc hôm nay lệch mục tiêu)
  status: 'active' | 'completed' | 'paused';
  lastReviewedAt: string;
  alignedMicroStepsCount?: number;
  misalignedMicroStepsCount?: number;
}

export interface ProjectContext {
  id: string;
  title: string;
  description: string;
  domain: DomainType;
  deadlineHorizon: string;
  energyLevel: EnergyLevel;
  currentFriction: string;
  behavioralFlags: string[];
  techStack: string[];
  lastUpdated: string;
  linkedGoalId?: string;
  linkedMilestoneId?: string;
}

export interface FutureMilestone {
  timeframe: string;
  prediction: string;
  state: 'optimal' | 'warning' | 'danger';
  keyIndicator: string;
}

export interface FutureTimeline {
  id: string;
  name: string;
  pathType: 'optimal' | 'drift' | 'bottleneck';
  probability: number;
  summary: string;
  milestones: FutureMilestone[];
  consequence: string;
}

export interface NanoStep {
  id: string;
  text: string;
  done: boolean;
}

export interface MicroStep {
  id: string;
  order: number;
  title: string;
  durationMinutes: number;
  programmerPrinciple: 'Divide & Conquer' | 'Atomic Commit' | 'TDD Loop' | 'Fail Fast' | 'YAGNI / Minimal Surface' | 'Boundary Isolation';
  inputRequired: string;
  singleAction: string;
  testCriterion: string;
  unblockTip: string;
  completed: boolean;
  completedAt?: string;
  nanoSteps?: NanoStep[];
  notes?: string;
  // Version 2.0 Traceability Linkage:
  goalId?: string;
  goalTitle?: string;
  milestoneId?: string;
  milestoneTitle?: string;
  isAlignedWithGoal?: boolean; // false nếu việc này đang lệch mục tiêu dài hạn
}

export interface BottleneckItem {
  id: string;
  title: string;
  severity: 'critical' | 'moderate' | 'low';
  category: 'cognitive' | 'technical' | 'dependency' | 'process';
  symptom: string;
  rootCauseWhy: string;
  counterMeasure: string;
  // Version 2.0:
  scope?: 'short_term' | 'long_term';
  longTermRiskType?: 'goal_drift' | 'milestone_slip' | 'burnout_risk' | 'skill_plateau' | 'priority_conflict';
}

export interface RiskMatrixItem {
  id: string;
  risk: string;
  probability: 'High' | 'Medium' | 'Low';
  impact: 'High' | 'Medium' | 'Low';
  prevention: string;
  contingency: string;
  scope?: 'short_term' | 'long_term';
}

export interface BehavioralInsight {
  focusEfficiencyScore: number;
  decisionFrictionIndex: number;
  procrastinationRisk: 'Thấp' | 'Trung bình' | 'Cao';
  observedPatterns: string[];
  cognitiveRecommendations: string[];
  // Version 2.0 Long-term behavior:
  longTermConsistencyScore?: number; // 0-100
  goalAbandonmentRisk?: 'Thấp' | 'Trung bình' | 'Cao';
  effectiveHoursPerWeek?: number;
}

export interface GoalDriftStatus {
  driftScore: number;
  hasWarning: boolean;
  warningMessage?: string;
  unlinkedStepsCount: number;
  recommendation: string;
}

export interface PredictionPayload {
  timelines: FutureTimeline[];
  microSteps: MicroStep[];
  bottlenecks: BottleneckItem[];
  riskMatrix: RiskMatrixItem[];
  behavioralInsights: BehavioralInsight;
  strategicWhySummary: string;
  // Version 2.0:
  longTermGoals?: LongTermGoal[];
  activeGoalId?: string;
  driftStatus?: GoalDriftStatus;
}

export interface AlternativeOption {
  name: string;
  pros: string;
  cons: string;
  rejectionReason: string;
}

export interface WhyFirstDecisionResult {
  dilemma: string;
  whyRootProblem: string; // 🎯 WHY #1: Vấn đề thật phía sau
  alternativesEvaluated: AlternativeOption[]; // 🔍 WHY #2: Lựa chọn & phương án bị loại
  tradeOffsAndRisks: string; // ⚠️ WHY #3: Hệ quả và đánh đổi
  howRecommendation: string; // 🛠️ HOW: Phương án tối ưu
  verificationBasis: string; // ✅ Vì sao tin được (kiểm chứng)
  socraticQuestions: string[]; // 🧠 Câu hỏi gợi mở kích thích tự duy cá nhân
  microActionPlan: string[]; // Các vi bước triển khai ngay
  linkedGoalId?: string;
}
