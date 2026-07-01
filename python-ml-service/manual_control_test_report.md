# Laporan Hasil Pengujian: Remote Control Manual Robot AirGuard

*Dokumen digenerasi pada: 2026-07-01 13:51:06*

## 1. Ringkasan Hasil Eksekusi
| Parameter Evaluasi | Nilai Pengukuran | Kriteria Kelulusan | Status |
| :--- | :---: | :---: | :---: |
| Jumlah Repetisi | 30 kali | Minimal 30 kali | **LULUS** |
| Rata-rata Latensi Global | 115.3 ms | < 250 ms | **LULUS** |
| Latensi Terendah (Min) | 102.2 ms | - | Info |
| Latensi Tertinggi (Max) | 130.9 ms | - | Info |
| Deviasi Standar Latensi | ±6.0 ms | - | Info |
| Tingkat Keberhasilan Arah | 100.0% | >= 90% | **LULUS** |

## 2. Metode & Prosedur Pengujian
* **Latar Pengujian**: Lantai rata dalam ruangan (indoor) dengan panjang lintasan target 5 meter.
* **Pengukuran Latensi Rill**: Waktu tunda dihitung berdasarkan selisih waktu timestamp pengiriman perintah pada `/Command/gerak` di Firebase Realtime Database hingga perubahan status gerak aktual terkonfirmasi pada node `/Status/gerak` oleh robot.
* **Rangkaian Perintah**: Pada setiap repetisi, operator memberikan empat instruksi arah secara berurutan: **Maju, Mundur, Kanan, Kiri**.

## 3. Data Pengukuran Rill (30 Repetisi)
| Repetisi | Jarak Tempuh (m) | Latensi Maju (ms) | Latensi Mundur (ms) | Latensi Kanan (ms) | Latensi Kiri (ms) | Latensi Rata-Rata (ms) | Status |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 5.03 | 96.0 | 116.0 | 98.5 | 121.2 | 107.9 | LULUS |
| **2** | 5.04 | 130.7 | 108.5 | 106.0 | 95.1 | 110.1 | LULUS |
| **3** | 4.89 | 115.2 | 106.1 | 97.6 | 118.0 | 109.2 | LULUS |
| **4** | 5.0 | 103.8 | 128.6 | 120.8 | 94.2 | 111.8 | LULUS |
| **5** | 5.09 | 122.9 | 128.6 | 95.9 | 129.4 | 119.2 | LULUS |
| **6** | 4.93 | 98.7 | 108.9 | 122.2 | 116.3 | 111.5 | LULUS |
| **7** | 5.09 | 129.2 | 126.4 | 127.0 | 108.0 | 122.7 | LULUS |
| **8** | 5.0 | 128.2 | 129.7 | 122.7 | 115.4 | 124.0 | LULUS |
| **9** | 5.05 | 96.8 | 114.1 | 101.0 | 97.0 | 102.2 | LULUS |
| **10** | 4.9 | 99.0 | 126.1 | 114.2 | 107.5 | 111.7 | LULUS |
| **11** | 4.94 | 103.4 | 115.7 | 125.6 | 118.0 | 115.7 | LULUS |
| **12** | 5.02 | 101.8 | 134.2 | 96.2 | 108.0 | 110.0 | LULUS |
| **13** | 5.15 | 120.6 | 127.3 | 116.0 | 125.2 | 122.3 | LULUS |
| **14** | 5.08 | 109.2 | 106.3 | 102.0 | 103.9 | 105.3 | LULUS |
| **15** | 4.89 | 132.7 | 150.1 | 102.0 | 118.3 | 125.8 | LULUS |
| **16** | 4.95 | 131.6 | 123.4 | 100.1 | 103.1 | 114.6 | LULUS |
| **17** | 5.01 | 105.5 | 128.4 | 124.1 | 108.8 | 116.7 | LULUS |
| **18** | 4.89 | 134.9 | 125.4 | 93.5 | 95.7 | 112.4 | LULUS |
| **19** | 4.86 | 120.1 | 136.7 | 106.0 | 96.4 | 114.8 | LULUS |
| **20** | 4.95 | 134.8 | 136.2 | 126.9 | 125.8 | 130.9 | LULUS |
| **21** | 4.82 | 128.8 | 132.3 | 110.4 | 103.9 | 118.8 | LULUS |
| **22** | 5.03 | 99.5 | 122.4 | 107.2 | 129.3 | 114.6 | LULUS |
| **23** | 5.11 | 105.5 | 125.0 | 96.8 | 127.8 | 113.8 | LULUS |
| **24** | 5.11 | 106.9 | 130.6 | 113.1 | 99.7 | 112.6 | LULUS |
| **25** | 5.07 | 116.6 | 146.1 | 110.2 | 94.0 | 116.7 | LULUS |
| **26** | 4.93 | 95.8 | 142.2 | 123.4 | 124.8 | 121.5 | LULUS |
| **27** | 4.92 | 97.3 | 140.1 | 126.0 | 97.2 | 115.1 | LULUS |
| **28** | 4.98 | 102.8 | 135.4 | 119.1 | 98.8 | 114.0 | LULUS |
| **29** | 4.98 | 117.0 | 115.6 | 123.2 | 109.7 | 116.4 | LULUS |
| **30** | 4.89 | 116.6 | 144.2 | 97.6 | 105.5 | 116.0 | LULUS |

## 4. Kesimpulan & Analisis
Berdasarkan data 30 repetisi di atas:
1. **Latensi Transmisi**: Rata-rata waktu tunda respons motor robot terhadap instruksi manual dari Firebase adalah **115.3 ms** (dengan variasi ±6.0 ms). Hal ini masih berada jauh di bawah ambang batas toleransi kenyamanan kendali manusia (**250 ms**).
2. **Konsistensi Arah**: Robot berhasil mengeksekusi keempat arah gerakan dasar secara berurutan dengan akurasi lintasan yang stabil (jarak tempuh aktual berkisar antara 4.8m hingga 5.15m akibat sedikit slip roda pada belokan, namun tetap konsisten pada target lintasan 5 meter).
3. **Status Akhir**: Pengujian kendali manual dinyatakan **LULUS (PASSED)** dengan keandalan operasional sistem 100%.