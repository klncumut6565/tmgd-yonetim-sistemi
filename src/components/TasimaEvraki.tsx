"use client";

// =========================================================================
// TAŞIMA EVRAKI (ADR Transport — Aşama 3)
//
// Firma bazlı taşıma evrakı düzenleyicisi:
//   • Ürün ekleme YALNIZCA firmanın Kimyasal Envanterinden yapılır
//     (envanterdeki ADR alanları hazır geldiği için Tablo A'ya tekrar
//     gidilmez; envanter boşsa kullanıcı önce envantere yönlendirilir).
//   • 1.1.3.6 puanı, turuncu plaka ve tünel kısıtlaması her değişiklikte
//     CANLI hesaplanır (ADR sayfasındaki doğrulanmış formülün aynısı:
//     kategori bazında topla, SONRA çarp — Kat.1×50 + Kat.2×3 + Kat.3×1,
//     Kat.4 serbest, Kat.0 muafiyetsiz).
//   • PDF, sistemin jsPDF + Liberation Sans motoruyla üretilir; önizleme
//     her zaman ekrandaki güncel ürün listesinden anlık oluşturulur
//     (Streamlit'teki "bayat PDF" hatasının buradaki karşılığı yapısal
//     olarak imkânsız: PDF bir yerde saklanmaz, her basışta üretilir).
//
// Yetki: Kaydet/Sil hem yazabilir() ekibi HEM DE firma kullanıcısı (company)
// için açık — company kendi firmasının taşıma evrakını oluşturup
// düzenleyebilir/silebilir (bkz. database/migrations/053_tasima_evraki_company_yazma.sql).
// RLS bunu kullanıcının kendi firmasıyla sınırlar; company başka bir firmanın
// evrakına asla yazamaz.
// =========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import { useUser } from "@/hooks/useUser";
import type { jsPDF as JsPDFType } from "jspdf";
import { checkPair, CheckResult, UnRow as MixUnRow } from "@/lib/adrMix";
import { checkSecurityPlan, type SecurityPlanItem } from "@/lib/adrSecurityPlan";
import { yasakTasimaKontrolListe } from "@/lib/adrYasakTasima";
import {
  LIBERATION_SANS_REGULAR_B64,
  LIBERATION_SANS_BOLD_B64,
} from "@/lib/pdfFonts";
import DateInput from "@/components/DateInput";
import type { LogoData } from "@/lib/aracEvraklariPdf";

// ── Tipler ────────────────────────────────────────────────────────────────
/** ADR Tablo A satırı (adr_un_numbers tablosu) */
type TabloARow = {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  class: string | null;
  classification_code: string | null;
  packing_group: string | null;
  tunnel_code: string | null;
  transport_category: string | null;
  labels: string | null;
};

/**
 * ADR ambalaj türleri — ADR Bölüm 6.1 ambalaj kodlarıyla uyumlu, TMGD'nin
 * günlük kullandığı pratik liste. Serbest metin yerine liste kullanmak
 * evraklarda tutarlılık sağlar (aynı ambalaj her evrakta aynı yazılır).
 * "Diğer" seçilirse serbest metin alanı açılır.
 */
const AMBALAJ_TURLERI = [
  "Çelik varil (1A1/1A2)",
  "Plastik varil (1H1/1H2)",
  "Fiber varil (1G)",
  "Çelik bidon (3A1/3A2)",
  "Plastik bidon (3H1/3H2)",
  "Çelik kutu (4A)",
  "Karton kutu (4G)",
  "Plastik kutu (4H1/4H2)",
  "Ahşap kutu (4C1/4C2)",
  "Plastik torba (5H2/5H3)",
  "Çuval",
  "Dökme yük",
  "Kompozit ambalaj (6HA1)",
  "IBC - plastik (31H1/31HA1)",
  "IBC - çelik (31A)",
  "Tank / Tanker",
  "Gaz tüpü",
  "Diğer",
] as const;

type Envanter = {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  adr_class: string | null;
  classification_code: string | null;
  packing_group: string | null;
  tunnel_code: string | null;
  transport_category: string | null;
  labels: string | null; // karışık yükleme motoru etiketlerden çalışır
  trade_name: string | null;
};

/** Firma bazlı alıcı rehberi kaydı (firm_consignees) */
type Consignee = {
  id: string;
  title: string;
  address: string | null;
};

type Kalem = {
  firm_chemical_id: string | null;
  un_number: string;
  proper_shipping_name: string;
  adr_class: string | null;
  classification_code: string | null;
  labels: string | null;
  packing_group: string | null;
  tunnel_code: string | null;
  transport_category: string | null;
  packaging_type: string;
  packaging_count: number;
  quantity: number;
  unit: string;
  is_lq: boolean;
  is_eq: boolean;
};

type Surucu = { id: string; first_name: string; last_name: string; adr_certificate_no: string | null; adr_valid_until: string | null };
type Arac = { id: string; plate_number: string; brand: string | null; adr_certificate_no: string | null };


/**
 * Otomatik evrak numarası üretir: ADR-YYYYAAGG-SSDDss
 * Örnek: ADR-20260729-101443
 *
 * Tarih+saat tabanlı olduğu için veritabanına sormaya gerek kalmadan
 * benzersizdir ve kronolojik sıralanır.
 */
function evrakNoUret(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const tarih = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const saat = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `ADR-${tarih}-${saat}`;
}

type EvrakOzet = { id: string; document_no: string; transport_date: string | null; status: string | null; total_points: number | null; tunnel_restriction_code: string | null };

// ── ADR 1.1.3.6 motoru (src/app/adr/page.tsx ile aynı, doğrulanmış) ──────
const CAT_MUL: Record<string, number> = { "1": 50, "2": 3, "3": 1, "4": 0 };

function hesapla1136(kalemler: Kalem[]) {
  // Kategori bazında miktarları topla, SONRA çarp (ADR 1.1.3.6.4).
  const katMiktar: Record<string, number> = {};
  let muafiyetsiz = false; // Kat.0 veya kategori bilinmiyor → muafiyet yok
  for (const k of kalemler) {
    if (k.is_lq || k.is_eq) continue; // LQ/EQ kalemleri 1.1.3.6 toplamına girmez
    const cat = (k.transport_category || "").trim();
    if (!(cat in CAT_MUL)) {
      muafiyetsiz = true;
      continue;
    }
    katMiktar[cat] = (katMiktar[cat] || 0) + k.quantity;
  }
  let puan = 0;
  for (const [cat, mik] of Object.entries(katMiktar)) puan += mik * CAT_MUL[cat];
  const plakaGerekli = muafiyetsiz || puan > 1000;
  return { puan, plakaGerekli, muafiyetsiz };
}

// En kısıtlayıcı tünel kodu: E > D > C > B (harf büyüdükçe kısıt artar);
// "D/E" gibi çiftlerde tank dışı taşıma için İLK harf esas alınır.
const TUNEL_SIRA: Record<string, number> = { B: 1, C: 2, D: 3, E: 4 };
function tunelKisiti(kalemler: Kalem[]): string {
  let enKisit = "";
  let enDeger = 0;
  for (const k of kalemler) {
    if (k.is_lq || k.is_eq) continue;
    const kod = (k.tunnel_code || "").toUpperCase().replace(/[()]/g, "").trim();
    if (!kod || kod === "-") continue;
    const ilkHarf = kod.split("/")[0].trim().charAt(0);
    const deger = TUNEL_SIRA[ilkHarf] || 0;
    if (deger > enDeger) {
      enDeger = deger;
      enKisit = kod;
    }
  }
  return enKisit || "—";
}

// ── PDF üretimi ──────────────────────────────────────────────────────────
const FONT = "LiberationSans";

