// Bottleneck Entities
import type { Severity, Category, Scope, LongTermRiskType } from '../valueObjects';

export interface BottleneckItem {
  id: string;
  title: string;
  severity: Severity;
  category: Category;
  symptom: string;
  rootCauseWhy: string;
  counterMeasure: string;
  scope?: Scope;
  longTermRiskType?: LongTermRiskType;
}

export function createBottleneck(params: {
  id: string;
  title: string;
  severity: Severity;
  category: Category;
  symptom: string;
  rootCauseWhy: string;
  counterMeasure: string;
  scope?: Scope;
  longTermRiskType?: LongTermRiskType;
}): BottleneckItem {
  return {
    ...params,
  };
}

export function getCriticalBottlenecks(bottlenecks: BottleneckItem[]): BottleneckItem[] {
  return bottlenecks.filter(b => b.severity === 'critical');
}

export function getBottlenecksByCategory(bottlenecks: BottleneckItem[], category: Category): BottleneckItem[] {
  return bottlenecks.filter(b => b.category === category);
}
