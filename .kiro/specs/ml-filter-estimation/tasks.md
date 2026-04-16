# Implementation Plan: ML Filter Estimation Integration

## Overview

Integrasikan Python FastAPI microservice sebagai ML backend ke dalam aplikasi Next.js yang sudah ada. Implementasi dilakukan secara incremental: mulai dari tipe data dan kontrak API, lalu Python service, lalu Next.js proxy routes, lalu ML client dan hook baru, dan terakhir enhancement pada `MaintenanceWidget`. Hook `use-filter-estimation.ts` yang sudah ada tidak diubah — hook baru membungkusnya.

## Tasks

- [x] 1. Tambahkan TypeScript types untuk ML ke `lib/sensor-data.ts`
  - Tambahkan `type FilterStatus = "Aman" | "Perhatian" | "Ganti Filter"` ke file yang sudah ada
  - Tambahkan interface `FilterProbabilities` dengan field `aman`, `perhatian`, `gantiFilter` (number 0–1)
  - Tambahkan interface `SensorFeatures` dengan field `pm25`, `pm10`, `co`, `voc`, `suhu`
  - Tambahkan interface `MLPredictionResult` dengan field `status`, `probabilities`, `recommendation`, `confidence`, `modelUsed`, `latencyMs`, `predictedAt`
  - Export semua tipe baru
  - _Requirements: 12.1, 12.2_

- [x] 2. Buat Python FastAPI microservice di `python-ml-service/`
  - [x] 2.1 Buat struktur direktori dan `requirements.txt`
    - Buat `python-ml-service/requirements.txt` dengan dependensi: `fastapi==0.115.0`, `uvicorn==0.30.0`, `scikit-learn==1.5.0`, `joblib==1.4.0`, `numpy==1.26.0`, `pydantic==2.7.0`
    - Buat direktori `python-ml-service/models/` (placeholder untuk `best_model.pkl` dan `scaler.pkl`)
    - _Requirements: 5.4_

  - [x] 2.2 Implementasikan `python-ml-service/model_loader.py`
    - Tulis class `ModelLoader` yang memuat `models/best_model.pkl` dan `models/scaler.pkl` menggunakan `joblib.load` saat inisialisasi
    - Jika file `.pkl` tidak ditemukan, raise `FileNotFoundError` sehingga service gagal start dengan exit code non-zero
    - Expose `model` dan `scaler` sebagai atribut instance
    - _Requirements: 5.4, 5.5_

  - [x] 2.3 Implementasikan `python-ml-service/main.py` — FastAPI app dengan endpoint `/predict` dan `/health`
    - Definisikan Pydantic model `PredictRequest` (pm25, pm10, co, voc, suhu sebagai `float`) dan `PredictResponse` (status, probabilities, recommendation, confidence, model_used, latency_ms)
    - Inisialisasi `ModelLoader` saat startup menggunakan `lifespan` context manager; jika gagal, exit non-zero
    - Implementasikan `POST /predict`: preprocess dengan scaler → predict → build `probabilities` dict → hitung `confidence = max(probabilities.values())` → generate recommendation → return `PredictResponse`
    - Implementasikan fungsi `getRecommendation(status, request)` sesuai pseudocode di design: untuk "Ganti Filter" sertakan nilai sensor penyebab utama dalam teks; untuk "Perhatian" sarankan pemantauan 2–4 minggu; untuk "Aman" nyatakan filter normal
    - Implementasikan `GET /health` yang mengembalikan `{"status": "ok"}`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]\* 2.4 Tulis property test untuk Python service (pytest + hypothesis)
    - **Property 1: Probability Sum Invariant** — untuk semua input sensor valid, `sum(probabilities.values())` selalu dalam `[0.999, 1.001]`
    - **Property 2: Confidence Equals Maximum Probability** — `confidence == max(probabilities.values())`
    - **Property 3: Status-Probability Alignment** — status selalu sesuai kelas dengan probabilitas tertinggi
    - **Property 9: Recommendation Contains Sensor Value** — untuk "Ganti Filter" dengan sensor kritis, nilai sensor muncul dalam teks rekomendasi
    - **Validates: Requirements 5.6, 5.7, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4**

- [x] 3. Implementasikan `getRuleBasedStatus` di `lib/ml-client.ts`
  - Buat file `lib/ml-client.ts`
  - Implementasikan fungsi `getRuleBasedStatus(features: SensorFeatures): FilterStatus` sesuai pseudocode di design:
    - Return `"Ganti Filter"` jika `pm25 > 75 || pm10 > 150 || co > 9 || voc > 2`
    - Return `"Perhatian"` jika `pm25 > 35 || pm10 > 75 || co > 2 || voc > 0.5`
    - Return `"Aman"` untuk semua kondisi lainnya
    - Fungsi tidak boleh throw dan tidak boleh return null
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 3.1 Tulis property test untuk `getRuleBasedStatus` menggunakan fast-check
    - **Property 4: Rule-Based Fallback Always Returns Valid Status** — untuk semua input (termasuk edge cases), selalu return salah satu dari tiga status yang valid, tidak pernah throw
    - **Property 5: Rule-Based Threshold Consistency** — verifikasi threshold "Ganti Filter", "Perhatian", dan "Aman" secara exhaustive dengan generated inputs
    - **Validates: Requirements 1.6, 7.2, 7.3, 7.4, 7.5**

