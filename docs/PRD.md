# Product Requirements Document (PRD): MONI

**Kelompok:** MONITOR
**Anggota:**
1. Muhammad Zakiyyuddin Abdul Adhiim — 24/545668/TK/60719
2. Dharu Bintang Mahendratama — 24/535960/TK/59484
3. Razaqi Alkautsar — 24/544958/TK/60570

---

## 1. Overview
**Nama Produk:** MONI
**Jenis Produk:** Aplikasi Web

**Deskripsi:** MONI adalah aplikasi web pencatatan keuangan (*sinking fund*) proaktif yang mengintegrasikan data makroekonomi real-time. Sistem menggunakan *background worker* (*cron job*) untuk menarik data nilai tukar uang dari API finansial publik secara otomatis. Data ini diproses oleh model Machine Learning (regresi deret waktu) guna memprediksi tren kurs jangka pendek dan mengalkulasi ulang target tabungan harian secara dinamis. Jika model mendeteksi potensi defisit dana akibat pelemahan nilai tukar, sistem akan menganalisis histori transaksi pengguna untuk merekomendasikan pemangkasan anggaran pada kategori pengeluaran non-esensial.

Guna menjaga kelayakan teknis (*feasibility*) dan keamanan sistem pada tahap awal, arsitektur data difokuskan pada mekanisme pencatatan manual dan agregasi melalui unggahan dokumen mutasi rekening (CSV), sehingga sistem dapat beroperasi stabil tanpa bergantung pada kerumitan birokrasi integrasi API perbankan (*open banking*).

## 2. Latar Belakang & Permasalahan
Mobilitas global masyarakat untuk studi dan bekerja di luar negeri terus meningkat, namun persiapan finansial sering kali menjadi titik kritis yang menggagalkan rencana tersebut. Menurut laporan World Bank (2025), lebih dari 40% calon pekerja dan mahasiswa internasional dari negara berkembang mengalami *financial shortfall* (kekurangan dana) yang dipicu oleh volatilitas nilai tukar mata uang dan inflasi di negara tujuan. Sebagai contoh, fluktuasi nilai tukar Rupiah (IDR) terhadap Dolar Australia (AUD) atau Euro (EUR) seringkali mengalami deviasi 5–8% hanya dalam kurun waktu 6 bulan (Bank Indonesia, 2026).

Kondisi ini membuat metode "tabungan statis" bulanan pada aplikasi pencatatan keuangan konvensional menjadi tidak relevan dan berisiko tinggi. Aplikasi yang ada saat ini umumnya hanya mencatat histori pengeluaran masa lalu tanpa memperhitungkan variabel makroekonomi real-time. Jika dibiarkan, selisih kurs ini dapat memicu defisit dana hingga belasan juta rupiah tepat menjelang keberangkatan. Oleh karena itu, terdapat urgensi untuk menghadirkan sistem pencatatan keuangan (*sinking fund*) yang proaktif, di mana AI dapat secara dinamis mengalkulasi ulang target tabungan harian mengikuti pergerakan pasar global, sehingga mencegah kegagalan finansial di menit-menit terakhir.

## 3. Tujuan Produk
Membantu pengguna merealisasikan rencana perjalanan ke luar negeri (liburan, studi, hingga bekerja) tanpa perlu mengkhawatirkan fluktuasi nilai tukar. Melalui fitur penyesuaian target tabungan harian otomatis berbasis kurs real-time, dana yang disiapkan akan selalu terpantau dan sesuai dengan target.

## 4. Target Pengguna & Kebutuhan
1. **Mahasiswa calon studi luar negeri:** Berfokus pada pengumpulan dana untuk biaya pendidikan (*tuition fee*) dan biaya hidup bulanan selama di luar negeri.
2. **Masyarakat yang ingin liburan ke luar negeri:** Menabung dalam jangka pendek hingga menengah untuk keperluan rekreasi seperti tiket pesawat, akomodasi, dan uang saku.
3. **Calon pekerja di luar negeri:** Mempersiapkan dana keberangkatan dan *living cost* awal yang membutuhkan kepastian finansial solid.

