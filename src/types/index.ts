// Types barrel - re-exports from feature domains
// Kept for backward compatibility during transition

// Goal domain
import type { 
  GoalHorizon, 
  GoalCategory, 
  GoalConstraints,
  GoalSprint,
  GoalMilestone,
  GoalDriftStatus
} from '../goal/valueObjects';
import type { LongTermGoal } from '../goal/entities/longTermGoal';

export type { 
  GoalHorizon, 
  GoalCategory, 
  GoalConstraints,
  GoalSprint,
  GoalMilestone,
  GoalDriftStatus,
  LongTermGoal,
};
export type { LongTermGoal as LongTermGoalType } from '../goal/entities/longTermGoal';

// ProjectContext domain
import type { 
  DomainType, 
  EnergyLevel,
  ZoomLevel 
} from '../projectContext/valueObjects';
import type { ProjectContext } from '../projectContext/entities/projectContext';

export type { 
  DomainType, 
  EnergyLevel,
  ZoomLevel,
  ProjectContext 
};
export type { ProjectContext as ProjectContextType } from '../projectContext/entities/projectContext';

// Prediction domain
import type { 
  FutureMilestone, 
  FutureTimeline,
  PathType,
  MilestoneState
} from '../prediction/valueObjects';

export type { 
  FutureMilestone, 
  FutureTimeline,
  PathType,
  MilestoneState
};

// MicroStep domain
import type { ProgrammerPrinciple } from '../microStep/valueObjects';
import type { MicroStep, NanoStep } from '../microStep/entities/microStep';

export type { 
  NanoStep, 
  MicroStep,
  ProgrammerPrinciple
};
export type { MicroStep as MicroStepType, NanoStep as NanoStepType } from '../microStep/entities/microStep';

// Bottleneck domain
import type { 
  Severity,
  Category,
  Scope,
  LongTermRiskType
} from '../bottleneck/valueObjects';
import type { BottleneckItem } from '../bottleneck/entities/bottleneckItem';

export type { 
  BottleneckItem,
  Severity,
  Category,
  Scope,
  LongTermRiskType
};
export type { BottleneckItem as BottleneckItemType } from '../bottleneck/entities/bottleneckItem';

// RiskMatrix domain
import type { 
  Probability,
  Impact,
  RiskScope
} from '../riskMatrix/valueObjects';
import type { RiskMatrixItem } from '../riskMatrix/entities/riskMatrixItem';

export type { 
  RiskMatrixItem,
  Probability,
  Impact,
  RiskScope
};
export type { RiskMatrixItem as RiskMatrixItemType } from '../riskMatrix/entities/riskMatrixItem';

// Behavioral domain
import type { 
  ProcrastinationRisk,
  GoalAbandonmentRisk
} from '../behavioral/valueObjects';
import type { BehavioralInsight } from '../behavioral/entities/behavioralInsight';

export type { 
  BehavioralInsight,
  ProcrastinationRisk,
  GoalAbandonmentRisk
};
export type { BehavioralInsight as BehavioralInsightType } from '../behavioral/entities/behavioralInsight';

// DecisionCopilot domain
import type { 
  AlternativeOption,
  SocraticQuestion
} from '../decisionCopilot/valueObjects';
import type { WhyFirstDecisionResult } from '../decisionCopilot/entities/whyFirstDecisionResult';

export type { 
  WhyFirstDecisionResult,
  AlternativeOption,
  SocraticQuestion
};
export type { 
  WhyFirstDecisionResult as WhyFirstDecisionResultType
} from '../decisionCopilot/entities/whyFirstDecisionResult';
export type {
  AlternativeOption as AlternativeOptionType
} from '../decisionCopilot/valueObjects';

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