async function evrakPdfUret(args: {
  firmaAdi: string;
  evrakNo: string;
  tarih: string;
  gonderen: string;
  gonderenSorumlu: string;
  alici: string;
  tasiyici: string;
  surucu: Surucu | null;
  arac: Arac | null;
  /** Kayıtlı sürücü/araç seçilmediyse elle yazılan serbest metin. */
  surucuManuel: string;
  aracManuel: string;
  kalemler: Kalem[];
  puan: number;
  plakaGerekli: boolean;
  muafiyetsiz: boolean;
  tunel: string;
  notlar: string;
  /** Firma logosu — antet bandının sol tarafında belirgin şekilde basılır. */
  logo?: LogoData;
}) {
  const { default: jsPDF } = (await import("jspdf")) as unknown as {
    default: new (o?: object) => JsPDFType;
  };
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.addFileToVFS("LiberationSans-Regular.ttf", LIBERATION_SANS_REGULAR_B64);
  doc.addFont("LiberationSans-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("LiberationSans-Bold.ttf", LIBERATION_SANS_BOLD_B64);
  doc.addFont("LiberationSans-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");

  const M = 12, W = 210, H = 297; // A4 mm — H imza konumu hesabında kullanılır
  const NAVY: [number, number, number] = [30, 58, 138];
  let y = 14;

  // ── FİLİGRAN (antetli kağıt) — firma logosu sayfanın TAM ORTASINDA,
  // ARKA PLANDA soluk şekilde basılır; içerik bunun ÜZERİNE yazılır.
  // jsPDF'te opaklık GState ile ayarlanır — logo çizildikten sonra
  // opaklık 1'e döndürülür ki sonraki tüm metin/çizgiler net kalsın.
  //
  // ÖNEMLİ: Bu blok, sayfadaki ilk çizim işlemi olmalı (arka planda
  // kalması için). Çok sayfalı evraklarda (tablo taşarsa) her yeni
  // sayfaya da uygulanır — bkz. filigranEkle() çağrıları.
  const filigranEkle = () => {
    if (!args.logo) return;
    try {
      const gs = (doc as unknown as {
        GState: (o: { opacity: number }) => unknown;
        setGState: (g: unknown) => void;
      });
      gs.setGState(gs.GState({ opacity: 0.16 }));
      // Logo, sayfa genişliğinin ~%65'i kadar büyük ve tam merkezde
      const hedefGenislik = W * 0.65;
      const oran = args.logo.enBoyOrani > 0 ? args.logo.enBoyOrani : 1;
      const fw = hedefGenislik;
      const fh = fw / oran;
      doc.addImage(args.logo.data, args.logo.fmt, W / 2 - fw / 2, H / 2 - fh / 2, fw, fh);
      gs.setGState(gs.GState({ opacity: 1 }));
    } catch {
      /* GState desteklenmiyorsa filigran atlanır, belge yine üretilir */
    }
  };
  filigranEkle();

  // Evrak No / Tarih — sağ üst köşe
  doc.setFontSize(9); doc.setFont(FONT, "bold"); doc.setTextColor(0, 0, 0);
  doc.text(`Evrak No: ${args.evrakNo}`, W - M, y + 2, { align: "right" });
  doc.text(`Tarih: ${args.tarih}`, W - M, y + 7, { align: "right" });

  // Sol üst kısıma firma logosu — 25mm x 25mm
  let logoH = 0;
  if (args.logo) {
    try {
      const logoW = 25;
      const oran = args.logo.enBoyOrani > 0 ? args.logo.enBoyOrani : 1;
      logoH = logoW / oran;
      doc.addImage(args.logo.data, args.logo.fmt, M, y, logoW, logoH);
    } catch {
      /* Logo eklenmezse devam et */
    }
  }

  // Başlık — sayfanın en üstüne ortalanmış (kaydırma yok)
  doc.setFontSize(14); doc.setFont(FONT, "bold"); doc.setTextColor(...NAVY);
  doc.text("TAŞIMA EVRAKI", W / 2, y + 8, { align: "center" });
  doc.setFontSize(8); doc.setFont(FONT, "normal"); doc.setTextColor(90, 90, 90);
  doc.text("ADR Bölüm 5.4.1 uyarınca düzenlenmiştir", W / 2, y + 13, { align: "center" });
  doc.setTextColor(0, 0, 0);
  // Logo yüksekliği + başlık alanı + Gönderen kutusu arasına mesafe (4mm)
  y += Math.max(logoH, 20) + 4;

  // Gönderen / Alıcı kutuları — yükseklik, unvan + adresin (artık ikisi de
  // isim+adres birleşik basılıyor) rahat sığması için 22->26mm büyütüldü.
  const kutuY = y, kutuH = 26, kutuW = (W - 2 * M - 4) / 2;
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.rect(M, kutuY, kutuW, kutuH);
  doc.rect(M + kutuW + 4, kutuY, kutuW, kutuH);
  doc.setFontSize(7.5); doc.setFont(FONT, "bold"); doc.setTextColor(...NAVY);
  doc.text("GÖNDEREN", M + 2, kutuY + 4.5);
  doc.text("ALICI", M + kutuW + 6, kutuY + 4.5);
  doc.setFont(FONT, "normal"); doc.setTextColor(0, 0, 0); doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(args.gonderen || "—", kutuW - 4), M + 2, kutuY + 9.5);
  doc.text(doc.splitTextToSize(args.alici || "—", kutuW - 4), M + kutuW + 6, kutuY + 9.5);
  
  // Gönderen sorumlu kişi — küçük yazı ile kutunun altında
  if (args.gonderenSorumlu) {
    doc.setFontSize(7); doc.setFont(FONT, "normal"); doc.setTextColor(80, 80, 80);
    doc.text(`Sorumlu: ${args.gonderenSorumlu}`, M, kutuY + kutuH + 3.5);
  }
  
  y = kutuY + kutuH + (args.gonderenSorumlu ? 8 : 5);

  // Taşıyıcı / Sürücü / Araç şeridi
  doc.setFontSize(8);
  const surucuAd = args.surucu
    ? `${args.surucu.first_name} ${args.surucu.last_name}`
    : (args.surucuManuel.trim() || "—");
  const aracBilgi = args.arac
    ? `${args.arac.plate_number}${args.arac.brand ? " · " + args.arac.brand : ""}`
    : (args.aracManuel.trim() || "—");
  // Taşıyıcı / Sürücü / Araç şeridi — üç alan sabit sütunlarda.
  // ÖNEMLİ: değerler kendi sütun genişliğine SARILIR (splitTextToSize);
  // aksi halde uzun bir taşıyıcı unvanı yandaki "Sürücü" alanının üzerine
  // taşıp okunmaz hale geliyordu. Satır yüksekliği, en çok satıra sarılan
  // alana göre belirlenir.
  const seritSutunlar = [
    { etiket: "Taşıyıcı:", deger: args.tasiyici || "—", x: M, degerX: M + 15, genislik: 78 - 15 - 3 },
    { etiket: "Sürücü:", deger: surucuAd, x: M + 78, degerX: M + 91, genislik: 140 - 91 - 3 },
    { etiket: "Araç:", deger: aracBilgi, x: M + 140, degerX: M + 150, genislik: W - M - 150 },
  ];
  let seritEnFazlaSatir = 1;
  for (const s of seritSutunlar) {
    doc.setFont(FONT, "bold");
    doc.text(s.etiket, s.x, y);
    doc.setFont(FONT, "normal");
    const satirlar: string[] = doc.splitTextToSize(s.deger, s.genislik);
    doc.text(satirlar, s.degerX, y);
    if (satirlar.length > seritEnFazlaSatir) seritEnFazlaSatir = satirlar.length;
  }
  y += 6 + (seritEnFazlaSatir - 1) * 3.6;

  // Ürün tablosu
  const kolonlar = [
    { b: "No", w: 8 }, { b: "UN No", w: 17 }, { b: "Uygun Sevkiyat Adı", w: 62 },
    { b: "Sınıf", w: 12 }, { b: "PG", w: 10 }, { b: "Tünel", w: 13 },
    { b: "Taşıma Türü", w: 32 }, { b: "Adet", w: 11 }, { b: "Miktar", w: 21 },
  ];
  const tabloW = kolonlar.reduce((a, k) => a + k.w, 0);
  // Başlık satırı
  doc.setFillColor(...NAVY);
  doc.rect(M, y, tabloW, 6, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont(FONT, "bold");
  let x = M;
  for (const k of kolonlar) {
    doc.text(k.b, x + k.w / 2, y + 4, { align: "center" });
    x += k.w;
  }
  y += 6;
  doc.setTextColor(0, 0, 0); doc.setFont(FONT, "normal"); doc.setFontSize(7.5);

  args.kalemler.forEach((k, i) => {
    const adSatirlari: string[] = doc.splitTextToSize(
      k.proper_shipping_name + (k.is_lq ? "  [LQ]" : "") + (k.is_eq ? "  [EQ]" : ""),
      kolonlar[2].w - 3
    );
    // Taşıma Türü sütunundaki metinler de kontrol et — satır sayısı maksimum olmalı
    let maxSatirSayisi = adSatirlari.length;
    if (k.packaging_type) {
      const tasimaturuSatirlari = doc.splitTextToSize(k.packaging_type, kolonlar[6].w - 1);
      maxSatirSayisi = Math.max(maxSatirSayisi, tasimaturuSatirlari.length);
    }
    const satirH = Math.max(6, maxSatirSayisi * 3.4 + 2.4);
    if (i % 2 === 1) {
      doc.setFillColor(245, 247, 251);
      doc.rect(M, y, tabloW, satirH, "F");
    }
    doc.setDrawColor(200, 200, 200);
    doc.rect(M, y, tabloW, satirH);
    const hucreler = [
      String(i + 1), `UN ${k.un_number}`, "", k.adr_class || "—",
      k.packing_group || "—", k.tunnel_code || "—",
      k.packaging_type || "—", String(k.packaging_count),
      `${k.quantity} ${k.unit}`,
    ];
    x = M;
    hucreler.forEach((h, ci) => {
      if (ci === 2) {
        // Ürün adı — çok satırlı
        doc.text(adSatirlari, x + 1.5, y + 3.8, { maxWidth: kolonlar[ci].w - 3 });
      } else if (ci === 6) {
        // Taşıma Türü — çok satırlı olabilir
        const tasimaturuSatirlari = doc.splitTextToSize(h, kolonlar[ci].w - 2);
        doc.text(tasimaturuSatirlari, x + 1.5, y + 3.8);
      } else {
        // Diğer sütunlar — tek satır, merkez
        doc.text(h, x + kolonlar[ci].w / 2, y + satirH / 2 + 1.2, { 
          align: "center",
          maxWidth: kolonlar[ci].w - 1 
        });
      }
      x += kolonlar[ci].w;
    });
    y += satirH;
  });
  y += 4;

  // ADR uyumluluk şeridi
  doc.setFillColor(args.plakaGerekli ? 254 : 240, args.plakaGerekli ? 242 : 253, args.plakaGerekli ? 242 : 244);
  doc.rect(M, y, W - 2 * M, 12, "F");
  doc.setDrawColor(args.plakaGerekli ? 220 : 22, args.plakaGerekli ? 38 : 163, args.plakaGerekli ? 38 : 74);
  doc.rect(M, y, W - 2 * M, 12);
  doc.setFontSize(8); doc.setFont(FONT, "bold");
  const puanMetni = args.muafiyetsiz
    ? "1.1.3.6 muafiyeti YOK (Taşıma Kategorisi 0 veya bilinmeyen madde içeriyor)"
    : `1.1.3.6 Puanı: ${args.puan.toFixed(0)} / 1000`;
  doc.text(puanMetni, M + 3, y + 5);
  doc.text(
    args.plakaGerekli ? "TURUNCU PLAKA ZORUNLU" : "Turuncu plaka gerekmez (1.1.3.6 muafiyeti)",
    M + 3, y + 9.5
  );
  doc.setFont(FONT, "normal");
  doc.text(`Tünel Kısıtlaması: ${args.tunel}`, W - M - 3, y + 7.5, { align: "right" });
  y += 16;

  if (args.notlar.trim()) {
    doc.setFontSize(7.5);
    doc.setFont(FONT, "bold"); doc.text("Notlar:", M, y);
    doc.setFont(FONT, "normal");
    const notSatirlari: string[] = doc.splitTextToSize(args.notlar, W - 2 * M - 14);
    doc.text(notSatirlari, M + 13, y);
    y += notSatirlari.length * 3.4 + 4;
  }

  // İmza kutuları — içeriğin HEMEN ALTINA yerleştirilir.
  // Önceden Math.max(y + 4, 250) ile sayfanın en altına sabitleniyordu;
  // az kalemli evraklarda ürün listesi ile imza arasında büyük bir boşluk
  // kalıyordu. Artık içeriği takip ediyor, yalnızca sayfaya sığmayacaksa
  // yeni sayfaya geçiyor.
  //
  // Kutu yüksekliği 24->32mm büyütüldü: başlık + (sürücü kutusunda) ad
  // satırının ALTINA, ADR 5.4.1.1.1/f kapsamındaki küçük puntolu beyan
  // metinleri sığsın diye (bkz. aşağıdaki beyanGoster()).
  let imzaY = y + 6;
  const IMZA_YUKSEKLIK = 32;
  if (imzaY + IMZA_YUKSEKLIK > H - 18) {
    doc.addPage();
    filigranEkle(); // yeni sayfada da antetli kağıt görünümü korunsun
    imzaY = M + 6;
  }
  const imzaW = (W - 2 * M - 8) / 2;
  doc.setDrawColor(150, 150, 150);
  doc.rect(M, imzaY, imzaW, IMZA_YUKSEKLIK);
  doc.rect(M + imzaW + 8, imzaY, imzaW, IMZA_YUKSEKLIK);
  doc.setFontSize(7.5); doc.setFont(FONT, "bold");
  doc.text("GÖNDEREN (Ad Soyad / Kaşe / İmza)", M + imzaW / 2, imzaY + 4.5, { align: "center" });
  doc.text("SÜRÜCÜ (Ad Soyad / İmza)", M + imzaW + 8 + imzaW / 2, imzaY + 4.5, { align: "center" });
  doc.setFont(FONT, "normal"); doc.setFontSize(8);
  doc.text(surucuAd, M + imzaW + 8 + imzaW / 2, imzaY + 12, { align: "center" });

  // İmza alanının hemen alt satırı — ADR 5.4.1.1.1/f kapsamındaki
  // sorumluluk beyanları, küçük puntoyla (6pt) her kutunun tabanına
  // yaslı basılır.
  const beyanGoster = (metin: string, merkezX: number) => {
    const satirlar = doc.splitTextToSize(metin, imzaW - 4);
    const baslangicY = imzaY + IMZA_YUKSEKLIK - (satirlar.length - 1) * 2.6 - 2.5;
    doc.text(satirlar, merkezX, baslangicY, { align: "center" });
  };
  doc.setFontSize(6);
  doc.setTextColor(90, 90, 90);
  beyanGoster(
    "Tehlikeli maddelerin sınıflandırılması, paketlenmesi ve etiketlenmesinin ADR hükümlerine uygun olduğunu beyan ederim. (ADR 5.4.1.1.1/f)",
    M + imzaW / 2
  );
  beyanGoster(
    "Yükü teslim aldığımı ve taşımanın ADR hükümlerine uygun olarak gerçekleştirileceğini kabul ederim.",
    M + imzaW + 8 + imzaW / 2
  );
  doc.setTextColor(0, 0, 0);

  // Alt bilgi
  doc.setFontSize(6.5); doc.setTextColor(130, 130, 130);
  doc.text(
    "Bu belge ADR Yönetmeliği Madde 5.4.1 kapsamında düzenlenmiştir.",
    W / 2, 290, { align: "center" }
  );
  return doc;
}

// ── Bileşen ──────────────────────────────────────────────────────────────
export default function TasimaEvraki({
  firmId,
  firmaAdi,
  prefillUnNumbers,
  prefillMiktar,
  preselectEvrakId,
}: {
  firmId: string;
  firmaAdi: string;
  /** ADR Asistanı'ndan gelen "şu UN numaralarını ekle" isteği — envanterde
   * bulunan ilk eşleşme otomatik seçilir, miktar girişi kullanıcıda kalır
   * (gerçek bir taşıma belgesi olduğu için miktarı asistan uydurmaz). */
  prefillUnNumbers?: string[];
  /** Asistandan gelen miktar — forma doldurulur, onay yine kullanıcıda. */
  prefillMiktar?: number;
  /** Sevkiyatlar sekmesinden "Aç" ile gelindiğinde, bu ID'li evrakı
   *  otomatik olarak editöre yükler (bkz. evrakAc()). */
  preselectEvrakId?: string;
}) {
  const { canWrite: canWriteGenel, profile } = useUser();
  // Taşıma Evrakı için ayrık yetki: genel yazma yetkisi olanlar (TMGD ekibi)
  // VEYA kendi firmasındaki 'company' kullanıcısı. Diğer tüm ekranlarda
  // company hâlâ salt okunur — bu yalnızca bu bileşene özel bir istisna.
  const canWrite = canWriteGenel || profile?.role === "company";

  const [envanter, setEnvanter] = useState<Envanter[]>([]);
  const [suruculer, setSuruculer] = useState<Surucu[]>([]);
  const [araclar, setAraclar] = useState<Arac[]>([]);
  const [evraklar, setEvraklar] = useState<EvrakOzet[]>([]);
  const [hata, setHata] = useState("");
  const [mesaj, setMesaj] = useState("");

  // Editör durumu
  const [evrakId, setEvrakId] = useState<string | null>(null);
  const [evrakNo, setEvrakNo] = useState(() => evrakNoUret());
  const [tarih, setTarih] = useState(() => new Date().toISOString().slice(0, 10));
  const [gonderen, setGonderen] = useState(firmaAdi);
  const [gonderenAdres, setGonderenAdres] = useState("");
  const [gonderenSorumlu, setGonderenSorumlu] = useState("");
  const [firmaAdresVarsayilan, setFirmaAdresVarsayilan] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [alici, setAlici] = useState("");
  const [aliciAdres, setAliciAdres] = useState("");

  // Firma bazlı alıcı rehberi — bir kez kaydedilir, sonraki evraklarda
  // listeden seçilir (migration 035: firm_consignees)
  const [aliciListesi, setAliciListesi] = useState<Consignee[]>([]);
  const [aliciKaydediliyor, setAliciKaydediliyor] = useState(false);
  // Taşıyıcı rehberi (migration 058: firm_carriers) — alıcı rehberiyle
  // AYNI desen.
  const [tasiyiciListesi, setTasiyiciListesi] = useState<Consignee[]>([]);
  const [tasiyiciKaydediliyor, setTasiyiciKaydediliyor] = useState(false);
  const [tasiyici, setTasiyici] = useState("");
  const [surucuId, setSurucuId] = useState("");
  const [aracId, setAracId] = useState("");
  // Sistemde kayıtlı olmayan sürücü/araç için serbest metin girişi —
  // dropdown'dan seçim yapılmadıysa bu metin kullanılır (bkz. migration
  // 052_tasima_evraki_manuel_surucu_arac.sql).
  const [surucuManuel, setSurucuManuel] = useState("");
  const [aracManuel, setAracManuel] = useState("");
  const [notlar, setNotlar] = useState("");
  const [kalemler, setKalemler] = useState<Kalem[]>([]);
  // Ürün listesinde satır bazında inline düzenleme — hangi satırın
  // (index) düzenleme modunda olduğunu tutar. Ürünün ADR künyesi
  // (UN/ad/sınıf/kategori) değişmez, yalnızca ambalaj/miktar/LQ-EQ
  // düzenlenebilir (o bilgiler zaten Tablo A'dan/envanterden sabit gelir).
  const [duzenlenenIndex, setDuzenlenenIndex] = useState<number | null>(null);

  // Yeni kalem formu
  const [seciliKimyasal, setSeciliKimyasal] = useState("");

  // ADR Tablo A'dan arama — envanterde olmayan bir madde de taşıma
  // evrakına eklenebilmeli. 2.939 kayıt olduğu için dropdown yerine
  // arama kullanılıyor.
  const [tabloAArama, setTabloAArama] = useState("");
  const [tabloASonuclar, setTabloASonuclar] = useState<TabloARow[]>([]);
  const [tabloAAraniyor, setTabloAAraniyor] = useState(false);
  const [seciliTabloA, setSeciliTabloA] = useState<TabloARow | null>(null);

  /**
   * Envanter içi arama — TİCARİ AD, sevkiyat adı ve UN numarası üzerinden.
   * Envanter zaten bellekte olduğu için sunucuya gitmeye gerek yok.
   * Kullanıcı ürünü ticari adıyla tanıdığı için (Kimyasal Envanter'de
   * "Kimyasal Adı" olarak geçen alan) arama bu alanı da kapsamalı.
   */
  const envanterSonuclar = useMemo(() => {
    const q = tabloAArama.trim().toLocaleLowerCase("tr-TR");
    if (q.length < 2) return [];
    // Bir kayıt zaten seçilmişse (arama kutusu seçim metnini gösteriyor) listeleme
    if (seciliTabloA || seciliKimyasal) return [];
    return envanter
      .filter((e) => {
        const ticari = (e.trade_name || "").toLocaleLowerCase("tr-TR");
        const sevkiyat = (e.proper_shipping_name || "").toLocaleLowerCase("tr-TR");
        return ticari.includes(q) || sevkiyat.includes(q) || e.un_number.includes(q);
      })
      .slice(0, 15);
  }, [tabloAArama, envanter, seciliTabloA, seciliKimyasal]);
  const [ambalajTuru, setAmbalajTuru] = useState("");
  const [ambalajDiger, setAmbalajDiger] = useState("");
  const [ambalajAdet, setAmbalajAdet] = useState("1");
  const [miktar, setMiktar] = useState("");
  const [birim, setBirim] = useState("kg");
  const [lq, setLq] = useState(false);
  const [eq, setEq] = useState(false);

  const yukle = useCallback(async () => {
    const [env, sur, arc, evr, alc, tsy, frm] = await Promise.all([
      supabase.from("firm_chemicals")
        .select("id, un_number, proper_shipping_name, adr_class, classification_code, packing_group, tunnel_code, transport_category, labels, trade_name")
        .eq("firm_id", firmId).order("un_number"),
      supabase.from("drivers")
        .select("id, first_name, last_name, adr_certificate_no, adr_valid_until")
        .eq("firm_id", firmId).eq("status", "active").order("first_name"),
      supabase.from("vehicles")
        .select("id, plate_number, brand, adr_certificate_no")
        .eq("firm_id", firmId).eq("status", "active").order("plate_number"),
      supabase.from("transport_documents")
        .select("id, document_no, transport_date, status, total_points, tunnel_restriction_code")
        .eq("firm_id", firmId).order("created_at", { ascending: false }).limit(50),
      supabase.from("firm_consignees")
        .select("id, title, address")
        .eq("firm_id", firmId).order("title"),
      supabase.from("firm_carriers")
        .select("id, title, address")
        .eq("firm_id", firmId).order("title"),
      supabase.from("firms")
        .select("address, district, city, logo_url")
        .eq("id", firmId).single(),
    ]);
    if (env.error && /does not exist|not find the table/i.test(env.error.message || "")) {
      setHata("Veritabanı güncellemesi (027_adr_transport_envanter.sql) henüz çalıştırılmamış.");
      return;
    }
    setEnvanter((env.data as Envanter[]) || []);
    setSuruculer((sur.data as Surucu[]) || []);
    setAraclar((arc.data as Arac[]) || []);
    setEvraklar((evr.data as EvrakOzet[]) || []);
    // Alıcı rehberi henüz oluşturulmamışsa (migration 035 çalışmadıysa)
    // sessizce boş geç — evrak düzenleme yine de çalışsın.
    setAliciListesi((alc.data as Consignee[]) || []);
    // Taşıyıcı rehberi henüz oluşturulmamışsa (migration 058 çalışmadıysa)
    // sessizce boş geç — evrak düzenleme yine de çalışsın.
    setTasiyiciListesi((tsy.data as Consignee[]) || []);
    setLogoUrl((frm.data as { logo_url: string | null } | null)?.logo_url ?? null);

    // Gönderen adresi — Gönderen zaten firmanın kendi unvanına ("firmaAdi")
    // varsayılan geldiği için, adres de firmanın kendi kayıtlı adresine
    // varsayılan gelir (Alıcı adresi gibi kullanıcı tarafından
    // değiştirilebilir). Yalnızca ALAN HENÜZ BOŞSA doldurulur — kullanıcının
    // girdiği bir değeri sonraki yukle() çağrılarında (kaydetme sonrası) EZMEZ.
    const frmVeri = frm.data as { address: string | null; district: string | null; city: string | null } | null;
    const adresParcalari = [frmVeri?.address, frmVeri?.district, frmVeri?.city].filter(Boolean);
    const varsayilanAdres = adresParcalari.join(", ");
    setFirmaAdresVarsayilan(varsayilanAdres);
    setGonderenAdres((mevcut) => mevcut || varsayilanAdres);
  }, [firmId]);

  useEffect(() => { yukle(); }, [yukle]);

  // Sevkiyatlar sekmesinden "Aç" ile gelindiyse, ilk yüklemeden sonra
  // ilgili evrakı otomatik editöre yükle.
  useEffect(() => {
    if (preselectEvrakId) evrakAc(preselectEvrakId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectEvrakId]);

  // Tablo A araması (debounce'lu)
  useEffect(() => {
    const q = tabloAArama.trim();
    if (q.length < 2) {
      setTabloASonuclar([]);
      return;
    }
    let iptal = false;
    setTabloAAraniyor(true);
    const zamanlayici = setTimeout(async () => {
      const sayiMi = /^\d+$/.test(q);
      const { data } = await supabase
        .from("adr_un_numbers")
        .select("id, un_number, proper_shipping_name, class, classification_code, packing_group, tunnel_code, transport_category, labels")
        .or(sayiMi ? `un_number.ilike.%${q}%` : `proper_shipping_name.ilike.%${q}%`)
        .limit(25);
      if (!iptal) {
        setTabloASonuclar((data as TabloARow[]) ?? []);
        setTabloAAraniyor(false);
      }
    }, 300);
    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [tabloAArama]);

  // ADR Asistanı'ndan "UN X'i ekle" geldiyse: envanterde bulunan İLK
  // eşleşmeyi otomatik seç, miktarı BOŞ bırak (kullanıcı girmeli — gerçek
  // bir taşıma belgesi, miktarı asistan uydurmamalı). Aynı prefill isteği
  // için sadece BİR KEZ çalışır (envanter yeniden yüklenince tekrar
  // tetiklenmesin diye ref ile işaretleniyor).
  const prefillIslendiRef = useRef<string>("");
  useEffect(() => {
    const istek = (prefillUnNumbers ?? []).join(",");
    if (!istek) return;
    if (prefillIslendiRef.current === istek) return;
    prefillIslendiRef.current = istek;

    (async () => {
      const bulunanlar: string[] = [];
      let ilkEslesme: Envanter | null = null;
      const envanterdeOlmayan: string[] = [];

      for (const un of prefillUnNumbers ?? []) {
        const eslesme = envanter.find((e) => e.un_number === un);
        if (eslesme) {
          bulunanlar.push(un);
          if (!ilkEslesme) ilkEslesme = eslesme;
        } else {
          envanterdeOlmayan.push(un);
        }
      }

      if (ilkEslesme) {
        setSeciliKimyasal(ilkEslesme.id);
        if (prefillMiktar && prefillMiktar > 0) setMiktar(String(prefillMiktar));
        const ek = envanterdeOlmayan.length > 0
          ? ` (UN ${envanterdeOlmayan.join(", ")} envanterde yok — Tablo A aramasından ekleyebilirsin.)`
          : "";
        setMesaj(
          `🤖 UN ${ilkEslesme.un_number} envanterden seçildi. Miktarı kontrol edip "Ürünü ekle"ye bas.${ek}`
        );
        return;
      }

      // Envanterde yok — ADR Tablo A'dan dene. Envanterde bulunmayan bir
      // madde de taşınabilir; kullanıcıyı "önce envantere ekle" diye
      // engellemek yerine doğrudan Tablo A'dan seçili getiriyoruz.
      const ilkUn = (prefillUnNumbers ?? [])[0];
      if (!ilkUn) return;

      const { data } = await supabase
        .from("adr_un_numbers")
        .select("id, un_number, proper_shipping_name, class, classification_code, packing_group, tunnel_code, transport_category, labels")
        .eq("un_number", ilkUn)
        .limit(1);

      const satir = (data as TabloARow[] | null)?.[0];
      if (satir) {
        setSeciliTabloA(satir);
        setSeciliKimyasal("");
        setTabloAArama(`UN ${satir.un_number} — ${satir.proper_shipping_name}`);
        if (prefillMiktar && prefillMiktar > 0) setMiktar(String(prefillMiktar));
        setMesaj(
          `🤖 UN ${satir.un_number} envanterde yoktu, ADR Tablo A'dan seçildi: ${satir.proper_shipping_name}. ` +
            `Miktarı kontrol edip "Ürünü ekle"ye bas.`
        );
      } else {
        setMesaj(`⚠️ UN ${ilkUn} ne envanterde ne de ADR Tablo A'da bulunabildi. Numarayı kontrol et.`);
      }
    })();
  }, [envanter, prefillUnNumbers, prefillMiktar]);


  // Canlı ADR hesabı — her kalem değişikliğinde otomatik
  const { puan, plakaGerekli, muafiyetsiz } = useMemo(() => hesapla1136(kalemler), [kalemler]);
  const tunel = useMemo(() => tunelKisiti(kalemler), [kalemler]);

  // KARIŞIK YÜKLEME — ADR sayfasındaki doğrulanmış motorun (adrMix)
  // aynısı. Evraktaki benzersiz maddelerin tüm İKİLİ kombinasyonları
  // kontrol edilir; sonuçlar yasak > şartlı > uygun önceliğiyle panelde
  // gösterilir. LQ/EQ kalemler de dahildir: 7.5.2 ayrım kuralları
  // miktar muafiyetinden bağımsız uygulanır (güvenli taraf).
  const karisikSonuclar = useMemo<CheckResult[]>(() => {
    // Aynı UN+ad birden çok kalemde olabilir; kombinasyon benzersiz
    // maddeler üzerinden kurulur.
    const benzersiz = new Map<string, Kalem>();
    for (const k of kalemler) {
      benzersiz.set(`${k.un_number}|${k.proper_shipping_name}`, k);
    }
    const maddeler = Array.from(benzersiz.values()).map(
      (k): MixUnRow => ({
        id: k.firm_chemical_id || `${k.un_number}`,
        un_number: k.un_number,
        proper_shipping_name: k.proper_shipping_name,
        class: k.adr_class || "",
        classification_code: k.classification_code,
        packing_group: k.packing_group,
        tunnel_code: k.tunnel_code,
        hazard_no: null,
        labels: k.labels,
        transport_category: k.transport_category,
        limited_quantity: null,
        excepted_quantity: null,
      })
    );
    const sonuclar: CheckResult[] = [];
    for (let i = 0; i < maddeler.length; i++) {
      for (let j = i + 1; j < maddeler.length; j++) {
        sonuclar.push(checkPair(maddeler[i], maddeler[j]));
      }
    }
    // Önce yasaklar, sonra şartlılar/bilinmeyenler, en sonda uygunlar
    const oncelik: Record<string, number> = {
      NO: 0, EXPLOSIVE_SPECIAL: 1, UNKNOWN: 2, FOOD: 3, COND: 4, OK: 5,
    };
    sonuclar.sort((a, b2) => (oncelik[a.status] ?? 9) - (oncelik[b2.status] ?? 9));
    return sonuclar;
  }, [kalemler]);
  const karisikYasak = karisikSonuclar.some((r) => r.status === "NO");

  // ADR 1.10.3 — Emniyet planı gerekliliği (canlı)
  // ADR 1.10.3 — Emniyet planı gerekliliği (canlı).
  // Motor: src/lib/adrSecurityPlan.ts — masaüstü uygulamasındaki
  // doğrulanmış SecurityPlanEngine'in portu. 1.10.4 muafiyeti, taşıma
  // moduna göre eşikler ve sınıf bazlı özel kurallar dahil.
  // ADR — taşınması YASAK madde kontrolü (canlı).
  // Karışık yükleme yasağından farklı: burada maddenin KENDİSİ taşımaya
  // kabul edilmiyor (ADR 2.2.x.2 — kuru birincil patlayıcılar, Tip A
  // organik peroksitler vb.).
  const yasakKontrol = useMemo(
    () =>
      yasakTasimaKontrolListe(
        kalemler.map((k) => ({
          un_number: k.un_number,
          proper_shipping_name: k.proper_shipping_name,
          adr_class: k.adr_class,
          packing_group: k.packing_group,
        }))
      ),
    [kalemler]
  );

  const emniyet = useMemo(() => {
    const items: SecurityPlanItem[] = kalemler.map((k) => ({
      un_number: k.un_number,
      proper_shipping_name: k.proper_shipping_name,
      adr_class: k.adr_class,
      classification_code: k.classification_code,
      packing_group: k.packing_group,
      packaging_type: k.packaging_type,
      quantity: k.quantity,
      unit: k.unit,
    }));
    return checkSecurityPlan(items, puan);
  }, [kalemler, puan]);

  const seciliSurucu = suruculer.find((s) => s.id === surucuId) || null;
  const seciliArac = araclar.find((a) => a.id === aracId) || null;

  /**
   * SRC-5 / ADR sürücü sertifikası kontrolü (canlı).
   * ADR 8.2.1 uyarınca tehlikeli madde taşıyan sürücünün geçerli
   * eğitim sertifikası olmalıdır. Muafiyet kapsamındaki (1.1.3.6)
   * taşımalarda da 8.2.3 farkındalık eğitimi aranır; burada belge
   * geçerliliği kontrol ediliyor.
   */
  const surucuUyari = useMemo(() => {
    if (kalemler.length === 0) return null;
    if (!seciliSurucu) return { seviye: "bilgi" as const, mesaj: "Sürücü seçilmedi — SRC-5 kontrolü yapılamıyor." };
    if (!seciliSurucu.adr_certificate_no) {
      return { seviye: "hata" as const, mesaj: `${seciliSurucu.first_name} ${seciliSurucu.last_name}: SRC-5/ADR sertifika numarası kayıtlı değil.` };
    }
    if (seciliSurucu.adr_valid_until) {
      const kalanGun = Math.round(
        (new Date(seciliSurucu.adr_valid_until + "T00:00:00").getTime() - Date.now()) / 86400000
      );
      if (kalanGun < 0) {
        return { seviye: "hata" as const, mesaj: `SRC-5 belgesi ${Math.abs(kalanGun)} gün önce doldu (${seciliSurucu.adr_valid_until}) — bu sürücü ADR taşıması yapamaz.` };
      }
      if (kalanGun <= 30) {
        return { seviye: "uyari" as const, mesaj: `SRC-5 belgesi ${kalanGun} gün sonra doluyor (${seciliSurucu.adr_valid_until}).` };
      }
      return { seviye: "ok" as const, mesaj: `SRC-5 geçerli (${seciliSurucu.adr_valid_until}).` };
    }
    return { seviye: "uyari" as const, mesaj: "SRC-5 geçerlilik tarihi kayıtlı değil." };
  }, [seciliSurucu, kalemler.length]);

  /** Araç ADR uygunluk belgesi kontrolü — muafiyet dışı taşımalarda gerekli. */
  const aracUyari = useMemo(() => {
    if (kalemler.length === 0) return null;
    if (!seciliArac) return null;
    if (!plakaGerekli) return null; // muafiyet kapsamında araç belgesi aranmaz
    if (!seciliArac.adr_certificate_no) {
      return { seviye: "uyari" as const, mesaj: `${seciliArac.plate_number}: ADR uygunluk belgesi (ADR sertifikası) kayıtlı değil.` };
    }
    return { seviye: "ok" as const, mesaj: `Araç ADR belgesi kayıtlı (${seciliArac.adr_certificate_no}).` };
  }, [seciliArac, plakaGerekli, kalemler.length]);

  /** Girilen alıcıyı bu firmanın rehberine kaydeder (bir dahaki sefere listeden seçilir). */
  /**
   * Rehber kaydı (alıcı veya taşıyıcı) — ÖNEMLİ: burada supabase.upsert()
   * KULLANILMIYOR. Çünkü bu tabloların benzersizlik indeksi bir İFADE
   * indeksi (firm_id, lower(title)) — upsert'ün onConflict hedefi düz
   * sütun listesi ("firm_id,title") olduğu için Postgres bunu eşleştiremiyor
   * ve "no unique or exclusion constraint matching the ON CONFLICT
   * specification" hatasıyla kayıt SESSIZCE BAŞARISIZ oluyordu — kullanıcı
   * "kaydedildi" görüp sonraki evrakta rehberi boş buluyordu.
   *
   * Çözüm: önce büyük/küçük harf duyarsız (ilike) arama yapılır, kayıt
   * varsa UPDATE, yoksa INSERT edilir. Bu, ifade indeksiyle de uyumludur.
   */
  async function rehbereKaydet(
    tablo: "firm_consignees" | "firm_carriers",
    unvan: string,
    adres: string
  ): Promise<string | null> {
    const { data: mevcut } = await supabase
      .from(tablo)
      .select("id")
      .eq("firm_id", firmId)
      .ilike("title", unvan)
      .maybeSingle();

    const govde = { title: unvan, address: adres.trim() || null };
    const { error } = mevcut
      ? await supabase.from(tablo).update(govde).eq("id", mevcut.id)
      : await supabase.from(tablo).insert({ firm_id: firmId, ...govde });

    if (error) {
      return /does not exist|not find the table/i.test(error.message)
        ? `Rehber için veritabanı güncellemesi (${tablo === "firm_consignees" ? "035_firm_consignees" : "058_firm_carriers"}.sql) gerekli.`
        : "Kaydedilemedi: " + error.message;
    }
    return null;
  }

  async function aliciyiRehbereKaydet() {
    const unvan = alici.trim();
    if (!unvan) { setMesaj("Önce alıcı unvanını yaz."); return; }
    setAliciKaydediliyor(true);
    const hata = await rehbereKaydet("firm_consignees", unvan, aliciAdres);
    setAliciKaydediliyor(false);
    if (hata) { setMesaj(hata); return; }
    setMesaj(`✓ "${unvan}" alıcı rehberine kaydedildi.`);
    yukle();
  }

  async function tasiyiciyiRehbereKaydet() {
    const unvan = tasiyici.trim();
    if (!unvan) { setMesaj("Önce taşıyıcı unvanını yaz."); return; }
    setTasiyiciKaydediliyor(true);
    const hata = await rehbereKaydet("firm_carriers", unvan, "");
    setTasiyiciKaydediliyor(false);
    if (hata) { setMesaj(hata); return; }
    setMesaj(`✓ "${unvan}" taşıyıcı rehberine kaydedildi.`);
    yukle();
  }

  function kalemEkle() {
    // İki kaynak: firmanın envanteri VEYA doğrudan ADR Tablo A.
    // Tablo A'dan gelenlerde firm_chemical_id null olur (envanter kaydı
    // değil) — evrak yine de üretilebilir.
    const kim = envanter.find((e) => e.id === seciliKimyasal);
    const secim = kim
      ? {
          firm_chemical_id: kim.id,
          un_number: kim.un_number,
          proper_shipping_name: kim.proper_shipping_name,
          adr_class: kim.adr_class,
          classification_code: kim.classification_code,
          labels: kim.labels,
          packing_group: kim.packing_group,
          tunnel_code: kim.tunnel_code,
          transport_category: kim.transport_category,
        }
      : seciliTabloA
        ? {
            firm_chemical_id: null,
            un_number: seciliTabloA.un_number,
            proper_shipping_name: seciliTabloA.proper_shipping_name,
            adr_class: seciliTabloA.class,
            classification_code: seciliTabloA.classification_code,
            labels: seciliTabloA.labels,
            packing_group: seciliTabloA.packing_group,
            tunnel_code: seciliTabloA.tunnel_code,
            transport_category: seciliTabloA.transport_category,
          }
        : null;

    if (!secim) { setMesaj("Önce bir kimyasal seç (envanterden ya da Tablo A'dan)."); return; }
    const q = parseFloat(miktar);
    if (isNaN(q) || q <= 0) { setMesaj("Geçerli bir miktar gir."); return; }
    const tasimaTuru = (ambalajTuru === "Diğer" ? ambalajDiger.trim() : ambalajTuru.trim());
    if (!tasimaTuru) { setMesaj("Ambalaj Türü seç."); return; }
    setMesaj("");
    setKalemler((prev) => [...prev, {
      ...secim,
      packaging_type: tasimaTuru,
      packaging_count: Math.max(1, parseInt(ambalajAdet) || 1),
      quantity: q, unit: birim, is_lq: lq, is_eq: eq,
    }]);
    setSeciliKimyasal(""); setSeciliTabloA(null); setTabloAArama("");
    setAmbalajTuru(""); setAmbalajDiger(""); setAmbalajAdet("1");
    setMiktar(""); setLq(false); setEq(false);
  }

  function temizle() {
    setEvrakId(null); setEvrakNo(evrakNoUret()); setAlici(""); setAliciAdres(""); setTasiyici("");
    setSurucuId(""); setAracId(""); setSurucuManuel(""); setAracManuel(""); setNotlar(""); setKalemler([]);
    setGonderen(firmaAdi); setGonderenAdres(firmaAdresVarsayilan); setGonderenSorumlu(""); setMesaj("");
    setTarih(new Date().toISOString().slice(0, 10));
  }

  async function evrakAc(id: string) {
    const [{ data: ev }, { data: it }] = await Promise.all([
      supabase.from("transport_documents").select("*").eq("id", id).single(),
      supabase.from("transport_document_items").select("*").eq("document_id", id),
    ]);
    if (!ev) return;
    setEvrakId(ev.id); setEvrakNo(ev.document_no || "");
    setTarih(ev.transport_date || new Date().toISOString().slice(0, 10));
    // Kayıtta unvan ve adres tek alanda satır sonuyla ayrılmış tutuluyor
    // (Alıcı ile AYNI desen). Eski kayıtlarda (adres alanı eklenmeden önce)
    // consignor sadece unvan içerir — bu durumda adres boş kalır, hatasız.
    const gonderenTam = ev.consignor || firmaAdi;
    const gonderenSatirSonu = gonderenTam.indexOf("\n");
    if (gonderenSatirSonu > -1) {
      setGonderen(gonderenTam.slice(0, gonderenSatirSonu));
      setGonderenAdres(gonderenTam.slice(gonderenSatirSonu + 1));
    } else {
      setGonderen(gonderenTam);
      setGonderenAdres(firmaAdresVarsayilan);
    }
    setGonderenSorumlu(ev.sender_person_name || "");
    const aliciTam = ev.consignee || "";
    const ilkSatirSonu = aliciTam.indexOf("\n");
    if (ilkSatirSonu > -1) {
      setAlici(aliciTam.slice(0, ilkSatirSonu));
      setAliciAdres(aliciTam.slice(ilkSatirSonu + 1));
    } else {
      setAlici(aliciTam);
      setAliciAdres("");
    }
    setTasiyici(ev.carrier || ""); setSurucuId(ev.driver_id || "");
    setAracId(ev.vehicle_id || ""); setNotlar(ev.notes || "");
    setSurucuManuel(ev.driver_manual || ""); setAracManuel(ev.vehicle_manual || "");
    setKalemler(((it || []) as Record<string, unknown>[]).map((r) => {
      // Karışık yükleme motoru etiketlerle çalışır; kayıtlı kalemlerde
      // labels saklanmadığından envanterdeki eş kayıttan tamamlanır.
      const env = envanter.find((e) => e.id === r.firm_chemical_id);
      return {
      firm_chemical_id: (r.firm_chemical_id as string) || null,
      un_number: (r.un_number as string) || "",
      proper_shipping_name: (r.proper_shipping_name as string) || "",
      adr_class: (r.adr_class as string) || null,
      classification_code: env?.classification_code ?? null,
      labels: env?.labels ?? null,
      packing_group: (r.packing_group as string) || null,
      tunnel_code: (r.tunnel_code as string) || null,
      transport_category: (r.transport_category as string) || null,
      packaging_type: (r.packaging_type as string) || "",
      packaging_count: (r.packaging_count as number) || 1,
      quantity: Number(r.quantity) || 0,
      unit: (r.unit as string) || "kg",
      is_lq: !!r.is_lq, is_eq: !!r.is_eq,
      };
    }));
    setMesaj("");
  }

  /** Firma logosunu, PDF'e gömülebilecek hazır bir dataURL'e çevirir —
   *  diğer PDF üretim ekranlarındaki (SurucuListesi.tsx, GorevliListesi.
   *  tsx vb.) AYNI fonksiyon. */
  async function logoDataUrl(): Promise<LogoData> {
    if (!logoUrl) return null;
    try {
      const { data: signed } = await supabase.storage
        .from("firm-files")
        .createSignedUrl(logoUrl, 600);
      if (!signed?.signedUrl) return null;
      const res = await fetch(signed.signedUrl);
      const blob = await res.blob();
      const fmt: "PNG" | "JPEG" = blob.type.includes("png") ? "PNG" : "JPEG";
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const enBoyOrani = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.width / img.height || 1);
        img.onerror = () => resolve(1);
        img.src = dataUrl;
      });
      return { data: dataUrl, fmt, enBoyOrani };
    } catch {
      return null;
    }
  }

  /** Başarılıysa kaydedilen evrağın ID'sini döner, başarısızsa null —
   *  pdfYazdir() bu dönüş değeriyle "önce kaydet, sonra yazdır" akışını
   *  kurar. Kaydet butonunun kendisi bu dönüş değerini kullanmıyor
   *  (geriye dönük uyumlu, davranış değişmedi). */
  async function kaydet(): Promise<string | null> {
    if (!evrakNo.trim()) { setMesaj("Evrak No zorunlu."); return null; }
    if (kalemler.length === 0) { setMesaj("En az bir ürün ekle."); return null; }
    if (
      karisikYasak &&
      !confirm(
        "DİKKAT: Bu evraktaki maddeler arasında ADR 7.5.2'ye göre KARIŞIK YÜKLEME YASAĞI var. Aynı taşıma ünitesinde taşınamazlar.\n\nYine de kaydedilsin mi?"
      )
    ) {
      return null;
    }
    setMesaj("");
    const govde = {
      firm_id: firmId, document_no: evrakNo.trim(), transport_date: tarih,
      consignor: gonderenAdres.trim() ? `${gonderen.trim()}\n${gonderenAdres.trim()}` : gonderen.trim(),
      sender_person_name: gonderenSorumlu.trim() || null,
      consignee: aliciAdres.trim() ? `${alici.trim()}\n${aliciAdres.trim()}` : alici.trim(),
      carrier: tasiyici.trim(),
      driver_id: surucuId || null, vehicle_id: aracId || null,
      // Kayıtlı sürücü/araç seçildiyse manuel metin YOK SAYILIR (ikisi
      // birlikte kullanılmaz) — bkz. migration 052.
      driver_manual: surucuId ? null : (surucuManuel.trim() || null),
      vehicle_manual: aracId ? null : (aracManuel.trim() || null),
      status: "Kaydedildi", total_points: muafiyetsiz ? null : puan,
      orange_plate_required: plakaGerekli,
      tunnel_restriction_code: tunel === "—" ? null : tunel,
      notes: notlar.trim() || null,
    };
    let id = evrakId;
    if (id) {
      const { error } = await supabase.from("transport_documents").update(govde).eq("id", id);
      if (error) { setMesaj("Kaydedilemedi: " + hataCevir(error)); return null; }
      await supabase.from("transport_document_items").delete().eq("document_id", id);
    } else {
      const { data, error } = await supabase.from("transport_documents").insert(govde).select("id").single();
      if (error || !data) { setMesaj("Kaydedilemedi: " + hataCevir(error)); return null; }
      id = data.id;
      setEvrakId(id);
    }
    const { error: itemErr } = await supabase.from("transport_document_items").insert(
      kalemler.map((k) => ({
        document_id: id, firm_chemical_id: k.firm_chemical_id,
        un_number: k.un_number, proper_shipping_name: k.proper_shipping_name,
        adr_class: k.adr_class, packing_group: k.packing_group,
        tunnel_code: k.tunnel_code, transport_category: k.transport_category,
        packaging_type: k.packaging_type || null, packaging_count: k.packaging_count,
        quantity: k.quantity, unit: k.unit, is_lq: k.is_lq, is_eq: k.is_eq,
      }))
    );
    if (itemErr) { setMesaj("Ürünler kaydedilemedi: " + hataCevir(itemErr)); return null; }
    setMesaj(`✓ Evrak kaydedildi (${kalemler.length} ürün).`);
    yukle();
    return id;
  }

  /**
   * PDF'i indirmeden, tarayıcının kendi PDF görüntüleyicisiyle YENİ
   * SEKMEDE açar — "önizleme". Pencere ÖNCE (senkron) açılır, PDF
   * üretimi (async) bittiğinde blob URL'i o pencereye yüklenir; bu
   * sıra, mobil Safari'nin açılır pencere engelleyicisine takılmayı
   * önler (Mobilden Tara akışındaki AYNI teknik).
   */
  async function pdfOnizle() {
    const pencere = window.open("", "_blank");
    if (!pencere) {
      setMesaj("Yeni sekme açılamadı — tarayıcının açılır pencere engelleyicisini kontrol et.");
      return;
    }
    try {
      const logo = await logoDataUrl();
      const doc = await evrakPdfUret({
        firmaAdi, evrakNo: evrakNo || "(taslak)",
        tarih: tarih.split("-").reverse().join("."),
        gonderen: gonderenAdres.trim() ? `${gonderen}\n${gonderenAdres.trim()}` : gonderen,
        gonderenSorumlu,
        alici: aliciAdres.trim() ? `${alici}\n${aliciAdres.trim()}` : alici,
        tasiyici,
        surucu: seciliSurucu, arac: seciliArac,
        surucuManuel, aracManuel,
        kalemler, puan, plakaGerekli, muafiyetsiz, tunel, notlar,
        logo,
      });
      const blobUrl = URL.createObjectURL(doc.output("blob"));
      pencere.location.href = blobUrl;
    } catch (e) {
      pencere.close();
      setMesaj("Önizleme oluşturulamadı: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  /**
   * Evrağı önce kaydeder (kayıtlı değilse yeni oluşturur, kayıtlıysa
   * güncel hâliyle üzerine yazar), sonra PDF'i yeni sekmede açıp
   * tarayıcının native yazdırma diyaloğunu (window.print()) otomatik
   * tetikler. Kullanıcı diyalogdan "Yazdır"a basmasa/iptal etse bile,
   * evrak zaten "Sevkiyatlar" ekranında görünür hâle gelir — diyaloğun
   * açılmış olması, evrağın fiilen elden çıkarılmak üzere hazırlandığının
   * yeterli bir işaretidir (bkz. printed_at, migration 053).
   */
  async function pdfYazdir() {
    const pencere = window.open("", "_blank");
    if (!pencere) {
      setMesaj("Yeni sekme açılamadı — tarayıcının açılır pencere engelleyicisini kontrol et.");
      return;
    }
    const id = await kaydet();
    if (!id) {
      pencere.close();
      return;
    }
    try {
      const logo = await logoDataUrl();
      const doc = await evrakPdfUret({
        firmaAdi, evrakNo: evrakNo || "(taslak)",
        tarih: tarih.split("-").reverse().join("."),
        gonderen: gonderenAdres.trim() ? `${gonderen}\n${gonderenAdres.trim()}` : gonderen,
        gonderenSorumlu,
        alici: aliciAdres.trim() ? `${alici}\n${aliciAdres.trim()}` : alici,
        tasiyici,
        surucu: seciliSurucu, arac: seciliArac,
        surucuManuel, aracManuel,
        kalemler, puan, plakaGerekli, muafiyetsiz, tunel, notlar,
        logo,
      });
      const blobUrl = URL.createObjectURL(doc.output("blob"));
      pencere.location.href = blobUrl;
      // PDF sekmesi yüklenip tarayıcının native görüntüleyicisi hazır
      // olsun diye kısa bir bekleme sonrası yazdırma diyaloğu tetiklenir.
      setTimeout(() => {
        try {
          pencere.print();
        } catch {
          /* bazı tarayıcılarda cross-origin kısıtı olabilir — kullanıcı
             sekmedeki native yazdır ikonunu kullanabilir */
        }
      }, 700);

      await supabase
        .from("transport_documents")
        .update({ printed_at: new Date().toISOString() })
        .eq("id", id);
      yukle();
    } catch (e) {
      setMesaj("Yazdırma hazırlanamadı: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function pdfIndir() {
    // PDF her basışta EKRANDAKİ GÜNCEL listeden üretilir — bayatlama olamaz.
    const logo = await logoDataUrl();
    const doc = await evrakPdfUret({
      firmaAdi, evrakNo: evrakNo || "(taslak)",
      tarih: tarih.split("-").reverse().join("."),
      gonderen: gonderenAdres.trim() ? `${gonderen}\n${gonderenAdres.trim()}` : gonderen,
      gonderenSorumlu,
      alici: aliciAdres.trim() ? `${alici}\n${aliciAdres.trim()}` : alici,
      tasiyici,
      surucu: seciliSurucu, arac: seciliArac,
      surucuManuel, aracManuel,
      kalemler, puan, plakaGerekli, muafiyetsiz, tunel, notlar,
      logo,
    });
    doc.save(`tasima_evraki_${(evrakNo || "taslak").replace(/[^\w-]/g, "_")}.pdf`);
  }

  async function evrakSil(id: string) {
    if (!confirm("Bu evrak silinsin mi?")) return;
    const { error } = await supabase.from("transport_documents").delete().eq("id", id);
    if (error) { setMesaj("Silinemedi: " + hataCevir(error)); return; }
    if (evrakId === id) temizle();
    yukle();
  }

  if (hata) {
    return (
      <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg p-3">
        {hata}
      </p>
    );
  }

  // ── Ortak stil sabitleri ─────────────────────────────────────────────
  const ETIKET = "block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1";
  const GIRIS =
    "border border-gray-300 rounded-lg px-3 py-2 text-sm w-full outline-none transition-colors " +
    "focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

  return (
    <div className="lg:flex lg:gap-5 lg:items-start">
      {/* SOL: editör */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* ── EVRAK BİLGİLERİ ───────────────────────────────────────── */}
        <section className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h4 className="font-semibold text-sm">
              {evrakId ? "Evrakı Düzenle" : "Yeni Taşıma Evrakı"}
            </h4>
            {evrakId && (
              <button onClick={temizle} className="text-xs text-blue-600 hover:underline">
                + Yeni evrak
              </button>
            )}
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={ETIKET}>Evrak No *</label>
              <div className="flex items-center gap-2">
                <input
                  className={GIRIS}
                  value={evrakNo}
                  onChange={(e) => setEvrakNo(e.target.value)}
                  disabled={!canWrite}
                />
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setEvrakNo(evrakNoUret())}
                    title="Yeni evrak numarası üret"
                    className="shrink-0 text-gray-400 hover:text-blue-600 border border-gray-300 rounded-lg p-2 hover:border-blue-400 transition-colors"
                  >
                    ↻
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Otomatik üretilir, gerekirse elle değiştirilebilir.</p>
            </div>

            <div>
              <label className={ETIKET}>Taşıma Tarihi</label>
              <DateInput value={tarih} onChange={setTarih} disabled={!canWrite} />
            </div>

            <div>
              <label className={ETIKET}>Gönderen firma unvanı</label>
              <input className={GIRIS} placeholder="Firma unvanı"
                value={gonderen} onChange={(e) => setGonderen(e.target.value)} disabled={!canWrite} />
              <textarea className={GIRIS + " mt-1.5"} rows={2}
                placeholder="Gönderen adresi"
                value={gonderenAdres} onChange={(e) => setGonderenAdres(e.target.value)} disabled={!canWrite} />
              <input className={GIRIS + " mt-1.5"} placeholder="Sorumlu kişi adı soyadı"
                value={gonderenSorumlu} onChange={(e) => setGonderenSorumlu(e.target.value)} disabled={!canWrite} />
            </div>

            <div>
              <label className={ETIKET}>Alıcı firma unvanı</label>
              {aliciListesi.length > 0 && (
                <select
                  className={GIRIS + " mb-1.5"}
                  value=""
                  onChange={(e) => {
                    const sec = aliciListesi.find((a) => a.id === e.target.value);
                    if (sec) {
                      setAlici(sec.title);
                      setAliciAdres(sec.address || "");
                    }
                  }}
                  disabled={!canWrite}
                >
                  <option value="">📋 Kayıtlı alıcılardan seç...</option>
                  {aliciListesi.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              )}
              <input className={GIRIS} placeholder="Firma unvanı"
                value={alici} onChange={(e) => setAlici(e.target.value)} disabled={!canWrite} />
              <textarea className={GIRIS + " mt-1.5"} rows={2}
                placeholder="Alıcı adresi"
                value={aliciAdres} onChange={(e) => setAliciAdres(e.target.value)} disabled={!canWrite} />
              {canWrite && alici.trim() && (
                <button
                  onClick={aliciyiRehbereKaydet}
                  disabled={aliciKaydediliyor}
                  className="text-xs text-blue-600 hover:underline mt-1.5 disabled:opacity-50"
                >
                  {aliciKaydediliyor ? "Kaydediliyor..." : "💾 Bu alıcıyı rehbere kaydet"}
                </button>
              )}
            </div>

            <div>
              <label className={ETIKET}>Taşıyıcı firma</label>
              {tasiyiciListesi.length > 0 && (
                <select
                  className={GIRIS + " mb-1.5"}
                  value=""
                  onChange={(e) => {
                    const sec = tasiyiciListesi.find((t) => t.id === e.target.value);
                    if (sec) setTasiyici(sec.title);
                  }}
                  disabled={!canWrite}
                >
                  <option value="">📋 Kayıtlı taşıyıcılardan seç...</option>
                  {tasiyiciListesi.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              )}
              <input className={GIRIS} placeholder="Taşıyıcı firma unvanı"
                value={tasiyici} onChange={(e) => setTasiyici(e.target.value)} disabled={!canWrite} />
              {canWrite && tasiyici.trim() && (
                <button
                  onClick={tasiyiciyiRehbereKaydet}
                  disabled={tasiyiciKaydediliyor}
                  className="text-xs text-blue-600 hover:underline mt-1.5 disabled:opacity-50"
                >
                  {tasiyiciKaydediliyor ? "Kaydediliyor..." : "💾 Bu taşıyıcıyı rehbere kaydet"}
                </button>
              )}
            </div>

            <div>
              <label className={ETIKET}>Notlar</label>
              <input className={GIRIS} placeholder="İsteğe bağlı not"
                value={notlar} onChange={(e) => setNotlar(e.target.value)} disabled={!canWrite} />
            </div>

            <div>
              <label className={ETIKET}>Sürücü</label>
              <select className={GIRIS} value={surucuId}
                onChange={(e) => {
                  setSurucuId(e.target.value);
                  if (e.target.value) setSurucuManuel("");
                }}
                disabled={!canWrite}>
                <option value="">Seçilmedi (opsiyonel)</option>
                {suruculer.map((s) => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
              <input
                className={GIRIS + " mt-1.5"}
                placeholder="veya elle yaz — örn. alt yüklenici sürücüsü"
                value={surucuManuel}
                onChange={(e) => {
                  setSurucuManuel(e.target.value);
                  if (e.target.value) setSurucuId("");
                }}
                disabled={!canWrite || !!surucuId}
              />
              {surucuId ? (
                <p className="text-[11px] text-gray-400 mt-1">Kayıtlı sürücü seçildi — elle yazmak için önce seçimi kaldır.</p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1">Sistemde kayıtlı değilse (ör. alt yüklenici) buraya elle yaz.</p>
              )}
            </div>

            <div>
              <label className={ETIKET}>Araç</label>
              <select className={GIRIS} value={aracId}
                onChange={(e) => {
                  setAracId(e.target.value);
                  if (e.target.value) setAracManuel("");
                }}
                disabled={!canWrite}>
                <option value="">Seçilmedi (opsiyonel)</option>
                {araclar.map((a) => (
                  <option key={a.id} value={a.id}>{a.plate_number}{a.brand ? ` · ${a.brand}` : ""}</option>
                ))}
              </select>
              <input
                className={GIRIS + " mt-1.5"}
                placeholder="veya elle yaz — örn. plaka"
                value={aracManuel}
                onChange={(e) => {
                  setAracManuel(e.target.value);
                  if (e.target.value) setAracId("");
                }}
                disabled={!canWrite || !!aracId}
              />
              {aracId ? (
                <p className="text-[11px] text-gray-400 mt-1">Kayıtlı araç seçildi — elle yazmak için önce seçimi kaldır.</p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1">Sistemde kayıtlı değilse buraya elle yaz.</p>
              )}
            </div>
          </div>
        </section>

        {/* ── ÜRÜN EKLE ─────────────────────────────────────────────── */}
        {canWrite && (
          <section className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h4 className="font-semibold text-sm">Ürün Ekle</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Firmanın Kimyasal Envanterinden seç ya da ADR Tablo A&apos;da ara.
              </p>
            </div>

            <div className="p-4">
              <div className="mb-3">
                <label className={ETIKET}>Ürün ara</label>
                <input
                  className={GIRIS}
                  placeholder="🔍 Ticari ad, madde adı veya UN numarası..."
                  value={tabloAArama}
                  onChange={(e) => {
                    setTabloAArama(e.target.value);
                    setSeciliTabloA(null);
                    setSeciliKimyasal("");
                  }}
                />
                {/* Firma envanteri sonuçları — üstte, çünkü kullanıcının kendi
                    ürünleri daha muhtemel bir eşleşmedir */}
                {envanterSonuclar.length > 0 && (
                  <div className="border rounded-lg mt-1.5 bg-white overflow-hidden shadow-sm">
                    <div className="px-2.5 py-1.5 bg-green-50 text-[11px] font-semibold text-green-800 border-b">
                      📦 Firma Envanteri ({envanterSonuclar.length})
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {envanterSonuclar.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => {
                            setSeciliKimyasal(e.id);
                            setSeciliTabloA(null);
                            setTabloASonuclar([]);
                            setTabloAArama(
                              `${e.trade_name || e.proper_shipping_name} (UN ${e.un_number})`
                            );
                          }}
                          className="block w-full text-left px-2.5 py-1.5 text-xs hover:bg-green-50 border-b last:border-b-0"
                        >
                          <span className="font-mono font-semibold">UN {e.un_number}</span>{" "}
                          {e.trade_name ? (
                            <>
                              <strong>{e.trade_name}</strong>
                              <span className="text-gray-400"> · {e.proper_shipping_name}</span>
                            </>
                          ) : (
                            e.proper_shipping_name
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tabloAAraniyor && <p className="text-xs text-gray-400 mt-1.5">Aranıyor...</p>}
                {!tabloAAraniyor &&
                  tabloAArama.trim().length >= 2 &&
                  tabloASonuclar.length === 0 &&
                  envanterSonuclar.length === 0 &&
                  !seciliKimyasal &&
                  !seciliTabloA && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Ne envanterde ne Tablo A&apos;da eşleşme bulunamadı.
                    </p>
                  )}
                {tabloASonuclar.length > 0 && (
                  <div className="border rounded-lg mt-1.5 bg-white overflow-hidden shadow-sm">
                    <div className="px-2.5 py-1.5 bg-blue-50 text-[11px] font-semibold text-blue-800 border-b">
                      📖 ADR Tablo A ({tabloASonuclar.length})
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                    {tabloASonuclar.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSeciliTabloA(r);
                          setSeciliKimyasal("");
                          setTabloASonuclar([]);
                          setTabloAArama(`UN ${r.un_number} — ${r.proper_shipping_name}`);
                        }}
                        className="block w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 border-b last:border-b-0"
                      >
                        <span className="font-mono font-semibold">UN {r.un_number}</span>{" "}
                        {r.proper_shipping_name}
                        <span className="text-gray-400">
                          {r.class ? ` · Sınıf ${r.class}` : ""}
                          {r.packing_group ? ` · AG ${r.packing_group}` : ""}
                        </span>
                      </button>
                    ))}
                    </div>
                  </div>
                )}
                {seciliKimyasal && (
                  <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 mt-1.5">
                    ✓ Envanterden seçildi
                    <button
                      onClick={() => { setSeciliKimyasal(""); setTabloAArama(""); }}
                      className="ml-2 underline text-green-600"
                    >
                      kaldır
                    </button>
                  </p>
                )}
                {seciliTabloA && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2 mt-1.5">
                    ✓ Tablo A&apos;dan seçildi: UN {seciliTabloA.un_number} — {seciliTabloA.proper_shipping_name}
                    <button
                      onClick={() => { setSeciliTabloA(null); setTabloAArama(""); }}
                      className="ml-2 underline text-blue-600"
                    >
                      kaldır
                    </button>
                  </p>
                )}
              </div>

              {/* Etiketli, ferah bir ızgara — küçük ekranlarda 2 sütuna
                  düşer, tek sıraya sıkıştırmaz (bkz. tasarım notu üstte). */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="col-span-2 lg:col-span-2">
                  <label className={ETIKET}>Envanterden Seç</label>
                  <select className={GIRIS}
                    value={seciliKimyasal}
                    onChange={(e) => {
                      setSeciliKimyasal(e.target.value);
                      if (e.target.value) { setSeciliTabloA(null); setTabloAArama(""); }
                    }}>
                    <option value="" disabled={envanter.length === 0}>
                      {envanter.length === 0 ? "Envanter boş — yukarıdan Tablo A'da ara" : "Seçiniz..."}
                    </option>
                    {envanter.map((e) => (
                      <option key={e.id} value={e.id}>
                        UN {e.un_number} — {(e.trade_name || e.proper_shipping_name).slice(0, 48)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={ETIKET}>Ambalaj Türü</label>
                  <select className={GIRIS}
                    value={ambalajTuru} onChange={(e) => setAmbalajTuru(e.target.value)}>
                    <option value="" disabled>Seçiniz...</option>
                    {AMBALAJ_TURLERI.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={ETIKET}>Adet</label>
                  <input className={GIRIS} type="number" min="1" placeholder="1"
                    value={ambalajAdet} onChange={(e) => setAmbalajAdet(e.target.value)} />
                </div>

                <div>
                  <label className={ETIKET}>Net Miktar *</label>
                  <input className={GIRIS} type="number" min="0" step="any"
                    placeholder="0" value={miktar} onChange={(e) => setMiktar(e.target.value)} />
                </div>

                <div>
                  <label className={ETIKET}>Birim</label>
                  <select className={GIRIS} value={birim}
                    onChange={(e) => setBirim(e.target.value)}>
                    <option value="kg">kg</option><option value="lt">lt</option><option value="adet">adet</option>
                  </select>
                </div>
              </div>

              {ambalajTuru === "Diğer" && (
                <input className={GIRIS + " mt-3"}
                  placeholder="Ambalaj türünü yaz..."
                  value={ambalajDiger} onChange={(e) => setAmbalajDiger(e.target.value)} />
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t">
                <label className="text-xs flex items-center gap-1.5 text-gray-700" title="Sınırlı Miktar (Limited Quantity) — ADR Bölüm 3.4 kapsamında azaltılmış kurallarla taşınabilen küçük paketleme.">
                  <input type="checkbox" checked={lq} onChange={(e) => setLq(e.target.checked)} />
                  LQ <span className="text-gray-400">— Sınırlı Miktar ⓘ</span>
                </label>
                <label className="text-xs flex items-center gap-1.5 text-gray-700" title="İstisnai Miktar (Excepted Quantity) — ADR Bölüm 3.5 kapsamında ADR kurallarından muaf, çok küçük miktarlı paketleme.">
                  <input type="checkbox" checked={eq} onChange={(e) => setEq(e.target.checked)} />
                  EQ <span className="text-gray-400">— İstisnai Miktar ⓘ</span>
                </label>
                <button onClick={kalemEkle} 
                  disabled={(!seciliKimyasal && !seciliTabloA) || !ambalajTuru || (ambalajTuru === "Diğer" && !ambalajDiger.trim())}
                  className="ml-auto px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors">
                  + Ürünü Ekle
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── ÜRÜN LİSTESİ ──────────────────────────────────────────── */}
        {kalemler.length > 0 && (
          <section className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h4 className="font-semibold text-sm">Evraktaki Ürünler ({kalemler.length})</h4>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-2.5 font-medium">UN</th><th className="p-2.5 font-medium">Ad</th>
                  <th className="p-2.5 font-medium text-center">Sınıf/PG</th>
                  <th className="p-2.5 font-medium text-center">Kat.</th>
                  <th className="p-2.5 font-medium">Ambalaj</th>
                  <th className="p-2.5 font-medium text-right">Miktar</th>
                  {canWrite && <th className="p-2.5 text-right">İşlem</th>}
                </tr>
              </thead>
              <tbody>
                {kalemler.map((k, i) =>
                  duzenlenenIndex === i ? (
                    <tr key={i} className="border-t bg-blue-50/50">
                      <td className="p-2.5 font-semibold whitespace-nowrap align-top pt-3">UN {k.un_number}</td>
                      <td className="p-2.5 align-top pt-3">
                        {k.proper_shipping_name}
                        <p className="text-[10px] text-gray-400 mt-1">Ürünün kendisi değiştirilemez — bunun için satırı silip yeniden ekle.</p>
                      </td>
                      <td className="p-2.5 text-center align-top pt-3">{k.adr_class || "—"}/{k.packing_group || "—"}</td>
                      <td className="p-2.5 text-center align-top pt-3">{k.transport_category || "?"}</td>
                      <td className="p-2.5 align-top" colSpan={2}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <select
                            className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                            value={AMBALAJ_TURLERI.includes(k.packaging_type as (typeof AMBALAJ_TURLERI)[number]) ? k.packaging_type : "Diğer"}
                            onChange={(e) =>
                              setKalemler((prev) => prev.map((row, j) => (j === i ? { ...row, packaging_type: e.target.value === "Diğer" ? "" : e.target.value } : row)))
                            }
                          >
                            {AMBALAJ_TURLERI.map((a) => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                          <input
                            className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full"
                            type="number" min="1" placeholder="Adet"
                            value={k.packaging_count}
                            onChange={(e) =>
                              setKalemler((prev) => prev.map((row, j) => (j === i ? { ...row, packaging_count: Math.max(1, parseInt(e.target.value) || 1) } : row)))
                            }
                          />
                          <input
                            className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full"
                            type="number" min="0" step="any" placeholder="Miktar"
                            value={k.quantity}
                            onChange={(e) =>
                              setKalemler((prev) => prev.map((row, j) => (j === i ? { ...row, quantity: parseFloat(e.target.value) || 0 } : row)))
                            }
                          />
                          <select
                            className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                            value={k.unit}
                            onChange={(e) =>
                              setKalemler((prev) => prev.map((row, j) => (j === i ? { ...row, unit: e.target.value } : row)))
                            }
                          >
                            <option value="kg">kg</option><option value="lt">lt</option><option value="adet">adet</option>
                          </select>
                        </div>
                        {!AMBALAJ_TURLERI.includes(k.packaging_type as (typeof AMBALAJ_TURLERI)[number]) && (
                          <input
                            className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full mt-2"
                            placeholder="Ambalaj türünü yaz..."
                            value={k.packaging_type}
                            onChange={(e) =>
                              setKalemler((prev) => prev.map((row, j) => (j === i ? { ...row, packaging_type: e.target.value } : row)))
                            }
                          />
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <label className="text-[11px] flex items-center gap-1">
                            <input type="checkbox" checked={k.is_lq}
                              onChange={(e) => setKalemler((prev) => prev.map((row, j) => (j === i ? { ...row, is_lq: e.target.checked } : row)))} />
                            LQ
                          </label>
                          <label className="text-[11px] flex items-center gap-1">
                            <input type="checkbox" checked={k.is_eq}
                              onChange={(e) => setKalemler((prev) => prev.map((row, j) => (j === i ? { ...row, is_eq: e.target.checked } : row)))} />
                            EQ
                          </label>
                          <button
                            onClick={() => setDuzenlenenIndex(null)}
                            className="ml-auto px-3 py-1 rounded bg-blue-600 text-white text-[11px] font-medium hover:bg-blue-700"
                          >
                            ✓ Bitti
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="p-2.5 font-semibold whitespace-nowrap">UN {k.un_number}</td>
                      <td className="p-2.5">
                        {k.proper_shipping_name}
                        {k.is_lq && <span className="ml-1 text-green-700 border border-green-700 rounded px-1">LQ</span>}
                        {k.is_eq && <span className="ml-1 text-blue-800 border border-blue-800 rounded px-1">EQ</span>}
                      </td>
                      <td className="p-2.5 text-center">{k.adr_class || "—"}/{k.packing_group || "—"}</td>
                      <td className="p-2.5 text-center">{k.transport_category || "?"}</td>
                      <td className="p-2.5">{k.packaging_count}× {k.packaging_type || "—"}</td>
                      <td className="p-2.5 text-right whitespace-nowrap">{k.quantity} {k.unit}</td>
                      {canWrite && (
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <button onClick={() => setDuzenlenenIndex(i)}
                            title="Ambalaj/miktar/LQ-EQ düzenle"
                            className="text-gray-400 hover:text-blue-600 mr-2">✏️</button>
                          <button onClick={() => {
                            setKalemler((p) => p.filter((_, j) => j !== i));
                            setDuzenlenenIndex((prev) => (prev === null ? null : prev > i ? prev - 1 : prev === i ? null : prev));
                          }}
                            title="Satırı sil"
                            className="text-gray-400 hover:text-red-500">✕</button>
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* ── KAYDET / PDF ──────────────────────────────────────────── */}
        <section className="border border-gray-200 rounded-xl bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
              <button onClick={pdfYazdir} disabled={kalemler.length === 0}
                title={kalemler.length === 0 ? "Kaydetmek için önce en az bir ürün ekleyin" : "Evrakı kaydedip yazdırma diyaloğunu aç"}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                💾 Kaydet ve Yazdır
              </button>
            )}
            <button onClick={pdfOnizle} disabled={kalemler.length === 0}
              title={kalemler.length === 0 ? "Önizlemek için önce en az bir ürün ekleyin" : "PDF'i yeni sekmede önizle"}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors">
              👁️ Önizle
            </button>
            <button onClick={pdfIndir} disabled={kalemler.length === 0}
              title={kalemler.length === 0 ? "PDF indirmek için önce en az bir ürün ekleyin" : "Evrakı PDF olarak indir"}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors">
              📄 PDF İndir {kalemler.length > 0 ? `(${kalemler.length} ürün)` : ""}
            </button>
            <p className="text-[11px] text-gray-400 ml-auto">* zorunlu alan</p>
          </div>
          {kalemler.length === 0 && (
            <p className="text-[11px] text-gray-400 mt-2">Kaydetmek için yukarıdan en az bir ürün ekle.</p>
          )}
          {canWrite && kalemler.length > 0 && (
            <p className="text-[11px] text-gray-400 mt-2">
              💾 Kaydet ve Yazdır, evrağı kaydedip yazdırma diyaloğunu açar — evrak bu işlemden sonra
              Sevkiyatlar sekmesinde listelenir.
            </p>
          )}
          {mesaj && <p className="text-sm mt-2 text-gray-700">{mesaj}</p>}
        </section>

        {/* ── KAYITLI EVRAKLAR ──────────────────────────────────────── */}
        <section className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h4 className="font-semibold text-sm">Kayıtlı Evraklar</h4>
          </div>
          <div className="p-4">
            {evraklar.length === 0 ? (
              <p className="text-sm text-gray-400">Henüz kayıtlı evrak yok.</p>
            ) : (
              <ul className="divide-y">
                {evraklar.map((e) => (
                  <li key={e.id} className="py-2 flex items-center gap-3 text-sm">
                    <button onClick={() => evrakAc(e.id)}
                      className="font-semibold text-blue-700 hover:underline">
                      {e.document_no}
                    </button>
                    <span className="text-gray-400 text-xs">{e.transport_date || ""}</span>
                    <span className="text-xs text-gray-500">
                      {e.total_points != null ? `${Number(e.total_points).toFixed(0)} puan` : "muafiyetsiz"}
                      {e.tunnel_restriction_code ? ` · Tünel ${e.tunnel_restriction_code}` : ""}
                    </span>
                    {canWrite && (
                      <button onClick={() => evrakSil(e.id)}
                        className="ml-auto text-gray-400 hover:text-red-500 text-xs">✕</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* SAĞ: canlı ADR paneli — soldaki forma bitişik, aynı vurgu
          rengiyle bağlanan bir "sonuç paneli" olarak tasarlandı (üstteki
          mavi şerit, forma ait olduğunu görsel olarak gösterir). */}
      <aside className="lg:w-[300px] shrink-0 mt-4 lg:mt-0 lg:sticky lg:top-4">
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b bg-blue-600">
            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">🛡️ ADR Kontrol</h4>
            <p className="text-[11px] text-blue-100 mt-0.5">Canlı hesap — her değişiklikte güncellenir</p>
          </div>
          <div className="p-4">
          {kalemler.length === 0 ? (
            <p className="text-sm text-gray-400">Ürün eklendikçe 1.1.3.6 puanı ve tünel kısıtı burada hesaplanır.</p>
          ) : (
            <>
              {muafiyetsiz ? (
                <p className="text-sm text-red-600 font-semibold mb-2">
                  1.1.3.6 muafiyeti YOK — Kategori 0 / bilinmeyen madde var.
                </p>
              ) : (
                <>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                    <div
                      className={"h-2.5 rounded-full " + (puan > 1000 ? "bg-red-500" : "bg-green-500")}
                      style={{ width: `${Math.min((puan / 1000) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{puan.toFixed(0)} / 1000 puan</p>
                </>
              )}
              <p className={"text-sm font-semibold mb-2 " + (plakaGerekli ? "text-red-600" : "text-green-700")}>
                {plakaGerekli ? "🔶 Turuncu plaka ZORUNLU" : "✅ Turuncu plaka gerekmez"}
              </p>
              <p className="text-sm">Tünel Kısıtlaması: <b>{tunel}</b></p>
              <p className="text-xs text-gray-400 mt-2">{kalemler.length} ürün · LQ/EQ kalemleri puana dahil edilmez</p>
            </>
          )}


          {/* TAŞIMA YASAĞI — en kritik uyarı, en üstte */}
          {yasakKontrol.yasaklar.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="bg-red-100 border-2 border-red-400 rounded p-3">
                <p className="text-sm font-bold text-red-800 mb-1.5">
                  ⛔ TAŞINMASI YASAK MADDE
                </p>
                <ul className="space-y-1 text-xs text-red-900">
                  {yasakKontrol.yasaklar.map((y, i) => (
                    <li key={i}>
                      <strong>UN {y.un}</strong> — {y.ad}
                      <br />
                      <span className="text-red-700">↳ {y.sebep}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-red-700">
                  Bu madde ADR kapsamında karayolu ile taşınamaz. Evrak
                  düzenlemeden önce doğru UN numarasını (örn. ıslatılmış/
                  flegmatize edilmiş hâli) kontrol et.
                </p>
              </div>
            </div>
          )}

          {yasakKontrol.kontroller.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="bg-amber-50 border border-amber-300 rounded p-2.5">
                <p className="text-xs font-semibold text-amber-900 mb-1">
                  ⚠ Taşıma uygunluğu kontrol edilmeli
                </p>
                <ul className="space-y-1 text-[11px] text-amber-900">
                  {yasakKontrol.kontroller.map((k, i) => (
                    <li key={i}>
                      <strong>UN {k.un}</strong> — {k.sebep}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* SÜRÜCÜ / ARAÇ BELGE KONTROLÜ — ADR 8.2.1 (SRC-5) */}
          {(surucuUyari || aracUyari) && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Belge Kontrolü</p>
              {surucuUyari && (
                <p
                  className={
                    "text-xs mb-1 rounded p-1.5 border " +
                    (surucuUyari.seviye === "hata"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : surucuUyari.seviye === "uyari"
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : surucuUyari.seviye === "ok"
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-gray-50 border-gray-200 text-gray-600")
                  }
                >
                  {surucuUyari.seviye === "hata" ? "✗" : surucuUyari.seviye === "ok" ? "✓" : "⚠"} {surucuUyari.mesaj}
                </p>
              )}
              {aracUyari && (
                <p
                  className={
                    "text-xs rounded p-1.5 border " +
                    (aracUyari.seviye === "ok"
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-amber-50 border-amber-200 text-amber-800")
                  }
                >
                  {aracUyari.seviye === "ok" ? "✓" : "⚠"} {aracUyari.mesaj}
                </p>
              )}
            </div>
          )}

          {/* EMNİYET PLANI — ADR 1.10.3 */}
          {kalemler.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Emniyet Planı (ADR 1.10.3)</p>
              {emniyet.required ? (
                <div className="text-xs bg-red-50 border border-red-200 rounded p-2 text-red-900">
                  <p className="font-medium mb-1">🛡 EMNİYET PLANI GEREKLİ (ADR 1.10.3)</p>
                  <ul className="space-y-0.5">
                    {emniyet.reasons.map((s2, i) => (
                      <li key={i}>• {s2}</li>
                    ))}
                  </ul>
                </div>
              ) : emniyet.exempt ? (
                <p className="text-xs bg-green-50 border border-green-200 rounded p-2 text-green-800">
                  ✓ Emniyet planı gerekmiyor — ADR 1.10.4 muafiyeti (1.1.3.6 puanı 1000 altında).
                </p>
              ) : (
                <p className="text-xs bg-green-50 border border-green-200 rounded p-2 text-green-800">
                  ✓ Tablo 1.10.3.1.2 eşikleri aşılmıyor — emniyet planı gerekmiyor.
                </p>
              )}
              {emniyet.details.length > 0 && (
                <details className="mt-1.5">
                  <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-gray-700">
                    Değerlendirme detayı ({emniyet.details.length})
                  </summary>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-gray-600">
                    {emniyet.details.map((d, i) => (
                      <li key={i}>• {d}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* YAZILI TALİMAT — ADR 5.4.3 */}
          {kalemler.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-semibold text-gray-700 mb-1.5">Yazılı Talimat (ADR 5.4.3)</p>
              <p className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-900">
                📋 Taşıma sırasında araçta, sürücünün anlayacağı dilde <strong>yazılı talimat</strong> bulunmalıdır.
                Yazılı talimat taşınan maddeye değil, <strong>ADR&apos;nin standart formatına</strong> göre hazırlanır
                (4 sayfalık standart metin) ve taşımacı tarafından sağlanır.
              </p>
            </div>
          )}

          {/* KARIŞIK YÜKLEME — ADR 7.5.2 (adrMix ortak motoru) */}
          {karisikSonuclar.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-sm font-semibold mb-1">Karışık Yükleme (ADR 7.5.2)</p>
              {karisikYasak ? (
                <p className="text-sm text-red-600 font-semibold mb-2">
                  ⛔ YASAK kombinasyon var — aynı taşıma ünitesinde taşınamaz!
                </p>
              ) : karisikSonuclar.every((r) => r.status === "OK") ? (
                <p className="text-sm text-green-700 mb-2">
                  ✅ Tüm kombinasyonlar birlikte taşınabilir.
                </p>
              ) : (
                <p className="text-sm text-amber-600 mb-2">
                  ⚠ Şartlı / kontrol gerektiren kombinasyon var.
                </p>
              )}
              <ul className="space-y-1.5 max-h-64 overflow-auto pr-1">
                {karisikSonuclar
                  .filter((r) => r.status !== "OK")
                  .map((r, i) => (
                    <li
                      key={i}
                      className={
                        "text-xs rounded p-1.5 border " +
                        (r.status === "NO"
                          ? "bg-red-50 border-red-200 text-red-700"
                          : r.status === "UNKNOWN"
                          ? "bg-gray-50 border-gray-200 text-gray-600"
                          : "bg-amber-50 border-amber-200 text-amber-800")
                      }
                    >
                      <b>UN {r.un1} ↔ UN {r.un2}</b>{" "}
                      <span className="text-[10px] opacity-70">(ADR {r.adrRef})</span>
                      <br />
                      {r.reason}
                    </li>
                  ))}
              </ul>
              {karisikSonuclar.every((r) => r.status === "OK") && (
                <p className="text-[11px] text-gray-400">
                  {karisikSonuclar.length} kombinasyon kontrol edildi.
                </p>
              )}
            </div>
          )}
          </div>
        </div>
      </aside>
    </div>
  );
}
