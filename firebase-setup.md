# Firebase Realtime Database — Setup & Structure

## 1. Database Rules

Di Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "Udara": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "Status": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "Command": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "history": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "LiDAR": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "Map": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "robot": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "SavedMaps": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

## 2. Database Structure

### `/Udara` — Data sensor real-time (ditulis Arduino)

```json
{
  "Udara": {
    "PM25": 12.5,
    "PM10": 20.1,
    "CO": 3.2,
    "VOC": 1.8,
    "Suhu": 29.4,
    "Tegangan": 15.8,
    "Persentase": 87
  }
}
```

| Field        | Tipe   | Satuan | Keterangan                 |
| ------------ | ------ | ------ | -------------------------- |
| `PM25`       | number | μg/m³  | Partikel 2.5 mikron        |
| `PM10`       | number | μg/m³  | Partikel 10 mikron         |
| `CO`         | number | ppm    | Karbon monoksida           |
| `VOC`        | number | mg/m³  | Volatile Organic Compounds |
| `Suhu`       | number | °C     | Suhu udara                 |
| `Tegangan`   | number | V      | Tegangan baterai           |
| `Persentase` | number | %      | Persentase baterai         |

---

### `/Status` — Status aktual perangkat (ditulis Arduino, read-only dari app)

```json
{
  "Status": {
    "kipas": "HIGH",
    "gerak": "MAJU",
    "rpmKanan": 48.2,
    "rpmKiri": 47.9
  }
}
```

| Field      | Tipe   | Nilai                                             | Keterangan             |
| ---------- | ------ | ------------------------------------------------- | ---------------------- |
| `kipas`    | string | `OFF` \| `LOW` \| `NORMAL` \| `HIGH`              | Kecepatan kipas aktual |
| `gerak`    | string | `MAJU` \| `MUNDUR` \| `KIRI` \| `KANAN` \| `DIAM` | Arah gerak aktual      |
| `rpmKanan` | number | —                                                 | RPM motor kanan        |
| `rpmKiri`  | number | —                                                 | RPM motor kiri         |

---

### `/Command` — Perintah dari app ke Arduino

```json
{
  "Command": {
    "speed": "HIGH",
    "gerak": "MAJU",
    "isAutoMode": true,
    "filterStartDate": 1708923456789,
    "updatedAt": 1708923456789
  }
}
```

| Field             | Tipe    | Nilai                                             | Keterangan                                |
| ----------------- | ------- | ------------------------------------------------- | ----------------------------------------- |
| `speed`           | string  | `OFF` \| `LOW` \| `NORMAL` \| `HIGH`              | Perintah kecepatan kipas                  |
| `gerak`           | string  | `MAJU` \| `MUNDUR` \| `KIRI` \| `KANAN` \| `DIAM` | Perintah arah gerak (dari Remote Control) |
| `isAutoMode`      | boolean | `true` / `false`                                  | Mode otomatis aktif                       |
| `filterStartDate` | number  | timestamp ms                                      | Tanggal reset filter terakhir             |
| `map_action`      | object  | `{ action: "SAVE"\|"LOAD", mapName: string, status: "PENDING"\|"SUCCESS"\|"ERROR", timestamp: number }` | Perintah aksi penyimpanan/pemuatan peta |
| `updatedAt`       | number  | timestamp ms                                      | Waktu update terakhir dari app            |

**Mapping Remote Control → `/Command/gerak`:**

| Tombol D-Pad | Value Firebase |
| ------------ | -------------- |
| ↑ (Up)       | `MAJU`         |
| ↓ (Down)     | `MUNDUR`       |
| ← (Left)     | `KIRI`         |
| → (Right)    | `KANAN`        |
| Stop / Reset | `DIAM`         |

---

### `/history` — Data historis sensor

```json
{
  "history": {
    "1708920000000": {
      "pm25": 11.2,
      "pm10": 16.8,
      "co": 14.5,
      "voc": 7.9,
      "suhu": 28.1,
      "tegangan": 15.5,
      "battery": 90
    }
  }
}
```

Key adalah Unix timestamp dalam milidetik. Data digunakan untuk grafik 3d / 7d.

---

### `/Map` — Data peta real-time dari SLAM (ditulis Orange Pi bridge)

