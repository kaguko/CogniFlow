import { AgentNode, AgentTask, AgenticMemoryEntry } from './agent';

export interface SwarmCircuitBreaker {
  maxAllowedDrift: number; // default 40%
  autoHaltOnDrift: boolean;
  isTriggered: boolean;
  lastHaltedReason?: string;
  haltedAt?: string;
}

export interface SwarmExecutionLog {
  id: string;
  timestamp: string;
  sourceAgentId: string;
  sourceAgentName: string;
  targetAgentId?: string;
  actionType: 'DECOMPOSE_INVOKED' | 'TASK_DISPATCHED' | 'CODE_GENERATED' | 'DRIFT_CHECK' | 'SOCRATIC_CHALLENGE' | 'GUARDRAIL_CIRCUIT_BREAK' | 'TEST_PASSED' | 'MEMORY_SYNC';
  payloadSummary: string;
  driftScore?: number;
  status: 'info' | 'success' | 'warning' | 'critical';
}

export interface SwarmState {
  id: string;
  objective: string;
  activeCycle: number;
  totalMicroStepsCount: number;
  completedMicroStepsCount: number;
  averageDriftScore: number;
  overallHealthScore: number; // 0 - 100
  circuitBreaker: SwarmCircuitBreaker;
  agents: AgentNode[];
  activeTasks: AgentTask[];
  completedTasks: AgentTask[];
  executionLogs: SwarmExecutionLog[];
  memoryEntries: AgenticMemoryEntry[];
}
