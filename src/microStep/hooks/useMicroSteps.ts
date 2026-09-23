import { useState, useCallback } from 'react';
import { MicroStep, NanoStep } from '../entities/microStep';

export interface UseMicroStepsOptions {
  initialSteps: MicroStep[];
  onStepComplete?: (completedStep: MicroStep, allSteps: MicroStep[]) => void;
}

export function useMicroSteps({
  initialSteps,
  onStepComplete,
}: UseMicroStepsOptions) {
  const [microSteps, setMicroSteps] = useState<MicroStep[]>(initialSteps);

  const toggleComplete = useCallback(
    (id: string) => {
      setMicroSteps((prevSteps) => {
        let toggledStep: MicroStep | undefined;
        const updated = prevSteps.map((step) => {
          if (step.id === id) {
            const nextCompleted = !step.completed;
            toggledStep = {
              ...step,
              completed: nextCompleted,
              completedAt: nextCompleted ? 'Vừa xong' : undefined,
            };
            return toggledStep;
          }
          return step;
        });

        if (toggledStep && onStepComplete) {
          onStepComplete(toggledStep, updated);
        }

        return updated;
      });
    },
    [onStepComplete]
  );

  const addStep = useCallback((step: MicroStep) => {
    setMicroSteps((prev) => [...prev, step]);
  }, []);

  const addMultipleSteps = useCallback((steps: MicroStep[]) => {
    setMicroSteps((prev) => [...steps, ...prev]);
  }, []);

  const decomposeStep = useCallback(
    async (stepId: string, currentFriction: string) => {
      const step = microSteps.find((s) => s.id === stepId);
      if (!step) return;

      try {
        const res = await fetch('/api/decompose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stepTitle: step.title,
            contextFriction: currentFriction,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.nanoSteps) {
            setMicroSteps((prev) =>
              prev.map((s) => (s.id === stepId ? { ...s, nanoSteps: data.nanoSteps } : s))
            );
            return;
          }
        }
      } catch (err) {
        console.warn('Decompose fallback triggered:', err);
      }

      // Local fallback decomposition
      const fallbackNano: NanoStep[] = [
        {
          id: `ns_${Date.now()}_1`,
          text: 'Mở đúng 1 file liên quan và định vị hàm mục tiêu (2 phút)',
          done: false,
        },
        {
          id: `ns_${Date.now()}_2`,
          text: 'Viết 1 dòng assert hoặc log để xác nhận input đầu vào (2 phút)',
          done: false,
        },
        {
          id: `ns_${Date.now()}_3`,
          text: 'Chạy kiểm thử nhanh để xác thực bước giải phóng (3 phút)',
          done: false,
        },
      ];

      setMicroSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, nanoSteps: fallbackNano } : s))
      );
    },
    [microSteps]
  );

  const toggleNanoStep = useCallback((stepId: string, nanoId: string) => {
    setMicroSteps((prev) =>
      prev.map((s) => {
        if (s.id === stepId && s.nanoSteps) {
          return {
            ...s,
            nanoSteps: s.nanoSteps.map((n) => (n.id === nanoId ? { ...n, done: !n.done } : n)),
          };
        }
        return s;
      })
    );
  }, []);

  const linkStepToGoal = useCallback(
    (stepId: string, goalId: string, goalTitle?: string, milestoneId?: string, milestoneTitle?: string) => {
      setMicroSteps((prev) =>
        prev.map((s) =>
          s.id === stepId
            ? {
                ...s,
                goalId,
                goalTitle,
                milestoneId,
                milestoneTitle,
                isAlignedWithGoal: true,
              }
            : s
        )
      );
    },
    []
  );

  return {
    microSteps,
    setMicroSteps,
    toggleComplete,
    addStep,
    addMultipleSteps,
    decomposeStep,
    toggleNanoStep,
    linkStepToGoal,
  };
}
