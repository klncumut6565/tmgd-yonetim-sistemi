"use client";

// ADR BİLGİ MOTORU — ADR Mix Checker Pro'dan türetilmiş tam sürüm
// Kaynak: ADR Mix Checker Pro v2.4.1 (Umut Kılınç)
//
// Motorun 3 sekmesi:
//   1) UN Sorgulama   — 2939 gerçek ADR kaydı
//   2) Muafiyet       — ADR 1.1.3.6 çarpan hesabı + PDF
//   3) Karışık Yükleme — ADR Mix Pro'nun tam mantığı:
//      • ADR 7.5.2.1 etiket bazlı segregasyon matrisi
//      • Sınıf 1 ↔ Sınıf 1: ADR 7.5.2.2 uyumluluk grubu tablosu (A-S)
//      • Sınıf 1 ↔ diğer: 7.5.2.1 dipnotları a/b/c/d
//      • Gıda ayrımı: CV28 / ADR 7.5.4
//      • Tünel kodu bilgilendirmesi: ADR 8.6
//      • Risk puanı: FORBIDDEN=100, EXPLOSIVE_SPECIAL=85, UNKNOWN=60, FOOD=40, OK=0

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// ── Tipler ────────────────────────────────────────────────────────────────
type UnRow = {
  id: string; un_number: string; proper_shipping_name: string;
  class: string; classification_code: string | null;
  packing_group: string | null; tunnel_code: string | null;
  hazard_no: string | null; labels: string | null;
  transport_category: string | null;
  limited_quantity: string | null; excepted_quantity: string | null;
};
type CalcItem = { row: UnRow; quantity: number };
type MixItem  = { row: UnRow };

// ── ADR 1.1.3.6 Muafiyet çarpanları ──────────────────────────────────────
const CAT_MUL: Record<string, number> = { "1":50, "2":333, "3":1000, "4":Infinity };

// ── Etiket yardımcıları (utils.py'den) ───────────────────────────────────
// Etiket normalizasyonu: alt sınıf etiketleri ana sınıfa indirgenir
// "2.1" → "2", "2.2" → "2", "2.3" → "2" (ADR 7.5.2.1'de Sınıf 2 tek satır)
// "7A","7B","7C","7D","7E" → "7" (muaf paket → Sınıf 7)
// Uyumluluk grubu HARFLERİ (1.4S, 1.1D) olduğu gibi kalır — bunlar Sınıf 1 içindir
function normalizeLabel(s: string): string {
  if (!s) return "";
  let n = s.replace(",", ".").replace(/\s/g, "").toUpperCase();
  // Sınıf 2 alt etiketleri → "2"
  if (n === "2.1" || n === "2.2" || n === "2.3") return "2";
  // Sınıf 7 alt etiketleri (7A, 7B, 7C, 7D, 7E) → "7"
  if (/^7[A-E]$/.test(n)) return "7";
  return n;
}

