// src/lib/ai/localIntent.ts
//
// YEREL NİYET SINIFLANDIRICI (Rasa'nın temel prensibinden uyarlandı)
//
// Rasa gibi konuşma çerçeveleri her mesajı bir dil modeline göndermez —
// önce kullanıcının niyetini kendi sınıflandırıcısıyla çözmeye çalışır,
// sadece belirsiz durumlarda daha ağır katmanlara gider.
//
// Bizde de aynı mantık: "görevler ekranını aç" gibi NET komutlar için
// LLM'e hiç gitmeye gerek yok. Bu:
//   - API kotası tükendiğinde bile çalışır (çevrimdışı dayanıklılık)
//   - Anında yanıt verir (ağ gecikmesi yok)
//   - Hiçbir maliyet doğurmaz
//   - Deterministiktir — aynı komut her zaman aynı sonucu verir
//
// TASARIM KURALI: Burada YALNIZCA çok net eşleşmeler yakalanır. En ufak
// bir belirsizlikte null döndürülür ve normal LLM akışına devam edilir.
// Yanlış bir tahmin, LLM'e gitmekten daha kötüdür.

import type { AssistantAction, FirmTabKey } from "./actions";

export type LocalIntentSonuc = {
  action: AssistantAction;
  /** Kullanıcıya gösterilecek kısa onay cümlesi */
  cevap: string;
};