## 5. Analisis Kompetitor

| Aspek | YNAB (You Need A Budget) | Wise | Cleo |
|---|---|---|---|
| **Jenis Kompetitor** | Indirect Competitor | Indirect Competitor | Tertiary Competitor |
| **Jenis Produk** | Web Budgeting | Dompet Digital / E-Wallet Multi-Currency | AI Financial Assistant App |
| **Target Customer** | Individu pengelola arus kas bulanan berbasis target | Ekspatriat, pelancong, mahasiswa internasional | Gen Z & mahasiswa yang butuh asistensi cash flow |
| **Kelebihan** | Metodologi *zero-based budgeting* yang ketat; *goal tracking* terstruktur untuk multi-proyek; pelaporan visual mendetail | Konversi kurs valas riil, murah, dan transparan; menampung banyak mata uang asing; terintegrasi kartu debit internasional | Prediksi kas jangka pendek akurat dengan UI *chat-based* interaktif; deteksi pola tagihan berulang; gamifikasi agresif (fitur "Roast") |
| **Kekurangan** | Target nominal statis, tidak merespons kurs/inflasi; *learning curve* curam | Tidak menganalisis pengeluaran harian; tanpa AI prediktif; tanpa *forecasting chart* | Hanya fokus survival akhir bulan (siklus bulanan); tidak mendukung multi-mata uang/valas global; interaksi humor kurang cocok untuk segmen profesional |

**Key Competitive Advantage & Unique Value MONI:**
MONI menggabungkan tiga hal yang tidak dimiliki kompetitor secara bersamaan: (1) target tabungan yang otonom merespons volatilitas kurs global, (2) manajemen pengeluaran harian yang proaktif, dan (3) proyeksi *milestone* jangka panjang lintas mata uang — bukan sekadar penertiban anggaran bulanan lokal.

## 6. Functional Requirements (FR)

| ID | Fitur | Deskripsi |
|---|---|---|
| **FR 1** | Registrasi & Login | Sistem harus memungkinkan pengguna mendaftar dengan email/password dan login dengan validasi kredensial. |
| **FR 2** | Kelola target keberangkatan | Sistem harus memungkinkan pengguna menetapkan negara tujuan (opsional), mata uang tujuan, target tanggal, dan nominal dana yang dibutuhkan. |
| **FR 3** | Catat Transaksi Manual | Sistem harus memungkinkan pengguna mencatat transaksi pemasukan/pengeluaran secara manual beserta kategorinya. |
| **FR 4** | Unggah Mutasi Rekening CSV | Sistem harus dapat menerima unggahan file CSV mutasi rekening dan mem-parsing datanya menjadi transaksi. |
| **FR 5** | Tarik Data Nilai Tukar | Sistem harus menjalankan *background worker* (*cron job*) yang menarik data kurs dari API finansial publik secara berkala. |
| **FR 6** | Prediksi Tren Kurs | Sistem harus memproses data historis kurs dengan model regresi deret waktu untuk memprediksi tren jangka pendek. |
| **FR 7** | Kalkulasi Ulang Target Harian | Sistem harus mengalkulasi ulang target tabungan harian secara otomatis setiap kali terjadi perubahan signifikan pada kurs. |
| **FR 8** | Lihat Dashboard *Sinking Fund* | Sistem harus menampilkan progres tabungan, target harian terkini, dan sisa waktu menuju keberangkatan. |
| **FR 9** | Lihat *Burn-Down Forecasting Chart* | Sistem harus menampilkan grafik visual proyeksi kelayakan dana terhadap tenggat waktu keberangkatan. |
| **FR 10** | Terima *Smart Alert* dan Rekomendasi | Sistem harus mengirim notifikasi kepada pengguna saat terdeteksi potensi defisit dana. |
| **FR 11** | Analisis Histori dan Rekomendasi | Sistem harus menganalisis histori transaksi pengguna dan merekomendasikan kategori pengeluaran non-esensial yang dapat dipangkas. |
| **FR 12** | Manajemen Kategori | Sistem harus menyediakan kategori transaksi standar (esensial/non-esensial) untuk klasifikasi otomatis maupun manual. |

