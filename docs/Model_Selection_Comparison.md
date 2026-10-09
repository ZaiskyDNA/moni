# Riset & Pemilihan Model Regresi Deret Waktu: MONI

**Terkait:** FR-06 (Prediksi Tren Kurs) pada `docs/PRD.md`; deliverable "Dokumen pemilihan model (mis. ARIMA/Prophet/regresi sederhana)" — Issue #16, roadmap Fase 3/4 (bagian 16 PRD).
**Tanggal riset:** 2026-10-09

## 1. Konteks & Kriteria

`docs/ML_Architecture.md` bagian 3.3 menyebutkan dua tingkatan pendekatan model:
- **Baseline (MVP):** Regresi Linier Sederhana atau Moving Average — **sudah diimplementasikan** di `ml-service/app/models/` (lihat scaffold FR-06).
- **Intermediate (disarankan):** Prophet atau ARIMA, karena "sangat andal dalam mendeteksi tren dan musiman pada data finansial".

Issue #16 minta dokumen pemilihan model secara eksplisit sebelum lanjut — dokumen ini mengisi bagian itu dengan **pengujian nyata**, bukan cuma kajian literatur: keempat kandidat (Moving Average, Simple Linear Regression, ARIMA, Prophet) diuji di atas data IDR/AUD **asli** dari Frankfurter (3 tahun, 2022-10-09 s.d. 2026-10-09), bukan data sintetis.

**Target kelayakan (PRD/ML doc):** MAPE < 2% untuk horizon 3-7 hari.

## 2. Metodologi Pengujian

*Rolling backtest*, bukan satu window tunggal (supaya tidak kebetulan dapat minggu yang "mudah"):
- Data: 1.463 hari (setelah forward-fill hari libur/weekend) kurs IDR→AUD dari Frankfurter.
- 37 titik potong (*cutoff*) berjarak ~30 hari, mulai dari hari ke-365 sampai akhir data.
- Di setiap titik potong: latih model pada data sebelum titik itu, forecast 7 hari ke depan (`horizon=7`, `window=7` untuk model yang butuh lookback), bandingkan ke nilai aktual.
- Metrik: MAPE dan RMSE per window, lalu diagregasi (mean, median, max) di seluruh 37 window.

Skrip pengujian tidak disertakan sebagai bagian aplikasi (`ml-service/` tetap bersih dari dependency ARIMA/Prophet kalau memang tidak dipakai) — lihat bagian "Reproduksi" di bawah kalau mau menjalankan ulang.

## 3. Hasil

| Model | Mean MAPE | Median MAPE | Max MAPE | Waktu fit+predict (1x) | Ukuran install |
|---|---|---|---|---|---|
| **Linear Regression** (baseline, sudah jadi default) | 0,71% | 0,71% | 1,73% | ~0,02s | sudah ada (scikit-learn) |
| **Moving Average** (baseline, alternatif) | 0,80% | 0,61% | 1,98% | ~0,002s | sudah ada (numpy) |
| **Random Walk** (`ARIMA(0,1,0)`, dipakai sebagai pembanding "naif") | 0,64% | 0,60% | 1,58% | ~0,18s | statsmodels (~tambahan kecil) |
| **ARIMA(1,1,1)** (statsmodels, order manual) | 0,67% | 0,59% | 1,57% | ~0,31s, kadang `ConvergenceWarning` | statsmodels (~tambahan kecil) |
| **Prophet** (Meta, 1 window uji) | 2,76% | — | — | ~1,3s | **+37 MB** + backend Stan/cmdstanpy terpisah |

*(Baris Prophet hanya 1 window uji, bukan rolling 37 window — lihat bagian 4.4 untuk alasannya.)*

## 4. Analisis per Kandidat

### 4.1 Baseline yang sudah diimplementasikan (Linear Regression & Moving Average)
Kedua baseline **sudah memenuhi target MAPE < 2%** secara konsisten di seluruh 37 window backtest (nilai maksimum pun masih di bawah 2%). Tidak perlu diganti.

### 4.2 ARIMA (statsmodels)
Secara teknis **sedikit lebih akurat** dari baseline (selisih 0,04-0,13 poin persentase MAPE) — tapi selisih ini kecil sekali dan masih dalam rentang *noise* mengingat seluruh model (termasuk random walk naif) sudah di bawah 1% mean MAPE. ARIMA juga menambah kerumitan nyata: perlu pemilihan order `(p,d,q)` (di sini dipakai manual `(1,1,1)`, belum tuning otomatis), dan beberapa fit memunculkan `ConvergenceWarning` dari optimizer — risiko kegagalan diam-diam kalau tidak dipantau.

