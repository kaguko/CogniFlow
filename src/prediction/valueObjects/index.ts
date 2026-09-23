// Prediction Value Objects
export type PathType = 'optimal' | 'drift' | 'bottleneck';

export type MilestoneState = 'optimal' | 'warning' | 'danger';

export interface FutureMilestone {
  timeframe: string;
  prediction: string;
  state: MilestoneState;
  keyIndicator: string;
}

export interface FutureTimeline {
  id: string;
  name: string;
  pathType: PathType;
  probability: number;
  summary: string;
  milestones: FutureMilestone[];
  consequence: string;
}