## 7. Use Case Diagram

**Aktor:** User (pengguna aplikasi), Scheduler/Cron Job (sistem otomatis), API Finansial Eksternal (sistem eksternal)

**Ringkasan alur relasi use case:**
- *User* dapat langsung mengakses: Registrasi & Login, Kelola Target Keberangkatan, Catat Transaksi Manual, Unggah Mutasi Rekening CSV, Lihat Dashboard Sinking Fund, Lihat Burn-Down Forecasting Chart, dan Terima Smart Alert & Rekomendasi.
- **Lihat Dashboard Sinking Fund** `include` → **Kalkulasi Ulang Target Harian**
- **Lihat Burn-Down Forecasting Chart** `include` → **Kalkulasi Ulang Target Harian**
- **Kalkulasi Ulang Target Harian** `include` → **Prediksi Tren Kurs** `include` → **Tarik Data Nilai Tukar**
- **Tarik Data Nilai Tukar** dipicu oleh *Scheduler/Cron Job* dan berinteraksi dengan *API Finansial Eksternal*
- **Terima Smart Alert & Rekomendasi** `extend` → **Analisis Histori & Rekomendasi Pemangkasan**, dan **Analisis Histori & Rekomendasi Pemangkasan** `include` → **Kalkulasi Ulang Target Harian**

*(Diagram lengkap tersedia pada lampiran worksheet Modul 2 — Lab 2.4.)*

## 8. Tech Stack

### 8.1 Frontend
| Komponen | Pilihan | Kegunaan |
|---|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript | Rendering UI, routing, SSR/SSG untuk landing & dashboard |
| Styling | Tailwind CSS | Utility-first styling, konsisten dengan cepat |
| State/Data Fetching | TanStack Query (React Query) | Caching, refetch otomatis untuk data kurs & saldo yang berubah dinamis |
| Form & Validasi | React Hook Form + Zod | Validasi form Registrasi, Goal, Transaksi di sisi klien |
| Visualisasi | Recharts atau Chart.js | Burn-Down Forecasting Chart, grafik tren kurs |
| HTTP Client | Axios (dibungkus custom hook) | Komunikasi ke REST API backend |
| Auth Session | JWT disimpan di `httpOnly cookie` | Menjaga sesi login aman dari akses JavaScript sisi klien |

### 8.2 Backend
| Komponen | Pilihan | Kegunaan |
|---|---|---|
| Runtime & Framework | Node.js 20.x + Express.js atau NestJS + TypeScript | REST API utama (Auth, Goal, Transaction, Category, CSV, Alert) |
| ORM | Prisma ORM (atau TypeORM) | Query & migration ke PostgreSQL sesuai ERD |
| Autentikasi | JWT (access + refresh token) + bcrypt/argon2 untuk hashing password | Memenuhi FR-01 |
| Background Worker | node-cron (skala kecil) atau BullMQ + Redis (skala lebih besar) | Menjalankan cron job penarikan kurs (FR-05) |
| Parsing CSV | papaparse / csv-parse | Parsing mutasi rekening (FR-04) |
| HTTP Client (ke API eksternal) | Axios / undici | Menarik data kurs dari API finansial publik |
| Validasi Request | Zod atau class-validator (NestJS) | Validasi payload API di sisi server |
| Dokumentasi API | Swagger / OpenAPI (`swagger-jsdoc` atau `@nestjs/swagger`) | Kontrak API yang jelas antar anggota tim FE/BE |
| Notifikasi | Nodemailer/Resend (email) dan/atau in-app notification | Smart Alert (FR-10) |

