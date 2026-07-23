// =====================================================================
// ADR KARIŞIK YÜKLEME MOTORU (ortak kütüphane)
//
// Kaynak: ADR Mix Checker Pro v2.4.1'den port edilen, ADR sayfasında
// doğrulanmış motor. Taşıma Evrakı ekranı da aynı motoru kullansın diye
// buraya taşındı — iki kopya bakımı yerine tek kaynak.
//
// İçerik: etiket normalizasyonu (ADR 7.5.2.1), Sınıf 1 uyumluluk grubu
// tablosu (7.5.2.2) ve a/b/c/d dipnotları, gıda kuralı (CV28/7.5.4),
// risk puanı. STATUS_UNKNOWN tanımsız çiftlerde güvenli varsayılandır.
// =====================================================================

export type UnRow = {
  id: string; un_number: string; proper_shipping_name: string;
  class: string; classification_code: string | null;
  packing_group: string | null; tunnel_code: string | null;
  hazard_no: string | null; labels: string | null;
  transport_category: string | null;
  limited_quantity: string | null; excepted_quantity: string | null;
};
export type CalcItem = { row: UnRow; quantity: number };
export type MixItem  = { row: UnRow };

// ── ADR 1.1.3.6.4 Muafiyet formülü ───────────────────────────────────────
// DOĞRU KURAL: Toplam = (Kat.1 miktarı × 50) + (Kat.2 miktarı × 3) + (Kat.3 miktarı × 1)
// Kat.4 tamamen serbesttir (hesaba dahil edilmez, çarpan 0).
// ÇARPILIR, bölünmez — miktar arttıkça puan da artar.
export const CAT_MUL: Record<string, number> = { "1":50, "2":3, "3":1, "4":0 };

// ── Etiket yardımcıları (utils.py'den) ───────────────────────────────────
// Etiket normalizasyonu: alt sınıf etiketleri ana sınıfa indirgenir
// "2.1" → "2", "2.2" → "2", "2.3" → "2" (ADR 7.5.2.1'de Sınıf 2 tek satır)
// "7A","7B","7C","7D","7E" → "7" (muaf paket → Sınıf 7)
// Uyumluluk grubu HARFLERİ (1.4S, 1.1D) olduğu gibi kalır — bunlar Sınıf 1 içindir
export function normalizeLabel(s: string): string {
  if (!s) return "";
  let n = s.replace(",", ".").replace(/\s/g, "").toUpperCase();
  // Sınıf 2 alt etiketleri → "2"
  if (n === "2.1" || n === "2.2" || n === "2.3") return "2";
  // Sınıf 7 alt etiketleri (7A, 7B, 7C, 7D, 7E) → "7"
  if (/^7[A-E]$/.test(n)) return "7";
  return n;
}

