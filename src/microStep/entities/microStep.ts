// MicroStep Entities
import type { ProgrammerPrinciple } from '../valueObjects';

export interface NanoStep {
  id: string;
  text: string;
  done: boolean;
}

export interface MicroStep {
  id: string;
  order: number;
  title: string;
  durationMinutes: number;
  programmerPrinciple: ProgrammerPrinciple;
  inputRequired: string;
  singleAction: string;
  testCriterion: string;
  unblockTip: string;
  completed: boolean;
  completedAt?: string;
  nanoSteps?: NanoStep[];
  notes?: string;
  // Version 2.0 Traceability Linkage:
  goalId?: string;
  goalTitle?: string;
  milestoneId?: string;
  milestoneTitle?: string;
  isAlignedWithGoal?: boolean;
}

export function createMicroStep(params: {
  id: string;
  order: number;
  title: string;
  durationMinutes: number;
  programmerPrinciple: ProgrammerPrinciple;
  inputRequired: string;
  singleAction: string;
  testCriterion: string;
  unblockTip: string;
}): MicroStep {
  return {
    ...params,
    completed: false,
    nanoSteps: undefined,
    notes: undefined,
    goalId: undefined,
    goalTitle: undefined,
    milestoneId: undefined,
    milestoneTitle: undefined,
    isAlignedWithGoal: false,
  };
}

export function markStepComplete(step: MicroStep, completedAt?: string): MicroStep {
  return {
    ...step,
    completed: true,
    completedAt: completedAt || new Date().toISOString(),
  };
}

export function markStepIncomplete(step: MicroStep): MicroStep {
  return {
    ...step,
    completed: false,
    completedAt: undefined,
  };
}
