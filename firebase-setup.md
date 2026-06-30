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

## 3. Alur Data

```
Arduino ──writes──▶ /Udara      (sensor readings)
Arduino ──writes──▶ /Status     (actual device state)

App     ──writes──▶ /Command    (fan speed, gerak, auto mode)
App     ──reads──▶  /Udara      (display sensor cards & chart)
App     ──reads──▶  /Status     (display actual device state)
App     ──reads──▶  /Command    (sync fan control UI)
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
