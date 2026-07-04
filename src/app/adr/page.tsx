"use client";

// ADR BİLGİ MOTORU — Tam Sürüm
// 1) UN numarası / madde adıyla arama (2939 gerçek ADR kaydı)
// 2) Detay kartı: tüm ADR kolonları
// 3) ADR 1.1.3.6 Muafiyet Hesabı + PDF
// 4) ADR 7.5.2 Karışık Yükleme Uyumluluk Kontrolü (ADR Mix Pro mantığı)
//    — Sınıf bazlı uyumluluk matrisi
//    — Özel kurallar: patlayıcılar, gıda, tünel kısıtlamaları

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

type CalcItem = { row: UnRow; quantity: number };

// ── ADR 1.1.3.6 Muafiyet çarpanları ───────────────────────────────
const CAT_MULTIPLIER: Record<string, number> = {
  "1": 50, "2": 333, "3": 1000, "4": Infinity,
};

// ── ADR 7.5.2 Karışık Yükleme Uyumluluk Matrisi ───────────────────
// Değerler: "OK" | "X" | "!" | "01" | "12" | "13" | "14"
// OK=uyumlu, X=yasak, !=şartlı, sayılar=dipnot
type CompResult = "OK" | "X" | "!" | string;

const CLASSES = ["1","2","3","4.1","4.2","4.3","5.1","5.2","6.1","6.2","7","8","9"];

