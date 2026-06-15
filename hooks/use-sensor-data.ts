import { useState, useEffect } from 'react';
import { generateSensorData, SensorReading } from '@/lib/sensor-data';
import { listenToSensorData } from '@/lib/firebase-data';

export function useSensorData(refreshInterval: number = 3000) {
  const [data, setData] = useState<SensorReading>(generateSensorData());
  const [useFirebase, setUseFirebase] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    if (useFirebase) {
      // Try to use Firebase real-time data
      try {
        cleanup = listenToSensorData(
          (firebaseData) => {
            setData(firebaseData);
            setError(null);
            setIsLoading(false);
          },
          (err) => {
            console.error('Firebase connection error:', err);
            setError(err);
            setUseFirebase(false); // Fall back to simulated data
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error('Failed to initialize Firebase listener:', err);
        setUseFirebase(false);
        setIsLoading(false);
      }
    }

    // Fallback: Use simulated data if Firebase is disabled or fails
    if (!useFirebase) {
      fallbackInterval = setInterval(() => {
        setData(generateSensorData());
        setIsLoading(false);
      }, refreshInterval);
    }

    return () => {
      if (cleanup) cleanup();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [refreshInterval, useFirebase]);

  return { data, isLoading, error };
}
