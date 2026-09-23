// Types barrel - re-exports from feature domains
// Kept for backward compatibility during transition

// Goal domain
export type { 
  GoalHorizon, 
  GoalCategory, 
  GoalConstraints,
  GoalSprint,
  GoalMilestone,
  LongTermGoal,
  GoalDriftStatus
} from '../goal/valueObjects';
export type { LongTermGoal as LongTermGoalType } from '../goal/entities/longTermGoal';

// Context domain
export type { 
  DomainType, 
  EnergyLevel,
  ZoomLevel,
  ProjectContext 
} from '../context/valueObjects';
export type { ProjectContext as ProjectContextType } from '../context/entities/projectContext';

// Prediction domain
export type { 
  FutureMilestone, 
  FutureTimeline,
  PathType,
  MilestoneState
} from '../prediction/valueObjects';

// MicroStep domain
export type { 
  NanoStep, 
  MicroStep,
  ProgrammerPrinciple
} from '../microStep/valueObjects';
export type { MicroStep as MicroStepType, NanoStep as NanoStepType } from '../microStep/entities/microStep';

// Bottleneck domain
export type { 
  BottleneckItem,
  Severity,
  Category,
  Scope,
  LongTermRiskType
} from '../bottleneck/valueObjects';
export type { BottleneckItem as BottleneckItemType } from '../bottleneck/entities/bottleneckItem';

// RiskMatrix domain
export type { 
  RiskMatrixItem,
  Probability,
  Impact,
  RiskScope
} from '../riskMatrix/valueObjects';
export type { RiskMatrixItem as RiskMatrixItemType } from '../riskMatrix/entities/riskMatrixItem';

// Behavioral domain
export type { 
  BehavioralInsight,
  ProcrastinationRisk,
  GoalAbandonmentRisk
} from '../behavioral/valueObjects';
export type { BehavioralInsight as BehavioralInsightType } from '../behavioral/entities/behavioralInsight';

// DecisionCopilot domain
export type { 
  WhyFirstDecisionResult,
  AlternativeOption,
  SocraticQuestion
} from '../decisionCopilot/valueObjects';
export type { 
  WhyFirstDecisionResult as WhyFirstDecisionResultType,
  AlternativeOption as AlternativeOptionType
} from '../decisionCopilot/entities/whyFirstDecisionResult';

// Prediction payload (combines multiple domains)
export interface PredictionPayload {
  timelines: FutureTimeline[];
  microSteps: MicroStep[];
  bottlenecks: BottleneckItem[];
  riskMatrix: RiskMatrixItem[];
  behavioralInsights: BehavioralInsight;
  strategicWhySummary: string;
  longTermGoals?: LongTermGoal[];
  activeGoalId?: string;
  driftStatus?: GoalDriftStatus;
}