### 4.3 Random Walk sebagai pembanding
Model paling naif — "besok sama dengan hari ini" — justru **mean MAPE-nya terbaik** (0,64%), nyaris menyamai ARIMA. Ini bukan kebetulan: ini konsisten dengan temuan klasik di literatur finance (Meese & Rogoff, 1983) bahwa nilai tukar jangka pendek sangat sulit dikalahkan oleh model yang lebih "pintar" dari random walk. Temuan ini **memvalidasi keputusan PRD/ML doc untuk mulai dari baseline sederhana** — bukan kegagalan metodologi kita, tapi karakteristik data kurs itu sendiri.

### 4.4 Prophet
Prophet **tidak diuji penuh 37 window** karena dari satu window uji saja sudah terlihat tiga masalah:
1. **MAPE 2,76%** — di atas ambang 2% PRD, lebih buruk dari seluruh baseline dan ARIMA.
2. **Install berat**: +37 MB plus backend Stan/`cmdstanpy` terpisah (butuh kompilasi model Stan saat fit pertama kali) — jauh lebih berat dari scikit-learn/statsmodels yang dipakai saat ini.
3. **Fit jauh lebih lambat** (~1,3s vs ~0,02-0,3s kandidat lain) — untuk retraining mingguan ini tidak masalah, tapi untuk iterasi/eksperimen jadi lebih lambat.

Kemungkinan akar masalah: Prophet dirancang untuk data dengan *seasonality* kalender yang jelas (harian/mingguan/tahunan, mis. trafik web atau penjualan ritel). Pasangan mata uang seperti IDR/AUD tidak punya pola musiman kalender yang kuat, sehingga komponen seasonality Prophet kemungkinan mencocokkan *noise*, bukan sinyal asli — konsisten dengan prinsip random walk di atas.

## 5. Rekomendasi

**Tidak ada perubahan dari baseline yang sudah diimplementasikan.** `linear_regression` tetap jadi default, `moving_average` tetap jadi alternatif — keduanya sudah terbukti memenuhi target MAPE PRD secara konsisten di data nyata, tanpa menambah dependency atau kerumitan operasional.

**ARIMA tidak diadopsi untuk saat ini** — peningkatan akurasinya tidak cukup besar untuk menjustifikasi kerumitan tambahan (pemilihan order, risiko non-convergence) dibanding manfaatnya yang marginal.

**Prophet tidak direkomendasikan sama sekali** — lebih lambat, lebih berat untuk di-deploy (`ml-service/Dockerfile` jadi lebih besar & butuh kompilasi Stan), dan performanya justru lebih buruk di pengujian kita.

## 6. Kapan Perlu Dievaluasi Ulang

Keputusan ini bukan final selamanya. Pertimbangkan ARIMA (dengan `pmdarima.auto_arima` untuk pemilihan order otomatis, bukan manual) kalau salah satu terjadi:
- MAPE **produksi** (bukan backtest) mulai konsisten melebihi 2% untuk pasangan mata uang yang dipantau.
- Pasangan mata uang baru ditambahkan yang punya karakteristik volatilitas berbeda secara signifikan dari IDR/AUD.
- Horizon forecast diperpanjang jauh di atas 7 hari (makin panjang horizon, random walk biasanya makin kalah dibanding model yang menangkap tren).

Prophet baru masuk akal dipertimbangkan lagi kalau ada bukti sinyal musiman kalender yang jelas pada data kurs yang dipantau — sejauh ini tidak terlihat.

## 7. Reproduksi

Pengujian dijalankan manual (bukan bagian test suite `ml-service`, karena `statsmodels`/`prophet` sengaja tidak masuk `requirements.txt` — keduanya tidak dipakai aplikasi):

```bash
cd ml-service && source .venv/bin/activate
pip install statsmodels prophet   # hanya untuk riset ini, tidak commit ke requirements.txt
# data uji: 3 tahun IDR/AUD asli dari Frankfurter
curl -s "https://api.frankfurter.dev/v1/2022-10-09..2026-10-09?base=IDR&symbols=AUD" -o /tmp/aud_3y.json
```

Skrip rolling backtest memakai `app.preprocessing`, `app.models`, dan `app.evaluation` yang sudah ada di `ml-service/app/` — hasil pada tabel bagian 3 didapat langsung dari fungsi produksi yang sama, bukan re-implementasi terpisah.

## Sumber
- `docs/ML_Architecture.md` bagian 3.3-3.4 (daftar kandidat & target MAPE).
- [statsmodels SARIMAX/ARIMA documentation](https://www.statsmodels.org/stable/examples/notebooks/generated/statespace_sarimax_stata.html)
- [Prophet (Meta) — PyPI package `prophet`](https://pypi.org/project/prophet/)
- Pengujian empiris sendiri (lihat bagian 7) — bukan dari artikel/blog pihak ketiga.
