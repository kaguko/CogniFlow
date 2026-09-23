// Central barrel export - Application root exports
// This is the single entry point for importing from the application

// Common (truly shared across features)
export * from './common/mod';

// Feature domains (Business Aggregates)
export * from './goal/mod';
export * from './prediction/mod';
export * from './microStep/mod';
export * from './bottleneck/mod';
export * from './riskMatrix/mod';
export * from './decisionCopilot/mod';
export * from './behavioral/mod';
export * from './projectContext/mod';

// Legacy compatibility - deprecated, use feature modules directly
// @deprecated Use specific feature domain imports instead
export type {
  DomainType,
  EnergyLevel,
  ZoomLevel,
  GoalHorizon,
  GoalCategory,
  GoalSprint,
  GoalMilestone,
  GoalConstraints,
  LongTermGoal,
  ProjectContext,
  FutureMilestone,
  FutureTimeline,
  NanoStep,
  MicroStep,
  BottleneckItem,
  RiskMatrixItem,
  BehavioralInsight,
  GoalDriftStatus,
  PredictionPayload,
  AlternativeOption,
  WhyFirstDecisionResult,
} from './types/index';
