import { database, ref, onValue, off, set, get, update } from "./firebase";
import { SensorReading, HistoricalData, FanSpeed } from "./sensor-data";
import type { DataSnapshot } from "firebase/database";

// ============================================================================
// 1. TYPE DEFINITIONS & INTERFACES
// ============================================================================

/**
 * State untuk kontrol kipas dan mode navigasi yang dikirim ke robot
 */
export interface FanControlState {
  speed: FanSpeed;      // Kecepatan kipas: "off" | "low" | "normal" | "high"
  isAutoMode: boolean;   // Mode navigasi otomatis (true) atau manual (false)
  updatedAt?: number;    // Timestamp pembaruan terakhir (ms)
}

/**
 * Status aktual robot yang dikirim balik oleh Arduino (Read-Only dari aplikasi)
 */
export interface DeviceStatus {
  kipas: FanSpeed;      // Status kecepatan kipas aktual
  gerak: string;        // Arah gerak aktual ("MAJU", "MUNDUR", "KIRI", "KANAN", "DIAM")
  rpmKanan: number;     // Kecepatan putaran roda kanan (RPM)
  rpmKiri: number;      // Kecepatan putaran roda kiri (RPM)
  x?: number;           // Posisi aktual X (meter)
  y?: number;           // Posisi aktual Y (meter)
  yaw?: number;         // Sudut hadap aktual (yaw, radian)
  linear_velocity?: number;
  angular_velocity?: number;
  navigation_status?: string;
}

/**
 * Data sensor jarak LiDAR terupdate
 */
export interface LidarData {
  timestamp: string;          // Timestamp ISO dari pembacaan LiDAR
  jarak_terdekat_cm: number;  // Jarak hambatan terdekat dalam centimeter
}

// ============================================================================
// 2. DATABASE PATHS & HELPER
// ============================================================================

const UDARA_PATH = "Udara";
const STATUS_PATH = "Status";
const COMMAND_PATH = "Command";
const LIDAR_PATH = "LiDAR/latest";
const HISTORY_PATH = "history";

/**
 * Memastikan Firebase database terinisialisasi sebelum melakukan operasi
 */
const isDbReady = (): boolean => {
  return database && typeof database.app !== "undefined";
};

// ============================================================================
// 3. REAL-TIME DATA SUBSCRIBERS (LISTENERS)
// ============================================================================

/**
 * Mendengarkan perubahan data sensor kualitas udara secara real-time dari /Udara
 * 
 * @param callback Fungsi handler ketika data baru diterima
 * @param onError Fungsi handler opsional ketika terjadi error
 * @returns Fungsi unsubscribe untuk membersihkan listener
 */
