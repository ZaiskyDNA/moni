// Satu-satunya sumber daftar mata uang tujuan yang didukung MONI (ISO-4217).
// Dipakai untuk validasi GOAL.targetCurrency (FR-02) dan sebagai default mata uang
// yang ditarik cron kurs (FR-05), supaya setiap goal pasti punya data kurs.
// Semua kode di sini harus tersedia di provider kurs (Frankfurter) dengan basis IDR.
export const SUPPORTED_CURRENCIES = ['USD', 'AUD', 'EUR', 'GBP', 'JPY', 'SGD'];
