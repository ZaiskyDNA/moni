#!/usr/bin/env node
// Backfill histori kurs dari Frankfurter ke tabel EXCHANGE_RATE, dipakai sekali (atau
// sesekali) untuk mengisi data training awal model regresi (FR-06). Cron harian (FR-05)
// tidak terpengaruh skrip ini — lihat backend/src/cron.js.
//
// Pemakaian (dari folder backend/, database harus sudah jalan & migrated):
//   npm run db:backfill-rates
//   npm run db:backfill-rates -- --from=2023-01-01 --to=2024-12-31
//
// Default: 2 tahun terakhir sampai hari ini. IDR hanya tersedia di Frankfurter sejak
// ~1999-01-04 (lihat docs/Exchange_Rate_API_Comparison.md) — rentang lebih jauh dari itu
// akan gagal dengan error dari API.

import { config } from '../src/config.js';
import { prisma } from '../src/prisma.js';
import { runExchangeRateBackfillJob } from '../src/services/exchangeRateJob.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = /^--(from|to)=(.+)$/.exec(arg);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
}

function resolveDateRange(argv) {
  const args = parseArgs(argv);
  const today = new Date();
  const twoYearsAgo = new Date(today);
  twoYearsAgo.setUTCFullYear(today.getUTCFullYear() - 2);

  const startDate = args.from ?? formatDate(twoYearsAgo);
  const endDate = args.to ?? formatDate(today);

  for (const [label, value] of [['--from', startDate], ['--to', endDate]]) {
    if (!DATE_PATTERN.test(value)) {
      throw new Error(`Format tanggal tidak valid untuk ${label}: "${value}" (harus YYYY-MM-DD)`);
    }
  }
  if (startDate > endDate) {
    throw new Error(`--from (${startDate}) tidak boleh setelah --to (${endDate})`);
  }

  return { startDate, endDate };
}

async function main() {
  const { startDate, endDate } = resolveDateRange(process.argv.slice(2));
  console.log(`Backfill kurs ${config.exchangeRate.baseCurrency} -> [${config.exchangeRate.trackedCurrencies.join(', ')}]`);
  console.log(`Rentang tanggal: ${startDate} s.d. ${endDate}`);

  const result = await runExchangeRateBackfillJob({
    prisma,
    config,
    startDate,
    endDate,
    onProgress: ({ savedCount, totalCount }) => console.log(`  tersimpan ${savedCount}/${totalCount} baris...`),
  });

  console.log(`Selesai: ${result.dayCount} hari data, ${result.savedCount} baris tersimpan/diperbarui.`);
}

main()
  .catch((err) => {
    console.error('Backfill gagal:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
