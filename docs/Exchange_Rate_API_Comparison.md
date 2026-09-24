# Riset & Perbandingan API Sumber Nilai Tukar: MONI

**Terkait:** FR-05 (Tarik Data Nilai Tukar) & FR-06 (Prediksi Tren Kurs) pada `docs/PRD.md`; deliverable "Dokumen perbandingan API (rate limit, biaya, cakupan mata uang)" pada roadmap Fase 3 (bagian 16, "Breakdown Proyek & Deliverable").
**Tanggal riset:** 2026-09-24

## 1. Konteks & Kriteria

Pipeline forecasting MONI (`docs/ML_Architecture.md` bagian 3) butuh sumber data kurs yang bisa dipakai untuk dua kebutuhan sekaligus:
1. **Penarikan harian (cron job, FR-05):** cukup 1 kali per hari per pasangan mata uang yang aktif dipantau (misal IDR→AUD, IDR→EUR).
2. **Backfill data historis untuk melatih/mengevaluasi model regresi (FR-06):** butuh histori yang cukup panjang untuk *windowing* 7 hari (bagian 3.2 ML doc) dan evaluasi MAPE/RMSE (bagian 3.4), idealnya minimal 1-2 tahun ke belakang agar model punya cukup data untuk belajar pola musiman.

Kandidat dipilih dari yang disebut PRD/ML doc (Alpha Vantage, ExchangeRate-API, Yahoo Finance) ditambah dua alternatif kredibel yang relevan untuk kasus FX (Frankfurter, Open Exchange Rates).

## 2. Tabel Perbandingan

| Aspek | **Frankfurter** | ExchangeRate-API | Open Exchange Rates | Alpha Vantage | Yahoo Finance (tidak resmi) |
|---|---|---|---|---|---|
| Butuh API key? | Tidak | Tidak (Open Access) / Ya (tier Free) | Ya | Ya | Tidak (tanpa API resmi) |
| Rate limit free tier | Tidak ada kuota bulanan/harian eksplisit (dibatasi hanya untuk cegah abuse) | Open Access: ±1x/jam · Free (dg key): 1.500 request/bulan | 1.000 request/bulan | **25 request/hari** | Tidak resmi — bisa dibatasi/diblokir kapan saja tanpa pemberitahuan |
| Frekuensi update data | Harian (mayoritas), beberapa sumber bulanan/kuartalan | 1x/hari | Per jam | Tidak didokumentasikan jelas untuk FX | Real-time/intraday, tapi tidak stabil |
| Historical data di free tier | **Ya — sejak 1948** (hampir 80 tahun) | **Tidak tersedia** di free/Open Access (endpoint historis khusus paid, data sampai 1990) | Tidak jelas didokumentasikan untuk free plan; time-series baru ada di tier Enterprise | Tidak dibatasi eksplisit di dokumentasi, tapi kuota 25 req/hari membuat backfill sangat lambat | Tersedia dalam (bertahun-tahun) tapi lewat scraping endpoint tidak resmi |
| Cakupan mata uang | 206 mata uang, dari 98 bank sentral/sumber resmi | 165 mata uang | 200+ mata uang | Tidak disebutkan jumlah pasti untuk FX | Luas, mencakup pasangan forex umum |
| Batasan base currency | Bisa base currency apa saja | Bisa base currency apa saja | **Free tier dipaksa base currency USD** — perlu cross-rate manual untuk IDR→AUD dsb. | Base currency fleksibel per endpoint | Fleksibel |
| Status legal/ToS untuk produksi | Open source, eksplisit "free for commercial use", tanpa logging data pribadi | ToS resmi, aman dipakai sesuai tier | ToS resmi, aman dipakai sesuai tier | ToS resmi, aman dipakai sesuai tier | **Berisiko** — bukan API resmi, berpotensi melanggar ToS Yahoo, endpoint bisa berubah/mati sewaktu-waktu |
| Biaya upgrade (kalau perlu) | Tidak perlu upgrade (self-host/cache jika volume besar) | Tier Pro mulai berbayar untuk historical | Tier Developer $12/bulan (indikatif, cek harga terbaru) | $49,99/bulan (75 req/menit) s.d. $249,99/bulan (1.200 req/menit) | Tidak ada opsi berbayar resmi |

## 3. Analisis Singkat per Kandidat

