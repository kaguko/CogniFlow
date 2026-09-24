import { useState, useCallback } from 'react';
import { PredictionPayload } from '../mod';
import { ProjectContext } from '../../projectContext/entities/projectContext';
import { decomposeOffline } from '../../services/offlineDecomposer';

export interface UsePredictionOptions {
  initialData: PredictionPayload;
}

export function usePrediction({ initialData }: UsePredictionOptions) {
  const [prediction, setPrediction] = useState<PredictionPayload>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrediction = useCallback(
    async (context: ProjectContext) => {
      // Check offline status first
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.info('[Offline Engine] Generating local microstep decomposition');
        const offlineResult = decomposeOffline(context);
        setPrediction(offlineResult);
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context }),
        });

        if (!res.ok) throw new Error('Predict API error');
        const data = await res.json();
        if (data && data.timelines) {
          setPrediction(data);
        }
      } catch (err) {
        console.warn('Network or API error, switching seamlessly to offline Rule Engine', err);
        const offlineResult = decomposeOffline(context);
        setPrediction(offlineResult);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    prediction,
    setPrediction,
    isLoading,
    setIsLoading,
    fetchPrediction,
  };
}
