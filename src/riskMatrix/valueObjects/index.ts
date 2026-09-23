// RiskMatrix Value Objects
export type Probability = 'High' | 'Medium' | 'Low';

export type Impact = 'High' | 'Medium' | 'Low';

export type RiskScope = 'short_term' | 'long_term';

export function getRiskColor(probability: Probability, impact: Impact): string {
  const riskMap: Record<Probability, Record<Impact, string>> = {
    High: { High: 'red', Medium: 'orange', Low: 'yellow' },
    Medium: { High: 'orange', Medium: 'orange', Low: 'yellow' },
    Low: { High: 'yellow', Medium: 'yellow', Low: 'green' },
  };
  return riskMap[probability][impact];
}

export function calculateRiskScore(probability: Probability, impact: Impact): number {
  const probValues: Record<Probability, number> = { High: 3, Medium: 2, Low: 1 };
  const impactValues: Record<Impact, number> = { High: 3, Medium: 2, Low: 1 };
  return probValues[probability] * impactValues[impact];
}
