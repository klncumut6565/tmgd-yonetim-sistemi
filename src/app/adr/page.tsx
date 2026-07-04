"use client";

// ADR BİLGİ MOTORU
// Özellikler:
//  1) UN numarası veya madde adıyla anlık arama
//  2) Detay kartı: sınıf, ambalaj grubu, tünel kodu, tehlike no,
//     etiketler, sınırlı miktar, muaf miktar
//  3) ADR 1.1.3.6 Muafiyet Hesabı:
//     - Birden fazla madde eklenebilir
//     - Her madde için miktar girilir
//     - Toplam puan ≤ 1000 ise muafiyet uygulanır
//  4) Hesap sonucu rapor PDF olarak indirilebilir

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type UnRow = {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  class: string;
  classification_code: string | null;
  packing_group: string | null;
  tunnel_code: string | null;
  hazard_no: string | null;
  labels: string | null;
  transport_category: string | null;
  limited_quantity: string | null;
  excepted_quantity: string | null;
};

type CalcItem = {
  row: UnRow;
  quantity: number; // kg veya L
};

// ADR 1.1.3.6: kategori → çarpan
const CATEGORY_MULTIPLIER: Record<string, number> = {
  "1": 50,
  "2": 333,
  "3": 1000,
  "4": Infinity, // her miktarda muaf
};

const CLASS_COLOR: Record<string, string> = {
  "1": "bg-orange-100 text-orange-800 border-orange-200",
  "2.1": "bg-red-100 text-red-800 border-red-200",
  "2.2": "bg-green-100 text-green-800 border-green-200",
  "2.3": "bg-gray-200 text-gray-800 border-gray-300",
  "3": "bg-red-100 text-red-800 border-red-200",
  "4.1": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "4.2": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "4.3": "bg-blue-100 text-blue-800 border-blue-200",
  "5.1": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "5.2": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "6.1": "bg-gray-200 text-gray-800 border-gray-300",
  "6.2": "bg-gray-200 text-gray-800 border-gray-300",
  "7": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "8": "bg-gray-100 text-gray-800 border-gray-300",
  "9": "bg-gray-100 text-gray-800 border-gray-300",
};

const CLASS_LABELS: Record<string, string> = {
  "1": "Patlayıcılar",
  "2.1": "Alevlenir Gazlar",
  "2.2": "Alevlenmez Zehirsiz Gazlar",
  "2.3": "Zehirli Gazlar",
  "3": "Alevlenir Sıvılar",
  "4.1": "Alevlenir Katılar",
  "4.2": "Kendiliğinden Tutuşan",
  "4.3": "Su ile Temas Tehlikeli",
  "5.1": "Yükseltgeyiciler",
  "5.2": "Organik Peroksitler",
  "6.1": "Zehirli Maddeler",
  "6.2": "Bulaşıcı Maddeler",
  "7": "Radyoaktif",
  "8": "Aşındırıcılar",
  "9": "Çeşitli Tehlikeli Maddeler",
};

