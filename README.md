**#MONI**  
![CI](https://github.com/dharumahendra/moni/actions/workflows/ci.yml/badge.svg)

MONI adalah web app *sinking fund* proaktif yang menarik data kurs via API untuk diolah Machine Learning. Sistem menyesuaikan target tabungan harian dan merekomendasikan pemotongan biaya non-esensial saat kurs melemah. Demi privasi, pencatatan memakai unggahan CSV tanpa integrasi API bank.  

**Kelompok MONI TOR**  
Ketua Kelompok: Muhammad Zakiyyuddin Abdul Adhiim - 24/545668/TK/60719  
Anggota 1: Dharu Bintang Mahendratama - 24/535960/TK/59484   
Anggota 2: Razaqi Alkautsar -24/544958/TK/60570

## Backend

Backend REST API (Express.js + PostgreSQL) yang dijalankan dengan Docker. Backend hanya mengirim data JSON, sehingga bisa dipakai oleh client web maupun mobile.

### Prasyarat

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 24](https://nodejs.org/) (hanya kalau ingin menjalankan backend tanpa Docker, atau menjalankan lint/test)

### Menjalankan dengan Docker (disarankan)

1. Buat file `.env` di root project (file ini tidak di-commit), isi dengan format berikut lalu ganti password-nya:

   ```env
   POSTGRES_USER=app
   POSTGRES_PASSWORD=gantipasswordini
   POSTGRES_DB=app_db
   BACKEND_PORT=3000
   DB_PORT=5432
   CORS_ORIGIN=*
   # Hanya untuk menjalankan backend tanpa Docker; samakan dengan nilai di atas
   DATABASE_URL=postgres://app:gantipasswordini@localhost:5432/app_db
   ```

   Gunakan huruf dan angka saja untuk password. Kalau port 3000 atau 5432 sudah dipakai, ubah `BACKEND_PORT` / `DB_PORT` (dan port di `DATABASE_URL`).
2. Jalankan backend dan database:

   ```bash
   docker compose up --build --watch
   ```

   Dengan `--watch`, perubahan di `backend/src` langsung diterapkan tanpa restart manual.
3. Buka http://localhost:3000/api/v1/health

Untuk berhenti, tekan `Ctrl+C` lalu jalankan `docker compose down`. Tambahkan `-v` (`docker compose down -v`) hanya kalau ingin **menghapus seluruh data database**.

### Menjalankan backend tanpa Docker

Tetap butuh PostgreSQL. Cara paling mudah adalah menjalankan database-nya saja lewat Docker:

```bash
docker compose up -d db
cd backend
npm install
npm run dev
```

### Perintah backend

Jalankan dari folder `backend/`.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server dengan auto-restart saat file berubah |
| `npm start` | Menjalankan server (mode production) |
| `npm run lint` | Mengecek gaya dan potensi bug kode dengan ESLint |
| `npm test` | Menjalankan unit test |

### Endpoint

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/health` | Liveness: server hidup |
| GET | `/api/v1/health/ready` | Readiness: server bisa terhubung ke database (503 kalau tidak) |

## CI

Workflow GitHub Actions (`.github/workflows/ci.yml`) berjalan pada setiap push dan pull request ke `main`/`dev`, dan bisa dijalankan manual dari tab **Actions**:

1. **Lint & Test**: `npm ci`, `npm run lint`, dan `npm test` di folder `backend/`.
2. **Docker Smoke Test** (hanya jalan kalau job pertama lulus): build image target `production`, menjalankannya bersama PostgreSQL, lalu memanggil `/api/v1/health` dan `/api/v1/health/ready`.
