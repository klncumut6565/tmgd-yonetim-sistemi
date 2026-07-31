// src/lib/adrYasakTasima.ts
//
// ADR — TAŞIMASI YASAK / KABUL EDİLMEYEN MADDELER
//
// ADR'de bazı maddeler hiçbir koşulda karayolu ile taşınamaz. Bu, karışık
// yükleme yasağından (iki maddenin birlikte taşınamaması) FARKLI bir
// konudur: burada maddenin KENDİSİ taşımaya kabul edilmez.
//
// Başlıca kaynaklar:
//   - ADR 2.2.1.1.1 / 2.2.1.2: taşımaya kabul edilmeyen patlayıcılar
//     (özellikle KURU haldeki birincil patlayıcılar — ıslatılmış/
//     flegmatize hâlleri farklı UN numaralarıyla taşınabilir)
//   - ADR 2.2.41.2: kendiliğinden reaksiyona giren maddeler, TİP A
//   - ADR 2.2.52.2: organik peroksitler, TİP A
//   - ADR 2.2.x.2 bölümlerindeki "taşıma için kabul edilmeyen maddeler"
//
// ÖNEMLİ: Bu liste bir ÖN UYARI mekanizmasıdır, ADR'nin tamamının yerini
// tutmaz. Nihai karar TMGD'ye aittir. Liste bilinçli olarak KESİN olan
// vakalarla sınırlı tutulmuştur — şüpheli durumlarda uyarı üretmek yerine
// sessiz kalmak, yanlış güven vermekten iyidir.

export type YasakSonuc = {
  yasak: boolean;
  /** Şüpheli ama kesin değil — kullanıcı doğrulamalı */
  kontrolGerekli: boolean;
  sebep: string;
};

/**
 * ADR 2.2.1.2 — Taşımaya kabul EDİLMEYEN patlayıcılar.
 * Bunlar kuru/ıslatılmamış hâlleriyle listelenmiştir; aynı maddenin
 * ıslatılmış veya flegmatize edilmiş hâli AYRI bir UN numarasıyla
 * taşınabilir (örn. kuru UN 0129 kurşun azid yasak, ıslatılmış
 * UN 0129 değil — Tablo A'da ayrı satır).
 */
const YASAK_PATLAYICILAR: Record<string, string> = {
  "0020": "Zehirli mühimmat — ADR'ye göre taşınması yasaktır",
  "0021": "Zehirli mühimmat — ADR'ye göre taşınması yasaktır",
  "0074": "Dinitrodiazofenol (kuru/ıslatılmamış) — taşımaya kabul edilmez",
  "0113": "Guanil nitrozaminoguanilidin (kuru) — taşımaya kabul edilmez",
  "0114": "Guanil nitrozaminoguanilidin tetrazen (kuru) — taşımaya kabul edilmez",
  "0129": "Kurşun azid (kuru/ıslatılmamış) — taşımaya kabul edilmez",
  "0130": "Kurşun stifnat / kurşun trinitrorezorsinat (kuru) — taşımaya kabul edilmez",
  "0135": "Cıva fulminat (kuru/ıslatılmamış) — taşımaya kabul edilmez",
  "0224": "Baryum azid (kuru/ıslatılmamış) — taşımaya kabul edilmez",
};

/**
 * Sevkiyat adında geçtiğinde TAŞIMA YASAĞINA işaret eden ifadeler.
 * Tablo A verisinde bu bilgi ayrı bir sütunda tutulmadığı için
 * madde adı üzerinden yakalanır.
 */
const YASAK_IFADELER: { kalip: RegExp; sebep: string }[] = [
  {
    kalip: /taşınma(sı|si)\s*yasak|tasinmasi\s*yasak/i,
    sebep: "Madde adında 'taşınması yasaktır' ibaresi geçiyor",
  },
  {
    kalip: /carriage\s+prohibited|not\s+accepted\s+for\s+carriage/i,
    sebep: "Madde adında taşıma yasağı ibaresi geçiyor (carriage prohibited)",
  },
  {
    kalip: /\bTİP\s*A\b|\bTIP\s*A\b|\bTYPE\s*A\b/i,
    sebep:
      "Tip A kendiliğinden reaksiyona giren madde / organik peroksit — " +
      "ADR 2.2.41.2 ve 2.2.52.2 uyarınca taşımaya kabul edilmez",
  },
];

/**
 * Şüpheli durumlar — kesin yasak demek yerine kullanıcıyı kontrole
 * yönlendiren ifadeler.
 */
const KONTROL_IFADELERI: { kalip: RegExp; sebep: string }[] = [
  {
    kalip: /\bkuru\b|\bdry\b/i,
    sebep:
      "Madde adında 'kuru' ibaresi var — bazı birincil patlayıcılar kuru " +
      "hâlde taşınamaz, ıslatılmış hâlleri taşınabilir. Tablo A'daki doğru " +
      "satırı ve özel hükümleri kontrol et.",
  },
  {
    kalip: /desensiti[sz]ed|flegmat|duyarsız/i,
    sebep:
      "Duyarsızlaştırılmış madde — flegmatize edici oranı ADR'de belirtilen " +
      "sınırın altındaysa taşınamaz. Özel hükümleri kontrol et.",
  },
];

export type YasakKontrolGirdi = {
  un_number: string;
  proper_shipping_name: string;
  adr_class?: string | null;
};

/**
 * Bir maddenin ADR kapsamında taşınmasının yasak olup olmadığını
 * değerlendirir.
 */
export function yasakTasimaKontrol(madde: YasakKontrolGirdi): YasakSonuc {
  const un = (madde.un_number || "").trim().replace(/^UN\s*/i, "").padStart(4, "0");
  const ad = madde.proper_shipping_name || "";

  // 1) Kesin yasak UN listesi
  if (YASAK_PATLAYICILAR[un]) {
    return { yasak: true, kontrolGerekli: false, sebep: YASAK_PATLAYICILAR[un] };
  }

  // 2) Madde adında açık yasak ifadesi
  for (const { kalip, sebep } of YASAK_IFADELER) {
    if (kalip.test(ad)) {
      return { yasak: true, kontrolGerekli: false, sebep };
    }
  }

  // 3) Şüpheli — kullanıcı doğrulamalı
  for (const { kalip, sebep } of KONTROL_IFADELERI) {
    if (kalip.test(ad)) {
      return { yasak: false, kontrolGerekli: true, sebep };
    }
  }

  return { yasak: false, kontrolGerekli: false, sebep: "" };
}

/** Bir kalem listesini toplu değerlendirir. */
export function yasakTasimaKontrolListe(maddeler: YasakKontrolGirdi[]): {
  yasaklar: { un: string; ad: string; sebep: string }[];
  kontroller: { un: string; ad: string; sebep: string }[];
} {
  const yasaklar: { un: string; ad: string; sebep: string }[] = [];
  const kontroller: { un: string; ad: string; sebep: string }[] = [];

  for (const m of maddeler) {
    const s = yasakTasimaKontrol(m);
    if (s.yasak) {
      yasaklar.push({ un: m.un_number, ad: m.proper_shipping_name, sebep: s.sebep });
    } else if (s.kontrolGerekli) {
      kontroller.push({ un: m.un_number, ad: m.proper_shipping_name, sebep: s.sebep });
    }
  }

  return { yasaklar, kontroller };
}
