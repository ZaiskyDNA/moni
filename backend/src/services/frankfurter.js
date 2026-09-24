// Klien tipis untuk Frankfurter API (lihat docs/Exchange_Rate_API_Comparison.md untuk alasan
// pemilihannya). Tidak butuh API key, jadi tidak ada secret yang perlu dikelola di sini.

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// NFR "Ketersediaan" (PRD bagian 9): retry dengan backoff eksponensial bila API eksternal
// gagal merespons, supaya kalkulasi tabungan tidak memakai data kurs basi karena satu kegagalan sesaat.
async function fetchWithRetry(url) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Frankfurter merespons ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  throw new Error(`Gagal mengambil data dari Frankfurter setelah ${MAX_ATTEMPTS} percobaan: ${lastError.message}`);
}

// Mengambil kurs terbaru (hari kerja bank terakhir) untuk satu base currency terhadap
// beberapa target currency sekaligus. Bentuk respons: { amount, base, date, rates: { AUD: 0.00008, ... } }
export async function fetchLatestRates({ apiBaseUrl, baseCurrency, targetCurrencies }) {
  const url = new URL(`${apiBaseUrl.replace(/\/+$/, '')}/latest`);
  url.searchParams.set('base', baseCurrency);
  url.searchParams.set('symbols', targetCurrencies.join(','));

  return fetchWithRetry(url.toString());
}
