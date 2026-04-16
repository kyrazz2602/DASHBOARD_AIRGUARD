# Requirements Document

## Introduction

Fitur ini mengintegrasikan pipeline Machine Learning berbasis Python (FastAPI) ke dalam aplikasi Next.js untuk estimasi kondisi filter udara secara real-time. Model ML (Random Forest / Decision Tree / SVM) menerima data sensor (PM2.5, PM10, CO, VOC, Suhu) dari Firebase dan mengklasifikasikan kondisi filter menjadi tiga status: **Aman**, **Perhatian**, atau **Ganti Filter** — menggantikan logika rule-based sederhana dengan prediksi berbasis probabilitas yang lebih akurat. Integrasi dilakukan melalui Next.js API Route sebagai proxy server-side ke Python FastAPI microservice.

## Glossary

- **ML_Hook**: Hook React `use-ml-filter-estimation.ts` yang menggabungkan prediksi ML dengan estimasi lifespan filter.
- **API_Route**: Next.js API Route `/api/ml/predict` yang berfungsi sebagai proxy server-side ke Python service.
- **Python_Service**: Python FastAPI microservice yang meng-host model `.pkl` dan melayani prediksi.
- **Rule_Based_Fallback**: Fungsi `getRuleBasedStatus` yang mengembalikan `FilterStatus` berdasarkan threshold tetap tanpa ML.
- **MaintenanceWidget**: Komponen UI React yang menampilkan status filter, probabilitas, dan rekomendasi.
- **FilterStatus**: Tipe string dengan nilai `"Aman"`, `"Perhatian"`, atau `"Ganti Filter"`.
- **FilterProbabilities**: Objek dengan field `aman`, `perhatian`, dan `gantiFilter` bertipe `number` (0–1).
- **SensorFeatures**: Objek input ML dengan field `pm25`, `pm10`, `co`, `voc`, `suhu`.
- **MLPredictionResult**: Objek hasil prediksi ML yang mencakup `status`, `probabilities`, `recommendation`, `confidence`, `modelUsed`, `latencyMs`, dan `predictedAt`.
- **predictedAt**: Timestamp (`Date`) yang dicatat oleh ML_Hook saat prediksi ML berhasil diterima, merepresentasikan waktu prediksi dilakukan.
- **Debounce**: Mekanisme penundaan eksekusi fungsi selama interval tertentu setelah event terakhir.
- **Scaler**: Objek `StandardScaler` scikit-learn yang disimpan sebagai `.pkl` dan digunakan untuk normalisasi fitur.

---

## Requirements

### Requirement 1: ML Hook — Prediksi Real-Time dari Sensor Firebase

**User Story:** Sebagai pengguna dashboard, saya ingin melihat status kondisi filter yang diprediksi oleh ML secara real-time berdasarkan data sensor terkini, sehingga saya mendapatkan estimasi yang lebih akurat dibanding logika rule-based sederhana.

#### Acceptance Criteria

1. WHEN data sensor baru diterima dari Firebase `/Udara`, THE ML_Hook SHALL memicu prediksi ML setelah debounce 2 detik.
2. WHEN prediksi ML berhasil diterima, THE ML_Hook SHALL memperbarui `mlStatus`, `probabilities`, `recommendation`, `confidence`, dan `predictedAt` dengan hasil terbaru.
3. WHILE prediksi ML sedang berlangsung, THE ML_Hook SHALL menjaga `isPredicting` bernilai `true`.
4. WHEN prediksi ML selesai atau gagal, THE ML_Hook SHALL menjaga `isPredicting` bernilai `false`.
5. THE ML_Hook SHALL selalu mengembalikan `healthPct` dan `daysRemaining` yang valid (tidak pernah `null`) dari logika `use-filter-estimation` yang sudah ada.
6. THE ML_Hook SHALL selalu mengembalikan `ruleBasedStatus` yang valid (tidak pernah `null`) sebagai fallback terlepas dari ketersediaan Python_Service.
7. WHEN semua nilai sensor dari Firebase bernilai 0 atau data tidak valid, THE ML_Hook SHALL melewati prediksi ML dan mempertahankan state terakhir yang valid.

