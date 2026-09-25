import { useState, useCallback, useEffect } from 'react';
import { PredictionPayload } from '../mod';
import { ProjectContext } from '../../projectContext/entities/projectContext';
import { decomposeOffline } from '../../services/offlineDecomposer';
import { auth } from '../../lib/firebase';

export interface UsePredictionOptions {
  initialData: PredictionPayload;
}

export function usePrediction({ initialData }: UsePredictionOptions) {
  const [prediction, setPrediction] = useState<PredictionPayload>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Restore from localStorage on initial mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('domain_stores_active_prediction');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.microSteps) {
          setPrediction(parsed);
        }
      }
    } catch (err) {
      console.warn('[usePrediction] Failed reading from localStorage:', err);
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (prediction && prediction.microSteps) {
      try {
        localStorage.setItem('domain_stores_active_prediction', JSON.stringify(prediction));
      } catch (e) {
        console.warn('[usePrediction] Failed saving to localStorage:', e);
      }
    }
  }, [prediction]);

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
        const token = await auth.currentUser?.getIdToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers,
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
