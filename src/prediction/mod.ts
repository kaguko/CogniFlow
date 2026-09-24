// Prediction module exports
export * from './valueObjects';
export * from './components';
export * from './hooks/usePrediction';
export * from './backtesting';

export interface PredictionPayload {
  timelines: import('./valueObjects').FutureTimeline[];
  microSteps: import('../microStep/entities/microStep').MicroStep[];
  bottlenecks: import('../bottleneck/entities/bottleneckItem').BottleneckItem[];
  riskMatrix: import('../riskMatrix/entities/riskMatrixItem').RiskMatrixItem[];
  behavioralInsights: import('../behavioral/entities/behavioralInsight').BehavioralInsight;
  strategicWhySummary: string;
  longTermGoals?: import('../goal/entities/longTermGoal').LongTermGoal[];
  activeGoalId?: string;
  driftStatus?: import('../goal/valueObjects').GoalDriftStatus;
}

export interface PredictionRequest {
  context: import('../projectContext/entities/projectContext').ProjectContext;
}

export function createPredictionPayload(params: {
  timelines: PredictionPayload['timelines'];
  microSteps: PredictionPayload['microSteps'];
  bottlenecks: PredictionPayload['bottlenecks'];
  riskMatrix: PredictionPayload['riskMatrix'];
  behavioralInsights: PredictionPayload['behavioralInsights'];
  strategicWhySummary: string;
}): PredictionPayload {
  return {
    ...params,
    longTermGoals: undefined,
    activeGoalId: undefined,
    driftStatus: undefined,
  };
}