---

### Requirement 2: Debounce dan Cache Prediksi

**User Story:** Sebagai developer, saya ingin ML_Hook membatasi frekuensi request ke Python_Service, sehingga tidak terjadi request berlebihan yang membebani server.

#### Acceptance Criteria

1. WHEN data sensor berubah, THE ML_Hook SHALL menunda pengiriman request ML selama 2 detik (debounce).
2. WHEN data sensor berubah kembali sebelum 2 detik berlalu, THE ML_Hook SHALL mereset timer debounce dan tidak mengirim request sebelumnya.
3. WHEN nilai sensor tidak berubah lebih dari 5% dari prediksi sebelumnya, THE ML_Hook SHALL menggunakan hasil prediksi yang di-cache tanpa mengirim request baru.

---

### Requirement 3: Next.js API Route Proxy

**User Story:** Sebagai developer, saya ingin Next.js API Route menjadi proxy antara browser dan Python_Service, sehingga URL Python_Service tidak pernah terekspos ke browser dan keamanan terjaga.

#### Acceptance Criteria

1. THE API_Route SHALL menerima request `POST /api/ml/predict` dengan body `{ pm25, pm10, co, voc, suhu }`.
2. WHEN request diterima, THE API_Route SHALL memvalidasi bahwa semua nilai sensor berada dalam range fisik yang valid sebelum meneruskan ke Python_Service.
3. WHEN validasi input berhasil, THE API_Route SHALL meneruskan request ke `PYTHON_ML_SERVICE_URL` yang dikonfigurasi via environment variable.
4. WHEN Python_Service tidak merespons dalam 5 detik, THE API_Route SHALL mengembalikan HTTP 503 dengan pesan error yang deskriptif.
5. WHEN Python_Service tidak tersedia atau mengembalikan error, THE API_Route SHALL mengembalikan HTTP 503 (bukan HTTP 500).
6. WHEN input sensor tidak valid (nilai negatif, NaN, atau di luar range fisik), THE API_Route SHALL mengembalikan HTTP 422 dengan detail validasi.
7. THE API_Route SHALL tidak pernah mengekspos nilai `PYTHON_ML_SERVICE_URL` dalam response ke browser.

---

### Requirement 4: Health Check Endpoint

**User Story:** Sebagai developer, saya ingin endpoint health check untuk memantau ketersediaan Python_Service, sehingga saya dapat mendeteksi masalah konektivitas dengan cepat.

#### Acceptance Criteria

1. THE API_Route SHALL menyediakan endpoint `GET /api/ml/health` untuk memeriksa ketersediaan Python_Service.
2. WHEN Python_Service tersedia dan merespons, THE API_Route SHALL mengembalikan HTTP 200 dengan status `{ status: "ok" }`.
3. WHEN Python_Service tidak tersedia, THE API_Route SHALL mengembalikan HTTP 503 dengan status `{ status: "unavailable" }`.

---

### Requirement 5: Python FastAPI Service — Prediksi dan Probabilitas

**User Story:** Sebagai sistem, saya ingin Python_Service memproses fitur sensor dan mengembalikan prediksi kelas beserta probabilitas per kelas, sehingga ML_Hook dapat menampilkan confidence score dan probability bars.

#### Acceptance Criteria

1. THE Python_Service SHALL menerima request `POST /predict` dengan body `{ pm25, pm10, co, voc, suhu }`.
2. WHEN request diterima, THE Python_Service SHALL memproses fitur menggunakan Scaler yang sama dengan yang digunakan saat training.
3. WHEN prediksi selesai, THE Python_Service SHALL mengembalikan response JSON dengan field: `status` (salah satu dari `"Aman"`, `"Perhatian"`, `"Ganti Filter"`), `probabilities` (dict tiga kelas dengan key `"Aman"`, `"Perhatian"`, `"Ganti Filter"`), `confidence` (float 0–1), `recommendation` (string), `model_used` (string), dan `latency_ms` (float).
4. THE Python_Service SHALL memuat model `.pkl` dan Scaler `.pkl` sekali saat startup, bukan per-request.
5. IF file model `.pkl` tidak ditemukan saat startup, THEN THE Python_Service SHALL gagal start dengan exit code non-zero.
6. THE Python_Service SHALL mengembalikan `probabilities` di mana jumlah ketiga nilai selalu dalam range `[0.999, 1.001]`.
7. THE Python_Service SHALL mengembalikan `confidence` yang selalu sama dengan nilai tertinggi dari `probabilities`.