export function listenToSensorData(
  callback: (data: SensorReading) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!isDbReady()) {
    console.warn("[listenToSensorData] Firebase Database not initialized.");
    return () => {};
  }
  const sensorsRef = ref(database, UDARA_PATH);

  const listener = onValue(
    sensorsRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        const sensorReading: SensorReading = {
          pm25: Number(data.PM25 !== undefined ? data.PM25 : data.pm25) || 0,
          pm10: Number(data.PM10 !== undefined ? data.PM10 : data.pm10) || 0,
          co: Number(data.CO !== undefined ? data.CO : data.co) || 0,
          voc: Number(data.VOC !== undefined ? data.VOC : data.voc) || 0,
          suhu: Number(data.Suhu !== undefined ? data.Suhu : data.suhu) || 25,
          tegangan: Number(data.Tegangan !== undefined ? data.Tegangan : data.tegangan) || 0,
          battery: Number(data.Persentase !== undefined ? data.Persentase : (data.battery !== undefined ? data.battery : data.Battery)) || 0,
          timestamp: new Date(),
        };
        callback(sensorReading);
      }
    },
    (error: Error) => {
      console.error("[listenToSensorData] Firebase error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(sensorsRef, "value", listener);
}

/**
 * Mendengarkan status riil robot dari /Status (ditulis oleh Arduino)
 * 
 * @param callback Fungsi handler ketika data status baru diterima
 * @param onError Fungsi handler opsional ketika terjadi error
 * @returns Fungsi unsubscribe untuk membersihkan listener
 */
export function listenToDeviceStatus(
  callback: (status: DeviceStatus) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!isDbReady()) {
    console.warn("[listenToDeviceStatus] Firebase Database not initialized.");
    return () => {};
  }
  const statusRef = ref(database, STATUS_PATH);

  const listener = onValue(
    statusRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          kipas: (((data.kipas !== undefined ? data.kipas : data.speed) as string)?.toLowerCase() as FanSpeed) || "off",
          gerak: String(data.gerak || "DIAM"),
          rpmKanan: (() => {
            const val = Number(data.rpmKanan !== undefined ? data.rpmKanan : (data.rpm_right !== undefined ? data.rpm_right : 0));
            return Math.abs(val) < 1.0 ? 0 : val;
          })(),
          rpmKiri: (() => {
            const val = Number(data.rpmKiri !== undefined ? data.rpmKiri : (data.rpm_left !== undefined ? data.rpm_left : 0));
            return Math.abs(val) < 1.0 ? 0 : val;
          })(),
          x: data.x !== undefined ? Number(data.x) : undefined,
          y: data.y !== undefined ? Number(data.y) : undefined,
          yaw: data.yaw !== undefined ? Number(data.yaw) : undefined,
          linear_velocity: data.linear_velocity !== undefined ? Number(data.linear_velocity) : undefined,
          angular_velocity: data.angular_velocity !== undefined ? Number(data.angular_velocity) : undefined,
          navigation_status: data.navigation_status !== undefined ? String(data.navigation_status) : undefined,
        });
      }
    },
    (error: Error) => {
      console.error("[listenToDeviceStatus] Firebase error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(statusRef, "value", listener);
}

/**
 * Mendengarkan perubahan konfigurasi kontrol kipas secara real-time dari /Command
 * 
 * @param callback Fungsi handler ketika konfigurasi berubah
 * @param onError Fungsi handler opsional ketika terjadi error
 * @returns Fungsi unsubscribe untuk membersihkan listener
 */
export function listenToFanControl(
  callback: (state: FanControlState) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!isDbReady()) {
    console.warn("[listenToFanControl] Firebase Database not initialized.");
    return () => {};
  }
  const fanRef = ref(database, COMMAND_PATH);

  const listener = onValue(
    fanRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          speed: (((data.speed !== undefined ? data.speed : data.kipas) as string)?.toLowerCase() as FanSpeed) || "off",
          isAutoMode: data.isAutoMode !== undefined ? Boolean(data.isAutoMode) : true,
          updatedAt: data.updatedAt,
        });
      } else {
        callback({ speed: "off", isAutoMode: true });
      }
    },
    (error: Error) => {
      console.error("[listenToFanControl] Firebase error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(fanRef, "value", listener);
}

/**
 * Mendengarkan status reset filter terakhir dari /Command/filterStartDate
 * 
 * @param callback Fungsi handler ketika tanggal filter berubah
 * @returns Fungsi unsubscribe untuk membersihkan listener
 */
export function listenToFilterStartDate(
  callback: (timestamp: number | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!isDbReady()) {
    console.warn("[listenToFilterStartDate] Firebase Database not initialized.");
    return () => {};
  }
  const filterRef = ref(database, `${COMMAND_PATH}/filterStartDate`);

  const listener = onValue(
    filterRef,
    (snapshot: DataSnapshot) => {
      callback(snapshot.exists() ? Number(snapshot.val()) : null);
    },
    (error: Error) => {
      console.error("[listenToFilterStartDate] Firebase error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(filterRef, "value", listener);
}

/**
 * Mendengarkan data sensor LiDAR secara real-time dari /LiDAR/latest
 * 
 * @param callback Fungsi handler ketika data LiDAR baru diterima
 * @param onError Fungsi handler opsional ketika terjadi error
 * @returns Fungsi unsubscribe untuk membersihkan listener
 */
export function listenToLidarData(
  callback: (data: LidarData) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!isDbReady()) {
    console.warn("[listenToLidarData] Firebase Database not initialized.");
    return () => {};
  }
  const lidarRef = ref(database, LIDAR_PATH);

  const listener = onValue(
    lidarRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          timestamp: String(data.timestamp || ""),
          jarak_terdekat_cm: Number(data.jarak_terdekat_cm) || 0,
        });
      }
    },
    (error: Error) => {
      console.error("[listenToLidarData] Firebase error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(lidarRef, "value", listener);
}

// ============================================================================
// 4. DATA WRITER & ACTIONS (COMMANDS)
// ============================================================================

/**
 * Memperbarui pengaturan kontrol kipas dan navigasi di /Command secara parsial.
 * Menggunakan `update` alih-alih `set` agar tidak menimpa atau menghapus field lain
 * seperti target navigasi (goal_x, goal_y) atau tanggal filter.
 * 
 * @param state Konfigurasi kontrol kipas yang baru
 */
export async function setFanControl(state: FanControlState): Promise<void> {
  if (!isDbReady()) {
    console.warn("[setFanControl] Firebase Database not initialized.");
    return;
  }
  const fanRef = ref(database, COMMAND_PATH);
  await update(fanRef, {
    speed: state.speed.toUpperCase(),
    isAutoMode: state.isAutoMode,
    updatedAt: Date.now(),
  });
}

/**
 * Mengatur mode navigasi robot (Otonom / Manual) di Firebase secara bersamaan
 * 
 * @param isAuto true untuk otonom (autonomous), false untuk manual
 */
export async function setNavigationMode(isAuto: boolean): Promise<void> {
  if (!isDbReady()) {
    console.warn("[setNavigationMode] Firebase Database not initialized.");
    return;
  }
  const fanRef = ref(database, COMMAND_PATH);
  await update(fanRef, {
    isAutoMode: isAuto,
    updatedAt: Date.now(),
  });

  try {
    const robotModeRef = ref(database, "robot/control/mode");
    await set(robotModeRef, isAuto ? "autonomous" : "manual");
  } catch (err) {
    console.warn(
      "[Firebase] Failed to write to robot/control/mode (probably Firebase Rules restriction):",
      err
    );
  }
}

/**
 * Menulis perintah arah pergerakan manual ke /Command/gerak
 * 
 * @param gerak Arah gerak ("MAJU", "MUNDUR", "KIRI", "KANAN", "DIAM")
 */
export async function setGerakCommand(gerak: string): Promise<void> {
  if (!isDbReady()) {
    console.warn("[setGerakCommand] Firebase Database not initialized.");
    return;
  }
  const gerakRef = ref(database, `${COMMAND_PATH}/gerak`);
  await set(gerakRef, gerak.toUpperCase());
}

/**
 * Mengirim koordinat target rute navigasi otonom A* ke /Command
 * 
 * @param x Posisi target sumbu X (meter)
 * @param y Posisi target sumbu Y (meter)
 */
export async function sendNavGoal(x: number, y: number): Promise<void> {
  if (!isDbReady()) {
    console.warn("[sendNavGoal] Firebase Database not initialized.");
    return;
  }
  const commandRef = ref(database, COMMAND_PATH);
  await update(commandRef, {
    goal_x: x,
    goal_y: y,
  });
}

/**
 * Membaca pengaturan kontrol kipas saat ini secara satu kali (one-shot)
 * 
 * @returns Konfigurasi kipas saat ini atau null jika data tidak ditemukan
 */
export async function getFanControl(): Promise<FanControlState | null> {
  if (!isDbReady()) {
    console.warn("[getFanControl] Firebase Database not initialized.");
    return null;
  }
  const fanRef = ref(database, COMMAND_PATH);
  const snapshot = await get(fanRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    return {
      speed: (((data.speed !== undefined ? data.speed : data.kipas) as string)?.toLowerCase() as FanSpeed) || "off",
      isAutoMode: data.isAutoMode !== undefined ? Boolean(data.isAutoMode) : true,
      updatedAt: data.updatedAt,
    };
  }
  return null;
}

/**
 * Mereset tanggal mulai penggunaan filter udara baru di /Command/filterStartDate
 */
export async function resetFilterStartDate(): Promise<void> {
  if (!isDbReady()) {
    console.warn("[resetFilterStartDate] Firebase Database not initialized.");
    return;
  }
  const filterRef = ref(database, `${COMMAND_PATH}/filterStartDate`);
  await set(filterRef, Date.now());
}

// ============================================================================
// 5. HISTORICAL DATA SERVICES
// ============================================================================

/**
 * Mengambil data historis sensor kualitas udara untuk visualisasi grafik.
 * 
 * @param days Jumlah rentang hari ke belakang yang ingin diambil
 * @returns Array data historis kualitas udara terurut kronologis
 */
export async function getHistoricalData(
  days: number,
): Promise<HistoricalData[]> {
  if (!isDbReady()) {
    console.warn("[getHistoricalData] Firebase Database not initialized.");
    return [];
  }
  return new Promise((resolve) => {
    const historyRef = ref(database, HISTORY_PATH);

    onValue(
      historyRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        if (!data) {
          resolve([]);
          return;
        }

        const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
        const historicalData: HistoricalData[] = [];

        Object.entries(data).forEach(([timestamp, values]: [string, any]) => {
          const ts = Number(timestamp);
          if (!isNaN(ts) && ts >= cutoffTime && values) {
            historicalData.push({
              timestamp: new Date(ts),
              pm25: Number(values.pm25 !== undefined ? values.pm25 : values.PM25) || 0,
              pm10: Number(values.pm10 !== undefined ? values.pm10 : values.PM10) || 0,
              co: Number(values.co !== undefined ? values.co : values.CO) || 0,
              voc: Number(values.voc !== undefined ? values.voc : values.VOC) || 0,
              suhu: Number(values.suhu !== undefined ? values.suhu : values.Suhu) || 0,
              tegangan: Number(values.tegangan !== undefined ? values.tegangan : values.Tegangan) || 0,
              battery: Number(values.battery !== undefined ? values.battery : (values.Persentase !== undefined ? values.Persentase : values.Battery)) || 0,
            });
          }
        });

        // Urutkan data berdasarkan timestamp terlama ke terbaru
        historicalData.sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );
        resolve(historicalData);
      },
      (error: Error) => {
        console.error("[getHistoricalData] Error fetching historical data:", error);
        resolve([]);
      },
      { onlyOnce: true },
    );
  });
}

