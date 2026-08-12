"use client";

// HİBRİT TARİH ALANI
//
// Hem metin girişiyle (GG.AA.YYYY / GG/AA/YYYY / GGAAYYYY) hem de takvim
// ikonuyla (native picker) tarih girilebilen ortak bileşen.
//
// Native <input type="date"> tek başına kullanılınca, tarih eksikken
// (örn. gün+ay girildi, yıl daha tamamlanmadı) tarayıcı onChange'i BOŞ
// STRING ile tetikliyordu — bu boş değer state'e yazılınca controlled
// input'un tamamı (gün+ay dahil) sıfırlanıyordu. Bu bileşen, görünür metin
// input'unu native date input'tan AYIRARAK bu sorunu çözer: metin alanı
// sadece TAM ve GEÇERLİ bir tarih oluştuğunda parent'a bildirir; gizli
// native input ise yalnızca takvim ikonuyla açılıp seçim yapıldığında
// devreye girer.

import { useEffect, useRef, useState } from "react";

export default function DateInput({
  value,
  onChange,
  disabled = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const dateRef = useRef<HTMLInputElement>(null);

  const isoToDisplay = (iso: string) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
    const [year, month, day] = iso.split("-");
    return `${day}.${month}.${year}`;
  };

  const [text, setText] = useState(isoToDisplay(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  function parseDate(input: string): string | null {
    const cleaned = input.replace(/\D/g, "");
    if (cleaned.length !== 8) return null;

    const day = Number(cleaned.slice(0, 2));
    const month = Number(cleaned.slice(2, 4));
    const year = Number(cleaned.slice(4, 8));

    if (year < 1000 || year > 9999) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return `${year.toString().padStart(4, "0")}-${month
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }

  function formatTyping(input: string): string {
    const digits = input.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatTyping(e.target.value);
    setText(formatted);
    setInvalid(false);

    if (!formatted) {
      onChange("");
      return;
    }

    const iso = parseDate(formatted);
    if (iso) onChange(iso);
  }

  function handleBlur() {
    if (!text) {
      setInvalid(false);
      onChange("");
      return;
    }

    const iso = parseDate(text);
    if (!iso) {
      // Yarım/hatalı tarih yazıldıysa mevcut geçerli tarihi geri göster.
      setInvalid(true);
      setText(isoToDisplay(value));
      return;
    }

    setInvalid(false);
    setText(isoToDisplay(iso));
    onChange(iso);
  }

  function handleCalendarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value;
    if (!iso) {
      setText("");
      onChange("");
      return;
    }
    setInvalid(false);
    setText(isoToDisplay(iso));
    onChange(iso);
  }

  function openCalendar() {
    if (disabled || !dateRef.current) return;
    try {
      if ("showPicker" in HTMLInputElement.prototype) {
        dateRef.current.showPicker();
      } else {
        dateRef.current.click();
      }
    } catch {
      dateRef.current.click();
    }
  }

  return (
    <div className={`relative flex items-center gap-1 ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="GG.AA.YYYY"
        value={text}
        disabled={disabled}
        onChange={handleTextChange}
        onBlur={handleBlur}
        maxLength={10}
        className={
          "border rounded px-2 py-1 text-xs w-[115px] " +
          (invalid ? "border-red-500 bg-red-50" : "border-gray-300") +
          " disabled:bg-gray-50 disabled:text-gray-400"
        }
      />
      <button
        type="button"
        onClick={openCalendar}
        disabled={disabled}
        title="Takvimden tarih seç"
        className="border rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
      >
        📅
      </button>
      <input
        ref={dateRef}
        type="date"
        value={value || ""}
        onChange={handleCalendarChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}