function splitLabels(cell: string | null): string[] {
  if (!cell) return [];
  const parts = cell.replace(/\n/g, "+").replace(/\//g, "+").split("+");
  return [...new Set(parts.map(normalizeLabel).filter(Boolean))];
}

function compatGroup(row: UnRow): string | null {
  // sınıflandırma kodundaki son harf = uyumluluk grubu (örn. "1.4S" → "S")
  const candidates = [
    ...(row.labels ? splitLabels(row.labels) : []),
    row.classification_code || "",
  ];
  for (const c of candidates) {
    const m = c.match(/^1\.[1-6]([A-Z])$/);
    if (m) return m[1];
  }
  return null;
}

function isClass1Label(lbl: string): boolean {
  if (lbl === "1") return true;
  return ["1.1","1.2","1.3","1.4","1.5","1.6"].some(p => lbl.startsWith(p));
}

function isMassExplosiveRow(labels: string[]): boolean {
  return labels.some(l => l === "1" || ["1.1","1.2","1.3"].some(p => l.startsWith(p)));
}

// ── ADR 7.5.2.1 Etiket segregasyon matrisi (rule_engine.py'den) ──────────
// STATUS_OK | STATUS_FORBIDDEN | STATUS_UNKNOWN | STATUS_EXPLOSIVE_SPECIAL | STATUS_FOOD_CAUTION
// Segregasyon matrisi: ana sınıf VEYA alt etiket (2.1/2.2/2.3 → Sınıf 2 kuralı)
// Etiket normalize fonksiyonu alt sınıf etiketlerini ana sınıfa indirger.
const SEG: Record<string, Record<string, string>> = {
  "2":  {"3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"OK","6.1":"OK","6.2":"NO","7":"NO","8":"OK","9":"OK"},
  "3":  {"3":"OK","4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"COND","6.1":"OK","6.2":"NO","7":"NO","8":"OK","9":"OK"},
  "4.1":{"4.1":"OK","4.2":"OK","4.3":"OK","5.1":"OK","5.2":"COND","6.1":"OK","6.2":"NO","7":"NO","8":"OK","9":"OK"},
  "4.2":{"4.2":"OK","4.3":"OK","5.1":"OK","5.2":"COND","6.1":"OK","6.2":"NO","7":"NO","8":"OK","9":"OK"},
  "4.3":{"4.3":"OK","5.1":"OK","5.2":"COND","6.1":"OK","6.2":"NO","7":"NO","8":"OK","9":"OK"},
  "5.1":{"5.1":"OK","5.2":"OK","6.1":"OK","6.2":"NO","7":"NO","8":"OK","9":"OK"},
  "5.2":{"5.2":"OK","6.1":"OK","6.2":"NO","7":"NO","8":"COND","9":"OK"},
  "6.1":{"6.1":"OK","6.2":"NO","7":"NO","8":"OK","9":"OK"},
  "6.2":{"6.2":"OK","7":"NO","8":"NO","9":"NO"},
  "7":  {"7":"COND","8":"NO","9":"NO"},
  "8":  {"8":"OK","9":"OK"},
  "9":  {"9":"OK"},
};

function getSegStatus(a: string, b: string): string {
  if (a === b) return "OK";
  const [lo, hi] = [a, b].sort();
  return SEG[lo]?.[hi] ?? SEG[hi]?.[lo] ?? "UNKNOWN";
}

// ── ADR 7.5.2.2 Uyumluluk Grubu Tablosu (compatibility_groups.py'den) ────
const CG_TABLE: Record<string, Record<string, string|null>> = {
  "A":{"A":"X","B":null,"C":null,"D":null,"E":null,"F":null,"G":null,"H":null,"J":null,"L":null,"N":null,"S":null},
  "B":{"A":null,"B":"X","C":null,"D":"a","E":null,"F":null,"G":null,"H":null,"J":null,"L":null,"N":null,"S":"X"},
  "C":{"A":null,"B":null,"C":"X","D":"X","E":"X","F":null,"G":"X","H":null,"J":null,"L":null,"N":"bc","S":"X"},
  "D":{"A":null,"B":"a","C":"X","D":"X","E":"X","F":null,"G":"X","H":null,"J":null,"L":null,"N":"bc","S":"X"},
  "E":{"A":null,"B":null,"C":"X","D":"X","E":"X","F":null,"G":"X","H":null,"J":null,"L":null,"N":"bc","S":"X"},
  "F":{"A":null,"B":null,"C":null,"D":null,"E":null,"F":"X","G":null,"H":null,"J":null,"L":null,"N":null,"S":"X"},
  "G":{"A":null,"B":null,"C":"X","D":"X","E":"X","F":null,"G":"X","H":null,"J":null,"L":null,"N":null,"S":"X"},
  "H":{"A":null,"B":null,"C":null,"D":null,"E":null,"F":null,"G":null,"H":"X","J":null,"L":null,"N":null,"S":"X"},
  "J":{"A":null,"B":null,"C":null,"D":null,"E":null,"F":null,"G":null,"H":null,"J":"X","L":null,"N":null,"S":"X"},
  "L":{"A":null,"B":null,"C":null,"D":null,"E":null,"F":null,"G":null,"H":null,"J":null,"L":"d","N":null,"S":null},
  "N":{"A":null,"B":null,"C":"bc","D":"bc","E":"bc","F":null,"G":null,"H":null,"J":null,"L":null,"N":"b","S":"X"},
  "S":{"A":null,"B":"X","C":"X","D":"X","E":"X","F":"X","G":"X","H":"X","J":"X","L":null,"N":"X","S":"X"},
};

const CG_NOTES: Record<string,string> = {
  "a":"B↔D: infilak aktarımı riskine karşı etkili fiziksel ayırma şartıyla izin verilir (ADR 7.5.2.2 not a).",
  "b":"1.6N nesneleri, ilave infilak riski taşımadığı kanıtlanmışsa birbirleriyle taşınabilir; aksi halde 1.1 kabul edilir (not b).",
  "bc":"1.6N nesneleri not b koşuluyla + C/D/E gruplarıyla D grubu özelliği taşıdığı kabul edilerek (not c).",
  "d":"L grubu SADECE aynı L grubuna dahil tiplerle birlikte yüklenebilir (not d).",
};

// ── ADR 7.5.2.1 Dipnotları (explosive_footnotes.py'den) ──────────────────
const FN_B_LIFESAVING = new Set(["2990","3072","3268"]);
const FN_C_PAIR       = [new Set(["0503"]), new Set(["3268"])];
const FN_D_EXPLOSIVE  = new Set(["1942","2067","3375"]);
const FN_D_NITRATE    = new Set(["1451","2722","1486","1477","1498","1446","2464","1454","1474","1507"]);

type FootnoteResult = { code: string; note: string } | null;

function checkFnA(group: string|null): FootnoteResult {
  if (group === "S") return { code:"a", note:"Not a: Uyumluluk grubu S olan Sınıf 1 madde/nesneleri, Sınıf 1 dışındaki maddelerle karışık yüklenebilir (ADR 7.5.2.1 not a)." };
  return null;
}
function checkFnB(un1:string, un2:string, hasClass9:boolean): FootnoteResult {
  if (!hasClass9) return null;
  if (FN_B_LIFESAVING.has(un1)||FN_B_LIFESAVING.has(un2))
    return { code:"b", note:"Not b: Sınıf 9 hayat kurtarıcı araç (UN 2990/3072/3268) ile Sınıf 1 arasında karışık yükleme izinlidir (ADR 7.5.2.1 not b)." };
  return null;
}
function checkFnC(un1:string, un2:string): FootnoteResult {
  if ((FN_C_PAIR[0].has(un1)&&FN_C_PAIR[1].has(un2))||(FN_C_PAIR[0].has(un2)&&FN_C_PAIR[1].has(un1)))
    return { code:"c", note:"Not c: UN 0503 (1.4G emniyet cihazı) ↔ UN 3268 (Sınıf 9 emniyet cihazı) arasında izin verilmiştir (ADR 7.5.2.1 not c)." };
  return null;
}
function checkFnD(explosiveUn:string, otherUn:string): FootnoteResult {
  if (explosiveUn === "0083") return null;
  const allNitrate = new Set([...FN_D_NITRATE, ...FN_D_EXPLOSIVE]);
  if (allNitrate.has(otherUn))
    return { code:"d", note:"Not d: Tahripli patlayıcılar/amonyum nitrat türevleri ↔ alkali metal nitratları; tümü Sınıf 1 olarak muamele görmesi koşuluyla izin verilmiştir (ADR 7.5.2.1 not d)." };
  return null;
}

// ── Tünel kodu (tunnel_rules.py'den) ─────────────────────────────────────
const RESTRICTED_TUNNELS = new Set(["B","B/D","B/E","C","C/D","C/E","D","D/E","E"]);

// ── Risk puanı (risk_engine.py'den) ──────────────────────────────────────
const RISK_BASE: Record<string,number> = {
  "NO":100,"EXPLOSIVE_SPECIAL":85,"UNKNOWN":60,"FOOD":40,"OK":0,"COND":30
};

// ── Ana kontrol fonksiyonu ────────────────────────────────────────────────
type CheckResult = {
  un1:string; un2:string; name1:string; name2:string;
  status:string; adrRef:string; reason:string;
  notes:string[]; riskScore:number;
};

function checkPair(a: UnRow, b: UnRow): CheckResult {
  const labels1 = splitLabels(a.labels || a.class);
  const labels2 = splitLabels(b.labels || b.class);
  const notes: string[] = [];
  let status = "OK", adrRef = "7.5.2.1", reason = "Birlikte taşıma uygundur.";

  const exp1 = labels1.some(isClass1Label);
  const exp2 = labels2.some(isClass1Label);

  if (exp1 || exp2) {
    // ── Sınıf 1 mantığı ─────────────────────────────────────────────
    if (exp1 && exp2) {
      adrRef = "7.5.2.2";
      const g1 = compatGroup(a), g2 = compatGroup(b);
      if (!g1 || !g2) {
        status = "EXPLOSIVE_SPECIAL";
        reason = `İki taraf da Sınıf 1 ancak UN ${!g1?a.un_number:b.un_number} için uyumluluk grubu belirlenemedi; ADR 7.5.2.2 tablosuna göre manuel kontrol gerekir.`;
      } else {
        const [lo,hi] = [g1,g2].sort() as [string,string];
        const cell = CG_TABLE[lo]?.[hi] ?? CG_TABLE[hi]?.[lo] ?? null;
        if (cell === null) {
          status = "NO"; reason = `Uyumluluk grubu ${g1} ↔ ${g2}: karışık yükleme yasaktır (ADR 7.5.2.2).`;
        } else if (cell === "X") {
          status = "EXPLOSIVE_SPECIAL"; reason = `Uyumluluk grubu ${g1} ↔ ${g2}: izin verilir (ADR 7.5.2.2). Not: taşıma ünitesi başına net patlayıcı kütlesi (ADR 7.5.5.2) bu modülde hesaplanmaz.`;
        } else {
          status = "EXPLOSIVE_SPECIAL"; reason = CG_NOTES[cell] || `Uyumluluk grubu ${g1} ↔ ${g2}: dipnot ${cell} kapsamında şartlı izin.`;
        }
      }
    } else {
      // Bir taraf Sınıf 1, diğeri değil
      const expRow = exp1 ? a : b;
      const othRow = exp1 ? b : a;
      const group = compatGroup(expRow);
      const hasC9 = (othRow.class || "").startsWith("9") || (othRow.labels||"").includes("9");

      const fnA = checkFnA(group);
      const fnB = checkFnB(a.un_number, b.un_number, hasC9);
      const fnC = checkFnC(a.un_number, b.un_number);
      const fnD = isMassExplosiveRow(exp1?labels1:labels2)
        ? checkFnD(expRow.un_number, othRow.un_number) : null;

      const hit = fnA || fnB || fnC || fnD;
      if (hit) {
        status = "EXPLOSIVE_SPECIAL"; adrRef = "7.5.2.1"; reason = hit.note;
      } else if (!group) {
        status = "EXPLOSIVE_SPECIAL"; adrRef = "7.5.2.1";
        reason = `UN ${expRow.un_number} için uyumluluk grubu belirlenemediğinden 'a' dipnotu elenemez; manuel doğrulama gerekir.`;
      } else {
        status = "NO"; adrRef = "7.5.2.1";
        reason = `Sınıf 1 (grup ${group}) ↔ ${othRow.class||"diğer"}: ADR 7.5.2.1 dipnotlarından (a/b/c/d) hiçbiri karşılanmıyor; karışık yükleme YASAKTIR.`;
      }
    }
  } else {
    // ── Sınıf 1 içermeyen sıradan çiftler ─────────────────────────
    let worst = "OK";
    for (const l1 of labels1.length ? labels1 : [a.class]) {
      for (const l2 of labels2.length ? labels2 : [b.class]) {
        const s = getSegStatus(l1, l2);
        if ((RISK_BASE[s]||0) > (RISK_BASE[worst]||0)) worst = s;
        if (worst === "NO") break;
      }
    }
    status = worst;
    if (status === "OK") reason = "ADR 7.5.2.1 kapsamında birlikte taşıma uygundur.";
    else if (status === "NO") reason = `Sınıf ${a.class} ↔ Sınıf ${b.class}: ADR 7.5.2.1 gereği karışık yükleme YASAKTIR.`;
    else if (status === "COND") reason = `Sınıf ${a.class} ↔ Sınıf ${b.class}: ADR 7.5.2.1 kapsamında özel koşullarla birlikte taşınabilir.`;
    else reason = `Sınıf ${a.class} ↔ Sınıf ${b.class}: kural tablosunda tanımlı kombinasyon yok; manuel kontrol gerekir (ADR 7.5.2.1).`;
  }

  // CV28 gıda ayrımı
  const cv1 = a.labels||"", cv2 = b.labels||"";
  if (cv1.includes("CV28")||cv2.includes("CV28")) {
    notes.push("CV28: Gıda/yem ile bitişik istifleme yapılamaz; aralarına bölme/mesafe/örtü konularak taşınabilir (ADR 7.5.4).");
    if (status === "OK") status = "FOOD";
  }

  // Tünel kodu
  const t1 = (a.tunnel_code||"").toUpperCase().trim();
  const t2 = (b.tunnel_code||"").toUpperCase().trim();
  if (RESTRICTED_TUNNELS.has(t1)) notes.push(`UN ${a.un_number} tünel kodu ${t1}: bazı tünellerde taşıma kısıtlı (ADR 8.6).`);
  if (RESTRICTED_TUNNELS.has(t2)) notes.push(`UN ${b.un_number} tünel kodu ${t2}: bazı tünellerde taşıma kısıtlı (ADR 8.6).`);

  const hasTunnel = RESTRICTED_TUNNELS.has(t1)||RESTRICTED_TUNNELS.has(t2);
  const riskScore = Math.min((RISK_BASE[status]||50) + (hasTunnel?5:0), 100);

  return { un1:a.un_number, un2:b.un_number,
    name1:a.proper_shipping_name, name2:b.proper_shipping_name,
    status, adrRef, reason, notes, riskScore };
}

// ── Renk/etiket yardımcıları ──────────────────────────────────────────────
const CLASS_COLOR: Record<string,string> = {
  "1":"bg-orange-100 text-orange-800","2":"bg-green-100 text-green-800",
  "2.1":"bg-red-100 text-red-800","2.2":"bg-green-100 text-green-800","2.3":"bg-gray-200 text-gray-800",
  "3":"bg-red-100 text-red-800","4.1":"bg-yellow-100 text-yellow-800",
  "4.2":"bg-yellow-100 text-yellow-800","4.3":"bg-blue-100 text-blue-800",
  "5.1":"bg-yellow-50 text-yellow-700","5.2":"bg-yellow-100 text-yellow-800",
  "6.1":"bg-gray-200 text-gray-800","6.2":"bg-gray-200 text-gray-800",
  "7":"bg-purple-100 text-purple-800","8":"bg-gray-100 text-gray-700","9":"bg-gray-50 text-gray-600",
};

function statusBadge(s: string) {
  const map: Record<string,[string,string]> = {
    "OK":["✓ Uyumlu","bg-green-100 text-green-700"],
    "NO":["✗ YASAK","bg-red-100 text-red-700 font-bold"],
    "COND":["! Şartlı","bg-amber-100 text-amber-700"],
    "UNKNOWN":["? Bilinmiyor","bg-gray-100 text-gray-600"],
    "EXPLOSIVE_SPECIAL":["⚠ Patlayıcı — Manuel Kontrol","bg-orange-100 text-orange-800"],
    "FOOD":["🍎 Gıda Tedbiri","bg-yellow-100 text-yellow-700"],
  };
  const [label, cls] = map[s] || ["? Bilinmiyor","bg-gray-100 text-gray-600"];
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{label}</span>;
}

type Tab = "search"|"muafiyet"|"karisik";

// ── Arama kutusu — ana component DIŞINDA tanımlanmalı ────────────────────
// İçeride tanımlanırsa her render'da yeniden oluşur → input focus kaybeder.
type SearchBoxProps = {
  q: string; setQ: (s: string) => void;
  res: UnRow[]; load: boolean;
  showDd: boolean; setShowDd: (b: boolean) => void;
  dropRef: React.RefObject<HTMLDivElement | null>;
  onSel: (r: UnRow) => void;
  extra?: React.ReactNode;
  placeholder?: string;
};

function SearchBox({ q, setQ, res, load, showDd, setShowDd, dropRef, onSel, extra, placeholder }: SearchBoxProps) {
  return (
    <div className="relative" ref={dropRef}>
      <input
        className="border p-3 w-full rounded-xl text-sm"
        placeholder={placeholder ?? "UN numarası (örn: 1203) veya madde adı..."}
        value={q}
        onChange={e => { setQ(e.target.value); }}
        onFocus={() => res.length > 0 && setShowDd(true)}
      />
      {load && <span className="absolute right-3 top-3 text-xs text-gray-400">Aranıyor...</span>}
      {showDd && res.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto mt-1">
          {res.map(row => (
            <button key={row.id + row.classification_code} onClick={() => onSel(row)}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-b-0 text-sm">
              <span className="font-bold">UN {row.un_number}</span>
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${CLASS_COLOR[row.class] || "bg-gray-100"}`}>Sınıf {row.class}</span>
              {row.classification_code && <span className="ml-1 text-xs text-gray-400">[{row.classification_code}]</span>}
              <div className="text-gray-400 text-xs mt-0.5 truncate">{row.proper_shipping_name}</div>
            </button>
          ))}
        </div>
      )}
      {showDd && !load && res.length === 0 && q.trim().length > 1 && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow mt-1 p-4 z-40 text-sm text-gray-400">
          Sonuç bulunamadı.
        </div>
      )}
      {extra}
    </div>
  );
}

export default function AdrPage() {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UnRow|null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const [calcItems, setCalcItems] = useState<CalcItem[]>([]);
  const [addQty, setAddQty] = useState("1");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [mixItems, setMixItems] = useState<MixItem[]>([]);
  const [mixQuery, setMixQuery] = useState("");
  const [mixResults, setMixResults] = useState<UnRow[]>([]);
  const [mixSearching, setMixSearching] = useState(false);
  const [showMixDrop, setShowMixDrop] = useState(false);
  const mixRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q:string, setRes:(r:UnRow[])=>void, setLoad:(b:boolean)=>void) => {
    const t = q.trim(); if (!t) { setRes([]); return; }
    setLoad(true);
    const isNum = /^\d+$/.test(t);
    let qb = supabase.from("adr_un_numbers").select("*").limit(15);
    qb = isNum ? qb.ilike("un_number",`${t}%`) : qb.ilike("proper_shipping_name",`%${t}%`);
    const { data } = await qb.order("un_number");
    setRes((data as UnRow[])||[]); setLoad(false);
  }, []);

  useEffect(() => { const t = setTimeout(()=>doSearch(query,setResults,setSearching),280); return ()=>clearTimeout(t); }, [query,doSearch]);
  useEffect(() => { const t = setTimeout(()=>doSearch(mixQuery,setMixResults,setMixSearching),280); return ()=>clearTimeout(t); }, [mixQuery,doSearch]);

  useEffect(() => {
    const h=(e:MouseEvent)=>{
      if(dropRef.current&&!dropRef.current.contains(e.target as Node)) setShowDrop(false);
      if(mixRef.current&&!mixRef.current.contains(e.target as Node)) setShowMixDrop(false);
    };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  }, []);

  function selectRow(row:UnRow) { setSelected(row); setQuery(`UN ${row.un_number} — ${row.proper_shipping_name.slice(0,60)}`); setShowDrop(false); setResults([]); }
  function addToMix(row:UnRow) { setMixItems(p=>p.find(i=>i.row.un_number===row.un_number)?p:[...p,{row}]); setMixQuery(""); setMixResults([]); setShowMixDrop(false); }
  function addToCalc() { if(!selected) return; const qty=parseFloat(addQty); if(isNaN(qty)||qty<=0) return; setCalcItems(p=>{ const ex=p.find(i=>i.row.un_number===selected.un_number); return ex?p.map(i=>i.row.un_number===selected.un_number?{...i,quantity:i.quantity+qty}:i):[...p,{row:selected,quantity:qty}]; }); }

  const calcRows = calcItems.map(item => {
    const cat=item.row.transport_category||""; const mul=CAT_MUL[cat]??null;
    const pts=mul===null?null:mul===Infinity?0:item.quantity/mul;
    return {...item,cat,mul,pts};
  });
  const hasNonEx = calcRows.some(r=>r.pts===null);
  const totalPts = calcRows.reduce((a,r)=>a+(r.pts??9999),0);
  const isExempt = !hasNonEx && totalPts<=1000;

  async function downloadPdf() {
    if(calcItems.length===0) return; setPdfLoading(true);
    const {jsPDF}=await import("jspdf"); const autoTable=(await import("jspdf-autotable")).default;
    const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const W=210,M=15;
    doc.setFillColor(15,15,15); doc.rect(0,0,W,28,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(14); doc.setFont("helvetica","bold");
    doc.text("TMGD YÖNETİM SİSTEMİ",M,12);
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.text("ADR 1.1.3.6 Muafiyet Hesabı",M,20);
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`,W-M,20,{align:"right"});
    let y=36; doc.setTextColor(0,0,0); doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.text("Hesaplanan Maddeler",M,y); y+=2;
    autoTable(doc,{startY:y,margin:{left:M,right:M},headStyles:{fillColor:[30,30,30]},
      head:[["UN No","Madde","Sınıf","AG","Kat.","Çarpan","Miktar","Puan"]],
      body:calcRows.map(r=>[`UN ${r.row.un_number}`,r.row.proper_shipping_name.slice(0,40),r.row.class||"—",r.row.packing_group||"—",r.cat||"—",r.mul===null?"Muaf değil":r.mul===Infinity?"∞":r.mul,`${r.quantity.toFixed(2)} kg/L`,r.pts===null?"Muaf değil":r.mul===Infinity?"0":r.pts!==null?r.pts.toFixed(2):"—"]),
      foot:[[{content:`TOPLAM PUAN: ${hasNonEx?"Hesaplanamadı":totalPts.toFixed(2)}`,colSpan:8,styles:{fontStyle:"bold",fillColor:isExempt?[220,252,231]:[254,226,226]}}]],
      styles:{fontSize:8}});
    y=(doc as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+8;
    const [r,g,b]=isExempt?[22,163,74]:[220,38,38];
    doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.setTextColor(r,g,b);
    doc.text(isExempt?`✓ MUAFİYET UYGULANABİLİR — Toplam: ${totalPts.toFixed(2)} ≤ 1000`:hasNonEx?"✗ MUAFİYET UYGULANAMAZ — Muafiyetten yararlanamayan madde var":`✗ MUAFİYET UYGULANAMAZ — Toplam: ${totalPts.toFixed(2)} > 1000`,M,y);
    doc.save(`ADR_Muafiyet_${new Date().toISOString().slice(0,10)}.pdf`); setPdfLoading(false);
  }

  // Karışık yükleme sonuçları
  const mixPairs: CheckResult[] = [];
  for(let i=0;i<mixItems.length;i++) for(let j=i+1;j<mixItems.length;j++)
    mixPairs.push(checkPair(mixItems[i].row, mixItems[j].row));
  const mixPairsSorted = [...mixPairs].sort((a,b)=>b.riskScore-a.riskScore);
  const hasNo = mixPairs.some(p=>p.status==="NO");
  const hasWarn = mixPairs.some(p=>["EXPLOSIVE_SPECIAL","UNKNOWN","COND","FOOD"].includes(p.status));

  const TABS: {key:Tab;label:string}[] = [
    {key:"search",label:"UN Sorgulama"},
    {key:"muafiyet",label:"Muafiyet Hesabı"},
    {key:"karisik",label:"Karışık Yükleme"},
  ];



  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">ADR Bilgi Motoru</h1>
      <p className="text-gray-500 text-sm mb-5">
        2.939 UN numarası · ADR 1.1.3.6 Muafiyet · ADR 7.5.2 Karışık Yükleme (Mix Checker Pro motoru)
      </p>

      <div className="flex gap-1 border-b mb-6">
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={"px-4 py-2 rounded-t text-sm "+(tab===t.key?"bg-black text-white":"hover:bg-gray-100 text-gray-600")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── UN SORGULAMA ── */}
      {tab==="search"&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SearchBox q={query} setQ={(s)=>{setQuery(s);setSelected(null);}} res={results} load={searching}
              showDd={showDrop} setShowDd={setShowDrop} dropRef={dropRef} onSel={selectRow}/>
            {selected&&(
              <div className="border rounded-xl p-5 space-y-3">
                <div><div className="text-xs text-gray-400">UN NUMARASI</div><div className="text-2xl font-bold">UN {selected.un_number}</div></div>
                <div className="text-sm font-medium">{selected.proper_shipping_name}</div>
                <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${CLASS_COLOR[selected.class]||"bg-gray-100"}`}>⚠ Sınıf {selected.class}</span>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {([["Sınıflandırma Kodu",selected.classification_code],["Ambalaj Grubu",selected.packing_group||"—"],
                    ["Tünel Kodu",selected.tunnel_code||"—"],["Tehlike Tanım No.",selected.hazard_no||"—"],
                    ["Etiketler",selected.labels],["Taşıma Kategorisi",selected.transport_category||"—"],
                    ["Sınırlı Miktar (LQ)",selected.limited_quantity],["Muaf Miktar (EQ)",selected.excepted_quantity],
                  ] as [string,string|null][]).map(([l,v])=>v?(
                    <div key={l} className="bg-gray-50 rounded-lg p-2.5">
                      <div className="text-xs text-gray-400 mb-0.5">{l}</div>
                      <div className="font-medium text-xs">{v}</div>
                    </div>
                  ):null)}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <input type="number" min="0.1" step="0.1" value={addQty} onChange={e=>setAddQty(e.target.value)} className="border rounded p-2 w-24 text-sm" placeholder="kg/L"/>
                  <button onClick={addToCalc} className="flex-1 px-3 py-2 rounded bg-black text-white text-sm">+ Muafiyet Hesabına Ekle</button>
                  <button onClick={()=>addToMix(selected)} className="flex-1 px-3 py-2 rounded border text-sm">+ Karışık Yüklemeye Ekle</button>
                </div>
              </div>
            )}
          </div>
          <div className="border rounded-xl p-5">
            <h2 className="font-bold mb-3 text-sm">Veritabanı Kapsamı (ADR_A_TABLOSU.xlsx)</h2>
            <div className="space-y-1.5">
              {([["1","Patlayıcılar",384],["2","Gazlar",257],["3","Alevlenir Sıvılar",552],
                ["4.1","Alevlenir Katılar",137],["4.2","Kendiliğinden Tutuşan",108],
                ["4.3","Su Temas Tehlikeli",127],["5.1","Yükseltgeyiciler",172],
                ["5.2","Organik Peroksitler",21],["6.1","Zehirli Maddeler",726],
                ["6.2","Bulaşıcı Maddeler",11],["7","Radyoaktif",25],
                ["8","Aşındırıcılar",368],["9","Çeşitli",51]] as [string,string,number][]).map(([cls,lbl,cnt])=>(
                <div key={cls} className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded w-8 text-center font-bold ${CLASS_COLOR[cls]||"bg-gray-100"}`}>{cls}</span>
                  <span className="text-xs text-gray-600 flex-1">{lbl}</span>
                  <span className="text-xs font-bold text-gray-500">{cnt}</span>
                  <div className="w-20 bg-gray-100 rounded h-1.5">
                    <div className="bg-gray-400 h-1.5 rounded" style={{width:`${Math.round(cnt/726*100)}%`}}/>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t text-xs font-bold text-gray-600">Toplam: 2.939 madde</div>
            </div>
          </div>
        </div>
      )}

      {/* ── MUAFİYET ── */}
      {tab==="muafiyet"&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <SearchBox q={query} setQ={(s)=>{setQuery(s);setSelected(null);}} res={results} load={searching}
              showDd={showDrop} setShowDd={setShowDrop} dropRef={dropRef} onSel={selectRow}
              extra={selected&&(
                <div className="mt-3 flex gap-2">
                  <input type="number" min="0.1" step="0.1" value={addQty} onChange={e=>setAddQty(e.target.value)} className="border rounded p-2 w-24 text-sm" placeholder="kg/L"/>
                  <button onClick={addToCalc} className="flex-1 py-2 rounded bg-black text-white text-sm">+ Ekle</button>
                </div>
              )}/>
          </div>
          <div className="border rounded-xl p-5">
            <h2 className="font-bold mb-1">ADR 1.1.3.6 Muafiyet Hesabı</h2>
            <p className="text-xs text-gray-400 mb-3">Kat.1→÷50 · Kat.2→÷333 · Kat.3→÷1000 · Kat.4→serbest · Toplam ≤1000 → muafiyet</p>
            {calcItems.length===0&&<p className="text-sm text-gray-400 text-center py-8">Soldan madde seçip ekleyin.</p>}
            <div className="space-y-2">
              {calcRows.map(r=>(
                <div key={r.row.un_number} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-bold">UN {r.row.un_number}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[180px]">{r.row.proper_shipping_name.slice(0,35)}</div>
                      <div className="text-xs text-gray-400">Sınıf {r.row.class} · Kat.{r.cat||"—"}</div>
                    </div>
                    <button onClick={()=>setCalcItems(p=>p.filter(i=>i.row.un_number!==r.row.un_number))} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="number" min="0.1" step="0.1" value={r.quantity}
                      onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)setCalcItems(p=>p.map(i=>i.row.un_number===r.row.un_number?{...i,quantity:v}:i));}}
                      className="border rounded p-1 w-20 text-sm"/>
                    <span className="text-xs text-gray-400 flex-1">kg/L</span>
                    <span className="text-sm font-bold">
                      {r.pts===null?<span className="text-red-500">Muaf değil</span>
                        :r.mul===Infinity?<span className="text-green-500">0 puan</span>
                        :<span>{(r.pts as number).toFixed(2)} puan</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {calcItems.length>0&&(
              <>
                <div className={`rounded-xl p-4 mt-3 border ${isExempt?"bg-green-50 border-green-200":"bg-red-50 border-red-200"}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Toplam Puan</span>
                    <span className={`text-xl font-bold ${isExempt?"text-green-700":"text-red-700"}`}>
                      {hasNonEx?"?":totalPts.toFixed(2)}<span className="text-sm font-normal ml-1">/ 1000</span>
                    </span>
                  </div>
                  <div className={`mt-1.5 text-sm font-medium ${isExempt?"text-green-700":"text-red-700"}`}>
                    {hasNonEx?"✗ Muafiyetten yararlanamayan madde var":isExempt?"✓ ADR 1.1.3.6 muafiyeti UYGULANABİLİR":"✗ Eşik aşıldı — ADR tam uygulanır"}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={downloadPdf} disabled={pdfLoading} className="flex-1 py-2 rounded bg-black text-white text-sm disabled:opacity-50">
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
      {tab==="karisik"&&(
        <div className="space-y-5">
          <div className="max-w-lg" ref={mixRef}>
            <SearchBox q={mixQuery} setQ={setMixQuery} res={mixResults} load={mixSearching}
              showDd={showMixDrop} setShowDd={setShowMixDrop} dropRef={mixRef} onSel={addToMix}/>
          </div>

          {mixItems.length>0&&(
            <div className="flex flex-wrap gap-2">
              {mixItems.map(item=>(
                <div key={item.row.un_number} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm ${CLASS_COLOR[item.row.class]||"bg-gray-100"}`}>
                  <span className="font-bold">UN {item.row.un_number}</span>
                  <span className="text-xs max-w-[120px] truncate opacity-80">{item.row.proper_shipping_name.slice(0,28)}</span>
                  <button onClick={()=>setMixItems(p=>p.filter(i=>i.row.un_number!==item.row.un_number))} className="opacity-50 hover:opacity-100">×</button>
                </div>
              ))}
              <button onClick={()=>setMixItems([])} className="text-xs text-gray-400 hover:text-gray-600 px-2">Temizle</button>
            </div>
          )}

          {mixItems.length<2&&<p className="text-sm text-gray-400 text-center py-10 border rounded-xl">En az 2 madde ekleyin.</p>}

          {mixItems.length>=2&&(
            <div className="space-y-4">
              <div className={`rounded-xl p-4 border ${hasNo?"bg-red-50 border-red-200":hasWarn?"bg-amber-50 border-amber-200":"bg-green-50 border-green-200"}`}>
                <div className={`text-lg font-bold ${hasNo?"text-red-700":hasWarn?"text-amber-700":"text-green-700"}`}>
                  {hasNo?"✗ KARIŞIK YÜKLEME YASAK":hasWarn?"! KONTROL GEREKİYOR — Ek koşullar var":"✓ KARIŞIK YÜKLEME UYUMLU"}
                </div>
                <p className="text-sm mt-1 opacity-70">
                  ADR Mix Checker Pro v2.4.1 motoru · ADR 7.5.2.1 + 7.5.2.2 + dipnotlar a/b/c/d + CV28 + Tünel kodu
                </p>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Madde A</th>
                      <th className="text-left p-3 font-medium text-gray-600">Madde B</th>
                      <th className="text-center p-3 font-medium text-gray-600">Sonuç</th>
                      <th className="text-left p-3 font-medium text-gray-600">Gerekçe</th>
                      <th className="text-center p-3 font-medium text-gray-600">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixPairsSorted.map((pair,i)=>(
                      <>
                        <tr key={i} className={`border-t ${pair.status==="NO"?"bg-red-50":pair.status==="EXPLOSIVE_SPECIAL"?"bg-orange-50":pair.status==="FOOD"?"bg-yellow-50":""}`}>
                          <td className="p-3">
                            <div className="font-medium text-xs">UN {pair.un1}</div>
                            <div className="text-gray-400 text-xs truncate max-w-[140px]">{pair.name1.slice(0,35)}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-xs">UN {pair.un2}</div>
                            <div className="text-gray-400 text-xs truncate max-w-[140px]">{pair.name2.slice(0,35)}</div>
                          </td>
                          <td className="p-3 text-center">{statusBadge(pair.status)}</td>
                          <td className="p-3 text-xs text-gray-600 max-w-[220px]">
                            <div>{pair.reason}</div>
                            {pair.adrRef&&<div className="text-gray-400 mt-0.5">Ref: ADR {pair.adrRef}</div>}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-xs font-bold ${pair.riskScore>=85?"text-red-600":pair.riskScore>=60?"text-amber-600":"text-green-600"}`}>
                              {pair.riskScore}
                            </span>
                          </td>
                        </tr>
                        {pair.notes.length>0&&(
                          <tr key={`${i}-notes`} className="border-t bg-yellow-50">
                            <td colSpan={5} className="px-4 py-2 text-xs text-yellow-800">
                              {pair.notes.map((n,ni)=><div key={ni}>ℹ {n}</div>)}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400">
                ⚠ Bu araç ADR Tablo 7.5.2.1'in basitleştirilmiş uygulamasıdır. Sınıf 1 miktar bazlı muafiyetler ve tank taşımacılığı özel kuralları kapsam dışıdır. Üretimde kullanılmadan önce TMGD/DGSA tarafından doğrulanması önerilir.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
