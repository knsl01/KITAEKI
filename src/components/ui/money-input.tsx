"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { useIsoLayoutEffect } from "@/hooks/use-element-size";
import { caretAfterDigits, formatMoneyRaw, normalizeMoney, stripTrailingDecimals, toRawMoney } from "@/lib/money-input";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  id?: string;
  /** Kalau diisi, angka polos dikirim lewat input tersembunyi bernama ini (server tidak berubah). */
  name?: string;
  /** Mode terkendali: angka polos ("2000000"). */
  value?: string;
  /** Mode tak terkendali: nilai awal dari database. */
  defaultValue?: string | number | null;
  onValueChange?: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Nilai terkecil yang boleh (mis. 1). Dicek browser saat form dikirim. */
  min?: number;
  /** Izinkan tanda minus (saldo awal, penarikan dana). */
  allowNegative?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Kolom nominal rupiah: mengetik 2000000 langsung tampil "2.000.000" dengan awalan "Rp".
 * Yang terkirim ke server tetap angka polos, jadi validasi dan penyimpanan tidak berubah.
 */
export function MoneyInput({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  required,
  autoFocus,
  disabled,
  min,
  allowNegative = false,
  className,
  "aria-label": ariaLabel,
}: MoneyInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const caretRef = React.useRef<number | null>(null);
  const initialRef = React.useRef(normalizeMoney(value ?? toRawMoney(defaultValue), allowNegative).raw);
  const [inner, setRaw] = React.useState(initialRef.current);
  // Yang terakhir kita laporkan ke induk. Tanda minus yang baru diketik dilaporkan "" ke induk,
  // jadi hanya perubahan yang BUKAN dari kita ini (mis. dikosongkan setelah tersimpan) yang diikuti.
  const lastSent = React.useRef(initialRef.current === "-" ? "" : initialRef.current);
  const changedFromOutside = value !== undefined && value !== lastSent.current;
  const raw = changedFromOutside ? normalizeMoney(value, allowNegative).raw : inner;

  React.useEffect(() => {
    if (value !== undefined && value !== lastSent.current) {
      lastSent.current = value;
      setRaw(normalizeMoney(value, allowNegative).raw);
    }
  }, [value, allowNegative]);

  // form.reset() milik halaman ikut mengosongkan kolom ini
  React.useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      lastSent.current = initialRef.current === "-" ? "" : initialRef.current;
      setRaw(initialRef.current);
      onValueChange?.(lastSent.current);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [onValueChange]);

  const validate = React.useCallback(
    (el: HTMLInputElement, current: string) => {
      const tooSmall = min !== undefined && current !== "" && current !== "-" && Number(current) < min;
      el.setCustomValidity(tooSmall ? `Nominal minimal ${formatMoneyRaw(String(min))}` : "");
    },
    [min]
  );

  useIsoLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    validate(el, raw);
    if (caretRef.current !== null && document.activeElement === el) {
      el.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  });

  function apply(text: string, digitsBeforeCaret: number) {
    const next = normalizeMoney(text, allowNegative);
    caretRef.current = caretAfterDigits(next.display, digitsBeforeCaret);
    lastSent.current = next.raw === "-" ? "" : next.raw;
    setRaw(next.raw);
    onValueChange?.(lastSent.current);
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const el = event.currentTarget;
    const caret = el.selectionStart ?? el.value.length;
    apply(el.value, el.value.slice(0, caret).replace(/\D/g, "").length);
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    const cleaned = stripTrailingDecimals(text);
    if (cleaned === text) return; // tempelan biasa: biarkan onChange yang menangani

    event.preventDefault();
    const el = event.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start) + cleaned;
    apply(before + el.value.slice(end), before.replace(/\D/g, "").length);
  }

  const sent = raw === "-" ? "" : raw;

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground"
      >
        Rp
      </span>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={allowNegative ? "text" : "numeric"}
        autoComplete="off"
        value={formatMoneyRaw(raw)}
        onChange={onChange}
        onPaste={onPaste}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn("tabular pl-10 font-semibold", className)}
      />
      {name ? <input type="hidden" name={name} value={sent} /> : null}
    </div>
  );
}
