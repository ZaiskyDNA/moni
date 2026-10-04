# MONI Backend API

Base URL: `/api/v1` — lokal `http://localhost:3000/api/v1`, staging lihat `docs/DEPLOYMENT.md`.

## Konvensi

- Request dan response memakai JSON. Response sukses dibungkus `{ "data": ... }`.
- Response error selalu berbentuk:

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Data yang dikirim tidak valid", "details": [{ "field": "targetDate", "message": "..." }] } }
  ```

  `details` hanya ada untuk error validasi.
- Endpoint yang ditandai 🔒 butuh header `Authorization: Bearer <accessToken>` (didapat dari login/refresh). Tanpa token atau token kedaluwarsa → `401 UNAUTHORIZED`.
- Resource milik user lain dibalas `404 NOT_FOUND` (bukan 403), supaya id milik orang lain tidak bisa ditebak.
- Nominal uang dikirim dan dikembalikan sebagai **string** (mis. `"25000.50"`) agar presisi tidak hilang. Tanggal tanpa jam memakai format `YYYY-MM-DD`.

| Kode error umum | Status |
|---|---|
| `VALIDATION_ERROR` | 400 |
| `BAD_REQUEST` | 400 (mis. JSON rusak) |
| `UNAUTHORIZED` | 401 |
| `NOT_FOUND` | 404 |
| `TOO_MANY_REQUESTS` | 429 |
| `INTERNAL_ERROR` | 500 |

---

## Health

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | Liveness: server hidup |
| GET | `/health/ready` | Readiness: database bisa dihubungi (`503` kalau tidak). Dipakai smoke test deploy |

---

## Auth (FR-01)

Access token dikirim di body (simpan di memori frontend). Refresh token disimpan di cookie `httpOnly` `refreshToken` dengan path `/api/v1/auth`, jadi frontend harus memanggil endpoint auth dengan `credentials: 'include'`.

### `POST /auth/register`

Body: `{ "name": "Budi", "email": "budi@contoh.com", "password": "rahasia123" }` — password minimal 8 karakter, wajib berisi huruf dan angka. Email dinormalkan ke huruf kecil.

- `201` → `{ "data": { "user": { "id", "name", "email", "createdAt" } } }`
- `409 EMAIL_TAKEN` · `429 TOO_MANY_REQUESTS` (rate limit per IP)

### `POST /auth/login`

Body: `{ "email", "password" }`

- `200` → `{ "data": { "user", "accessToken", "tokenType": "Bearer", "expiresIn": 900 } }` + cookie `refreshToken`
- `401 INVALID_CREDENTIALS` · `429 TOO_MANY_REQUESTS`

### `POST /auth/refresh`

Tanpa body, memakai cookie `refreshToken`. Refresh token dirotasi setiap kali dipanggil.

- `200` → bentuk sama dengan login · `401 UNAUTHORIZED`

### `POST /auth/logout`

Menghapus cookie refresh token → `204`.

### 🔒 `GET /auth/me`

- `200` → `{ "data": { "user" } }`

---

## Goals / Target Keberangkatan (FR-02) 🔒

Satu user boleh punya banyak goal. Objek goal:

```json
{
  "id": "6f0c...",
  "destinationCountry": "Australia",
  "targetCurrency": "AUD",
  "targetDate": "2027-07-01",
  "targetAmount": "25000.50",
  "status": "ACTIVE",
  "createdAt": "2026-10-04T08:00:00.000Z",
  "updatedAt": "2026-10-04T08:00:00.000Z"
}
```

| Field | Aturan |
|---|---|
| `destinationCountry` | Opsional, maks. 100 karakter, boleh `null` |
| `targetCurrency` | Wajib. Salah satu dari `USD`, `AUD`, `EUR`, `GBP`, `JPY`, `SGD` (tidak peka huruf besar/kecil) |
| `targetDate` | Wajib. `YYYY-MM-DD`, harus setelah hari ini (WIB) |
| `targetAmount` | Wajib. Nominal dalam mata uang tujuan, > 0, maks. 2 angka desimal, maks. 12 digit sebelum koma. String (disarankan) atau number |
| `status` | `ACTIVE` · `ACHIEVED` · `CANCELLED`. Tidak bisa diisi lewat body |

### `POST /goals`

Body: `{ destinationCountry?, targetCurrency, targetDate, targetAmount }`

- `201` → `{ "data": { "goal" } }` · `400 VALIDATION_ERROR`

### `GET /goals?status=ACTIVE`

Tanpa `status`, goal yang sudah dibatalkan **tidak** ditampilkan. Pakai `?status=CANCELLED` untuk melihatnya. Diurutkan dari `targetDate` terdekat.

- `200` → `{ "data": { "goals": [ ... ] } }` · `400` kalau `status` tidak dikenal

### `GET /goals/:id`

- `200` → `{ "data": { "goal" } }` · `404 NOT_FOUND`

### `PUT /goals/:id`

Update parsial: kirim hanya field yang berubah (minimal satu), dengan aturan validasi yang sama seperti `POST`.

- `200` → `{ "data": { "goal" } }` · `400` · `404` · `409 GOAL_CANCELLED` (goal yang sudah dibatalkan tidak bisa diubah)

### `DELETE /goals/:id`

Soft-delete: status menjadi `CANCELLED`, data tetap tersimpan karena riwayat kalkulasi & alert bergantung padanya. Idempotent.

- `204` · `404`

---

## Kurs (FR-05)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/exchange-rates/latest` | Kurs terbaru per pasangan mata uang dari tabel `exchange_rates` (diisi cron) |
| POST | `/internal/cron/fetch-exchange-rate` | Trigger manual penarikan kurs. Bukan untuk frontend — butuh header `x-internal-cron-secret` kalau `INTERNAL_CRON_SECRET` diset |
