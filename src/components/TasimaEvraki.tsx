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
// Yetki: Kaydet/Sil yalnızca yazabilir() ekibi (RLS de zorlar); company
// kullanıcısı evrakları görüntüleyip PDF indirebilir.
// =========================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import { useUser } from "@/hooks/useUser";
import type { jsPDF as JsPDFType } from "jspdf";
import { checkPair, CheckResult, UnRow as MixUnRow } from "@/lib/adrMix";
import {
  LIBERATION_SANS_REGULAR_B64,
  LIBERATION_SANS_BOLD_B64,
} from "@/lib/pdfFonts";

// ── Tipler ────────────────────────────────────────────────────────────────
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
  alici: string;
  tasiyici: string;
  surucu: Surucu | null;
  arac: Arac | null;
  kalemler: Kalem[];
  puan: number;
  plakaGerekli: boolean;
  muafiyetsiz: boolean;
  tunel: string;
  notlar: string;
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

  const M = 12, W = 210;
  const NAVY: [number, number, number] = [30, 58, 138];
  let y = 14;

  // Başlık
  doc.setFontSize(14); doc.setFont(FONT, "bold"); doc.setTextColor(...NAVY);
  doc.text("TAŞIMA EVRAKI", W / 2, y, { align: "center" });
  doc.setFontSize(8); doc.setFont(FONT, "normal"); doc.setTextColor(90, 90, 90);
  y += 5;
  doc.text("ADR Bölüm 5.4.1 uyarınca düzenlenmiştir", W / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 7;

  // Evrak No / Tarih
  doc.setFontSize(9); doc.setFont(FONT, "bold");
  doc.text(`Evrak No: ${args.evrakNo}`, M, y);
  doc.text(`Tarih: ${args.tarih}`, W - M, y, { align: "right" });
  y += 6;

  // Gönderen / Alıcı kutuları
  const kutuY = y, kutuH = 22, kutuW = (W - 2 * M - 4) / 2;
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.rect(M, kutuY, kutuW, kutuH);
  doc.rect(M + kutuW + 4, kutuY, kutuW, kutuH);
  doc.setFontSize(7.5); doc.setFont(FONT, "bold"); doc.setTextColor(...NAVY);
  doc.text("GÖNDEREN", M + 2, kutuY + 4.5);
  doc.text("ALICI", M + kutuW + 6, kutuY + 4.5);
  doc.setFont(FONT, "normal"); doc.setTextColor(0, 0, 0); doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(args.gonderen || "—", kutuW - 4), M + 2, kutuY + 9.5);
  doc.text(doc.splitTextToSize(args.alici || "—", kutuW - 4), M + kutuW + 6, kutuY + 9.5);
  y = kutuY + kutuH + 5;

  // Taşıyıcı / Sürücü / Araç şeridi
  doc.setFontSize(8);
  const surucuAd = args.surucu ? `${args.surucu.first_name} ${args.surucu.last_name}` : "—";
  const aracBilgi = args.arac ? `${args.arac.plate_number}${args.arac.brand ? " · " + args.arac.brand : ""}` : "—";
  doc.setFont(FONT, "bold"); doc.text("Taşıyıcı:", M, y);
  doc.setFont(FONT, "normal"); doc.text(args.tasiyici || "—", M + 15, y);
  doc.setFont(FONT, "bold"); doc.text("Sürücü:", M + 78, y);
  doc.setFont(FONT, "normal"); doc.text(surucuAd, M + 91, y);
  doc.setFont(FONT, "bold"); doc.text("Araç:", M + 140, y);
  doc.setFont(FONT, "normal"); doc.text(aracBilgi, M + 150, y);
  y += 6;

  // Ürün tablosu
  const kolonlar = [
    { b: "No", w: 8 }, { b: "UN No", w: 17 }, { b: "Resmi Taşıma Adı", w: 62 },
    { b: "Sınıf", w: 12 }, { b: "PG", w: 10 }, { b: "Tünel", w: 13 },
    { b: "Ambalaj", w: 32 }, { b: "Adet", w: 11 }, { b: "Miktar", w: 21 },
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
    const satirH = Math.max(6, adSatirlari.length * 3.4 + 2.4);
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
        doc.text(adSatirlari, x + 1.5, y + 3.8);
      } else {
        doc.text(h, x + kolonlar[ci].w / 2, y + satirH / 2 + 1.2, { align: "center" });
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

  // İmza kutuları
  const imzaY = Math.max(y + 4, 250);
  const imzaW = (W - 2 * M - 8) / 2;
  doc.setDrawColor(150, 150, 150);
  doc.rect(M, imzaY, imzaW, 24);
  doc.rect(M + imzaW + 8, imzaY, imzaW, 24);
  doc.setFontSize(7.5); doc.setFont(FONT, "bold");
  doc.text("GÖNDEREN (Ad Soyad / Kaşe / İmza)", M + imzaW / 2, imzaY + 4.5, { align: "center" });
  doc.text("SÜRÜCÜ (Ad Soyad / İmza)", M + imzaW + 8 + imzaW / 2, imzaY + 4.5, { align: "center" });
  doc.setFont(FONT, "normal"); doc.setFontSize(8);
  doc.text(surucuAd, M + imzaW + 8 + imzaW / 2, imzaY + 12, { align: "center" });

  // Alt bilgi
  doc.setFontSize(6.5); doc.setTextColor(130, 130, 130);
  doc.text(
    `${args.firmaAdi} — ADR Taşıma Evrakı · Bu belge TMGD Yönetim Sistemi ile üretilmiştir.`,
    W / 2, 290, { align: "center" }
  );
  return doc;
}

