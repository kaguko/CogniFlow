// MicroStep Value Objects
export type ProgrammerPrinciple =
  | 'Divide & Conquer'
  | 'Atomic Commit'
  | 'TDD Loop'
  | 'Fail Fast'
  | 'YAGNI / Minimal Surface'
  | 'Boundary Isolation';

export interface Duration {
  minutes: number;
  display: string;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins} phút` : `${hours} giờ`;
}
