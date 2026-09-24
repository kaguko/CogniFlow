export type AgentRole = 'orchestrator_pm' | 'coder_executor' | 'qa_security' | 'socratic_guardrail';

export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'guardrail_blocked' | 'drift_alert' | 'completed' | 'error';

export interface AgentNode {
  id: string;
  name: string;
  role: AgentRole;
  roleTitle: string;
  avatar: string;
  status: AgentStatus;
  currentTaskTitle?: string;
  currentMicroStepId?: string;
  activeDriftScore: number; // 0 - 100
  latencyMs: number;
  tokensProcessed: number;
  model: string;
  systemPromptSnippet: string;
  lastActionSummary?: string;
}

export interface AgentTask {
  id: string;
  title: string;
  assignedAgentId: string;
  status: 'pending' | 'in_progress' | 'verifying' | 'passed' | 'rejected_by_guardrail';
  estimatedMinutes: number;
  elapsedSeconds: number;
  inputContext: string;
  outputArtifact?: string;
  driftScore: number;
  guardrailFeedback?: string;
  socraticQuestions?: string[];
  testStatus?: 'untested' | 'passing' | 'failing';
}

export interface AgenticMemoryEntry {
  id: string;
  agentId: string;
  agentRole: AgentRole;
  category: 'proven_solution' | 'failure_prevention' | 'architecture_constraint' | 'api_contract';
  title: string;
  content: string;
  similarityScore?: number;
  timestamp: string;
  tags: string[];
}

export interface M2MApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string;
  rateLimit: string;
  totalRequests: number;
  status: 'active' | 'revoked';
}
