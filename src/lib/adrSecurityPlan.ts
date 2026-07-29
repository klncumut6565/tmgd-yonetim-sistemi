// src/lib/adrSecurityPlan.ts
//
// ADR 1.10.3 — EMNİYET PLANI GEREKLİLİĞİ MOTORU
//
// Bu dosya, klncumut6565/adr_transport_pro_2026 masaüstü/web uygulamasındaki
// doğrulanmış SecurityPlanEngine'in TypeScript portudur. Önceki basit
// yaklaşım hatalıydı: ambalajlı taşımada çoğu sınıf "her miktarda muaf"
// iken 3000 eşiği uygulanıyor, gereksiz yere "emniyet planı gerekli"
// deniyordu.
//
// KARAR HİYERARŞİSİ (ADR 2023 Bölüm 1.10):
//   1. Madde 1.10.4 listesinde UN var mı?
//      HAYIR ve toplam 1.1.3.6 puanı < 1000 → emniyet planı GEREKMİYOR
//      EVET → muafiyet kullanılamaz, tabloya bak
//   2. Sınıf 7 (radyoaktif) → Tablo 1.10.3.1.3 aktivite eşiği
//   3. Diğer sınıflar → Tablo 1.10.3.1.2 eşik karşılaştırması
//        null = 'a' → bu taşıma modu için uygulanamaz (muaf)
//        -1   = 'b' → miktar ne olursa olsun muaf
//        0          → her miktarda emniyet planı GEREKLİ
//        N          → miktar > N ise GEREKLİ

export type SecurityPlanItem = {
  un_number: string;
  proper_shipping_name: string;
  adr_class: string | null;
  classification_code: string | null;
  packing_group: string | null;
  packaging_type: string | null;
  quantity: number;
  unit: string;
};

export type SecurityPlanResult = {
  required: boolean;
  exempt: boolean;
  reasons: string[];
  details: string[];
};

/** ADR 1.10.4: Bu UN numaraları 1.1.3.6 muafiyetini KULLANAMAZ. */
const EXCLUDED_FROM_1136 = new Set([
  29, 30, 59, 65, 73, 104, 237, 255, 267, 288, 289, 290,
  360, 361, 364, 365, 366, 439, 440, 441, 455, 456, 500,
]);

/** ADR Tablo 1.10.3.1.2 — UN 1.4 içindeki yüksek sonuçlu numaralar. */
const CLASS14_HIGH_CONSEQUENCE = new Set([
  104, 237, 255, 267, 289, 361, 365, 366, 440, 441, 455, 456, 500, 512, 513,
]);

/** Amonyum nitrat / perklorat (Sınıf 5.1 özel satırı). */
const PERCHLORATE_AN_UN = new Set([
  1942, 2067, 2068, 2069, 2070, 2426, 3375,
  1481, 1482, 1483, 3506,
]);

/** Sınıf 6.2 Kategori A. */
const UN_6_2_CAT_A = new Set([2814, 2900, 3549]);

/** Sınıf 3 duyarsızlaştırılmış patlayıcılar. */
const DESENS_3 = new Set([2852, 3343, 3357, 3379, 3380, 3474, 3475, 3476, 3477, 3478, 3479]);

/** Sınıf 4.1 duyarsızlaştırılmış patlayıcılar. */
const DESENS_41 = new Set([2555, 2556, 2557, 3317, 3319, 3344, 3380, 3474, 3475, 3476, 3477]);

/**
 * Tablo 1.10.3.1.2 eşikleri.
 * Değer: [tank_litre, dokme_kg, ambalaj_kg]
 *   null = 'a' (bu mod için uygulanamaz), -1 = 'b' (her miktarda muaf)
 */
const THRESHOLDS: Record<string, [number | null, number | null, number | null]> = {
  "1|1.1": [null, null, 0],
  "1|1.2": [null, null, 0],
  "1|1.3C": [null, null, 0],
  "1|1.4_special": [null, null, 0],
  "1|1.5": [0, null, 0],
  "2|F": [3000, null, -1],
  "2|FC": [3000, null, -1],
  "2|T": [0, null, 0],
  "2|TF": [0, null, 0],
  "2|TC": [0, null, 0],
  "2|TO": [0, null, 0],
  "2|TFC": [0, null, 0],
  "2|TOC": [0, null, 0],
  "3|PGI": [3000, null, -1],
  "3|PGII": [3000, null, -1],
  "3|desensitized": [0, null, 0],
  "4.1|desensitized": [null, null, 0],
  "4.2|PGI": [3000, null, -1],
  "4.3|PGI": [3000, null, -1],
  "5.1|PGI_liquid": [3000, null, -1],
  "5.1|perchlorate_AN": [3000, 3000, -1],
  "6.1|PGI": [0, null, 0],
  "6.2|catA": [null, 0, 0],
  "8|PGI": [3000, null, -1],
};

