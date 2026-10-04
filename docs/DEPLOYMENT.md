# Deployment Backend MONI

## 1. Keputusan Provider

**Backend + database staging di [Railway](https://railway.com).** Frontend tetap di Vercel (dikelola Razaqi).

| Kriteria | Railway | Render | Azure (App Service + PostgreSQL) |
|---|---|---|---|
| Pakai `backend/Dockerfile` yang sudah ada | ✅ langsung | ✅ langsung | ✅ lewat registry (GHCR/ACR) |
| Managed PostgreSQL | ✅ satu project dengan backend, network privat | ✅ tapi DB free tier kedaluwarsa ~30 hari | ✅ biaya paling besar, butuh kredit student |
| Deploy dari GitHub Actions | ✅ `railway up` + project token | ✅ deploy hook (tanpa kontrol hasil build) | ✅ paling banyak langkah setup |
| Health check sebelum traffic dialihkan | ✅ (`healthcheckPath`) | ✅ | ✅ |
| Environment terpisah (staging / production) dalam satu project | ✅ | ❌ (project terpisah) | ✅ (resource terpisah) |

Alasan: paling cepat hidup (target M6.2 adalah staging bisa dipakai FE mulai Minggu 7), sesuai rekomendasi PRD bagian Hosting, dan environment `production` nanti (M11.2) cukup ditambahkan di project yang sama dengan database terpisah.

## 2. Arsitektur Staging

```
GitHub (push ke dev)
  └─ CI (.github/workflows/ci.yml): lint · unit + integration test (PostgreSQL) · docker smoke test
       └─ hijau → Deploy Staging (.github/workflows/deploy-staging.yml)
            ├─ railway variable set GIT_COMMIT_SHA=<sha>
            ├─ railway up backend  → Railway build backend/Dockerfile (stage production)
            │     └─ container start: prisma migrate deploy → node src/server.js
            │     └─ Railway alihkan traffic hanya jika /api/v1/health/ready = 200 (backend/railway.json)
            └─ smoke test dari CI: /health menunjukkan commit baru · /health/ready 200 · GET /goals tanpa token = 401

Railway project "moni" — environment "staging"
  ├─ service "backend"   (public domain *.up.railway.app)
  └─ service "Postgres"  (hanya network privat, DATABASE_URL di-referensikan ke backend)
```

Kalau deployment baru gagal health check (mis. migrasi error), Railway tetap menjalankan deployment lama, dan workflow gagal di langkah smoke test karena commit live tidak berubah.

## 3. Setup Awal (sekali saja)

### 3.1 Railway

1. Buat project baru di Railway, ganti nama environment default menjadi **`staging`** (Settings → Environments).
2. **+ New → Database → PostgreSQL**.
3. **+ New → Empty Service**, beri nama **`backend`**. Jangan hubungkan ke repo GitHub — deploy dilakukan oleh GitHub Actions, supaya hanya commit yang lolos CI yang ter-deploy.
4. Di service `backend` → **Variables**, isi:

   | Variable | Nilai |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference variable, lewat network privat) |
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | acak 32 byte (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `JWT_REFRESH_SECRET` | acak 32 byte, **berbeda** dari `JWT_SECRET` |
   | `CORS_ORIGIN` | domain frontend staging dari Razaqi, mis. `https://moni-staging.vercel.app` (pisahkan dengan koma kalau lebih dari satu; jangan `*`) |
   | `AUTH_COOKIE_SAMESITE` | `none` (frontend dan backend beda domain, lihat bagian 5) |
   | `TRUST_PROXY` | `1` (rate limit butuh IP asli dari proxy Railway) |
   | `INTERNAL_CRON_SECRET` | acak 32 byte |
   | `TZ` | `Asia/Jakarta` |
   | `PORT` | `3000` (disamakan dengan target port domain di langkah 5) |
5. Service `backend` → **Settings → Networking → Generate Domain** dengan target port `3000`. Catat URL-nya (mis. `https://moni-backend-staging.up.railway.app`).
6. **Project Settings → Tokens → Create token** untuk environment `staging`. Ini *project token* yang hanya bisa mengakses environment tersebut.

### 3.2 GitHub

Repo → **Settings → Environments → New environment `staging`**, lalu isi:

- **Environment secret** `RAILWAY_TOKEN` = project token dari langkah 3.1.6.
- **Environment variable** `STAGING_URL` = domain dari langkah 3.1.5 (tanpa `/` di akhir).
- (opsional) **Environment variable** `RAILWAY_SERVICE` kalau nama service bukan `backend`.
- Deployment branches: **jangan** dibatasi ke `dev` saja. Event `workflow_run` berjalan dalam konteks branch default (`main`), jadi pembatasan ke `dev` akan memblokir deploy otomatis. Pilih "No restriction", atau izinkan `main` dan `dev`.

Dua syarat dari GitHub:

- `.github/workflows/deploy-staging.yml` harus sudah ada di branch default (`main`). Kalau belum, `workflow_run` tidak pernah terpicu dan tombol "Run workflow" tidak muncul.
- Branch `dev` harus ada, karena deploy otomatis hanya terpicu dari CI hijau pada push ke `dev`.

### 3.3 Deploy pertama

Actions → **Deploy Staging** → **Run workflow** (branch `dev`). Setelah hijau, cek manual:

```bash
curl https://<STAGING_URL>/api/v1/health        # commit = SHA terakhir
curl https://<STAGING_URL>/api/v1/health/ready  # {"status":"ready","database":"up"}
```

## 4. Operasional

### Deploy rutin

Merge PR ke `dev` → CI → Deploy Staging berjalan otomatis. Tidak perlu langkah manual.

### Rollback

Pilih salah satu:

1. **Paling cepat (tanpa build ulang):** dashboard Railway → service `backend` → Deployments → pilih deployment lama yang sehat → **Redeploy**.
2. **Lewat Git (tercatat di riwayat):** `git revert <commit>` lalu PR ke `dev`; pipeline normal akan men-deploy hasil revert.
3. **Deploy ulang commit tertentu:** Actions → Deploy Staging → Run workflow, pilih branch/tag yang berisi commit yang diinginkan.

> ⚠️ Rollback kode **tidak** membatalkan migrasi database yang sudah jalan. Migrasi Prisma di proyek ini harus selalu *additive* (tambah kolom/tabel, jangan hapus/rename di rilis yang sama), supaya versi kode sebelumnya tetap kompatibel dengan skema terbaru.

### Melihat log

Dashboard Railway → service `backend` → Deployments → **View logs**, atau `railway logs --service backend --environment staging`.

## 5. Catatan Integrasi Frontend

- Base URL API staging: `https://<STAGING_URL>/api/v1` (kontrak di `docs/API.md`).
- Frontend (`*.vercel.app`) dan backend (`*.up.railway.app`) berbeda *site*, sehingga cookie refresh token harus `SameSite=None; Secure` (`AUTH_COOKIE_SAMESITE=none`) dan frontend wajib memanggil endpoint `/auth/*` dengan `credentials: 'include'`.
- Domain frontend harus ada di `CORS_ORIGIN`; origin lain akan ditolak browser.