### 8.3 AI / Forecasting Engine (FR-06, FR-07)
| Komponen | Pilihan | Kegunaan |
|---|---|---|
| Pendekatan model | Regresi deret waktu — mulai dari regresi linear sederhana sebagai baseline, lalu opsional upgrade ke ARIMA atau Prophet | Prediksi tren kurs jangka pendek |
| Implementasi | Microservice Python terpisah (FastAPI + `statsmodels`/`prophet`/`scikit-learn`) yang dipanggil backend via REST/internal API, **atau** implementasi ringan langsung di Node.js (mis. `regression-js`) bila kompleksitas model tetap sederhana | Dipilih berdasarkan trade-off kompleksitas vs waktu pengerjaan tim (lihat catatan Lab 2.5) |
| Retraining/Refresh | Dijalankan berkala mengikuti jadwal cron penarikan kurs (FR-05) agar prediksi selalu memakai data terbaru | — |

### 8.4 Database & Infrastruktur
| Komponen | Pilihan | Kegunaan |
|---|---|---|
| Database | PostgreSQL 16 (Relational Database) | Menyimpan seluruh entitas sesuai ERD (Bagian 10) |
| Migration | Prisma Migrate / TypeORM migrations | Version control skema database |
| Version Control | Git — strategi branching `main` + `dev` + *feature branch* | Kolaborasi tim, sinkron dengan board GitHub Projects |
| CI/CD | GitHub Actions — workflow `CI - Lint, Test, Build`, dipicu otomatis pada setiap *push*/*pull request* ke branch `main` dan `dev` | Menjamin kualitas kode sebelum merge |
| Hosting | Frontend: Vercel · Backend: Railway/Render · Database: Managed PostgreSQL (mis. Supabase/Neon/Railway) | Deployment terpisah FE/BE/DB sesuai NFR; provider final disesuaikan kuota/budget tim |
| Containerization (opsional) | Docker untuk backend & AI microservice | Konsistensi environment lokal ↔ CI ↔ production |

### 8.5 Detail Pipeline CI/CD (GitHub Actions)
Workflow `.github/workflows/main.yml` terdiri dari dua job paralel sesuai struktur aplikasi:
- **Job Frontend (Next.js):** checkout → setup Node 20.x (cache npm) → `npm ci` → `npm run lint` (ESLint) → `npm run type-check` → unit test dengan *coverage report* (`--ci --coverage`) → `npm run build` → upload build artifact (`frontend/.next/`).
- **Job Backend (Express/Nest.js):** checkout → setup Node 20.x (cache npm) → `npm ci` → `npm run lint` → menjalankan **service PostgreSQL 16 sungguhan** (via `services:` di GitHub Actions, dengan health-check) → unit & integration test (`--ci --coverage`, terkoneksi ke `DATABASE_URL` test) → `npm run build` → upload build artifact (`backend/dist/`).

Manfaat: mencegah kode error/gagal-test/melanggar lint masuk ke branch `main`/`dev`; memberi umpan balik otomatis dan cepat ke tim setelah tiap *push*/PR; menjaga konsistensi kualitas kode antar anggota yang mengerjakan modul berbeda secara paralel; serta artifact build & coverage tersimpan untuk verifikasi/debugging.

## 9. Non-Functional Requirements
- **Metodologi Pengembangan:** Agile Scrum, dengan *sprint* mingguan selama 1 semester (12 pertemuan). Scrum dipilih karena proyek membutuhkan pembaruan berkala tiap minggu, sehingga *timeline* pengerjaan lebih terstruktur dan kualitas produk terjaga melalui evaluasi serta *testing* rutin di akhir tiap *sprint*.
- **Performa:** Waktu respons endpoint dashboard dan kalkulasi target harian ditargetkan < 500 ms pada beban normal; proses penarikan kurs & forecasting berjalan asinkron di background worker agar tidak memblokir request pengguna.
- **Skalabilitas:** Backend, database, dan (bila ada) AI microservice di-deploy sebagai layanan terpisah sehingga dapat di-scale independen.
- **Ketersediaan:** Cron job penarikan kurs perlu mekanisme retry/backoff bila API finansial eksternal gagal merespons, agar `SAVING_CALCULATION` tidak memakai data kurs basi.
- **Portabilitas Data:** Pengguna dapat mengunggah ulang/menghapus data CSV yang salah tanpa memengaruhi transaksi manual yang sudah tercatat.
- **Auditability:** Setiap `TRANSACTION` menyimpan `sumber` (manual/CSV) agar histori dapat ditelusuri saat terjadi ketidaksesuaian data.