function unInt(un: string | null): number {
  const t = (un || "").trim().replace(/^0+/, "");
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Ambalaj türünden taşıma modu indeksi: 0=tank, 1=dökme, 2=ambalaj */
function modeIndexForItem(item: SecurityPlanItem): number {
  const pt = (item.packaging_type || "").trim().toLowerCase();
  if (pt.includes("tank")) return 0;
  if (pt.includes("dökme") || pt.includes("dokme")) return 1;
  return 2; // IBC, varil, bidon, kutu, çuval, kompozit...
}

/**
 * Bir kalem için Tablo 1.10.3.1.2 satır anahtarını üretir.
 * null dönerse madde tablo kapsamı dışındadır (muaf).
 */
function getTableKey(item: SecurityPlanItem): string | null {
  const clsRaw = (item.adr_class || "").trim().split(/\s+/)[0] || "";
  const pgRaw = (item.packing_group || "").trim().toUpperCase();
  // Bazı kayıtlarda PG Arap rakamıyla gelebiliyor — Roma'ya normalize et
  const pg = ({ "1": "I", "2": "II", "3": "III" } as Record<string, string>)[pgRaw] ?? pgRaw;
  const un = unInt(item.un_number);

  // ---- Sınıf 1 (patlayıcılar) ----
  if (clsRaw === "1" || clsRaw.startsWith("1.")) {
    const cc = (item.classification_code || "").trim().toUpperCase();
    const m = cc.match(/^(1\.[0-9])([A-Z]*)$/);
    if (m) {
      const sub = m[1];
      const compat = m[2];
      if (sub === "1.4") {
        if (compat === "S") return null; // 1.4S → gerektirmez
        return CLASS14_HIGH_CONSEQUENCE.has(un) ? "1.4_special" : null;
      }
      if (sub === "1.3") return compat === "C" ? "1.3C" : null;
      if (sub === "1.1" || sub === "1.2") return sub;
      if (sub === "1.5") return "1.5";
      return null;
    }
    // classification_code yoksa class_code'a göre (eski kayıtlar)
    if (clsRaw === "1.4") return CLASS14_HIGH_CONSEQUENCE.has(un) ? "1.4_special" : null;
    if (clsRaw === "1.1" || clsRaw === "1.2") return clsRaw;
    if (clsRaw === "1.3") return "1.3C"; // muhafazakâr
    if (clsRaw === "1.5") return "1.5";
    return null;
  }

  // ---- Sınıf 2 (gazlar) ----
  if (clsRaw === "2") {
    let cc = (item.classification_code || "").trim().toUpperCase();
    if (!cc) {
      const arama = (item.proper_shipping_name || "").toUpperCase();
      for (const kod of ["TOC", "TFC", "TF", "TC", "TO", "FC", "T", "F"]) {
        if (arama.includes(kod)) { cc = kod; break; }
      }
    }
    if (cc.includes("A")) return null; // aerosol → tablo dışı
    if (["T", "TF", "TC", "TO", "TFC", "TOC"].includes(cc)) return cc;
    return cc === "FC" ? "FC" : "F"; // bilinmiyorsa muhafazakâr: F
  }

  // ---- Sınıf 3 ----
  if (clsRaw === "3") {
    if (DESENS_3.has(un)) return "desensitized";
    if (pg === "I") return "PGI";
    if (pg === "II") return "PGII";
    return null; // PG III (örn. UN 1202 mazot) tablo dışı → muaf
  }

  // ---- Sınıf 4.1 ----
  if (clsRaw === "4.1") return DESENS_41.has(un) ? "desensitized" : null;

  // ---- Sınıf 4.2 / 4.3 / 6.1 / 8 — yalnızca PG I ----
  if (clsRaw === "4.2" || clsRaw === "4.3" || clsRaw === "6.1" || clsRaw === "8") {
    return pg === "I" ? "PGI" : null;
  }

  // ---- Sınıf 5.1 ----
  if (clsRaw === "5.1") {
    if (PERCHLORATE_AN_UN.has(un)) return "perchlorate_AN";
    return pg === "I" ? "PGI_liquid" : null;
  }

  // ---- Sınıf 6.2 ----
  if (clsRaw === "6.2") return UN_6_2_CAT_A.has(un) ? "catA" : null;

  return null;
}

/**
 * ADR 1.10.3 emniyet planı gerekliliğini hesaplar.
 *
 * @param items      Sevkiyat kalemleri
 * @param points1136 Hesaplanmış toplam 1.1.3.6 puanı
 */
export function checkSecurityPlan(
  items: SecurityPlanItem[],
  points1136: number
): SecurityPlanResult {
  const result: SecurityPlanResult = {
    required: false,
    exempt: false,
    reasons: [],
    details: [],
  };

  if (items.length === 0) {
    result.details.push("Sevkiyat boş — değerlendirme yapılamadı.");
    return result;
  }

  // ---- 1) ADR 1.10.4 muafiyeti ----
  const kisitliUnVar = items.some((i) => EXCLUDED_FROM_1136.has(unInt(i.un_number)));
  if (!kisitliUnVar && points1136 < 1000) {
    result.exempt = true;
    result.details.push(
      `ADR 1.10.4 muafiyeti: toplam 1.1.3.6 puanı ${points1136.toFixed(0)} < 1000 ` +
        `ve kısıtlı UN listesinde madde yok → emniyet planı gerekmiyor.`
    );
    return result;
  }
  if (kisitliUnVar) {
    result.details.push(
      "ADR 1.10.4 özel listesi: bazı UN numaraları 1.1.3.6 muafiyetinden yararlanamaz."
    );
  }

  // ---- 2) Sınıf 7 (radyoaktif) ----
  const sinif7 = items.filter((i) => (i.adr_class || "").startsWith("7"));
  if (sinif7.length > 0) {
    result.details.push(
      "Sınıf 7 (radyoaktif) tespit edildi — aktivite eşiği (Tablo 1.10.3.1.3) " +
        "radyonüklid bilgisi gerektirir, TMGD tarafından değerlendirilmelidir."
    );
  }

  // ---- 3) Tablo 1.10.3.1.2 ----
  const MOD_ADI = ["Tank", "Dökme", "Ambalaj"];

  for (const item of items) {
    const clsRaw = (item.adr_class || "").trim().split(/\s+/)[0] || "";
    if (clsRaw.startsWith("7")) continue; // üstte ele alındı

    const modIdx = modeIndexForItem(item);
    const modAdi = MOD_ADI[modIdx];
    const un = item.un_number || "—";

    const key = getTableKey(item);
    if (key === null) {
      result.details.push(
        `UN ${un} (Sınıf ${clsRaw || "—"}, AG ${item.packing_group || "—"}) [${modAdi}]: ` +
          `Tablo 1.10.3.1.2 kapsamı dışında → muaf`
      );
      continue;
    }

    const esikSinif = clsRaw.startsWith("1.") ? "1" : clsRaw;
    const satir = THRESHOLDS[`${esikSinif}|${key}`];
    if (!satir) {
      result.details.push(`UN ${un} [${modAdi}]: tablo satırı bulunamadı → muaf kabul edildi`);
      continue;
    }

    const limit = satir[modIdx];

    if (limit === null) {
      result.details.push(`UN ${un} (Sınıf ${clsRaw}): ${modAdi} modu için uygulanamaz (a) → muaf`);
    } else if (limit === -1) {
      result.details.push(`UN ${un} (Sınıf ${clsRaw}): miktar ne olursa olsun muaf (b) [${modAdi}]`);
    } else if (limit === 0) {
      result.required = true;
      result.reasons.push(
        `UN ${un} (Sınıf ${clsRaw}, AG ${item.packing_group || "—"}) [${modAdi}]: ` +
          `her miktarda emniyet planı gerekli`
      );
    } else {
      const deger = item.quantity || 0;
      const birim = modIdx === 0 ? "litre" : "kg";
      if (deger > limit) {
        result.required = true;
        result.reasons.push(
          `UN ${un} (Sınıf ${clsRaw}) [${modAdi}]: ${deger} ${birim} > ${limit} ${birim} eşiği`
        );
      } else {
        result.details.push(
          `UN ${un} (Sınıf ${clsRaw}) [${modAdi}]: ${deger} ${birim} ≤ ${limit} ${birim} → eşik altı`
        );
      }
    }
  }

  return result;
}