- [x] 4. Implementasikan `predictFilterStatus` fetch wrapper di `lib/ml-client.ts`
  - Tambahkan fungsi `predictFilterStatus(features: SensorFeatures): Promise<MLPredictionResult>` ke file yang sudah ada
  - Kirim `POST /api/ml/predict` dengan body `{ pm25, pm10, co, voc, suhu }`
  - Jika response bukan 2xx, throw `MLServiceError` dengan `code: "SERVICE_UNAVAILABLE"` (untuk 503) atau `"INVALID_INPUT"` (untuk 422)
  - Implementasikan timeout 5 detik menggunakan `AbortController`; jika timeout, throw `MLServiceError` dengan `code: "TIMEOUT"`
  - Map response JSON ke `MLPredictionResult` (termasuk set `predictedAt: new Date()`)
  - Export `MLServiceError` class dan `predictFilterStatus`
  - _Requirements: 1.2, 3.4, 3.5_

  - [x]\* 4.1 Tulis property test untuk mapping response ke `MLPredictionResult` menggunakan fast-check
    - **Property 11: SensorReading to SensorFeatures Mapping is Identity** — verifikasi bahwa mapping `SensorReading → SensorFeatures` mempertahankan semua lima nilai tanpa transformasi
    - **Validates: Requirements 12.1, 12.2**

- [x] 5. Buat Next.js API Route `/api/ml/predict`
  - Buat file `app/api/ml/predict/route.ts`
  - Implementasikan handler `POST`: baca body, validasi semua field sensor (pm25 `[0,1000]`, pm10 `[0,2000]`, co `[0,100]`, voc `[0,50]`, suhu `[-10,60]`), tolak NaN/null dengan HTTP 422
  - Baca `PYTHON_ML_SERVICE_URL` dari `process.env`; jika tidak dikonfigurasi, return HTTP 503 dengan pesan konfigurasi tidak lengkap
  - Forward request ke Python service dengan timeout 5 detik menggunakan `AbortController`
  - Jika Python service tidak merespons atau error, return HTTP 503 (bukan 500)
  - Pastikan nilai `PYTHON_ML_SERVICE_URL` tidak pernah muncul dalam response body
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 11.1, 11.2, 11.3_

  - [ ]\* 5.1 Tulis property test untuk validasi input API Route menggunakan fast-check
    - **Property 7: Invalid Sensor Input Always Rejected with HTTP 422** — untuk semua kombinasi input di luar range valid atau NaN/null, selalu return 422
    - **Property 8: Service URL Never Exposed in Response** — untuk semua request (valid, invalid, error), response body tidak mengandung nilai `PYTHON_ML_SERVICE_URL`
    - **Validates: Requirements 3.6, 3.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 11.2**

- [x] 6. Buat Next.js API Route `/api/ml/health`
  - Buat file `app/api/ml/health/route.ts`
  - Implementasikan handler `GET`: forward ke `GET /health` di Python service
  - Jika Python service merespons, return HTTP 200 dengan `{ status: "ok" }`
  - Jika Python service tidak tersedia, return HTTP 503 dengan `{ status: "unavailable" }`
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Checkpoint — Verifikasi kontrak API dan fallback logic
  - Pastikan semua tipe TypeScript di `lib/sensor-data.ts` dan `lib/ml-client.ts` compile tanpa error
  - Pastikan `getRuleBasedStatus` mengembalikan hasil yang benar untuk threshold boundary values
  - Pastikan semua tests pass, tanyakan kepada user jika ada pertanyaan.

