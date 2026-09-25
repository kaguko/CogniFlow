import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export interface ActiveCalibrationRule {
  id: string;
  rule: string;
  sourceOutcome: 'DRIFT' | 'CRASH';
  requestId: string;
  timestamp: number;
}

interface CalibrationMemoryFile {
  version: 1;
  rules: ActiveCalibrationRule[];
}

const maxContextRules = 20;
const defaultStoragePath = path.resolve(process.cwd(), '.data/calibration-memory.json');
const storagePath = process.env.SYMFLOWAGE_CALIBRATION_MEMORY_PATH || defaultStoragePath;
let activeCalibrationRules: ActiveCalibrationRule[] = loadCalibrationRules();

function loadCalibrationRules(): ActiveCalibrationRule[] {
  try {
    const raw = fs.readFileSync(storagePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CalibrationMemoryFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.rules)) return [];

    return parsed.rules.filter((rule): rule is ActiveCalibrationRule => {
      return Boolean(
        rule &&
          typeof rule.id === 'string' &&
          typeof rule.rule === 'string' &&
          (rule.sourceOutcome === 'DRIFT' || rule.sourceOutcome === 'CRASH') &&
          typeof rule.requestId === 'string' &&
          typeof rule.timestamp === 'number'
      );
    });
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn(`[calibration-memory] unable to load ${storagePath}:`, error?.message || error);
    }
    return [];
  }
}

function persistCalibrationRules(): void {
  const directory = path.dirname(storagePath);
  const temporaryPath = `${storagePath}.${process.pid}.${randomUUID()}.tmp`;
  const payload: CalibrationMemoryFile = {
    version: 1,
    rules: activeCalibrationRules,
  };

  fs.mkdirSync(directory, { recursive: true });
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryPath, storagePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

export function getActiveCalibrationRules(): ActiveCalibrationRule[] {
  return activeCalibrationRules.slice(-maxContextRules);
}

export function reloadCalibrationMemory(): void {
  activeCalibrationRules = loadCalibrationRules();
}

export function addCalibrationRule(
  outcomeStatus: 'DRIFT' | 'CRASH',
  requestId: string,
  notes?: string
): void {
  const normalizedNotes = notes?.trim();
  const rule = normalizedNotes
    ? `Sau outcome ${outcomeStatus}, kiểm chứng lại nguyên nhân trước khi lặp lại: ${normalizedNotes}`
    : `Sau outcome ${outcomeStatus}, phải xác định nguyên nhân gốc và thêm một kiểm chứng trước khi tiếp tục.`;

  activeCalibrationRules.push({
    id: `rule_${randomUUID().slice(0, 8)}`,
    rule,
    sourceOutcome: outcomeStatus,
    requestId,
    timestamp: Date.now(),
  });
  persistCalibrationRules();
}
