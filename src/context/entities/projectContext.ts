// Context Entities
import type { DomainType, EnergyLevel } from '../valueObjects';

export interface ProjectContext {
  id: string;
  title: string;
  description: string;
  domain: DomainType;
  deadlineHorizon: string;
  energyLevel: EnergyLevel;
  currentFriction: string;
  behavioralFlags: string[];
  techStack: string[];
  lastUpdated: string;
  linkedGoalId?: string;
  linkedMilestoneId?: string;
}

export interface ContextEditorRequest {
  id?: string;
  title: string;
  description: string;
  domain: DomainType;
  deadlineHorizon: string;
  energyLevel: EnergyLevel;
  currentFriction: string;
  behavioralFlags: string[];
  techStack: string[];
}

export function createContext(params: ContextEditorRequest): ProjectContext {
  return {
    ...params,
    id: params.id || `ctx_${Date.now()}`,
    lastUpdated: new Date().toISOString(),
  };
}

export function updateContext(context: ProjectContext, updates: Partial<ProjectContext>): ProjectContext {
  return {
    ...context,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
}
