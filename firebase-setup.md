# Firebase Database Structure

## 1. Realtime Database Rules
Di Firebase Console → Realtime Database → Rules, tambahkan:

```json
{
  "rules": {
    "Udara": {
      ".read": true,
      ".write": true
    },
    "history": {
      ".read": true,
      ".write": true
    },
    "sensors": {
      ".read": true,
      ".write": true
    }
  }
}
```

**PENTING**: Path `/Udara` digunakan untuk data real-time dari Arduino, sedangkan `/history` untuk data historis.

## 2. Database Structure

### Real-time Data Path: `/Udara` (sesuai kode Arduino)

```json
{
  "Udara": {
    "PM25": 12.5,
    "PM10": 18.3,
    "CO": 15.2,
    "VOC": 8.7,
    "Suhu": 28.5,
    "Persentase": 22
  }
}
```

### Alternative Path: `/sensors` (jika ingin menggunakan struktur dashboard)
```json
{
  "sensors": {
    "pm25": 12.5,
    "pm10": 18.3,
    "co": 15.2,
    "voc": 8.7,
    "timestamp": 1708923456789
  }
}
```

### Historical Data Path: `/history`
```json
{
  "history": {
    "1708920000000": {
      "pm25": 11.2,
      "pm10": 16.8,
      "co": 14.5,
      "voc": 7.9
    },
    "1708923600000": {
      "pm25": 13.1,
      "pm10": 19.2,
      "co": 16.1,
      "voc": 8.3
    }
  }
}
```

## 3. Test Data Upload (Optional)
Gunakan script ini untuk mengupload test data:

```javascript
// Di browser console Firebase
const database = firebase.database();

// Update real-time data
database.ref('sensors').set({
  pm25: 12.5,
  pm10: 18.3,
  co: 15.2,
  voc: 8.7,
  timestamp: Date.now()
});

// Add historical data
const historicalData = {
  pm25: 11.2,
  pm10: 16.8,
  co: 14.5,
  voc: 7.9
};
database.ref('history/' + Date.now()).set(historicalData);
```

## 4. Testing Firebase Connection

Gunakan utility `firebase-test.ts` untuk testing koneksi:

```javascript
import { testFirebaseConnection, checkFirebaseEnvironment } from '@/lib/firebase-test';

// Check environment variables
const envCheck = checkFirebaseEnvironment();
console.log('Environment check:', envCheck);

// Test connection
const connectionTest = await testFirebaseConnection();
console.log('Connection test:', connectionTest);
```

## 5. Troubleshooting

### Error: "permission_denied at /sensors"
- Pastikan Firebase Rules sudah diupdate dengan path `/Udara`
- Check database URL di environment variables
- Pastikan project ID benar

### Error: "Missing environment variables"
- Buat file `.env.local` dengan Firebase configuration
- Pastikan semua variabel required ada

### Error: "Connection timeout"
- Check internet connection
- Pastikan Firebase project aktif
- Verify database URL format
