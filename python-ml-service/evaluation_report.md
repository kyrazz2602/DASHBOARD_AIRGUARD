# Hasil Evaluasi Model Prediksi AirGuard

Total Pengujian: 30
Akurasi Model Mentah (Tanpa Guardrail): 10/30 (33.3%)
Akurasi Model Final (Dengan Guardrail): 30/30 (100.0%)

| No | Skenario Kondisi Udara | PM2.5 | PM10 | CO | VOC | Suhu | Ground Truth | Prediksi ML Mentah | Prediksi Final (Guardrail) | Guardrail Aktif | Status Keberhasilan |
|---|------------------------|-------|------|----|-----|------|--------------|--------------------|----------------------------|-----------------|---------------------|
| 1 | Clean Air (Perfect) | 8.5 | 12.0 | 2.1 | 1.2 | 24.5 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 2 | Typical Indoor | 12.0 | 18.5 | 3.5 | 2.0 | 25.0 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 3 | Cool Morning | 15.0 | 22.0 | 4.0 | 3.1 | 21.0 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 4 | Warm Afternoon | 20.0 | 30.0 | 5.0 | 4.2 | 29.5 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 5 | Dry Indoor | 18.0 | 28.0 | 3.0 | 2.5 | 26.0 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 6 | Rainy Day Calm | 10.0 | 15.0 | 2.8 | 1.5 | 22.0 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 7 | AC Room Stable | 7.0 | 11.0 | 1.9 | 0.9 | 18.0 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 8 | Kitchen Fan Running | 25.0 | 40.0 | 8.0 | 6.0 | 27.0 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 9 | Bedroom Night | 9.0 | 14.0 | 2.5 | 1.8 | 23.0 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 10 | Library Silent | 11.0 | 16.0 | 3.0 | 2.2 | 24.0 | **Aman** | Aman | **Aman** | Tidak | SUKSES |
| 11 | Hazy Day (PM2.5 warning) | 45.0 | 60.0 | 6.0 | 4.0 | 26.5 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 12 | Dust Buildup (PM10 warning) | 20.0 | 165.0 | 5.0 | 3.5 | 25.0 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 13 | Mild Exhaust (CO warning) | 15.0 | 22.0 | 18.5 | 5.0 | 24.0 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 14 | Perfume Spray (VOC warning) | 12.0 | 18.0 | 4.0 | 25.0 | 25.5 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 15 | Elevated Particles & Gas | 38.0 | 80.0 | 8.0 | 22.0 | 26.0 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 16 | Busy Traffic Haze | 55.0 | 90.0 | 12.0 | 15.0 | 28.0 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 17 | Mild Smoke Indoors | 65.0 | 110.0 | 14.0 | 18.0 | 27.5 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 18 | High Humidity Dust | 30.0 | 180.0 | 7.0 | 10.0 | 23.0 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 19 | Stuffy Closed Room | 32.0 | 45.0 | 16.0 | 21.0 | 25.0 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 20 | Cooking/Frying Vapors | 80.0 | 140.0 | 12.0 | 15.0 | 29.0 | **Perhatian** | Aman | **Perhatian** | Ya | SUKSES |
| 21 | Severe Forest Fire Haze | 160.0 | 210.0 | 18.0 | 12.0 | 28.0 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
| 22 | Extreme Construction Dust | 80.0 | 380.0 | 15.0 | 8.0 | 26.0 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
| 23 | Dangerous CO Leakage | 25.0 | 40.0 | 55.0 | 15.0 | 24.5 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
| 24 | Chemical Solvent Fumes | 15.0 | 30.0 | 8.0 | 110.0 | 25.0 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
| 25 | Major Fire Smoke | 250.0 | 420.0 | 65.0 | 45.0 | 32.0 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
| 26 | Industrial Exhaust Leak | 180.0 | 290.0 | 45.0 | 30.0 | 30.0 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
| 27 | Incense in Closed Room | 140.0 | 180.0 | 22.0 | 85.0 | 26.0 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
| 28 | Gas Stove Leak & Smoke | 135.0 | 240.0 | 52.0 | 35.0 | 28.5 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
| 29 | Heavy Paint Vapors | 30.0 | 70.0 | 12.0 | 130.0 | 26.0 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
| 30 | Filter Total Failure | 175.0 | 390.0 | 58.0 | 115.0 | 27.5 | **Ganti Filter** | Aman | **Ganti Filter** | Ya | SUKSES |
