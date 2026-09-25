import fs from 'fs';
import os from 'os';
import path from 'path';
import { test, expect } from '@playwright/test';

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'symflowage-calibration-'));
const storagePath = path.join(temporaryDirectory, 'calibration-memory.json');
process.env.SYMFLOWAGE_CALIBRATION_MEMORY_PATH = storagePath;

const {
  addCalibrationRule,
  getActiveCalibrationRules,
  reloadCalibrationMemory,
} = await import('../src/lib/calibrationMemory.ts');

test.afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('persists calibration rules across a memory reload', async () => {
  addCalibrationRule('DRIFT', 'restart-test', 'Luôn chạy contract test trước khi mở rộng phạm vi.');

  expect(fs.existsSync(storagePath)).toBe(true);
  expect(getActiveCalibrationRules()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceOutcome: 'DRIFT',
        rule: expect.stringContaining('Luôn chạy contract test'),
      }),
    ])
  );

  reloadCalibrationMemory();

  expect(getActiveCalibrationRules()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceOutcome: 'DRIFT',
        rule: expect.stringContaining('Luôn chạy contract test'),
      }),
    ])
  );
});
