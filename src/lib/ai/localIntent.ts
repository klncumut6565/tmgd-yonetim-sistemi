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
  /** Beyaz listedeki bir eylem (firma bağlamı gerektirenler) */
  action?: AssistantAction;
  /** Doğrudan gidilecek global sayfa (firma bağlamı gerektirmez) */
  url?: string;
  /** Kullanıcıya gösterilecek kısa onay cümlesi */
  cevap: string;
};

/**
 * Sol menüdeki global sayfalar — firma seçili olmasa da açılabilir.
 * Sidebar.tsx'teki menü ile aynı tutulmalı.
 */
const GLOBAL_SAYFALAR: { anahtarlar: string[]; url: string; ad: string }[] = [
  { anahtarlar: ["gosterge paneli", "dashboard", "ana sayfa", "anasayfa"], url: "/dashboard", ad: "Gösterge Paneli" },
  { anahtarlar: ["firmalar", "firma listesi", "musteriler"], url: "/firms", ad: "Firmalar" },
  { anahtarlar: ["gorev", "gorevler", "is listesi"], url: "/tasks", ad: "Görevler" },
  { anahtarlar: ["belge olustur", "belge olusturma", "yeni belge"], url: "/belge-olustur", ad: "Belge Oluştur" },
  { anahtarlar: ["belgeler", "dokuman", "dokumanlar"], url: "/documents", ad: "Belgeler" },
  { anahtarlar: ["arac", "araclar", "tasit", "tasitlar"], url: "/vehicles", ad: "Araçlar" },
  { anahtarlar: ["surucu", "surucular", "sofor", "soforler"], url: "/drivers", ad: "Sürücüler" },
  { anahtarlar: ["personel", "personeller", "calisan", "calisanlar"], url: "/employees", ad: "Personeller" },
  { anahtarlar: ["ziyaret", "ziyaretler"], url: "/visits", ad: "Ziyaretler" },
  { anahtarlar: ["rapor", "raporlar"], url: "/reports", ad: "Raporlar" },
  { anahtarlar: ["adr bilgi motoru", "un sorgula", "tablo a"], url: "/adr", ad: "ADR Bilgi Motoru" },
  { anahtarlar: ["ayarlar", "ayar"], url: "/settings", ad: "Ayarlar" },
];

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

/** "bana", "lütfen" gibi dolgu kelimeleri ve ekran/pencere/sayfa gürültüsünü atar. */
function gurultuTemizle(metin: string): string {
  let s = metin;
  ["bana", "lutfen", "rica etsem", "hemen", "sen"].forEach((k) => {
    s = s.replace(new RegExp(`\\b${k}\\b`, "g"), " ");
  });
  return s.replace(/\s+/g, " ").trim();
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
const ACMA_FIILLERI = ["ac", "acar", "gec", "goster", "git", "getir", "acabilir", "acsana", "gidelim"];

// "ekran", "pencere", "sayfa", "sekme", "bolum" — hepsi aynı şeyi kasteder,
// eşleştirmede gürültü yaratmasın diye temizlenir.
const EKRAN_KELIMELERI = ["ekranini", "ekrani", "ekran", "penceresini", "pencereyi", "pencere", "sayfasini", "sayfayi", "sayfa", "sekmesini", "sekmeyi", "sekme", "bolumunu", "bolum", "listesini"];

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
  const m = gurultuTemizle(normalize(mesaj));

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
    EKRAN_KELIMELERI.forEach((k) => {
      firmaAdi = firmaAdi.replace(new RegExp(`\\b${k}\\b`, "gi"), "");
    });
    firmaAdi = firmaAdi.replace(/\s+/g, " ").trim();

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

  // ---- 4) Görev ekleme ---------------------------------------------------
  // "şu görevi ekle: ziyaret raporu girilecek", "görev oluştur ..."
  const gorevEkleEslesme = m.match(
    /(?:^|\s)(?:su\s+)?gorev(?:i|ini)?\s*(?:ekle|olustur|yaz|tanimla)\s*:?\s*(.+)$/
  );
  if (gorevEkleEslesme) {
    const baslikHam = gorevEkleEslesme[1].trim();
    if (baslikHam.length >= 3) {
      // Orijinal metinden başlığı al (normalize edilmiş halden değil) —
      // Türkçe karakterler korunsun.
      const orijinal = mesaj.trim();
      const idx = orijinal.toLocaleLowerCase("tr-TR").search(/(?:ekle|oluştur|olustur|yaz|tanımla|tanimla)\s*:?\s*\S/);
      let baslik = baslikHam;
      if (idx !== -1) {
        const sonrasi = orijinal.slice(idx).replace(/^\S+\s*:?\s*/, "").trim();
        if (sonrasi.length >= 3) baslik = sonrasi;
      }
      // İlk harfi büyüt
      baslik = baslik.charAt(0).toLocaleUpperCase("tr-TR") + baslik.slice(1);
      return {
        action: { type: "prefill_task", title: baslik.slice(0, 200) },
        cevap: `Görevler sayfasını açıyorum, başlığı "${baslik}" olarak doldurdum. Firmayı seçip "Ekle" butonuna basman yeterli.`,
      };
    }
  }

  // ---- 5) Global sayfa açma (firma bağlamı GEREKTİRMEZ) -----------------
  // "görevler penceresini aç", "raporlara git" — sol menüdeki sayfalar.
  // Firma içi sekme eşleşmesi bulunamadıysa (ya da firma bağlamı yoksa)
  // buraya düşer.
  if (acmaNiyetiVarMi(m)) {
    const sayfa = GLOBAL_SAYFALAR.find((s) => s.anahtarlar.some((a) => m.includes(a)));
    if (sayfa) {
      return {
        url: sayfa.url,
        cevap: `${sayfa.ad} sayfasını açıyorum.`,
      };
    }
  }

  // Net bir eşleşme yok — LLM'e bırak
  return null;
}
