// DecisionCopilot Value Objects
export interface AlternativeOption {
  name: string;
  pros: string;
  cons: string;
  rejectionReason: string;
}

export interface SocraticQuestion {
  question: string;
  context?: string;
}

export function createAlternative(params: {
  name: string;
  pros: string;
  cons: string;
  rejectionReason: string;
}): AlternativeOption {
  return {
    ...params,
  };
}
