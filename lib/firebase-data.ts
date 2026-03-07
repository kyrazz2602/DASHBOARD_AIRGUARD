import { database, ref, onValue, off } from "./firebase";
import { SensorReading, HistoricalData } from "./sensor-data";
import type { DataSnapshot } from "firebase/database";

/**
 * Subscribe to real-time sensor data updates from Firebase
 * Expected database structure: /Udara/{ PM25, PM10, CO, VOC, Suhu }
 * Matches Arduino code field naming (uppercase)
 */
export function listenToSensorData(
  callback: (data: SensorReading) => void,
  onError?: (error: Error) => void
) {
  // Use /Udara path to match Arduino code structure
  const sensorsRef = ref(database, "Udara");

  const listener = onValue(
    sensorsRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      
      if (data) {
        // Transform Firebase data to SensorReading format
        const sensorReading: SensorReading = {
          pm25: Number(data.PM25) || 0,
          pm10: Number(data.PM10) || 0,
          co: Number(data.CO) || 0,
          voc: Number(data.VOC) || 0,
          suhu: Number(data.Suhu) || 0,
          battery: Number(data.Persentase) || 0,
          timestamp: new Date(), 
        };
        
        callback(sensorReading);
      }
    },
    (error: Error) => {
      console.error("Firebase error:", error);
      if (onError) {
        onError(error);
      }
    }
  );

  // Return cleanup function
  return () => {
    off(sensorsRef, "value", listener);
  };
}

/**
 * Fetch historical sensor data from Firebase
 * Expected structure: /history/[timestamp]/{ pm25, pm10, co, voc }
 * 
 * If historical data is not available in Firebase, returns empty array
 * Components should fall back to simulated data in that case
 */
export async function getHistoricalData(
  days: number
): Promise<HistoricalData[]> {
  return new Promise((resolve) => {
    const historyRef = ref(database, "history");
    
    onValue(
      historyRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        
        if (!data) {
          // No historical data available
          resolve([]);
          return;
        }

        const now = Date.now();
        const cutoffTime = now - days * 24 * 60 * 60 * 1000;
        const historicalData: HistoricalData[] = [];

        // Convert Firebase object to array and filter by time range
        Object.entries(data).forEach(([timestamp, values]: [string, any]) => {
          const ts = Number(timestamp);
          if (ts >= cutoffTime) {
            historicalData.push({
              timestamp: new Date(ts),
              pm25: Number(values.pm25) || 0,
              pm10: Number(values.pm10) || 0,
              co: Number(values.co) || 0,
              voc: Number(values.voc) || 0,
              suhu: Number(values.suhu) || 0,
              battery: Number(values.battery) || 0,
            });
          }
        });

        // Sort by timestamp ascending
        historicalData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        resolve(historicalData);
      },
      (error: Error) => {
        console.error("Error fetching historical data:", error);
        resolve([]);
      },
      { onlyOnce: true } // Only read once, not a continuous listener
    );
  });
}
