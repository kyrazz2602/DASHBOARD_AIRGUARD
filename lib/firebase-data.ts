import { database, ref, onValue, off, set, get } from "./firebase";
import { SensorReading, HistoricalData, FanSpeed } from "./sensor-data";
import type { DataSnapshot } from "firebase/database";

// ─── Fan Control ─────────────────────────────────────────────────────────────

export interface FanControlState {
  speed: FanSpeed;
  isAutoMode: boolean;
  updatedAt?: number;
}

const FAN_CONTROL_PATH = "Command";

/**
 * Menulis state fan control ke Firebase Realtime Database
 * Path: /Command/{ speed, isAutoMode, updatedAt }
 */
export async function setFanControl(state: FanControlState): Promise<void> {
  const fanRef = ref(database, FAN_CONTROL_PATH);
  await set(fanRef, {
    ...state,
    updatedAt: Date.now(),
  });
}

/**
 * Membaca state fan control dari Firebase sekali (one-shot)
 */
export async function getFanControl(): Promise<FanControlState | null> {
  const fanRef = ref(database, FAN_CONTROL_PATH);
  const snapshot = await get(fanRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return {
      speed: (data.speed as FanSpeed) || "off",
      isAutoMode: data.isAutoMode !== undefined ? Boolean(data.isAutoMode) : true,
      updatedAt: data.updatedAt,
    };
  }
  return null;
}

/**
 * Subscribe ke perubahan state fan control dari Firebase secara real-time
 * Path: /Command/{ speed, isAutoMode }
 * Mengembalikan fungsi cleanup untuk unsubscribe
 */
export function listenToFanControl(
  callback: (state: FanControlState) => void,
  onError?: (error: Error) => void
): () => void {
  const fanRef = ref(database, FAN_CONTROL_PATH);

  const listener = onValue(
    fanRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          speed: (data.speed as FanSpeed) || "off",
          isAutoMode: data.isAutoMode !== undefined ? Boolean(data.isAutoMode) : true,
          updatedAt: data.updatedAt,
        });
      } else {
        // Node belum ada — kembalikan default
        callback({ speed: "off", isAutoMode: true });
      }
    },
    (error: Error) => {
      console.error("Firebase fan control error:", error);
      if (onError) onError(error);
    }
  );

  return () => off(fanRef, "value", listener);
}

// ─── Filter Status ──────────────────────────────────────────────────────────

/**
 * Menyimpan tanggal penggantian filter baru ke Firebase
 */
export async function resetFilterStartDate(): Promise<void> {
  const filterRef = ref(database, "Command/filterStartDate");
  await set(filterRef, Date.now());
}

/**
 * Membaca/Subscribe ke perubahan tanggal filter dari Firebase
 */
export function listenToFilterStartDate(
  callback: (timestamp: number | null) => void
): () => void {
  const filterRef = ref(database, "Command/filterStartDate");
  const listener = onValue(
    filterRef,
    (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        callback(Number(snapshot.val()));
      } else {
        // Belum diset
        callback(null);
      }
    },
    (error: Error) => {
      console.error("Firebase filter error:", error);
    }
  );

  return () => off(filterRef, "value", listener);
}

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
