// src/lib/emniyetPlaniManuelAlanlar.ts
//
// EMNİYET PLANI — ELLE DOLDURULAN ALANLAR
//
// Şablondaki (belgeSablonlari.ts → EMNIYET_PLANI) "[ ]" ile bırakılmış
// tabloların ekranda doldurulabilen karşılığı. Her hücre ÇOK SATIRLI
// girilebilir ("\n" PDF tablo çizicisinde satır sonu olarak basılır).
//
// Kapsanan tablolar:
//   - Bölüm 3  İşletme ve Faaliyet Bilgileri   (sabit satır, değer sütunu)
//   - EK-2     Görevli Personel ve Yetki Matrisi (satır ekle/sil)
//   - EK-3     Acil ve Güvenlik İletişim Listesi (satır ekle/sil)
//   - EK-4     Eğitim Kayıtları                  (satır ekle/sil)
//   - EK-6     Güvenlik Olayı Bildirim Formu     (sabit satır, değer sütunu)
//
// Boş bırakılan alanlar şablondaki hâliyle ("[ ]" / boş satır) basılır;
// böylece doldurulmayan yerler kâğıt üzerinde elle doldurulabilir kalır.

import type { TemplateBlock } from "@/lib/belgeSablonlari";

export type AnahtarDeger = { etiket: string; deger: string; ipucu?: string };

export type EmniyetPlaniManuelVeri = {
  isletme: AnahtarDeger[];
  ek2: string[][];
  ek3: string[][];
  ek4: string[][];
  ek6: AnahtarDeger[];
};

export const EK2_BASLIKLAR = ["Ad Soyad", "Görev", "ADR Rolü", "Emniyet Sorumluluğu", "Yetki Seviyesi", "İletişim"];
export const EK3_BASLIKLAR = ["Kurum/Kişi", "Görev", "Telefon", "Ne Zaman Aranır?"];
export const EK4_BASLIKLAR = ["Personel", "Eğitim Konusu", "Tarih", "Sertifika No", "Tazeleme / Yenileme"];

export function varsayilanManuelVeri(firmaAdi: string): EmniyetPlaniManuelVeri {
  return {
    isletme: [
      { etiket: "Ticaret Unvanı", deger: firmaAdi || "" },
      { etiket: "TMFB No / Geçerlilik", deger: "" },
      { etiket: "Faaliyet Konuları", deger: "", ipucu: "Gönderen / Taşımacı / Paketleyen / Yükleyen / Dolduran / Boşaltan / vb." },
      { etiket: "Tesisler / Şubeler", deger: "" },
      { etiket: "Araç Sayısı ve Tipleri", deger: "" },
      { etiket: "Taşınan Tehlike Sınıfları", deger: "" },
      { etiket: "Yüksek Sonuç Doğurabilecek Madde Var mı?", deger: "", ipucu: "Evet/Hayır – Ek-1 değerlendirmesi" },
      { etiket: "TMGD / TMGDK", deger: "" },
      { etiket: "Acil Durum Sorumlusu", deger: "" },
      { etiket: "Güvenlik Sorumlusu", deger: "" },
    ],
    ek2: [bosSatir(EK2_BASLIKLAR.length)],
    ek3: [
      ["112 Acil Çağrı Merkezi", "Acil durum / kolluk / itfaiye / sağlık koordinasyonu", "112", "Hayati tehlike, saldırı, kaza vb."],
      ["TMGD", "Tehlikeli madde güvenlik danışmanı", "", "Güvenlik olayı / mevzuat değerlendirmesi"],
      ["İşletme Yetkilisi", "Yönetim / olay koordinasyonu", "", "Tüm kritik olaylar"],
      ["Taşıma Operasyon Sorumlusu", "Sevkiyat / araç / rota", "", "Araç-kargo güvenliği"],
    ],
    ek4: [bosSatir(EK4_BASLIKLAR.length)],
    ek6: [
      { etiket: "Olay Tarihi/Saati", deger: "" },
      { etiket: "Olay Yeri", deger: "" },
      { etiket: "Olay Türü", deger: "", ipucu: "Hırsızlık / Sabotaj / Yetkisiz Giriş / Şüpheli Durum / Diğer" },
      { etiket: "Araç / Plaka", deger: "" },
      { etiket: "UN No / Madde / Miktar", deger: "" },
      { etiket: "Olayın Açıklaması", deger: "" },
      { etiket: "Alınan İlk Tedbirler", deger: "" },
      { etiket: "Bildirim Yapılan Kurum/Kişiler", deger: "" },
      { etiket: "Kök Neden", deger: "" },
      { etiket: "Düzeltici/Önleyici Faaliyet", deger: "" },
      { etiket: "Sorumlu / Termin", deger: "" },
    ],
  };
}