export function splitLabels(cell: string | null): string[] {
  if (!cell) return [];
  const parts = cell.replace(/\n/g, "+").replace(/\//g, "+").split("+");
  return [...new Set(parts.map(normalizeLabel).filter(Boolean))];
}

export function compatGroup(row: UnRow): string | null {
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

export function isClass1Label(lbl: string): boolean {
  if (lbl === "1") return true;
  return ["1.1","1.2","1.3","1.4","1.5","1.6"].some(p => lbl.startsWith(p));
}

export function isMassExplosiveRow(labels: string[]): boolean {
  return labels.some(l => l === "1" || ["1.1","1.2","1.3"].some(p => l.startsWith(p)));
}

// ── ADR 7.5.2.1 Etiket segregasyon matrisi (rule_engine.py'den) ──────────
// STATUS_OK | STATUS_FORBIDDEN | STATUS_UNKNOWN | STATUS_EXPLOSIVE_SPECIAL | STATUS_FOOD_CAUTION
// Segregasyon matrisi: ana sınıf VEYA alt etiket (2.1/2.2/2.3 → Sınıf 2 kuralı)
// Etiket normalize fonksiyonu alt sınıf etiketlerini ana sınıfa indirger.
export const SEG: Record<string, Record<string, string>> = {
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

export function getSegStatus(a: string, b: string): string {
  if (a === b) return "OK";
  const [lo, hi] = [a, b].sort();
  return SEG[lo]?.[hi] ?? SEG[hi]?.[lo] ?? "UNKNOWN";
}

// ── ADR 7.5.2.2 Uyumluluk Grubu Tablosu (compatibility_groups.py'den) ────
export const CG_TABLE: Record<string, Record<string, string|null>> = {
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

export const CG_NOTES: Record<string,string> = {
  "a":"B↔D: infilak aktarımı riskine karşı etkili fiziksel ayırma şartıyla izin verilir (ADR 7.5.2.2 not a).",
  "b":"1.6N nesneleri, ilave infilak riski taşımadığı kanıtlanmışsa birbirleriyle taşınabilir; aksi halde 1.1 kabul edilir (not b).",
  "bc":"1.6N nesneleri not b koşuluyla + C/D/E gruplarıyla D grubu özelliği taşıdığı kabul edilerek (not c).",
  "d":"L grubu SADECE aynı L grubuna dahil tiplerle birlikte yüklenebilir (not d).",
};

// ── ADR 7.5.2.1 Dipnotları (explosive_footnotes.py'den) ──────────────────
export const FN_B_LIFESAVING = new Set(["2990","3072","3268"]);
export const FN_C_PAIR       = [new Set(["0503"]), new Set(["3268"])];
export const FN_D_EXPLOSIVE  = new Set(["1942","2067","3375"]);
export const FN_D_NITRATE    = new Set(["1451","2722","1486","1477","1498","1446","2464","1454","1474","1507"]);

export type FootnoteResult = { code: string; note: string } | null;

export function checkFnA(group: string|null): FootnoteResult {
  if (group === "S") return { code:"a", note:"Not a: Uyumluluk grubu S olan Sınıf 1 madde/nesneleri, Sınıf 1 dışındaki maddelerle karışık yüklenebilir (ADR 7.5.2.1 not a)." };
  return null;
}
export function checkFnB(un1:string, un2:string, hasClass9:boolean): FootnoteResult {
  if (!hasClass9) return null;
  if (FN_B_LIFESAVING.has(un1)||FN_B_LIFESAVING.has(un2))
    return { code:"b", note:"Not b: Sınıf 9 hayat kurtarıcı araç (UN 2990/3072/3268) ile Sınıf 1 arasında karışık yükleme izinlidir (ADR 7.5.2.1 not b)." };
  return null;
}
export function checkFnC(un1:string, un2:string): FootnoteResult {
  if ((FN_C_PAIR[0].has(un1)&&FN_C_PAIR[1].has(un2))||(FN_C_PAIR[0].has(un2)&&FN_C_PAIR[1].has(un1)))
    return { code:"c", note:"Not c: UN 0503 (1.4G emniyet cihazı) ↔ UN 3268 (Sınıf 9 emniyet cihazı) arasında izin verilmiştir (ADR 7.5.2.1 not c)." };
  return null;
}
export function checkFnD(explosiveUn:string, otherUn:string): FootnoteResult {
  if (explosiveUn === "0083") return null;
  const allNitrate = new Set([...FN_D_NITRATE, ...FN_D_EXPLOSIVE]);
  if (allNitrate.has(otherUn))
    return { code:"d", note:"Not d: Tahripli patlayıcılar/amonyum nitrat türevleri ↔ alkali metal nitratları; tümü Sınıf 1 olarak muamele görmesi koşuluyla izin verilmiştir (ADR 7.5.2.1 not d)." };
  return null;
}

// ── Tünel kodu (tunnel_rules.py'den) ─────────────────────────────────────
export const RESTRICTED_TUNNELS = new Set(["B","B/D","B/E","C","C/D","C/E","D","D/E","E"]);

// ── Risk puanı (risk_engine.py'den) ──────────────────────────────────────
export const RISK_BASE: Record<string,number> = {
  "NO":100,"EXPLOSIVE_SPECIAL":85,"UNKNOWN":60,"FOOD":40,"OK":0,"COND":30
};

// ── Ana kontrol fonksiyonu ────────────────────────────────────────────────
export type CheckResult = {
  un1:string; un2:string; name1:string; name2:string;
  status:string; adrRef:string; reason:string;
  notes:string[]; riskScore:number;
};

export function checkPair(a: UnRow, b: UnRow): CheckResult {
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