## 10. Struktur Data (Entity)
Berdasarkan ERD rancangan sistem, entitas utama beserta relasinya:
- **USER** (`user_id` PK; nama, email, password_hash, created_at) — *memiliki* banyak **GOAL**; *mencatat* banyak **TRANSACTION**; *mengunggah* banyak **CSV_UPLOAD**.
- **GOAL** (`goal_id` PK, `user_id` FK; negara_tujuan, mata_uang_tujuan, tanggal_keberangkatan, nominal_target, status) — *menghasilkan* banyak **SAVING_CALCULATION**; *memicu* banyak **ALERT**.
- **TRANSACTION** (`transaction_id` PK, `user_id` FK, `category_id` FK, `csv_upload_id` FK; tanggal, nominal, jenis, deskripsi, sumber) — *termasuk* dalam satu **CATEGORY**.
- **CATEGORY** (`category_id` PK; nama_kategori, tipe [esensial/non-esensial]) — *menyasar* pada **BUDGET_RECOMMENDATION**.
- **CSV_UPLOAD** (`csv_upload_id` PK, `user_id` FK; nama_file, tanggal_unggah, status) — *menghasilkan* banyak **TRANSACTION**.
- **EXCHANGE_RATE** (`rate_id` PK; mata_uang_asal, mata_uang_tujuan, nilai_kurs, tanggal, sumber_api) — *digunakan* oleh **SAVING_CALCULATION**.
- **SAVING_CALCULATION** (`calculation_id` PK, `goal_id` FK, `rate_id` FK; tanggal, target_harian, prediksi_kurs, status).
- **ALERT** (`alert_id` PK, `goal_id` FK; tipe, pesan, tanggal, status_dibaca) — *berisi* banyak **BUDGET_RECOMMENDATION**.
- **BUDGET_RECOMMENDATION** (`recommendation_id` PK, `alert_id` FK, `category_id` FK; nominal_potongan).

## 11. API Design Overview
Rancangan endpoint REST tingkat tinggi (detail request/response ditulis di dokumentasi API — Bagian 8.2), mengikuti prefix `/api/v1`:

| Endpoint | Method | FR Terkait | Deskripsi |
|---|---|---|---|
| `/auth/register`, `/auth/login` | POST | FR 1 | Registrasi & login pengguna |
| `/goals` | GET, POST | FR 2 | List & buat target keberangkatan |
| `/goals/:id` | GET, PUT, DELETE | FR 2 | Detail, ubah, hapus target |
| `/transactions` | GET, POST | FR 3 | List & catat transaksi manual |
| `/transactions/:id` | PUT, DELETE | FR 3 | Ubah/hapus transaksi |
| `/transactions/upload-csv` | POST | FR 4 | Unggah & parsing mutasi rekening CSV |
| `/categories` | GET | FR 12 | Daftar kategori esensial/non-esensial |
| `/exchange-rates/latest` | GET | FR 5 | Kurs terbaru yang sudah ditarik cron job |
| `/exchange-rates/forecast` | GET | FR 6 | Hasil prediksi tren kurs jangka pendek |
| `/goals/:id/saving-calculation` | GET | FR 7 | Target tabungan harian terkini untuk suatu goal |
| `/goals/:id/dashboard` | GET | FR 8 | Data agregat untuk Dashboard Sinking Fund |
| `/goals/:id/burn-down-chart` | GET | FR 9 | Data seri waktu untuk Burn-Down Forecasting Chart |
| `/alerts` | GET | FR 10 | Daftar smart alert milik user |
| `/alerts/:id/recommendations` | GET | FR 11 | Rekomendasi pemangkasan anggaran terkait sebuah alert |
| `/internal/cron/fetch-exchange-rate` | POST (internal/scheduler only) | FR 5 | Trigger job penarikan kurs (dipanggil scheduler, bukan user) |

