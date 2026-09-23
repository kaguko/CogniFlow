// DecisionCopilot Entities
import type { AlternativeOption } from '../valueObjects';

export interface WhyFirstDecisionResult {
  dilemma: string;
  whyRootProblem: string;
  alternativesEvaluated: AlternativeOption[];
  tradeOffsAndRisks: string;
  howRecommendation: string;
  verificationBasis: string;
  socraticQuestions: string[];
  microActionPlan: string[];
  linkedGoalId?: string;
}

export interface WhyFirstDecisionRequest {
  context: string;
  dilemma: string;
  constraints?: string[];
  linkedGoalId?: string;
}

export function summarizeDecision(result: WhyFirstDecisionResult): string {
  return `
Dilemma: ${result.dilemma}
Root Cause: ${result.whyRootProblem}
Recommendation: ${result.howRecommendation}
Verification: ${result.verificationBasis}
Next Steps: ${result.microActionPlan.join(', ')}
`;
}
