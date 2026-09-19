/**
 * Pemformat kolom nominal: 2000000 → "2.000.000".
 * Fungsi murni (tanpa React) supaya mudah diuji. Nilai yang dikirim ke server
 * tetap angka polos ("2000000"); titik hanya untuk tampilan.
 */

/** Batas panjang digit: tetap aman sebagai bilangan bulat JavaScript dan kolom numeric database. */
export const MAX_MONEY_DIGITS = 13;

export type NormalizedMoney = {
  /** Angka polos untuk dikirim: "2000000", "-500000", "" atau "-" (baru mengetik tanda minus). */
  raw: string;
  /** Tampilan dengan titik ribuan: "2.000.000". */
  display: string;
};

export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Mengambil hanya angka dari teks apa pun (termasuk tempelan "Rp 2.000.000"), lalu merapikannya. */
export function normalizeMoney(input: string, allowNegative = false): NormalizedMoney {
  const negative = allowNegative && input.trim().startsWith("-");

  let digits = input.replace(/\D/g, "");
  digits = digits.replace(/^0+(?=\d)/, ""); // "007" → "7", tapi "0" tetap "0"
  if (digits.length > MAX_MONEY_DIGITS) digits = digits.slice(0, MAX_MONEY_DIGITS);

  if (digits === "") {
    return negative ? { raw: "-", display: "-" } : { raw: "", display: "" };
  }

  const sign = negative && digits !== "0" ? "-" : ""; // "-0" tidak ada
  return { raw: sign + digits, display: sign + groupThousands(digits) };
}

/** Nilai awal dari database (angka atau teks) → angka polos. Pecahan dibuang: rupiah utuh. */
export function toRawMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.trunc(n)) : "";
}

/** Angka polos → tampilan ("2000000" → "2.000.000"). */
export function formatMoneyRaw(raw: string): string {
  return normalizeMoney(raw, true).display;
}

/**
 * Posisi kursor setelah `digitCount` angka pertama di `display`.
 * Dipakai supaya kursor tidak melompat ke ujung saat titik ribuan disisipkan.
 */
export function caretAfterDigits(display: string, digitCount: number): number {
  if (digitCount <= 0) return display.startsWith("-") ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < display.length; i++) {
    if (/\d/.test(display[i])) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return display.length;
}

/** Tempelan berakhiran pecahan ("2.000.000,50") → buang pecahannya. */
export function stripTrailingDecimals(text: string): string {
  return /[.,]\d{1,2}\s*$/.test(text) ? text.replace(/[.,]\d{1,2}\s*$/, "") : text;
}