export function bosSatir(n: number): string[] {
  return Array.from({ length: n }, () => "");
}

const dolu = (s: string) => s.trim() !== "";
const temizle = (s: string) => s.replace(/\r\n/g, "\n").replace(/\s+$/g, "");

/** Kayıtlı (eski sürüm olabilecek) veriyi güncel yapıya oturtur. */
export function veriyiNormallestir(ham: unknown, firmaAdi: string): EmniyetPlaniManuelVeri {
  const v = varsayilanManuelVeri(firmaAdi);
  if (!ham || typeof ham !== "object") return v;
  const h = ham as Partial<EmniyetPlaniManuelVeri>;
  const kv = (hedef: AnahtarDeger[], kaynak?: AnahtarDeger[]) =>
    hedef.map((s) => {
      const k = kaynak?.find((x) => x?.etiket === s.etiket);
      return typeof k?.deger === "string" ? { ...s, deger: k.deger } : s;
    });
  const tablo = (kaynak: unknown, n: number, yedek: string[][]) =>
    Array.isArray(kaynak) && kaynak.length > 0
      ? (kaynak as unknown[]).map((r) =>
          Array.from({ length: n }, (_, i) => (Array.isArray(r) && typeof r[i] === "string" ? (r[i] as string) : ""))
        )
      : yedek;
  return {
    isletme: kv(v.isletme, h.isletme),
    ek2: tablo(h.ek2, EK2_BASLIKLAR.length, v.ek2),
    ek3: tablo(h.ek3, EK3_BASLIKLAR.length, v.ek3),
    ek4: tablo(h.ek4, EK4_BASLIKLAR.length, v.ek4),
    ek6: kv(v.ek6, h.ek6),
  };
}

/** Bölüm 3 / EK-6 gibi iki sütunlu tablolar: değer boşsa şablondaki yer tutucu korunur. */
function anahtarDegerSatirlari(sablonSatirlari: string[][], alanlar: AnahtarDeger[]): string[][] {
  return sablonSatirlari.map((satir) => {
    const alan = alanlar.find((a) => a.etiket === satir[0]);
    return alan && dolu(alan.deger) ? [satir[0], temizle(alan.deger)] : satir;
  });
}

/** Satır ekle/sil tabloları: tamamen boş satırlar atılır; hiç dolu satır yoksa şablon aynen kalır. */
function listeSatirlari(sablonSatirlari: string[][], girilen: string[][], yerTutucuSutun?: number): string[][] {
  const doluSatirlar = girilen.filter((r) => r.some(dolu));
  if (doluSatirlar.length === 0) return sablonSatirlari;
  return doluSatirlar.map((r) =>
    r.map((h, i) => (dolu(h) ? temizle(h) : i === yerTutucuSutun ? "[ ]" : ""))
  );
}

/**
 * Şablon bloklarına ekranda girilen değerleri uygular. Orijinal diziyi
 * DEĞİŞTİRMEZ; yeni dizi döndürür. Tablolar başlıklarından tanınır.
 */
export function manuelAlanlariUygula(blocks: TemplateBlock[], veri: EmniyetPlaniManuelVeri): TemplateBlock[] {
  return blocks.map((b) => {
    if (b.type !== "table" || !b.headers) return b;
    const [h0, h1] = b.headers;
    if (h0 === "Bilgi" && h1 === "Doldurulacak Alan") {
      return { ...b, rows: anahtarDegerSatirlari(b.rows, veri.isletme) };
    }
    if (h0 === "Alan" && h1 === "Bilgi") {
      return { ...b, rows: anahtarDegerSatirlari(b.rows, veri.ek6) };
    }
    if (h0 === "Ad Soyad" && h1 === "Görev") {
      return { ...b, rows: listeSatirlari(b.rows, veri.ek2) };
    }
    if (h0 === "Kurum/Kişi") {
      return { ...b, rows: listeSatirlari(b.rows, veri.ek3, 2) };
    }
    if (h0 === "Personel" && h1 === "Eğitim Konusu") {
      return { ...b, rows: listeSatirlari(b.rows, veri.ek4) };
    }
    return b;
  });
}