/** Türkçe karakterleri sadeleştirip küçük harfe çevirir (eşleştirme için). */
function normalize(metin: string): string {
  return metin
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sekme adı eş anlamlıları — kullanıcı farklı kelimeler kullanabilir. */
const SEKME_ESLESMELERI: { anahtarlar: string[]; tab: FirmTabKey; ad: string }[] = [
  { anahtarlar: ["gorev", "gorevler", "is listesi"], tab: "tasks", ad: "Görevler" },
  { anahtarlar: ["belge takip", "belge takibi"], tab: "belge_takip", ad: "Belge Takip" },
  { anahtarlar: ["belge olustur", "belge olusturma", "yeni belge"], tab: "belge_olustur", ad: "Belge Oluştur" },
  { anahtarlar: ["belgeler", "dokuman", "dokumanlar"], tab: "documents", ad: "Belgeler" },
  { anahtarlar: ["arac", "araclar", "tasit", "tasitlar"], tab: "vehicles", ad: "Araçlar" },
  { anahtarlar: ["surucu", "surucular", "sofor", "soforler"], tab: "drivers", ad: "Sürücüler" },
  { anahtarlar: ["personel", "personeller", "calisan", "calisanlar"], tab: "employees", ad: "Personeller" },
  { anahtarlar: ["ziyaret", "ziyaretler"], tab: "visits", ad: "Ziyaretler" },
  { anahtarlar: ["tasima evraki", "tasima evragi", "adr transport", "sevkiyat evraki"], tab: "adr_transport", ad: "Taşıma Evrakı" },
  { anahtarlar: ["firma bilgileri", "firma bilgisi", "genel bilgiler"], tab: "genel", ad: "Firma Bilgileri" },
  { anahtarlar: ["denetim izi", "denetim kaydi", "audit"], tab: "denetim", ad: "Denetim İzi" },
  { anahtarlar: ["not", "notlar"], tab: "notlar", ad: "Notlar" },
];

/** "aç/git/göster" gibi navigasyon niyeti bildiren fiiller. */
const ACMA_FIILLERI = ["ac", "acar", "gec", "goster", "git", "getir", "acabilir"];

function acmaNiyetiVarMi(metin: string): boolean {
  return ACMA_FIILLERI.some((f) => new RegExp(`\\b${f}`, "i").test(metin));
}

/** Metinden UN numaralarını çıkarır (4 haneli sayılar). */
function unNumaralariniCikar(metin: string): string[] {
  const eslesmeler = metin.match(/\b\d{4}\b/g) ?? [];
  return Array.from(new Set(eslesmeler)).slice(0, 10);
}

/**
 * Kullanıcı mesajını yerel olarak sınıflandırmayı dener.
 * Net bir eşleşme yoksa null döner → normal LLM akışı devreye girer.
 *
 * @param mesaj Kullanıcının yazdığı/söylediği metin
 * @param firmaBagalamiVar Şu an bir firma sayfasında mıyız?
 */
export function yerelNiyetCoz(mesaj: string, firmaBagalamiVar: boolean): LocalIntentSonuc | null {
  const m = normalize(mesaj);

  // Çok uzun mesajlar genelde soru/sohbettir, komut değil — LLM'e bırak
  if (m.length > 90) return null;

  // ---- 1) Karışık yükleme kontrolü -------------------------------------
  // "UN 1203 ile UN 1170 taşınabilir mi", "1203 1170 karışık yükleme"
  const unNumaralari = unNumaralariniCikar(m);
  const karisikIfadeleri = ["karisik yukleme", "birlikte tasi", "beraber tasi", "ayni araca", "birlikte yukle"];
  const karisikNiyeti =
    karisikIfadeleri.some((k) => m.includes(k)) ||
    (unNumaralari.length >= 2 && /(tasi|yukle|olur mu|uygun mu|mumkun mu)/.test(m));

  if (karisikNiyeti && unNumaralari.length >= 2) {
    return {
      action: { type: "open_karisik_yukleme", un_numbers: unNumaralari },
      cevap: `Karışık yükleme kontrolünü UN ${unNumaralari.join(", ")} için açıyorum.`,
    };
  }

  // ---- 2) İsimle firma açma --------------------------------------------
  // "ABC firmasını aç", "XYZ Ltd firmasına git"
  const firmaEslesme = m.match(/(?:^|\s)(.+?)\s*(?:firmasin[ıi]|firmasina|firmasi|sirketini|sirketine)\s*(?:\w+\s*)?$/);
  if (firmaEslesme && acmaNiyetiVarMi(m)) {
    // Fiil kelimelerini isimden ayıkla
    let firmaAdi = firmaEslesme[1];
    ACMA_FIILLERI.forEach((f) => {
      firmaAdi = firmaAdi.replace(new RegExp(`\\b${f}\\w*\\b`, "gi"), "");
    });
    firmaAdi = firmaAdi.trim();

    if (firmaAdi.length >= 2) {
      // Sekme de belirtilmiş olabilir: "ABC firmasının görevlerini aç"
      const sekme = SEKME_ESLESMELERI.find((s) => s.anahtarlar.some((a) => m.includes(a)));
      return {
        action: {
          type: "open_firm",
          firm_name: firmaAdi,
          ...(sekme ? { tab: sekme.tab } : {}),
          ...(unNumaralari.length > 0 ? { un_numbers: unNumaralari } : {}),
        },
        cevap: sekme
          ? `"${firmaAdi}" firmasının ${sekme.ad} ekranını açıyorum.`
          : `"${firmaAdi}" firmasını açıyorum.`,
      };
    }
  }

  // ---- 3) Mevcut firma içinde sekme geçişi ------------------------------
  // "görevler ekranını aç", "taşıma evrakına geç"
  if (firmaBagalamiVar && acmaNiyetiVarMi(m)) {
    const sekme = SEKME_ESLESMELERI.find((s) => s.anahtarlar.some((a) => m.includes(a)));
    if (sekme) {
      return {
        action: {
          type: "open_firm_tab",
          tab: sekme.tab,
          ...(unNumaralari.length > 0 && sekme.tab === "adr_transport"
            ? { un_numbers: unNumaralari }
            : {}),
        },
        cevap:
          unNumaralari.length > 0 && sekme.tab === "adr_transport"
            ? `${sekme.ad} ekranını açıyorum, UN ${unNumaralari.join(", ")} envanterde aranacak. Miktarı sen girip "Kalem Ekle"ye basmalısın.`
            : `${sekme.ad} ekranını açıyorum.`,
      };
    }
  }

  // Net bir eşleşme yok — LLM'e bırak
  return null;
}