- **Frankfurter** — satu-satunya kandidat yang memenuhi *dua* kebutuhan (cron harian **dan** backfill historis) sekaligus di tier gratis, tanpa perlu API key/akun sama sekali, tanpa kuota yang bisa habis di tengah development. Data bersumber dari bank sentral resmi (awalnya ECB) sehingga kredibel untuk metrik evaluasi MAPE/RMSE di ML doc.
- **ExchangeRate-API** — cukup untuk kebutuhan cron harian saja (1.500 request/bulan jauh melebihi kebutuhan 1x/hari), tapi endpoint historis terkunci di tier berbayar. Kalau backfill training data dibutuhkan, tim harus cari sumber lain hanya untuk fase riset model — menambah kompleksitas tanpa perlu.
- **Open Exchange Rates** — kuota bulanan cukup, tapi pembatasan base currency ke USD di free tier berarti setiap konversi IDR→AUD/EUR harus dihitung manual lewat cross-rate (IDR/USD dan AUD/USD), menambah potensi galat pembulatan dan kerumitan kode yang tidak perlu.
- **Alpha Vantage** — disebut di PRD, tapi kuota **25 request/hari** di free tier sangat ketat: kalau tim mau backfill 1-2 tahun data historis untuk beberapa pasangan mata uang sekaligus saat riset model, kuota ini akan habis dalam hitungan menit dan proses jadi lambat berhari-hari. Lebih cocok kalau nanti MONI butuh data aset lain (saham dll.) di luar FX, bukan sebagai sumber utama kurs.
- **Yahoo Finance (tidak resmi)** — **tidak direkomendasikan**. Tidak ada API resmi sejak 2017; akses lewat library seperti `yfinance` memakai endpoint tidak resmi yang bisa berubah atau diblokir tanpa pemberitahuan, dan berisiko melanggar Terms of Service Yahoo. Untuk *background worker* yang harus jalan otomatis dan andal (NFR "Ketersediaan" di PRD bagian 9), ini risiko yang tidak sepadan.

## 4. Rekomendasi

**Pilihan utama: Frankfurter API**, dipakai baik untuk cron job harian (FR-05) maupun untuk backfill data historis saat riset/pelatihan model regresi (FR-06) — data sejak 1948 lebih dari cukup untuk kebutuhan *windowing* 7 hari dan evaluasi model di ML_Architecture.md. Tidak butuh API key berarti tidak ada secret tambahan yang perlu dikelola di `.env`/GitHub Actions secrets, dan tanpa kuota berarti tidak ada risiko job cron gagal karena rate limit — relevan langsung dengan NFR Ketersediaan di PRD.

**Cadangan (opsional):** Simpan **ExchangeRate-API** (tier Free, 1.500 req/bulan) sebagai *fallback source* kedua untuk mekanisme retry/backoff yang diminta NFR "Ketersediaan" — kalau Frankfurter suatu waktu down, cron job bisa otomatis coba sumber kedua sebelum menandai data hari itu sebagai gagal ditarik. Ini juga sudah disebut sebagai kandidat di PRD, jadi tidak menyimpang dari dokumen awal.

**Tidak dipakai:** Open Exchange Rates (batasan base currency USD), Alpha Vantage (kuota terlalu ketat untuk backfill; simpan sebagai opsi kalau nanti butuh data non-FX), Yahoo Finance (risiko ToS & stabilitas).

## 5. Langkah Selanjutnya

1. Implementasi modul fetch kurs (Fase 3 roadmap) memanggil Frankfurter (`https://api.frankfurter.dev/v1/latest?base=IDR&symbols=AUD,EUR,...`) dari cron job Node.js, simpan ke tabel `exchange_rates` (skema sudah ada, lihat `backend/prisma/schema.prisma`), kolom `source` diisi `"frankfurter"`.
2. Untuk backfill awal riset model, panggil endpoint historis Frankfurter per rentang tanggal (`/v1/1990-01-01..2026-09-24?base=IDR&symbols=AUD`) sekali di luar cron, simpan hasilnya sebagai seed data training.
3. Kalau tim memutuskan menambah ExchangeRate-API sebagai fallback, daftar API key gratis-nya dan simpan sebagai `EXCHANGE_RATE_FALLBACK_API_KEY` di `.env`/secrets — bukan `EXCHANGE_RATE_API_KEY` (Frankfurter tidak butuh key sama sekali, jadi variabel itu tidak dipakai untuk sumber utama).

## Sumber

- [ExchangeRate-API — Open Access, No Key Required](https://www.exchangerate-api.com/docs/free)
- [ExchangeRate-API — Overview](https://www.exchangerate-api.com/docs/overview)
- [ExchangeRate-API — Historical Data Request Type](https://www.exchangerate-api.com/docs/historical-data-requests)
- [ExchangeRate-API — Supported Currencies](https://www.exchangerate-api.com/docs/supported-currencies)
- [Alpha Vantage — Documentation](https://www.alphavantage.co/documentation/)
- [Alpha Vantage — Premium/Pricing](https://www.alphavantage.co/premium/)
- [Frankfurter — API Docs](https://frankfurter.dev/docs/)
- [Open Exchange Rates — Sign Up/Plans](https://openexchangerates.org/signup)
- [Yahoo Finance API: Status & Best Alternatives (Octoparse, 2026)](https://www.octoparse.com/blog/how-to-scrape-yahoo-finance)
- [yfinance documentation](https://ranaroussi.github.io/yfinance/)