Seluruh endpoint (kecuali `/auth/*` dan endpoint internal cron) diproteksi middleware autentikasi JWT dan divalidasi menggunakan skema Zod/`class-validator` di sisi backend.

## 12. Keamanan & Privasi
- **Autentikasi & Otorisasi:** Password di-hash dengan bcrypt/argon2 (tidak pernah disimpan plain-text); sesi menggunakan JWT access token (umur pendek) + refresh token; setiap resource (goal, transaksi, alert) diverifikasi kepemilikan (`user_id`) sebelum diakses.
- **Perlindungan Data Finansial:** Data mutasi rekening dari CSV hanya disimpan sebagai hasil parsing transaksi (nominal, tanggal, deskripsi), tanpa menyimpan nomor rekening/kartu — selaras dengan keputusan arsitektur untuk tidak berintegrasi langsung dengan *open banking*.
- **Transport & Environment:** Seluruh komunikasi via HTTPS; kredensial (DB URL, JWT secret, API key kurs) disimpan sebagai *environment variable*/secret di penyedia hosting dan GitHub Actions secrets, tidak pernah di-commit ke repository.
- **Rate Limiting & Abuse Prevention:** Endpoint autentikasi dan upload CSV diberi rate limit untuk mencegah brute-force login dan penyalahgunaan upload file besar.
- **Validasi Input:** Validasi ketat di sisi backend (bukan hanya frontend) untuk seluruh payload, termasuk format file CSV, guna mencegah data korup masuk ke `TRANSACTION`.
- **CORS:** Backend hanya menerima request dari origin frontend yang terdaftar (domain staging & production).

## 13. Low-Fidelity Wireframe (Ringkasan)
Dashboard utama (*Dashboard Sinking Fund*) menampilkan, dari atas ke bawah: (1) kartu **Target Keberangkatan** dengan nominal target dan *progress bar* persentase tercapai; (2) **Burn-Down Forecasting Chart** berupa grafik proyeksi penurunan kebutuhan dana terhadap waktu; (3) banner **Smart Alert** saat terdeteksi potensi defisit dana beserta tautan "Lihat detail"; (4) daftar **Transaksi Terbaru** (tanggal, deskripsi, kategori, nominal); serta navigasi utama ke menu Dashboard, Transaksi, Target, dan Profil.

## 14. Testing Strategy
| Level | Tools | Cakupan |
|---|---|---|
| Unit Test (Frontend) | Jest + React Testing Library | Komponen UI kritikal: form Goal, form Transaksi, kartu progress |
| Unit Test (Backend) | Jest/Vitest + Supertest | Modul kalkulasi target harian, parser CSV, dan modul forecasting (paling rawan bug — prioritas utama) |
| Integration Test | Supertest terhadap PostgreSQL sungguhan (service container di CI) | Alur end-to-end: auth → goal → transaksi → dashboard, sesuai skenario di CI/CD (Bagian 8.5) |
| Coverage Reporting | Jest coverage report, di-upload sebagai artifact CI | Target minimal coverage disepakati tim tiap sprint |
| User Acceptance Testing (UAT) | Sesi manual bersama calon pengguna nyata (mahasiswa/calon pekerja luar negeri) | Validasi kelayakan fitur inti (Dashboard, Smart Alert) sebelum deployment akhir |
| Regression Test | Dijalankan otomatis via GitHub Actions pada setiap PR ke `main`/`dev` | Mencegah fitur lama rusak akibat perubahan baru |