// ── Bileşen ──────────────────────────────────────────────────────────────
export default function TasimaEvraki({
  firmId,
  firmaAdi,
}: {
  firmId: string;
  firmaAdi: string;
}) {
  const { canWrite } = useUser();

  const [envanter, setEnvanter] = useState<Envanter[]>([]);
  const [suruculer, setSuruculer] = useState<Surucu[]>([]);
  const [araclar, setAraclar] = useState<Arac[]>([]);
  const [evraklar, setEvraklar] = useState<EvrakOzet[]>([]);
  const [hata, setHata] = useState("");
  const [mesaj, setMesaj] = useState("");

  // Editör durumu
  const [evrakId, setEvrakId] = useState<string | null>(null);
  const [evrakNo, setEvrakNo] = useState("");
  const [tarih, setTarih] = useState(() => new Date().toISOString().slice(0, 10));
  const [gonderen, setGonderen] = useState(firmaAdi);
  const [alici, setAlici] = useState("");
  const [tasiyici, setTasiyici] = useState("");
  const [surucuId, setSurucuId] = useState("");
  const [aracId, setAracId] = useState("");
  const [notlar, setNotlar] = useState("");
  const [kalemler, setKalemler] = useState<Kalem[]>([]);

  // Yeni kalem formu
  const [seciliKimyasal, setSeciliKimyasal] = useState("");
  const [ambalajTuru, setAmbalajTuru] = useState("");
  const [ambalajAdet, setAmbalajAdet] = useState("1");
  const [miktar, setMiktar] = useState("");
  const [birim, setBirim] = useState("kg");
  const [lq, setLq] = useState(false);
  const [eq, setEq] = useState(false);

  const yukle = useCallback(async () => {
    const [env, sur, arc, evr] = await Promise.all([
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
    ]);
    if (env.error && /does not exist|not find the table/i.test(env.error.message || "")) {
      setHata("Veritabanı güncellemesi (027_adr_transport_envanter.sql) henüz çalıştırılmamış.");
      return;
    }
    setEnvanter((env.data as Envanter[]) || []);
    setSuruculer((sur.data as Surucu[]) || []);
    setAraclar((arc.data as Arac[]) || []);
    setEvraklar((evr.data as EvrakOzet[]) || []);
  }, [firmId]);

  useEffect(() => { yukle(); }, [yukle]);

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

  const seciliSurucu = suruculer.find((s) => s.id === surucuId) || null;
  const seciliArac = araclar.find((a) => a.id === aracId) || null;

  function kalemEkle() {
    const kim = envanter.find((e) => e.id === seciliKimyasal);
    if (!kim) return;
    const q = parseFloat(miktar);
    if (isNaN(q) || q <= 0) { setMesaj("Geçerli bir miktar gir."); return; }
    setMesaj("");
    setKalemler((prev) => [...prev, {
      firm_chemical_id: kim.id,
      un_number: kim.un_number,
      proper_shipping_name: kim.proper_shipping_name,
      adr_class: kim.adr_class,
      classification_code: kim.classification_code,
      labels: kim.labels,
      packing_group: kim.packing_group,
      tunnel_code: kim.tunnel_code,
      transport_category: kim.transport_category,
      packaging_type: ambalajTuru.trim(),
      packaging_count: Math.max(1, parseInt(ambalajAdet) || 1),
      quantity: q, unit: birim, is_lq: lq, is_eq: eq,
    }]);
    setSeciliKimyasal(""); setAmbalajTuru(""); setAmbalajAdet("1");
    setMiktar(""); setLq(false); setEq(false);
  }

  function temizle() {
    setEvrakId(null); setEvrakNo(""); setAlici(""); setTasiyici("");
    setSurucuId(""); setAracId(""); setNotlar(""); setKalemler([]);
    setGonderen(firmaAdi); setMesaj("");
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
    setGonderen(ev.consignor || firmaAdi); setAlici(ev.consignee || "");
    setTasiyici(ev.carrier || ""); setSurucuId(ev.driver_id || "");
    setAracId(ev.vehicle_id || ""); setNotlar(ev.notes || "");
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

  async function kaydet() {
    if (!evrakNo.trim()) { setMesaj("Evrak No zorunlu."); return; }
    if (kalemler.length === 0) { setMesaj("En az bir ürün ekle."); return; }
    if (
      karisikYasak &&
      !confirm(
        "DİKKAT: Bu evraktaki maddeler arasında ADR 7.5.2'ye göre KARIŞIK YÜKLEME YASAĞI var. Aynı taşıma ünitesinde taşınamazlar.\n\nYine de kaydedilsin mi?"
      )
    ) {
      return;
    }
    setMesaj("");
    const govde = {
      firm_id: firmId, document_no: evrakNo.trim(), transport_date: tarih,
      consignor: gonderen.trim(), consignee: alici.trim(), carrier: tasiyici.trim(),
      driver_id: surucuId || null, vehicle_id: aracId || null,
      status: "Kaydedildi", total_points: muafiyetsiz ? null : puan,
      orange_plate_required: plakaGerekli,
      tunnel_restriction_code: tunel === "—" ? null : tunel,
      notes: notlar.trim() || null,
    };
    let id = evrakId;
    if (id) {
      const { error } = await supabase.from("transport_documents").update(govde).eq("id", id);
      if (error) { setMesaj("Kaydedilemedi: " + hataCevir(error)); return; }
      await supabase.from("transport_document_items").delete().eq("document_id", id);
    } else {
      const { data, error } = await supabase.from("transport_documents").insert(govde).select("id").single();
      if (error || !data) { setMesaj("Kaydedilemedi: " + hataCevir(error)); return; }
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
    if (itemErr) { setMesaj("Ürünler kaydedilemedi: " + hataCevir(itemErr)); return; }
    setMesaj(`✓ Evrak kaydedildi (${kalemler.length} ürün).`);
    yukle();
  }

  async function pdfIndir() {
    // PDF her basışta EKRANDAKİ GÜNCEL listeden üretilir — bayatlama olamaz.
    const doc = await evrakPdfUret({
      firmaAdi, evrakNo: evrakNo || "(taslak)",
      tarih: tarih.split("-").reverse().join("."),
      gonderen, alici, tasiyici,
      surucu: seciliSurucu, arac: seciliArac,
      kalemler, puan, plakaGerekli, muafiyetsiz, tunel, notlar,
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
      <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-3">
        {hata}
      </p>
    );
  }

  return (
    <div className="lg:flex lg:gap-6 lg:items-start">
      {/* SOL: editör */}
      <div className="flex-1 min-w-0">
        <div className="border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">
              {evrakId ? "Evrakı Düzenle" : "Yeni Taşıma Evrakı"}
            </h4>
            {evrakId && (
              <button onClick={temizle} className="text-xs text-blue-600 hover:underline">
                + Yeni evrak
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <input className="border p-2 rounded text-sm" placeholder="Evrak No *"
              value={evrakNo} onChange={(e) => setEvrakNo(e.target.value)} disabled={!canWrite} />
            <input type="date" className="border p-2 rounded text-sm"
              value={tarih} onChange={(e) => setTarih(e.target.value)} disabled={!canWrite} />
            <input className="border p-2 rounded text-sm" placeholder="Gönderen"
              value={gonderen} onChange={(e) => setGonderen(e.target.value)} disabled={!canWrite} />
            <input className="border p-2 rounded text-sm" placeholder="Alıcı"
              value={alici} onChange={(e) => setAlici(e.target.value)} disabled={!canWrite} />
            <input className="border p-2 rounded text-sm" placeholder="Taşıyıcı firma"
              value={tasiyici} onChange={(e) => setTasiyici(e.target.value)} disabled={!canWrite} />
            <select className="border p-2 rounded text-sm" value={surucuId}
              onChange={(e) => setSurucuId(e.target.value)} disabled={!canWrite}>
              <option value="">Sürücü seç (opsiyonel)</option>
              {suruculer.map((s) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
            <select className="border p-2 rounded text-sm" value={aracId}
              onChange={(e) => setAracId(e.target.value)} disabled={!canWrite}>
              <option value="">Araç seç (opsiyonel)</option>
              {araclar.map((a) => (
                <option key={a.id} value={a.id}>{a.plate_number}{a.brand ? ` · ${a.brand}` : ""}</option>
              ))}
            </select>
            <input className="border p-2 rounded text-sm" placeholder="Notlar"
              value={notlar} onChange={(e) => setNotlar(e.target.value)} disabled={!canWrite} />
          </div>

          {/* Ürün ekleme — YALNIZCA envanterden */}
          {canWrite && (
            <div className="border rounded-lg p-3 bg-gray-50 mb-3">
              <p className="text-xs text-gray-500 mb-2">
                Ürünler firmanın Kimyasal Envanterinden seçilir
                {envanter.length === 0 && " — envanter boş, önce Kimyasal Envanter sekmesinden madde ekle"}.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                <select className="border p-2 rounded text-sm md:col-span-2"
                  value={seciliKimyasal} onChange={(e) => setSeciliKimyasal(e.target.value)}>
                  <option value="">Kimyasal seç...</option>
                  {envanter.map((e) => (
                    <option key={e.id} value={e.id}>
                      UN {e.un_number} — {(e.trade_name || e.proper_shipping_name).slice(0, 48)}
                    </option>
                  ))}
                </select>
                <input className="border p-2 rounded text-sm" placeholder="Ambalaj (örn. Varil)"
                  value={ambalajTuru} onChange={(e) => setAmbalajTuru(e.target.value)} />
                <input className="border p-2 rounded text-sm" type="number" min="1" placeholder="Adet"
                  value={ambalajAdet} onChange={(e) => setAmbalajAdet(e.target.value)} />
                <input className="border p-2 rounded text-sm" type="number" min="0" step="any"
                  placeholder="Net miktar *" value={miktar} onChange={(e) => setMiktar(e.target.value)} />
                <select className="border p-2 rounded text-sm" value={birim}
                  onChange={(e) => setBirim(e.target.value)}>
                  <option value="kg">kg</option><option value="lt">lt</option><option value="adet">adet</option>
                </select>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <label className="text-xs flex items-center gap-1">
                  <input type="checkbox" checked={lq} onChange={(e) => setLq(e.target.checked)} />
                  LQ (Sınırlı Miktar)
                </label>
                <label className="text-xs flex items-center gap-1">
                  <input type="checkbox" checked={eq} onChange={(e) => setEq(e.target.checked)} />
                  EQ (İstisnai Miktar)
                </label>
                <button onClick={kalemEkle} disabled={!seciliKimyasal}
                  className="ml-auto px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-40">
                  Ürünü ekle
                </button>
              </div>
            </div>
          )}

          {/* Kalem listesi */}
          {kalemler.length > 0 && (
            <table className="w-full text-xs border rounded overflow-hidden mb-3">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-1.5">UN</th><th className="p-1.5">Ad</th>
                  <th className="p-1.5 text-center">Sınıf/PG</th>
                  <th className="p-1.5 text-center">Kat.</th>
                  <th className="p-1.5">Ambalaj</th>
                  <th className="p-1.5 text-right">Miktar</th>
                  {canWrite && <th className="p-1.5"></th>}
                </tr>
              </thead>
              <tbody>
                {kalemler.map((k, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1.5 font-semibold whitespace-nowrap">UN {k.un_number}</td>
                    <td className="p-1.5">
                      {k.proper_shipping_name}
                      {k.is_lq && <span className="ml-1 text-green-700 border border-green-700 rounded px-1">LQ</span>}
                      {k.is_eq && <span className="ml-1 text-blue-800 border border-blue-800 rounded px-1">EQ</span>}
                    </td>
                    <td className="p-1.5 text-center">{k.adr_class || "—"}/{k.packing_group || "—"}</td>
                    <td className="p-1.5 text-center">{k.transport_category || "?"}</td>
                    <td className="p-1.5">{k.packaging_count}× {k.packaging_type || "—"}</td>
                    <td className="p-1.5 text-right whitespace-nowrap">{k.quantity} {k.unit}</td>
                    {canWrite && (
                      <td className="p-1.5 text-right">
                        <button onClick={() => setKalemler((p) => p.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500">✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex gap-2">
            {canWrite && (
              <button onClick={kaydet}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">
                💾 Kaydet
              </button>
            )}
            <button onClick={pdfIndir} disabled={kalemler.length === 0}
              className="px-4 py-2 rounded border text-sm hover:bg-gray-50 disabled:opacity-40">
              📄 PDF indir ({kalemler.length} ürün)
            </button>
          </div>
          {mesaj && <p className="text-sm mt-2">{mesaj}</p>}
        </div>

        {/* Kayıtlı evraklar */}
        <div className="border rounded-xl p-4">
          <h4 className="font-semibold mb-2">Kayıtlı Evraklar</h4>
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
      </div>

      {/* SAĞ: canlı ADR paneli */}
      <aside className="lg:w-[300px] shrink-0 mt-4 lg:mt-0 lg:sticky lg:top-4">
        <div className="border rounded-xl p-4 bg-white">
          <h4 className="font-bold mb-1">🛡️ ADR Kontrol</h4>
          <p className="text-xs text-gray-400 mb-3">Canlı hesap — her değişiklikte güncellenir</p>
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
      </aside>
    </div>
  );
}
