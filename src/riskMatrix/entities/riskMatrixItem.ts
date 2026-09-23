// RiskMatrix Entities
import type { Probability, Impact, RiskScope } from '../valueObjects';

export interface RiskMatrixItem {
  id: string;
  risk: string;
  probability: Probability;
  impact: Impact;
  prevention: string;
  contingency: string;
  scope?: RiskScope;
}

export function createRisk(params: {
  id: string;
  risk: string;
  probability: Probability;
  impact: Impact;
  prevention: string;
  contingency: string;
  scope?: RiskScope;
}): RiskMatrixItem {
  return {
    ...params,
  };
}

export function getHighRiskItems(risks: RiskMatrixItem[]): RiskMatrixItem[] {
  return risks.filter(r => r.probability === 'High' || r.impact === 'High');
}

export function getLongTermRisks(risks: RiskMatrixItem[]): RiskMatrixItem[] {
  return risks.filter(r => r.scope === 'long_term');
}
