import { fetchHistoricalRates, fetchLatestRates } from './frankfurter.js';

// Upsert idempotent lewat constraint unik (base_currency, target_currency, date) —
// aman dipanggil berkali-kali untuk tanggal yang sama (retry manual, backfill ulang, dst).
function upsertRate(prisma, { baseCurrency, targetCurrency, date, rate, source }) {
  return prisma.exchangeRate.upsert({
    where: { baseCurrency_targetCurrency_date: { baseCurrency, targetCurrency, date } },
    create: { baseCurrency, targetCurrency, rate, date, source },
    update: { rate, source },
  });
}

// FR-05: tarik kurs terbaru dan simpan ke tabel EXCHANGE_RATE.
export async function runExchangeRateFetchJob({ prisma, config }) {
  const { apiBaseUrl, baseCurrency, trackedCurrencies, source } = config.exchangeRate;

  const { date, rates } = await fetchLatestRates({ apiBaseUrl, baseCurrency, targetCurrencies: trackedCurrencies });
  const rateDate = new Date(date);

  const saved = await prisma.$transaction(
    Object.entries(rates).map(([targetCurrency, rate]) =>
      upsertRate(prisma, { baseCurrency, targetCurrency, date: rateDate, rate, source }),
    ),
  );

  return { date, baseCurrency, source, savedCount: saved.length };
}

const BACKFILL_CHUNK_SIZE = 200;

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Backfill histori kurs (bukan cron harian) — dipakai sekali untuk mengisi data training
// awal model regresi (FR-06), lihat backend/scripts/backfillExchangeRates.js.
// Dijalankan per chunk (bukan satu transaksi raksasa) supaya tidak menahan koneksi
// terlalu lama untuk rentang tanggal yang panjang.
export async function runExchangeRateBackfillJob({ prisma, config, startDate, endDate, onProgress }) {
  const { apiBaseUrl, baseCurrency, trackedCurrencies, source } = config.exchangeRate;

  const { rates } = await fetchHistoricalRates({
    apiBaseUrl,
    baseCurrency,
    targetCurrencies: trackedCurrencies,
    startDate,
    endDate,
  });

  const rows = Object.entries(rates).flatMap(([date, ratesForDate]) =>
    Object.entries(ratesForDate).map(([targetCurrency, rate]) => ({
      baseCurrency,
      targetCurrency,
      date: new Date(date),
      rate,
      source,
    })),
  );

  let savedCount = 0;
  for (const batch of chunk(rows, BACKFILL_CHUNK_SIZE)) {
    await prisma.$transaction(batch.map((row) => upsertRate(prisma, row)));
    savedCount += batch.length;
    onProgress?.({ savedCount, totalCount: rows.length });
  }

  return { startDate, endDate, baseCurrency, source, dayCount: Object.keys(rates).length, savedCount };
}
