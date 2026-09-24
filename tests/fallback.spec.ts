import { test, expect } from '@playwright/test';
import { generateContentWithFallback } from '../src/lib/geminiResilience.ts';

test.describe('Gemini resilience fallback', () => {
  test('returns a usable decomposition contract without a Gemini key', async ({ request }) => {
    const response = await request.post('/api/v1/agent/decompose', {
      headers: {
        Authorization: 'Bearer test-agent-key',
        'Content-Type': 'application/json',
      },
      data: {
        goalTitle: 'Smoke test fallback khi Gemini không khả dụng',
      },
    });
    const body = await response.json();

    expect(response.ok()).toBe(true);
    expect(body.contractVersion).toBe('agent.v1');
    expect(body.microSteps.length).toBeGreaterThan(0);
    expect(body.microSteps.every((step: { durationMinutes: number }) => step.durationMinutes <= 15)).toBe(true);
  });

  test('switches models after a transient 429 response', async () => {
    const calls: string[] = [];
    const ai = {
      models: {
        generateContent: async ({ model }: { model: string }) => {
          calls.push(model);
          if (model === 'quota-model') throw { status: 429, message: 'RESOURCE_EXHAUSTED' };
          return { text: 'fallback model response' };
        },
      },
    } as any;

    const response = await generateContentWithFallback(ai, {
      contents: 'resilience test',
      models: ['quota-model', 'fallback-model'],
      maxRetriesPerModel: 1,
    });

    expect(response.text).toBe('fallback model response');
    expect(calls).toEqual(['quota-model', 'fallback-model']);
  });
});