function classBadge(cls: string) {
  const colorClass = CLASS_COLOR[cls] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full border ${colorClass}`}>
      <span className="text-base">⚠</span> Sınıf {cls}
      <span className="font-normal text-xs">— {CLASS_LABELS[cls] || "Tehlikeli Madde"}</span>
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

export default function AdrPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UnRow | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Muafiyet hesabı
  const [calcItems, setCalcItems] = useState<CalcItem[]>([]);
  const [addQty, setAddQty] = useState("1");
  const [pdfLoading, setPdfLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); return; }
    setSearching(true);

    // UN numarası veya isim araması
    const isNum = /^\d+$/.test(trimmed);
    let qb = supabase.from("adr_un_numbers").select("*").limit(12);

    if (isNum) {
      qb = qb.ilike("un_number", `${trimmed}%`);
    } else {
      qb = qb.ilike("proper_shipping_name", `%${trimmed}%`);
    }

    const { data } = await qb.order("un_number");
    setResults((data as UnRow[]) || []);
    setSearching(false);
    setShowDropdown(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 280);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectRow(row: UnRow) {
    setSelected(row);
    setQuery(`UN ${row.un_number} — ${row.proper_shipping_name}`);
    setShowDropdown(false);
    setResults([]);
  }

  function addToCalc() {
    if (!selected) return;
    const qty = parseFloat(addQty);
    if (isNaN(qty) || qty <= 0) return;
    setCalcItems((prev) => {
      const exists = prev.find((i) => i.row.un_number === selected.un_number);
      if (exists) {
        return prev.map((i) =>
          i.row.un_number === selected.un_number
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prev, { row: selected, quantity: qty }];
    });
  }

  function removeCalcItem(un: string) {
    setCalcItems((prev) => prev.filter((i) => i.row.un_number !== un));
  }

  function updateQty(un: string, val: string) {
    const qty = parseFloat(val);
    if (isNaN(qty) || qty <= 0) return;
    setCalcItems((prev) =>
      prev.map((i) => (i.row.un_number === un ? { ...i, quantity: qty } : i))
    );
  }

  // Muafiyet hesabı: puan = miktar / (kategori çarpanı)
  // Toplam ≤ 1000 → muafiyet uygulanır
  const calcRows = calcItems.map((item) => {
    const cat = item.row.transport_category || "";
    const multiplier = CATEGORY_MULTIPLIER[cat] ?? null;
    const points =
      multiplier === null
        ? null
        : multiplier === Infinity
          ? 0
          : item.quantity / multiplier;
    return { ...item, cat, multiplier, points };
  });

  const totalPoints = calcRows.reduce((acc, r) => {
    if (r.points === null) return acc + 9999; // muafiyetsiz madde varsa geç
    return acc + r.points;
  }, 0);

  const hasNonExemptable = calcRows.some((r) => r.points === null);
  const isExempt = !hasNonExemptable && totalPoints <= 1000;

  async function downloadPdf() {
    if (calcItems.length === 0) return;
    setPdfLoading(true);
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const W = 210, M = 15;

    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, W, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("TMGD YÖNETİM SİSTEMİ", M, 12);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("ADR 1.1.3.6 Muafiyet Hesabı", M, 20);
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, W - M, 20, { align: "right" });

    let y = 36;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Hesaplanan Maddeler", M, y); y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      headStyles: { fillColor: [30, 30, 30] },
      head: [["UN No", "Madde Adı", "Sınıf", "AG", "Kat.", "Çarpan", "Miktar (kg/L)", "Puan"]],
      body: calcRows.map((r) => [
        `UN ${r.row.un_number}`,
        r.row.proper_shipping_name,
        r.row.class || "—",
        r.row.packing_group || "—",
        r.cat || "—",
        r.multiplier === null ? "Muaf değil" : r.multiplier === Infinity ? "∞ (serbest)" : r.multiplier,
        r.quantity.toFixed(2),
        r.points === null ? "Muaf değil" : r.multiplier === Infinity ? "0 (serbest)" : r.points.toFixed(2),
      ]),
      styles: { fontSize: 8 },
      foot: [[
        { content: `TOPLAM PUAN: ${hasNonExemptable ? "Hesaplanamadı" : totalPoints.toFixed(2)}`, colSpan: 8, styles: { fontStyle: "bold", fillColor: isExempt ? [220, 252, 231] : [254, 226, 226] } }
      ]],
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    const resultColor = isExempt ? [22, 163, 74] : [220, 38, 38];
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.setTextColor(resultColor[0], resultColor[1], resultColor[2]);
    doc.text(
      isExempt
        ? `✓ MUAFİYET UYGULANABİLİR — Toplam Puan: ${totalPoints.toFixed(2)} ≤ 1000`
        : hasNonExemptable
          ? "✗ MUAFİYET UYGULANAMAZ — Muafiyetten yararlanamayan madde içeriyor"
          : `✗ MUAFİYET UYGULANAMAZ — Toplam Puan: ${totalPoints.toFixed(2)} > 1000`,
      M, y
    );

    y += 10;
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text("ADR Bölüm 1.1.3.6 kapsamında hesaplanmıştır. Bu hesap resmi belge niteliği taşımaz.", M, y);
    doc.text("Taşıma öncesinde yetkili TMGD danışmanı kontrolü önerilir.", M, y + 5);

    doc.save(`ADR_Muafiyet_Hesabi_${new Date().toISOString().slice(0, 10)}.pdf`);
    setPdfLoading(false);
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">ADR Bilgi Motoru</h1>
      <p className="text-gray-500 text-sm mb-8">
        UN numarası veya madde adıyla sorgulayın — ADR 1.1.3.6 muafiyet hesabı yapın.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOL KOLON — Arama + Detay */}
        <div className="space-y-4">
          {/* Arama kutusu */}
          <div className="relative" ref={dropRef}>
            <input
              className="border p-3 w-full rounded-xl text-sm"
              placeholder="UN numarası (örn: 1203) veya madde adı (örn: benzen)..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
            />
            {searching && (
              <span className="absolute right-3 top-3 text-xs text-gray-400">Aranıyor...</span>
            )}

            {showDropdown && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-40 max-h-72 overflow-y-auto mt-1">
                {results.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => selectRow(row)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                  >
                    <span className="font-bold text-gray-800">UN {row.un_number}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded border ${CLASS_COLOR[row.class] || "bg-gray-100"}`}>
                      Sınıf {row.class}
                    </span>
                    <div className="text-gray-500 text-xs mt-0.5 truncate">{row.proper_shipping_name}</div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && !searching && results.length === 0 && query.trim().length > 1 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-40 p-4 mt-1 text-sm text-gray-500">
                Sonuç bulunamadı. Farklı bir arama terimi deneyin.
              </div>
            )}
          </div>

          {/* Seçili madde detayı */}
          {selected && (
            <div className="border rounded-xl p-5 space-y-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">UN NUMARASI</div>
                <div className="text-2xl font-bold">UN {selected.un_number}</div>
              </div>

              <div className="text-sm font-medium leading-snug">
                {selected.proper_shipping_name}
              </div>

              {classBadge(selected.class)}

              <div className="grid grid-cols-2 gap-2">
                <Field label="Sınıflandırma Kodu" value={selected.classification_code} />
                <Field label="Ambalaj Grubu (AG)" value={selected.packing_group || "—"} />
                <Field label="Tünel Kodu" value={selected.tunnel_code || "—"} />
                <Field label="Tehlike Tanım No." value={selected.hazard_no || "—"} />
                <Field label="Etiketler" value={selected.labels} />
                <Field label="Taşıma Kategorisi" value={selected.transport_category || "Muaf değil"} />
                <Field label="Sınırlı Miktar (LQ)" value={selected.limited_quantity} />
                <Field label="Muaf Miktar (EQ)" value={selected.excepted_quantity} />
              </div>

              {/* Muafiyet hesabına ekle */}
              <div className="flex gap-2 pt-2 border-t">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="border rounded p-2 w-24 text-sm"
                  placeholder="kg/L"
                />
                <button
                  onClick={addToCalc}
                  className="flex-1 px-3 py-2 rounded bg-black text-white text-sm"
                >
                  + Muafiyet Hesabına Ekle
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SAĞ KOLON — Muafiyet Hesabı */}
        <div>
          <div className="border rounded-xl p-5">
            <h2 className="font-bold mb-1">ADR 1.1.3.6 Muafiyet Hesabı</h2>
            <p className="text-xs text-gray-400 mb-4">
              Toplam puan = Σ (miktar / kategori çarpanı). Toplam ≤ 1000 ise muafiyet uygulanabilir.
            </p>

            {calcItems.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                Sol taraftan madde seçip "Ekle" butonuna basın.
              </p>
            )}

            {calcItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {/* Kategori çarpan rehberi */}
                <div className="flex gap-2 flex-wrap mb-3 text-xs">
                  {["1","2","3","4"].map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      Kat.{c}: ÷{c === "4" ? "∞" : CATEGORY_MULTIPLIER[c]}
                    </span>
                  ))}
                </div>

                {calcRows.map((r) => (
                  <div key={r.row.un_number} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold">UN {r.row.un_number}</div>
                        <div className="text-xs text-gray-500 truncate">{r.row.proper_shipping_name}</div>
                        <div className="text-xs text-gray-400">
                          Sınıf {r.row.class} · Kat.{r.cat || "—"}
                          {r.multiplier !== null && r.multiplier !== Infinity && (
                            <> · Çarpan: {r.multiplier}</>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeCalcItem(r.row.un_number)}
                        className="text-gray-300 hover:text-red-500 text-lg leading-none mt-0.5"
                      >
                        ×
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={r.quantity}
                        onChange={(e) => updateQty(r.row.un_number, e.target.value)}
                        className="border rounded p-1 w-24 text-sm"
                      />
                      <span className="text-xs text-gray-400">kg veya L</span>
                      <span className="ml-auto text-sm font-bold">
                        {r.points === null ? (
                          <span className="text-red-600">Muaf değil</span>
                        ) : r.multiplier === Infinity ? (
                          <span className="text-green-600">0 puan (serbest)</span>
                        ) : (
                          <span>{r.points.toFixed(2)} puan</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Sonuç */}
                <div className={`rounded-xl p-4 mt-2 ${isExempt ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Toplam Puan</span>
                    <span className={`text-xl font-bold ${isExempt ? "text-green-700" : "text-red-700"}`}>
                      {hasNonExemptable ? "?" : totalPoints.toFixed(2)}
                      <span className="text-sm font-normal ml-1">/ 1000</span>
                    </span>
                  </div>
                  <div className={`mt-2 text-sm font-medium ${isExempt ? "text-green-700" : "text-red-700"}`}>
                    {hasNonExemptable
                      ? "✗ Muafiyetten yararlanamayan madde içeriyor"
                      : isExempt
                        ? "✓ ADR 1.1.3.6 muafiyeti UYGULANABİLİR"
                        : "✗ Muafiyet eşiği aşıldı — ADR gereklilikleri tam uygulanır"}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={downloadPdf}
                    disabled={pdfLoading}
                    className="flex-1 py-2 rounded bg-black text-white text-sm disabled:opacity-50"
                  >
                    {pdfLoading ? "Hazırlanıyor..." : "⬇ PDF Raporu İndir"}
                  </button>
                  <button
                    onClick={() => setCalcItems([])}
                    className="px-3 py-2 rounded border text-sm text-gray-500 hover:bg-gray-50"
                  >
                    Temizle
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
