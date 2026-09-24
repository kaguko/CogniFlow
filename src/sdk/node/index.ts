export interface SymFlowAgeClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface DecomposeTaskInput {
  goalTitle: string;
  technicalContext?: string;
  agentId?: string;
}

export interface DecomposeTaskResponse {
  contractVersion: string;
  requestId: string;
  agentId: string;
  goalTitle: string;
  microSteps: Array<{
    id: string;
    title: string;
    durationMinutes: number;
    singleAction?: string;
    testCriterion?: string;
    programmerPrinciple?: string;
    unblockTip?: string;
  }>;
  leanAdvice?: string;
}

export interface GuardrailCheckInput {
  originalGoal: string;
  agentOutput: string;
  circuitBreakerThreshold?: number;
  agentId?: string;
}

export interface GuardrailCheckResponse {
  contractVersion: string;
  requestId: string;
  agentId: string;
  driftScore: number;
  guardrailThreshold: number;
  guardrailStatus: 'ALLOW' | 'WARN' | 'BLOCK';
  decision: 'ALLOW' | 'WARN' | 'BLOCK';
  detectedRabbitHoles?: Array<{
    taskId?: string;
    taskTitle?: string;
    rabbitHoleType?: string;
    severity?: string;
    whyItsATrap?: string;
    leanAlternative?: string;
  }>;
  circuitBreaker?: {
    triggered: boolean;
    circuitStatus: 'OPEN' | 'CLOSED';
    reason: string;
  };
}

export interface OutcomeReportInput {
  requestId?: string;
  predictionId?: string;
  agentId?: string;
  outcomeStatus: 'SUCCESS' | 'DRIFT' | 'CRASH' | 'ABANDONED';
  actualExecutionTimeMs?: number;
  tokensConsumed?: number;
  userFeedback?: {
    isFalsePositiveDrift?: boolean;
    notes?: string;
  };
}

export interface OutcomeReportResponse {
  contractVersion: string;
  status: 'RECORDED';
  outcomeId: string;
  requestId: string;
  predictionId: string;
  outcomeStatus: string;
  accuracyDelta: {
    predictionMatched: boolean;
    updatedAgentPrecisionScore: number;
  };
  accuracyMetrics?: {
    overallAccuracyPercent: number;
    sampleSize: number;
    driftHitRate: number;
    crashHitRate: number;
  };
}

export interface CircuitBreakerConfigInput {
  maxDriftThreshold?: number;
  consecutiveFailureThreshold?: number;
  enableWebhook?: boolean;
  webhookUrl?: string;
}

export class SymFlowAgeClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options: SymFlowAgeClientOptions) {
    if (!options.apiKey) {
      throw new Error('SYMFLOWAGE_M2M_API_KEY is required to instantiate SymFlowAgeClient.');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:3000').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs || 8000;
    this.maxRetries = options.maxRetries || 3;
  }

  private async request<T>(endpoint: string, method: string = 'GET', body?: unknown): Promise<T> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        };

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(
            `SymFlowAge API Error (${res.status}): ${errJson.message || errJson.error || res.statusText}`
          );
        }

        return (await res.json()) as T;
      } catch (err: any) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 200));
        }
      }
    }

    throw lastError || new Error(`Failed to execute request to ${endpoint} after ${this.maxRetries} attempts.`);
  }

  /**
   * Decompose an Agent Goal into 5-15 minute lean micro-steps.
   */
  public async decomposeTask(input: DecomposeTaskInput): Promise<DecomposeTaskResponse> {
    return this.request<DecomposeTaskResponse>('/api/v1/agent/decompose', 'POST', input);
  }

  /**
   * Perform rapid M2M Guardrail & Semantic Drift check before agent code execution.
   */
  public async checkGuardrail(input: GuardrailCheckInput): Promise<GuardrailCheckResponse> {
    return this.request<GuardrailCheckResponse>('/api/v1/agent/guardrail/drift-check', 'POST', input);
  }

  /**
   * Report actual task outcome (Feedback Loop) for continuous backtesting & accuracy calibration.
   */
  public async reportOutcome(input: OutcomeReportInput): Promise<OutcomeReportResponse> {
    return this.request<OutcomeReportResponse>('/api/v1/agent/outcomes', 'POST', input);
  }

  /**
   * Retrieve continuous backtesting accuracy score and hit rates.
   */
  public async getAccuracyScore(days = 30): Promise<unknown> {
    return this.request(`/api/v1/agent/accuracy-score?days=${days}`, 'GET');
  }

  /**
   * Retrieve current Circuit Breaker configuration.
   */
  public async getCircuitBreakerConfig(): Promise<unknown> {
    return this.request('/api/v1/agent/circuit-breaker/config', 'GET');
  }

  /**
   * Update Circuit Breaker thresholds and outbound webhook settings.
   */
  public async configureCircuitBreaker(config: CircuitBreakerConfigInput): Promise<unknown> {
    return this.request('/api/v1/agent/circuit-breaker/config', 'POST', config);
  }
}