```json
{
  "Map": {
    "grid": {
      "width": 100,
      "height": 100,
      "resolution": 0.2,
      "origin_x": -10.0,
      "origin_y": -10.0,
      "data_b64": "<base64 encoded occupancy data>",
      "timestamp": "2026-07-04T22:00:00Z"
    },
    "scan_points": {
      "points": [
        { "x": 1.2, "y": 0.5 },
        { "x": 1.3, "y": 0.6 }
      ],
      "timestamp": "2026-07-04T22:00:00Z"
    },
    "path": {
      "points": [
        { "x": 0.0, "y": 0.0 },
        { "x": 1.0, "y": 1.0 }
      ],
      "timestamp": "2026-07-04T22:00:00Z"
    },
    "robot_pose": {
      "x": 0.5,
      "y": 0.3,
      "yaw": 1.57,
      "timestamp": "2026-07-04T22:00:00Z"
    }
  }
}
```

| Path              | Keterangan                                           |
| ----------------- | ---------------------------------------------------- |
| `grid`            | Occupancy grid (downsampled, base64)                 |
| `scan_points`     | Titik-titik LiDAR yang ditransformasi ke map frame   |
| `path`            | Jalur A* yang direncanakan Nav2                      |
| `robot_pose`      | Posisi dan orientasi robot dalam map frame            |

---

### `/SavedMaps` — Daftar peta yang disimpan

```json
{
  "SavedMaps": {
    "map_1708920000000": {
      "id": "map_1708920000000",
      "name": "Lantai 1 Rumah",
      "timestamp": 1708920000000,
      "grid": {
        "width": 100,
        "height": 100,
        "resolution": 0.2,
        "origin_x": -10.0,
        "origin_y": -10.0,
        "data_b64": "<base64 encoded occupancy data>"
      }
    }
  }
}
```

| Field       | Tipe   | Keterangan                                       |
| ----------- | ------ | ------------------------------------------------ |
| `id`        | string | ID unik peta (biasanya `map_[timestamp]`)       |
| `name`      | string | Nama/label kustom dari pengguna                  |
| `timestamp` | number | Waktu penyimpanan peta (ms)                      |
| `grid`      | object | Snapshot data occupancy grid peta saat disimpan   |

---

## 3. Alur Data

```
Arduino    ──writes──▶ /Udara      (sensor readings)
Arduino    ──writes──▶ /Status     (actual device state)
Orange Pi  ──writes──▶ /Map        (grid, scan_points, path, robot_pose)

App        ──writes──▶ /Command    (fan speed, gerak, auto mode, nav goal)
App        ──reads───▶ /Udara      (display sensor cards & chart)
App        ──reads───▶ /Status     (display actual device state)
App        ──reads───▶ /Command    (sync fan control UI)
App        ──reads───▶ /Map        (real-time map visualization)
```

---

## 4. Test Data (Browser Console)

```javascript
const db = firebase.database();

// Simulasi data sensor dari Arduino
db.ref("Udara").set({
  PM25: 12.5,
  PM10: 20.1,
  CO: 3.2,
  VOC: 1.8,
  Suhu: 29.4,
  Tegangan: 15.8,
  Persentase: 87,
});

// Simulasi status perangkat
db.ref("Status").set({
  kipas: "HIGH",
  gerak: "MAJU",
  rpmKanan: 48.2,
  rpmKiri: 47.9,
});

// Kirim perintah ke perangkat
db.ref("Command").set({
  speed: "NORMAL",
  gerak: "DIAM",
  isAutoMode: false,
  updatedAt: Date.now(),
});

// Tambah data historis
db.ref("history/" + Date.now()).set({
  pm25: 11.2,
  pm10: 16.8,
  co: 14.5,
  voc: 7.9,
  suhu: 28.1,
  tegangan: 15.5,
  battery: 90,
});
```

---

## 5. Troubleshooting

### `permission_denied` di `/Udara`, `/Status`, atau `/Command`

- Pastikan Firebase Rules sudah diupdate sesuai bagian 1
- Cek database URL di `.env.local`
- Pastikan user sudah login (rules menggunakan `auth != null`)

### Data sensor tidak muncul di dashboard

- Pastikan Arduino menulis ke path `/Udara` dengan field name persis (case-sensitive): `PM25`, `PM10`, `CO`, `VOC`, `Suhu`, `Tegangan`, `Persentase`
- Cek Firebase Console → Realtime Database untuk memverifikasi data masuk

### Remote Control tidak menggerakkan robot

- Pastikan Arduino membaca `/Command/gerak` dan merespons nilai `MAJU`, `MUNDUR`, `KIRI`, `KANAN`, `DIAM`
- Cek tab Network di browser untuk memastikan write ke Firebase berhasil (tidak ada 401/403)