/**
 * Mengirim perintah simpan peta ke /Command/save_map di Firebase
 */
export async function triggerSaveMap(): Promise<void> {
  if (!isDbReady()) {
    console.warn("[triggerSaveMap] Firebase Database not initialized.");
    return;
  }
  const saveMapRef = ref(database, `${COMMAND_PATH}/save_map`);
  await set(saveMapRef, true);
}

/**
 * Mengirim perintah koneksi WiFi baru ke /Command/wifi di Firebase
 */
export async function triggerWifiChange(ssid: string, password: string): Promise<void> {
  if (!isDbReady()) {
    console.warn("[triggerWifiChange] Firebase Database not initialized.");
    return;
  }
  const wifiRef = ref(database, `${COMMAND_PATH}/wifi`);
  await set(wifiRef, {
    ssid,
    password,
    trigger: true,
    updatedAt: Date.now(),
  });
}

/**
 * Mendengarkan status WiFi aktual dari /Status/wifi_status dan /Status/wifi_error di Firebase
 */
export function listenToWifiStatus(
  callback: (status: { wifiStatus: string; wifiError: string }) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!isDbReady()) {
    console.warn("[listenToWifiStatus] Firebase Database not initialized.");
    return () => {};
  }
  const statusRef = ref(database, STATUS_PATH);
  const listener = onValue(
    statusRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          wifiStatus: (data.wifi_status as string) || "",
          wifiError: (data.wifi_error as string) || "",
        });
      }
    },
    (error: Error) => {
      console.error("[listenToWifiStatus] Firebase error:", error);
      if (onError) onError(error);
    },
  );
  return () => off(statusRef, "value", listener);
}

/**
 * Mendengarkan daftar SSID WiFi yang terdeteksi oleh Orange Pi dari /Status/detected_wifis
 */
export function listenToDetectedWifis(
  callback: (wifis: string[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!isDbReady()) {
    console.warn("[listenToDetectedWifis] Firebase Database not initialized.");
    return () => {};
  }
  const wifisRef = ref(database, `${STATUS_PATH}/detected_wifis`);
  const listener = onValue(
    wifisRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data && Array.isArray(data)) {
        callback(data);
      } else if (data && typeof data === "object") {
        callback(Object.values(data) as string[]);
      } else {
        callback([]);
      }
    },
    (error: Error) => {
      console.error("[listenToDetectedWifis] Firebase error:", error);
      if (onError) onError(error);
    },
  );
  return () => off(wifisRef, "value", listener);
}

/**
 * Memicu Orange Pi untuk melakukan pemindaian WiFi baru
 */
export async function triggerWifiScan(): Promise<void> {
  if (!isDbReady()) {
    console.warn("[triggerWifiScan] Firebase Database not initialized.");
    return;
  }
  const scanTriggerRef = ref(database, `${COMMAND_PATH}/wifi`);
  await update(scanTriggerRef, {
    scan_trigger: true,
  });
}


