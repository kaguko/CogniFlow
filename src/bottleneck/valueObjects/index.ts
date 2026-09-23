// Bottleneck Value Objects
export type Severity = 'critical' | 'moderate' | 'low';

export type Category = 'cognitive' | 'technical' | 'dependency' | 'process';

export type Scope = 'short_term' | 'long_term';

export type LongTermRiskType =
  | 'goal_drift'
  | 'milestone_slip'
  | 'burnout_risk'
  | 'skill_plateau'
  | 'priority_conflict';

export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'critical': return 'red';
    case 'moderate': return 'orange';
    case 'low': return 'yellow';
  }
}

export function getCategoryIcon(category: Category): string {
  switch (category) {
    case 'cognitive': return 'brain';
    case 'technical': return 'code';
    case 'dependency': return 'link';
    case 'process': return 'flowchart';
  }
}