## 15. Deployment & Environment Guide
- **Environment:** `local` (development), `staging` (hasil merge ke `dev`, untuk internal testing), `production` (hasil merge ke `main`, untuk demo/UAT/publik).
- **Alur Deploy:** Build artifact dari GitHub Actions (Bagian 8.5) digunakan sebagai dasar deploy; frontend di-deploy ke Vercel (auto-deploy dari branch), backend & database di-deploy ke Railway/Render dengan migration dijalankan otomatis (`prisma migrate deploy`) sebelum service backend restart.
- **Environment Variables minimum yang dibutuhkan:** `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `EXCHANGE_RATE_API_BASE_URL`, `EXCHANGE_RATE_CRON_SCHEDULE`, `INTERNAL_CRON_SECRET`, `EMAIL_API_KEY` (untuk notifikasi, jika digunakan). *(Update 2026-09-24: `EXCHANGE_RATE_API_KEY` dihapus dari daftar — API kurs terpilih, Frankfurter, tidak butuh API key sama sekali; lihat `docs/Exchange_Rate_API_Comparison.md`. `CRON_SCHEDULE` diganti nama jadi `EXCHANGE_RATE_CRON_SCHEDULE` agar tidak ambigu dengan cron job lain di masa depan, mis. retraining model mingguan.)*
- **Observability minimum:** Logging terstruktur pada backend (khususnya untuk job cron kurs & modul kalkulasi) serta health-check endpoint (`/health`) agar status service mudah dipantau di hosting.

## 16. Roadmap & Fase Pengembangan

### 11.1 Fase Pengembangan (Ringkasan)
- **Fase 1 (Fondasi):** Setup Repository, CI/CD, Database Schema, Registrasi & Login.
- **Fase 2 (Input Data):** CRUD Target Keberangkatan, Catat Transaksi, Manajemen Kategori, dan Parser CSV Mutasi.
- **Fase 3 (Integrasi Kurs):** Integrasi API Finansial, Cron Job Tarik Kurs.
- **Fase 4 (AI & Kalkulasi):** Implementasi Model Regresi Tren Kurs, Algoritma Kalkulasi Ulang Target.
- **Fase 5 (Dashboard & Visualisasi):** UI Dashboard *Sinking Fund*, *Burn-Down Chart*.
- **Fase 6 (Smart Alert & QA):** Sistem Rekomendasi Realokasi, Unit & Integration Testing, UAT, Deployment.

### 11.2 Gantt Chart (12 Pertemuan / 1 Semester)

| Kegiatan | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Brainstorming | ■ | | | | | | | | | | | |
| Setup Repositori | ■ | ■ | | | | | | | | | | |
| Sprint Planning | | ■ | | | | | | | | | | |
| Use Case, FR, ERD | | ■ | | | | | | | | | | |
| Setup Cloud & CI/CD | | | ■ | | | | | | | | | |
| Desain & Implementasi Database | | | ■ | ■ | | | | | | | | |
| Auth & Manajemen Akun | | | ■ | ■ | | | | | | | | |
| Develop Target Keberangkatan | | | | | ■ | ■ | | | | | | |
| Catat Transaksi Manual | | | | | ■ | ■ | | | | | | |
| Unggah & Parsing Mutasi CSV | | | | | ■ | ■ | | | | | | |
| Integrasi API Kurs | | | | | | | ■ | ■ | | | | |
| Fetch Kurs Berkala | | | | | | | ■ | ■ | | | | |
| Forecasting | | | | | | | ■ | ■ | | | | |
| Kalkulasi Sinking Fund | | | | | | | | | ■ | ■ | | |
| Burn-Down Forecasting Chart | | | | | | | | | ■ | ■ | | |
| Smart Alert & Rekomendasi Realokasi | | | | | | | | | | | ■ | ■ |
| Testing & Bug Fixing Overall | | | | | | | | | | | ■ | ■ |
| Deployment | | | | | | | | | | | | ■ |

### 11.3 Breakdown Proyek & Deliverable

| Subproyek | Actionable Deliverable | Catatan |
|---|---|---|
| Setup repository GitHub, branching strategy, struktur folder | Repository terkonfigurasi (README, .gitignore, struktur folder FE/BE) | Gunakan trunk-based atau GitFlow sederhana (main + dev + feature branch) |
| Setup environment cloud (hosting FE, BE, DB) | Environment staging aktif & dapat diakses | Sesuaikan provider dengan kuota/budget tim |
| Desain & implementasi skema database sesuai ERD | Migration files untuk tabel USER, GOAL, TRANSACTION, CATEGORY, dst. | Mengacu langsung ke ERD |
| Implementasi Registrasi & Login (FR-01) | Endpoint API auth + halaman UI Registrasi/Login | Validasi email & password, hashing password |
| Implementasi Kelola Target Keberangkatan (FR-02) | Form + API CRUD negara tujuan, mata uang, tanggal, nominal target | Mendukung multi-goal per user (relasi 1-ke-N pada GOAL) |
| Implementasi Catat Transaksi Manual (FR-03) | Form + API CRUD transaksi manual dengan kategori | — |
| Implementasi Manajemen Kategori Transaksi (FR-12) | Data kategori standar esensial/non-esensial | Prioritas *Could Have*, dapat dikerjakan paralel dengan FR-03 |
| Implementasi Unggah & Parsing Mutasi Rekening CSV (FR-04) | Fitur upload CSV + parser menjadi data transaksi | Perlu validasi format file & error handling |
| Riset & pemilihan API finansial eksternal | Dokumen perbandingan API (rate limit, biaya, cakupan mata uang) | Pertimbangkan API gratis dengan histori data cukup panjang |
| Implementasi integrasi API Finansial Eksternal | Modul fetch data kurs dari API terpilih | Terkait FR-05 |
| Implementasi background worker/cron job (FR-05) | Job terjadwal menyimpan data kurs harian ke tabel EXCHANGE_RATE | Jadwal bisa harian atau per beberapa jam |
| Riset & pemilihan model regresi deret waktu | Dokumen pemilihan model (ARIMA/Prophet/regresi sederhana) | Pertimbangkan kompleksitas vs waktu pengerjaan tim |
| Implementasi model Prediksi Tren Kurs (FR-06) | Modul/endpoint prediksi kurs jangka pendek | Include ke UC Tarik Data Nilai Tukar |
| Implementasi Engine Kalkulasi Ulang Target Harian (FR-07) | Modul kalkulasi otomatis saat kurs berubah signifikan | Trigger otomatis, tersimpan di SAVING_CALCULATION |
| Implementasi Dashboard Sinking Fund (FR-08) | Halaman dashboard progres tabungan & target harian | — |
| Implementasi Burn-Down Forecasting Chart (FR-09) | Komponen grafik proyeksi kelayakan dana | Data historis dari SAVING_CALCULATION |
| Implementasi Analisis Histori & Rekomendasi Pemangkasan (FR-11) | Modul analisis kategori pengeluaran non-esensial | Dipakai sebagai isi rekomendasi Smart Alert |
| Implementasi Smart Alert & Rekomendasi (FR-10) | Sistem notifikasi saat terdeteksi potensi defisit | Extend dari Kalkulasi Ulang Target Harian |
| Unit testing seluruh modul utama | Test suite dengan coverage report | Prioritaskan modul kalkulasi & parsing CSV (paling rawan bug) |
| Integration testing alur end-to-end | Skenario test lintas modul (auth → goal → transaksi → dashboard) | — |
| User Acceptance Testing (UAT) | Dokumen hasil UAT + daftar bug/feedback | Libatkan minimal beberapa calon pengguna nyata |
| Deployment ke environment production | Aplikasi live & dapat diakses publik | — |
| Penulisan dokumentasi teknis (API docs, setup guide) | Dokumen teknis di repository (README/Wiki) | — |
| Persiapan materi demo & laporan akhir | Slide/skrip demo + laporan akhir proyek | — |

## 12. Project Management
Progres pengerjaan dikelola menggunakan **GitHub Projects** (board Kanban dengan kolom Backlog, Ready, In Progress, In Review, Done), dengan setiap *issue* dipetakan langsung ke FR terkait sehingga status pengembangan tiap fitur dapat dipantau secara real-time oleh seluruh anggota tim.