// ProjectContext Entity
import type { DomainType, EnergyLevel } from '../valueObjects';

export interface ProjectContext {
  id: string;
  title: string;
  description: string;
  domain: DomainType;
  deadlineHorizon: string;
  energyLevel: EnergyLevel;
  currentFriction: string;
  techStack: string[];
  behavioralFlags: string[];
  lastUpdated: string;
  linkedGoalId?: string;
  linkedMilestoneId?: string;
}

export function createProjectContext(params: {
  id: string;
  title: string;
  description?: string;
  domain?: DomainType;
  deadlineHorizon?: string;
  energyLevel?: EnergyLevel;
  currentFriction?: string;
  techStack?: string[];
  behavioralFlags?: string[];
  lastUpdated?: string;
  linkedGoalId?: string;
  linkedMilestoneId?: string;
}): ProjectContext {
  return {
    description: '',
    domain: 'software',
    deadlineHorizon: '3 ngày tới',
    energyLevel: 'medium',
    currentFriction: 'Chưa rõ điểm bắt đầu',
    techStack: [],
    behavioralFlags: [],
    lastUpdated: 'Vừa xong',
    ...params,
  };
}

export function updateProjectContext(
  context: ProjectContext,
  patch: Partial<Omit<ProjectContext, 'id'>>
): ProjectContext {
  return {
    ...context,
    ...patch,
    lastUpdated: 'Vừa xong',
  };
}