- [x] 8. Implementasikan `hooks/use-ml-filter-estimation.ts`
  - [x] 8.1 Buat hook dengan state initialization
    - Buat file `hooks/use-ml-filter-estimation.ts`
    - Import dan panggil `useSensorData` (dari `hooks/use-sensor-data.ts`) dan `useFilterEstimation` (dari `hooks/use-filter-estimation.ts`)
    - Inisialisasi state: `mlStatus`, `probabilities`, `recommendation`, `confidence`, `isMLAvailable`, `isPredicting`, `error` (semua nullable kecuali `isMLAvailable` dan `isPredicting`)
    - _Requirements: 1.5, 1.6, 12.1, 12.2_

  - [x] 8.2 Implementasikan debounced ML prediction effect
    - Tambahkan `useEffect` yang watch `sensorData` dengan debounce 2 detik menggunakan `setTimeout`/`clearTimeout`
    - Sebelum kirim request, validasi bahwa data sensor valid (tidak semua nol) — jika tidak valid, skip prediksi
    - Map `sensorData` ke `SensorFeatures` dengan urutan `[pm25, pm10, co, voc, suhu]`
    - Set `isPredicting = true`, panggil `predictFilterStatus(features)`, update semua ML state dari result
    - Jika `MLServiceError` dengan code `SERVICE_UNAVAILABLE` atau `TIMEOUT`, set `isMLAvailable = false` dan gunakan `getRuleBasedStatus` sebagai fallback untuk `mlStatus`
    - Set `isPredicting = false` di finally block
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 2.1, 2.2, 7.1_

  - [x] 8.3 Implementasikan cache prediksi (delta < 5%)
    - Simpan `lastFeatures` di ref
    - Sebelum kirim request, hitung apakah semua nilai sensor berubah kurang dari 5% dari `lastFeatures`
    - Jika delta < 5% untuk semua sensor, skip request dan gunakan prediksi cache
    - Update `lastFeatures` setelah setiap prediksi berhasil
    - _Requirements: 2.3_

  - [x] 8.4 Return `MLFilterEstimationResult` lengkap dari hook
    - Return semua field: `mlStatus`, `probabilities`, `recommendation`, `confidence`, `isMLAvailable`, `healthPct`, `daysRemaining`, `ruleBasedStatus`, `isLoading`, `isPredicting`, `error`, `resetFilter`
    - `ruleBasedStatus` dihitung dari `getRuleBasedStatus(extractFeatures(sensorData))` — selalu tersedia
    - `healthPct` dan `daysRemaining` selalu dari `useFilterEstimation` (tidak pernah null)
    - _Requirements: 1.5, 1.6_

  - [ ]\* 8.5 Tulis property test untuk ML hook menggunakan fast-check
    - **Property 6: Debounce Prevents Rapid Requests** — untuk sequence perubahan sensor dalam window 2 detik, hook mengirim maksimal 1 request
    - **Property 12: ML Hook Always Provides Fallback Values** — untuk semua state hook, `healthPct` dan `daysRemaining` selalu non-null, `ruleBasedStatus` selalu valid
    - **Validates: Requirements 1.1, 1.5, 1.6, 2.1, 2.2**

- [x] 9. Enhance `components/maintenance-widget.tsx` dengan ML props
  - [x] 9.1 Tambahkan ML props ke interface `MaintenanceWidgetProps`
    - Tambahkan props opsional: `mlStatus?: FilterStatus | null`, `probabilities?: FilterProbabilities | null`, `recommendation?: string | null`, `confidence?: number | null`, `isMLAvailable?: boolean`, `isPredicting?: boolean`
    - Import `FilterStatus`, `FilterProbabilities` dari `lib/sensor-data.ts`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 9.2 Implementasikan ML status badge dan "ML Offline" badge
    - Jika `isMLAvailable === true` dan `mlStatus` tersedia, tampilkan ML status badge di samping status existing (gunakan warna sesuai mapping: emerald untuk "Aman", orange untuk "Perhatian", red untuk "Ganti Filter")
    - Jika `isMLAvailable === false`, sembunyikan ML section dan tampilkan badge "ML Offline" (abu-abu)
    - _Requirements: 8.1, 8.4_

  - [x] 9.3 Implementasikan probability bars untuk tiga kelas
    - Jika `probabilities` tersedia dan `isMLAvailable === true`, render tiga progress bar: "Aman" (emerald), "Perhatian" (orange), "Ganti Filter" (red)
    - Lebar bar sesuai nilai probabilitas (0–100%)
    - Tampilkan persentase di samping label
    - _Requirements: 8.2_

  - [x] 9.4 Implementasikan loading skeleton dan recommendation text
    - Jika `isPredicting === true`, tampilkan loading skeleton (animated pulse) pada ML section sebagai pengganti probability bars dan recommendation
    - Jika `recommendation` tersedia dan `isMLAvailable === true`, tampilkan teks rekomendasi di bawah probability bars
    - Komponen harus tetap render dengan benar jika `mlStatus === null` (gunakan `ruleBasedStatus`-derived content sebagai fallback)
    - _Requirements: 8.3, 8.5, 8.6_

  - [ ]\* 9.5 Tulis property test untuk MaintenanceWidget rendering menggunakan fast-check
    - **Property 10: Widget Renders ML Data Without Crash** — untuk semua kombinasi props (termasuk null/undefined/false), komponen render tanpa throw; ketika `isMLAvailable = false`, ML section tersembunyi dan badge "ML Offline" tampil
    - **Validates: Requirements 8.4, 8.5, 8.6**

- [x] 10. Checkpoint — Integrasi end-to-end
  - Pastikan `use-ml-filter-estimation` hook dapat digunakan sebagai drop-in replacement untuk `use-filter-estimation` di `dashboard.tsx` atau komponen parent `MaintenanceWidget`
  - Pastikan semua TypeScript compile tanpa error (`tsc --noEmit`)
  - Pastikan semua tests pass, tanyakan kepada user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- `hooks/use-filter-estimation.ts` tidak diubah sama sekali — hook baru membungkusnya
- Property tests menggunakan **fast-check** (TypeScript) untuk frontend dan **hypothesis** (Python) untuk Python service
- Setiap property test task mereferensikan nomor property dari design.md untuk traceability
- Python service membutuhkan file `models/best_model.pkl` dan `models/scaler.pkl` — tanpa file ini service tidak akan start
- Environment variable `PYTHON_ML_SERVICE_URL` harus dikonfigurasi di `.env.local` untuk development
