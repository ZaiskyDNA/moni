import { fetchLatestRates } from './frankfurter.js';

// FR-05: tarik kurs terbaru dan simpan ke tabel EXCHANGE_RATE. Idempotent lewat upsert
// pada constraint unik (base_currency, target_currency, date), supaya aman dipanggil
// berkali-kali untuk tanggal yang sama (retry manual, atau trigger ganda dari scheduler).
export async function runExchangeRateFetchJob({ prisma, config }) {
  const { apiBaseUrl, baseCurrency, trackedCurrencies, source } = config.exchangeRate;

  const { date, rates } = await fetchLatestRates({ apiBaseUrl, baseCurrency, targetCurrencies: trackedCurrencies });
  const rateDate = new Date(date);

  const saved = await prisma.$transaction(
    Object.entries(rates).map(([targetCurrency, rate]) =>
      prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency_date: { baseCurrency, targetCurrency, date: rateDate },
        },
        create: { baseCurrency, targetCurrency, rate, date: rateDate, source },
        update: { rate, source },
      }),
    ),
  );

  return { date, baseCurrency, source, savedCount: saved.length };
}