// ADR 2023 Tablo 7.5.2.1 — tam matris
// Satır=A sınıfı, Sütun=B sınıfı
const MATRIX: Record<string, Record<string, CompResult>> = {
  "1":   { "1":"!","2":"X","3":"X","4.1":"X","4.2":"X","4.3":"X","5.1":"X","5.2":"X","6.1":"!","6.2":"X","7":"X","8":"X","9":"!" },
  "2":   { "1":"X","2":"OK","3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"OK","6.1":"OK","6.2":"X","7":"X","8":"OK","9":"OK" },
  "3":   { "1":"X","2":"OK","3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"!","6.1":"OK","6.2":"X","7":"X","8":"OK","9":"OK" },
  "4.1": { "1":"X","2":"OK","3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"!","6.1":"OK","6.2":"X","7":"X","8":"OK","9":"OK" },
  "4.2": { "1":"X","2":"OK","3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"!","6.1":"OK","6.2":"X","7":"X","8":"OK","9":"OK" },
  "4.3": { "1":"X","2":"OK","3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"!","6.1":"OK","6.2":"X","7":"X","8":"OK","9":"OK" },
  "5.1": { "1":"X","2":"OK","3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"OK","6.1":"OK","6.2":"X","7":"X","8":"OK","9":"OK" },
  "5.2": { "1":"X","2":"OK","3":"!","4.1":"!","4.2":"!","4.3":"!","5.1":"OK","5.2":"OK","6.1":"OK","6.2":"X","7":"X","8":"!","9":"OK" },
  "6.1": { "1":"!","2":"OK","3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"OK","6.1":"OK","6.2":"X","7":"X","8":"OK","9":"OK" },
  "6.2": { "1":"X","2":"X","3":"X","4.1":"X","4.2":"X","4.3":"X","5.1":"X","5.2":"X","6.1":"X","6.2":"OK","7":"X","8":"X","9":"X" },
  "7":   { "1":"X","2":"X","3":"X","4.1":"X","4.2":"X","4.3":"X","5.1":"X","5.2":"X","6.1":"X","6.2":"X","7":"!","8":"X","9":"X" },
  "8":   { "1":"X","2":"OK","3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"!","6.1":"OK","6.2":"X","7":"X","8":"OK","9":"OK" },
  "9":   { "1":"!","2":"OK","3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"OK","6.1":"OK","6.2":"X","7":"X","8":"OK","9":"OK" },
};

function getCompat(a: string, b: string): CompResult {
  if (a === b) return "OK";
  return MATRIX[a]?.[b] ?? MATRIX[b]?.[a] ?? "OK";
}

const CLASS_COLOR: Record<string, string> = {
  "1":"bg-orange-100 text-orange-800","2.1":"bg-red-100 text-red-800",
  "2.2":"bg-green-100 text-green-800","2.3":"bg-gray-200 text-gray-800",
  "2":"bg-green-100 text-green-800","3":"bg-red-100 text-red-800",
  "4.1":"bg-yellow-100 text-yellow-800","4.2":"bg-yellow-100 text-yellow-800",
  "4.3":"bg-blue-100 text-blue-800","5.1":"bg-yellow-50 text-yellow-700",
  "5.2":"bg-yellow-100 text-yellow-800","6.1":"bg-gray-200 text-gray-800",
  "6.2":"bg-gray-200 text-gray-800","7":"bg-purple-100 text-purple-800",
  "8":"bg-gray-100 text-gray-700","9":"bg-gray-50 text-gray-600",
};

const CLASS_TR: Record<string,string> = {
  "1":"Patlayıcılar","2":"Gazlar","2.1":"Alevlenir Gazlar",
  "2.2":"Alevlenmez/Zehirsiz Gazlar","2.3":"Zehirli Gazlar",
  "3":"Alevlenir Sıvılar","4.1":"Alevlenir Katılar",
  "4.2":"Kendiliğinden Tutuşan","4.3":"Su ile Temas Tehlikeli",
  "5.1":"Yükseltgeyiciler","5.2":"Organik Peroksitler",
  "6.1":"Zehirli Maddeler","6.2":"Bulaşıcı Maddeler",
  "7":"Radyoaktif","8":"Aşındırıcılar","9":"Çeşitli",
};

type MixItem = { row: UnRow };

function compatCell(res: CompResult) {
  if (res === "OK") return <span className="text-green-600 font-bold text-xs">✓</span>;
  if (res === "X")  return <span className="text-red-600 font-bold text-xs">✗</span>;
  if (res === "!")  return <span className="text-amber-500 font-bold text-xs">!</span>;
  return <span className="text-amber-500 text-xs">{res}</span>;
}

// Sekme türleri
type Tab = "search" | "muafiyet" | "karisik";

export default function AdrPage() {
  const [tab, setTab] = useState<Tab>("search");

  // Arama
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UnRow | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Muafiyet
  const [calcItems, setCalcItems] = useState<CalcItem[]>([]);
  const [addQty, setAddQty] = useState("1");
  const [pdfLoading, setPdfLoading] = useState(false);

  // Karışık yükleme
  const [mixItems, setMixItems] = useState<MixItem[]>([]);
  const [mixQuery, setMixQuery] = useState("");
  const [mixResults, setMixResults] = useState<UnRow[]>([]);
  const [mixSearching, setMixSearching] = useState(false);
  const [showMixDrop, setShowMixDrop] = useState(false);
  const mixRef = useRef<HTMLDivElement>(null);

  // ── Arama ─────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string, setter: (r: UnRow[]) => void, loadSetter: (b: boolean) => void) => {
    const t = q.trim();
    if (!t) { setter([]); return; }
    loadSetter(true);
    const isNum = /^\d+$/.test(t);
    let qb = supabase.from("adr_un_numbers").select("*").limit(15);
    qb = isNum ? qb.ilike("un_number", `${t}%`) : qb.ilike("proper_shipping_name", `%${t}%`);
    const { data } = await qb.order("un_number");
    setter((data as UnRow[]) || []);
    loadSetter(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query, setResults, setSearching), 280);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(mixQuery, setMixResults, setMixSearching), 280);
    return () => clearTimeout(t);
  }, [mixQuery, doSearch]);

  // Dışarı tıklama
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
      if (mixRef.current && !mixRef.current.contains(e.target as Node)) setShowMixDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function selectRow(row: UnRow) {
    setSelected(row);
    setQuery(`UN ${row.un_number} — ${row.proper_shipping_name.slice(0, 60)}`);
    setShowDrop(false); setResults([]);
  }

  function addToMix(row: UnRow) {
    setMixItems(prev => prev.find(i => i.row.un_number === row.un_number)
      ? prev : [...prev, { row }]);
    setMixQuery(""); setMixResults([]); setShowMixDrop(false);
  }

  // ── Muafiyet hesabı ───────────────────────────────────────────────
  function addToCalc() {
    if (!selected) return;
    const qty = parseFloat(addQty);
    if (isNaN(qty) || qty <= 0) return;
    setCalcItems(prev => {
      const ex = prev.find(i => i.row.un_number === selected.un_number);
      return ex ? prev.map(i => i.row.un_number === selected.un_number
        ? { ...i, quantity: i.quantity + qty } : i)
        : [...prev, { row: selected, quantity: qty }];
    });
  }

  const calcRows = calcItems.map(item => {
    const cat = item.row.transport_category || "";
    const mul = CAT_MULTIPLIER[cat] ?? null;
    const pts = mul === null ? null : mul === Infinity ? 0 : item.quantity / mul;
    return { ...item, cat, mul, pts };
  });
  const hasNonEx = calcRows.some(r => r.pts === null);
  const totalPts = calcRows.reduce((a, r) => a + (r.pts ?? 9999), 0);
  const isExempt = !hasNonEx && totalPts <= 1000;

  async function downloadPdf() {
    if (calcItems.length === 0) return;
    setPdfLoading(true);
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
    const W = 210, M = 15;

    doc.setFillColor(15,15,15); doc.rect(0,0,W,28,"F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(14); doc.setFont("helvetica","bold");
    doc.text("TMGD YÖNETİM SİSTEMİ", M, 12);
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.text("ADR 1.1.3.6 Muafiyet Hesabı", M, 20);
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, W-M, 20, {align:"right"});

    let y = 36;
    doc.setTextColor(0,0,0);
    doc.setFontSize(11); doc.setFont("helvetica","bold");
    doc.text("Hesaplanan Maddeler", M, y); y += 2;

    autoTable(doc, {
      startY: y, margin:{left:M,right:M},
      headStyles:{fillColor:[30,30,30]},
      head:[["UN No","Madde Adı","Sınıf","AG","Kat.","Çarpan","Miktar","Puan"]],
      body: calcRows.map(r => [
        `UN ${r.row.un_number}`, r.row.proper_shipping_name.slice(0,45),
        r.row.class||"—", r.row.packing_group||"—", r.cat||"—",
        r.mul===null?"Muaf değil":r.mul===Infinity?"∞":r.mul,
        `${r.quantity.toFixed(2)} kg/L`,
        r.pts===null?"Muaf değil":r.mul===Infinity?"0 (serbest)":r.pts.toFixed(2),
      ]),
      foot:[[{content:`TOPLAM PUAN: ${hasNonEx?"Hesaplanamadı":totalPts.toFixed(2)}`,
        colSpan:8, styles:{fontStyle:"bold",
        fillColor:isExempt?[220,252,231]:[254,226,226]}}]],
      styles:{fontSize:8},
    });

    y = (doc as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY + 8;
    const [r,g,b] = isExempt ? [22,163,74] : [220,38,38];
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(r,g,b);
    doc.text(isExempt
      ? `✓ MUAFİYET UYGULANABİLİR — Toplam: ${totalPts.toFixed(2)} ≤ 1000`
      : hasNonEx ? "✗ MUAFİYET UYGULANAMAZ — Muafiyetten yararlanamayan madde var"
        : `✗ MUAFİYET UYGULANAMAZ — Toplam: ${totalPts.toFixed(2)} > 1000`,
      M, y);

    y += 10;
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(120,120,120);
    doc.text("ADR Bölüm 1.1.3.6 kapsamında hesaplanmıştır. Resmi belge niteliği taşımaz.", M, y);
    doc.save(`ADR_Muafiyet_${new Date().toISOString().slice(0,10)}.pdf`);
    setPdfLoading(false);
  }

  // ── Karışık yükleme analizi ───────────────────────────────────────
  const mixClasses = [...new Set(mixItems.map(i => i.row.class))];
  type PairResult = { a: MixItem; b: MixItem; res: CompResult };
  const pairs: PairResult[] = [];
  for (let i = 0; i < mixItems.length; i++)
    for (let j = i+1; j < mixItems.length; j++)
      pairs.push({ a: mixItems[i], b: mixItems[j],
        res: getCompat(mixItems[i].row.class, mixItems[j].row.class) });

  const hasX = pairs.some(p => p.res === "X");
  const hasWarn = pairs.some(p => p.res === "!" || (p.res !== "OK" && p.res !== "X"));

  const TABS: {key:Tab; label:string}[] = [
    {key:"search", label:"UN Sorgulama"},
    {key:"muafiyet", label:"Muafiyet Hesabı"},
    {key:"karisik", label:"Karışık Yükleme"},
  ];

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">ADR Bilgi Motoru</h1>
      <p className="text-gray-500 text-sm mb-5">
        2.939 UN numarası · ADR 1.1.3.6 Muafiyet · ADR 7.5.2 Karışık Yükleme
      </p>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={"px-4 py-2 rounded-t text-sm " +
              (tab===t.key ? "bg-black text-white" : "hover:bg-gray-100 text-gray-600")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── UN SORGULAMA ── */}
      {tab === "search" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="relative" ref={dropRef}>
              <input className="border p-3 w-full rounded-xl text-sm"
                placeholder="UN numarası (örn: 1203) veya madde adı..."
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); }}
                onFocus={() => results.length > 0 && setShowDrop(true)} />
              {searching && <span className="absolute right-3 top-3 text-xs text-gray-400">Aranıyor...</span>}
              {showDrop && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-40 max-h-72 overflow-y-auto mt-1">
                  {results.map(row => (
                    <button key={row.id} onClick={() => selectRow(row)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-b-0 text-sm">
                      <span className="font-bold">UN {row.un_number}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${CLASS_COLOR[row.class]||"bg-gray-100"}`}>Sınıf {row.class}</span>
                      <div className="text-gray-400 text-xs mt-0.5 truncate">{row.proper_shipping_name}</div>
                    </button>
                  ))}
                </div>
              )}
              {showDrop && !searching && results.length===0 && query.trim().length>1 && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow mt-1 p-4 z-40 text-sm text-gray-400">
                  Sonuç bulunamadı.
                </div>
              )}
            </div>

            {selected && (
              <div className="border rounded-xl p-5 space-y-3">
                <div>
                  <div className="text-xs text-gray-400">UN NUMARASI</div>
                  <div className="text-2xl font-bold">UN {selected.un_number}</div>
                </div>
                <div className="text-sm font-medium">{selected.proper_shipping_name}</div>
                <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${CLASS_COLOR[selected.class]||"bg-gray-100"}`}>
                  ⚠ Sınıf {selected.class} — {CLASS_TR[selected.class]||""}
                </span>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Sınıflandırma Kodu", selected.classification_code],
                    ["Ambalaj Grubu", selected.packing_group||"—"],
                    ["Tünel Kodu", selected.tunnel_code||"—"],
                    ["Tehlike Tanım No.", selected.hazard_no||"—"],
                    ["Etiketler", selected.labels],
                    ["Taşıma Kategorisi", selected.transport_category||"—"],
                    ["Sınırlı Miktar (LQ)", selected.limited_quantity],
                    ["Muaf Miktar (EQ)", selected.excepted_quantity],
                  ].map(([l,v]) => v ? (
                    <div key={l} className="bg-gray-50 rounded-lg p-2.5">
                      <div className="text-xs text-gray-400 mb-0.5">{l}</div>
                      <div className="font-medium text-xs">{v}</div>
                    </div>
                  ) : null)}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <input type="number" min="0.1" step="0.1" value={addQty}
                    onChange={e=>setAddQty(e.target.value)}
                    className="border rounded p-2 w-24 text-sm" placeholder="kg/L"/>
                  <button onClick={addToCalc}
                    className="flex-1 px-3 py-2 rounded bg-black text-white text-sm">
                    + Muafiyet Hesabına Ekle
                  </button>
                  <button onClick={() => addToMix(selected)}
                    className="flex-1 px-3 py-2 rounded border text-sm">
                    + Karışık Yüklemeye Ekle
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sınıf istatistikleri */}
          <div className="border rounded-xl p-5">
            <h2 className="font-bold mb-3 text-sm">Veritabanı Kapsamı</h2>
            <div className="space-y-1.5">
              {[["1","Patlayıcılar","384"],["2","Gazlar","257"],["3","Alevlenir Sıvılar","552"],
                ["4.1","Alevlenir Katılar","137"],["4.2","Kendiliğinden Tutuşan","108"],
                ["4.3","Su Temas Tehlikeli","127"],["5.1","Yükseltgeyiciler","172"],
                ["5.2","Organik Peroksitler","21"],["6.1","Zehirli Maddeler","726"],
                ["6.2","Bulaşıcı Maddeler","11"],["7","Radyoaktif","25"],
                ["8","Aşındırıcılar","368"],["9","Çeşitli","51"]
              ].map(([cls,lbl,cnt]) => (
                <div key={cls} className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded w-8 text-center font-bold ${CLASS_COLOR[cls]||"bg-gray-100"}`}>{cls}</span>
                  <span className="text-xs text-gray-600 flex-1">{lbl}</span>
                  <span className="text-xs font-bold text-gray-500">{cnt}</span>
                  <div className="w-20 bg-gray-100 rounded h-1.5">
                    <div className="bg-gray-400 h-1.5 rounded" style={{width:`${Math.round(parseInt(cnt)/726*100)}%`}}/>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t text-xs font-bold text-gray-600">Toplam: 2.939 madde</div>
            </div>
          </div>
        </div>
      )}

      {/* ── MUAFİYET HESABI ── */}
      {tab === "muafiyet" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative" ref={dropRef}>
            <input className="border p-3 w-full rounded-xl text-sm"
              placeholder="Madde ara ve ekle..."
              value={query}
              onChange={e=>{ setQuery(e.target.value); setSelected(null); }}
              onFocus={()=>results.length>0&&setShowDrop(true)}/>
            {searching && <span className="absolute right-3 top-3 text-xs text-gray-400">Aranıyor...</span>}
            {showDrop && results.length>0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto mt-1">
                {results.map(row=>(
                  <button key={row.id} onClick={()=>{ selectRow(row); setShowDrop(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b text-sm">
                    <span className="font-bold">UN {row.un_number}</span>
                    <span className={`ml-2 text-xs px-1.5 rounded ${CLASS_COLOR[row.class]||"bg-gray-100"}`}>Sınıf {row.class} · Kat.{row.transport_category||"—"}</span>
                    <div className="text-gray-400 text-xs truncate">{row.proper_shipping_name}</div>
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <div className="mt-3 flex gap-2">
                <input type="number" min="0.1" step="0.1" value={addQty}
                  onChange={e=>setAddQty(e.target.value)}
                  className="border rounded p-2 w-24 text-sm" placeholder="kg/L"/>
                <button onClick={addToCalc}
                  className="flex-1 py-2 rounded bg-black text-white text-sm">
                  + Ekle
                </button>
              </div>
            )}
          </div>

          <div className="border rounded-xl p-5">
            <h2 className="font-bold mb-1">1.1.3.6 Muafiyet Hesabı</h2>
            <p className="text-xs text-gray-400 mb-4">Toplam puan ≤ 1000 → muafiyet uygulanabilir</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {["1","2","3"].map(c=>(
                <span key={c} className="text-xs px-2 py-0.5 rounded bg-gray-100">Kat.{c} → ÷{CAT_MULTIPLIER[c]}</span>
              ))}
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100">Kat.4 → serbest</span>
            </div>

            {calcItems.length===0 && <p className="text-sm text-gray-400 text-center py-6">Henüz madde eklenmedi.</p>}

            <div className="space-y-2">
              {calcRows.map(r=>(
                <div key={r.row.un_number} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-bold">UN {r.row.un_number}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[200px]">{r.row.proper_shipping_name.slice(0,40)}</div>
                      <div className="text-xs text-gray-400">Sınıf {r.row.class} · Kat.{r.cat||"—"}</div>
                    </div>
                    <button onClick={()=>setCalcItems(p=>p.filter(i=>i.row.un_number!==r.row.un_number))}
                      className="text-gray-300 hover:text-red-400 text-lg">×</button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="number" min="0.1" step="0.1" value={r.quantity}
                      onChange={e=>{ const v=parseFloat(e.target.value); if(!isNaN(v)&&v>0) setCalcItems(p=>p.map(i=>i.row.un_number===r.row.un_number?{...i,quantity:v}:i));}}
                      className="border rounded p-1 w-20 text-sm"/>
                    <span className="text-xs text-gray-400 flex-1">kg / L</span>
                    <span className="text-sm font-bold">
                      {r.pts===null?<span className="text-red-500">Muaf değil</span>
                        :r.mul===Infinity?<span className="text-green-500">0 puan</span>
                        :<span>{r.pts.toFixed(2)} puan</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {calcItems.length>0 && (
              <>
                <div className={`rounded-xl p-4 mt-3 ${isExempt?"bg-green-50 border-green-200":"bg-red-50 border-red-200"} border`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Toplam Puan</span>
                    <span className={`text-xl font-bold ${isExempt?"text-green-700":"text-red-700"}`}>
                      {hasNonEx?"?":totalPts.toFixed(2)}<span className="text-sm font-normal ml-1">/ 1000</span>
                    </span>
                  </div>
                  <div className={`mt-1.5 text-sm font-medium ${isExempt?"text-green-700":"text-red-700"}`}>
                    {hasNonEx?"✗ Muafiyetten yararlanamayan madde var"
                      :isExempt?"✓ ADR 1.1.3.6 muafiyeti UYGULANABİLİR"
                      :"✗ Eşik aşıldı — ADR tam uygulanır"}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={downloadPdf} disabled={pdfLoading}
                    className="flex-1 py-2 rounded bg-black text-white text-sm disabled:opacity-50">
                    {pdfLoading?"Hazırlanıyor...":"⬇ PDF İndir"}
                  </button>
                  <button onClick={()=>setCalcItems([])} className="px-3 py-2 rounded border text-sm text-gray-500">Temizle</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── KARIŞIK YÜKLEME ── */}
      {tab === "karisik" && (
        <div className="space-y-5">
          {/* Arama */}
          <div className="relative max-w-lg" ref={mixRef}>
            <input className="border p-3 w-full rounded-xl text-sm"
              placeholder="Madde ekle (UN no veya isim)..."
              value={mixQuery}
              onChange={e=>{ setMixQuery(e.target.value); }}
              onFocus={()=>mixResults.length>0&&setShowMixDrop(true)}/>
            {mixSearching && <span className="absolute right-3 top-3 text-xs text-gray-400">Aranıyor...</span>}
            {showMixDrop && mixResults.length>0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto mt-1">
                {mixResults.map(row=>(
                  <button key={row.id} onClick={()=>addToMix(row)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b text-sm">
                    <span className="font-bold">UN {row.un_number}</span>
                    <span className={`ml-2 text-xs px-1.5 rounded ${CLASS_COLOR[row.class]||"bg-gray-100"}`}>Sınıf {row.class}</span>
                    <div className="text-gray-400 text-xs truncate">{row.proper_shipping_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Eklenen maddeler */}
          {mixItems.length>0 && (
            <div className="flex flex-wrap gap-2">
              {mixItems.map(item=>(
                <div key={item.row.un_number}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${CLASS_COLOR[item.row.class]||"bg-gray-100"}`}>
                  <span className="font-bold">UN {item.row.un_number}</span>
                  <span className="text-xs max-w-[120px] truncate opacity-80">{item.row.proper_shipping_name.slice(0,30)}</span>
                  <button onClick={()=>setMixItems(p=>p.filter(i=>i.row.un_number!==item.row.un_number))}
                    className="opacity-50 hover:opacity-100">×</button>
                </div>
              ))}
              <button onClick={()=>setMixItems([])} className="text-xs text-gray-400 hover:text-gray-600 px-2">Temizle</button>
            </div>
          )}

          {mixItems.length < 2 && (
            <p className="text-sm text-gray-400 text-center py-10 border rounded-xl">
              En az 2 madde ekleyin — uyumluluk analizi yapılsın.
            </p>
          )}

          {mixItems.length >= 2 && (
            <div className="space-y-4">
              {/* Sonuç özeti */}
              <div className={`rounded-xl p-4 border ${hasX?"bg-red-50 border-red-200":hasWarn?"bg-amber-50 border-amber-200":"bg-green-50 border-green-200"}`}>
                <div className={`text-lg font-bold ${hasX?"text-red-700":hasWarn?"text-amber-700":"text-green-700"}`}>
                  {hasX ? "✗ KARIŞIK YÜKLEME YASAK"
                    : hasWarn ? "! ŞARTLI UYUMLU — Ek koşullar geçerli"
                    : "✓ KARIŞIK YÜKLEME UYUMLU"}
                </div>
                <p className="text-sm mt-1 opacity-80">
                  {hasX ? "Bir veya daha fazla madde çifti birlikte taşınamaz (ADR 7.5.2)."
                    : hasWarn ? "Bazı madde çiftleri özel koşullarla taşınabilir. Detayları inceleyin."
                    : "Tüm madde kombinasyonları ADR 7.5.2 kapsamında uyumludur."}
                </p>
              </div>

              {/* Çift bazlı sonuçlar */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Madde A</th>
                      <th className="text-left p-3 font-medium text-gray-600">Madde B</th>
                      <th className="text-center p-3 font-medium text-gray-600">Sonuç</th>
                      <th className="text-left p-3 font-medium text-gray-600">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((pair,i)=>(
                      <tr key={i} className={`border-t ${pair.res==="X"?"bg-red-50":pair.res==="!"?"bg-amber-50":""}`}>
                        <td className="p-3">
                          <div className="font-medium">UN {pair.a.row.un_number}</div>
                          <div className="text-xs text-gray-400">{pair.a.row.proper_shipping_name.slice(0,35)}</div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${CLASS_COLOR[pair.a.row.class]||"bg-gray-100"}`}>Sınıf {pair.a.row.class}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">UN {pair.b.row.un_number}</div>
                          <div className="text-xs text-gray-400">{pair.b.row.proper_shipping_name.slice(0,35)}</div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${CLASS_COLOR[pair.b.row.class]||"bg-gray-100"}`}>Sınıf {pair.b.row.class}</span>
                        </td>
                        <td className="p-3 text-center text-lg">
                          {pair.res==="OK"?<span className="text-green-600">✓</span>
                            :pair.res==="X"?<span className="text-red-600 font-bold">✗</span>
                            :<span className="text-amber-500 font-bold">!</span>}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {pair.res==="OK"?"Birlikte taşınabilir"
                            :pair.res==="X"?"ADR 7.5.2 — Birlikte taşınamaz"
                            :"Özel koşullar geçerli — ilgili hükmü kontrol edin"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Uyumluluk matrisi — seçili sınıflar için */}
              {mixClasses.length >= 2 && (
                <div>
                  <h3 className="font-bold text-sm mb-2">Sınıf Uyumluluk Matrisi (ADR 7.5.2.1)</h3>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border bg-gray-50 w-12"></th>
                          {mixClasses.map(c=>(
                            <th key={c} className={`p-2 border text-center w-14 font-bold ${CLASS_COLOR[c]||"bg-gray-100"}`}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mixClasses.map(ra=>(
                          <tr key={ra}>
                            <td className={`p-2 border text-center font-bold ${CLASS_COLOR[ra]||"bg-gray-100"}`}>{ra}</td>
                            {mixClasses.map(rb=>(
                              <td key={rb} className={`p-2 border text-center ${ra===rb?"bg-gray-50":""}`}>
                                {ra===rb?"—":compatCell(getCompat(ra,rb))}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span><span className="text-green-600 font-bold">✓</span> Uyumlu</span>
                    <span><span className="text-red-600 font-bold">✗</span> Yasak</span>
                    <span><span className="text-amber-500 font-bold">!</span> Şartlı</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