---

### Requirement 6: Validasi Range Input Sensor

**User Story:** Sebagai developer, saya ingin input sensor divalidasi sebelum dikirim ke model ML, sehingga model tidak menerima nilai yang tidak masuk akal secara fisik.

#### Acceptance Criteria

1. THE API_Route SHALL menolak nilai `pm25` yang berada di luar range `[0, 1000]` μg/m³.
2. THE API_Route SHALL menolak nilai `pm10` yang berada di luar range `[0, 2000]` μg/m³.
3. THE API_Route SHALL menolak nilai `co` yang berada di luar range `[0, 100]` ppm.
4. THE API_Route SHALL menolak nilai `voc` yang berada di luar range `[0, 50]` ppm.
5. THE API_Route SHALL menolak nilai `suhu` yang berada di luar range `[-10, 60]` °C.
6. IF salah satu nilai sensor adalah `NaN` atau `null`, THEN THE API_Route SHALL mengembalikan HTTP 422.

---

### Requirement 7: Rule-Based Fallback

**User Story:** Sebagai pengguna, saya ingin aplikasi tetap menampilkan estimasi kondisi filter meskipun Python_Service tidak tersedia, sehingga fungsionalitas dasar tidak terganggu.

#### Acceptance Criteria

1. WHEN Python_Service tidak tersedia, THE ML_Hook SHALL menetapkan `isMLAvailable` menjadi `false` dan menggunakan `Rule_Based_Fallback` sebagai `mlStatus`.
2. THE Rule_Based_Fallback SHALL mengembalikan `"Ganti Filter"` jika `pm25 > 75` ATAU `pm10 > 150` ATAU `co > 9` ATAU `voc > 2`.
3. THE Rule_Based_Fallback SHALL mengembalikan `"Perhatian"` jika `pm25 > 35` ATAU `pm10 > 75` ATAU `co > 2` ATAU `voc > 0.5` (dan tidak memenuhi threshold "Ganti Filter").
4. THE Rule_Based_Fallback SHALL mengembalikan `"Aman"` untuk semua kondisi lainnya.
5. THE Rule_Based_Fallback SHALL tidak pernah melempar exception dan tidak pernah mengembalikan `null`.

---

### Requirement 8: Enhanced MaintenanceWidget — Tampilan ML

**User Story:** Sebagai pengguna, saya ingin melihat hasil prediksi ML (status, probabilitas per kelas, dan rekomendasi) di MaintenanceWidget, sehingga saya mendapatkan informasi kondisi filter yang lebih lengkap dan informatif.

#### Acceptance Criteria

1. WHEN `isMLAvailable` bernilai `true` dan `mlStatus` tersedia, THE MaintenanceWidget SHALL menampilkan ML status badge di samping status existing.
2. WHEN `probabilities` tersedia, THE MaintenanceWidget SHALL menampilkan probability bars untuk ketiga kelas (`Aman`, `Perhatian`, `Ganti Filter`).
3. WHEN `recommendation` tersedia, THE MaintenanceWidget SHALL menampilkan teks rekomendasi dari ML.
4. WHEN `isMLAvailable` bernilai `false`, THE MaintenanceWidget SHALL menyembunyikan ML section dan menampilkan badge "ML Offline".
5. WHILE `isPredicting` bernilai `true`, THE MaintenanceWidget SHALL menampilkan loading skeleton pada ML section.
6. THE MaintenanceWidget SHALL tetap merender dengan benar menggunakan `ruleBasedStatus` meskipun `mlStatus` bernilai `null`.

---

### Requirement 9: Status-Probabilitas Alignment

**User Story:** Sebagai developer, saya ingin memastikan bahwa status yang dikembalikan ML selalu konsisten dengan probabilitas tertinggi, sehingga tidak ada inkonsistensi antara label status dan nilai probabilitas.

#### Acceptance Criteria

1. WHEN `status` adalah `"Ganti Filter"`, THE Python_Service SHALL memastikan `probabilities.gantiFilter` adalah nilai tertinggi di antara ketiga probabilitas.
2. WHEN `status` adalah `"Perhatian"`, THE Python_Service SHALL memastikan `probabilities.perhatian` adalah nilai tertinggi di antara ketiga probabilitas.
3. WHEN `status` adalah `"Aman"`, THE Python_Service SHALL memastikan `probabilities.aman` adalah nilai tertinggi di antara ketiga probabilitas.

---

### Requirement 10: Rekomendasi Berbasis Status dan Sensor

**User Story:** Sebagai pengguna, saya ingin menerima rekomendasi tindakan yang spesifik berdasarkan status filter dan nilai sensor yang menjadi penyebab utama, sehingga saya tahu tindakan apa yang perlu diambil.

#### Acceptance Criteria

1. WHEN `status` adalah `"Ganti Filter"` dan `pm25 > 75`, THE Python_Service SHALL menyertakan nilai PM2.5 dalam teks rekomendasi.
2. WHEN `status` adalah `"Ganti Filter"` dan `pm10 > 150`, THE Python_Service SHALL menyertakan nilai PM10 dalam teks rekomendasi.
3. WHEN `status` adalah `"Ganti Filter"` dan `co > 9`, THE Python_Service SHALL menyertakan nilai CO dalam teks rekomendasi.
4. WHEN `status` adalah `"Ganti Filter"` dan tidak ada sensor tunggal yang melebihi threshold kritis (`pm25 <= 75` DAN `pm10 <= 150` DAN `co <= 9`), THE Python_Service SHALL mengembalikan rekomendasi umum yang menyatakan beberapa parameter melebihi batas aman.
5. WHEN `status` adalah `"Perhatian"`, THE Python_Service SHALL mengembalikan rekomendasi yang menyarankan pemantauan dan pertimbangan penggantian dalam 2–4 minggu.
6. WHEN `status` adalah `"Aman"`, THE Python_Service SHALL mengembalikan rekomendasi yang menyatakan filter berfungsi normal.

---

### Requirement 11: Konfigurasi Environment dan Keamanan

**User Story:** Sebagai developer, saya ingin URL Python_Service dikonfigurasi melalui environment variable dan tidak pernah terekspos ke browser, sehingga keamanan deployment terjaga.

#### Acceptance Criteria

1. THE API_Route SHALL membaca URL Python_Service dari environment variable `PYTHON_ML_SERVICE_URL`.
2. THE API_Route SHALL tidak pernah menyertakan nilai `PYTHON_ML_SERVICE_URL` dalam response yang dikirim ke browser.
3. WHERE `PYTHON_ML_SERVICE_URL` tidak dikonfigurasi, THE API_Route SHALL mengembalikan HTTP 503 dengan pesan konfigurasi tidak lengkap.

---

### Requirement 12: Mapping SensorReading ke SensorFeatures

**User Story:** Sebagai developer, saya ingin ada mapping yang jelas dan konsisten antara `SensorReading` dari Firebase dan `SensorFeatures` yang dikirim ke ML, sehingga tidak ada transformasi data yang salah.

#### Acceptance Criteria

1. THE ML_Hook SHALL memetakan `sensorData.pm25` ke `features.pm25`, `sensorData.pm10` ke `features.pm10`, `sensorData.co` ke `features.co`, `sensorData.voc` ke `features.voc`, dan `sensorData.suhu` ke `features.suhu` tanpa transformasi tambahan.
2. THE ML_Hook SHALL menggunakan urutan fitur `[pm25, pm10, co, voc, suhu]` yang konsisten dengan urutan yang digunakan saat training model.
