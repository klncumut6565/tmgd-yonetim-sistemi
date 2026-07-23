"use client";

// =========================================================================
// KİMYASAL ENVANTER (ADR Transport — Aşama 2)
//
// Her firmanın kendi kimyasal envanteri. UN numarası veya madde adıyla
// Tablo A'da (adr_un_numbers, 2.939 satır) arama yapılır; seçilen kaydın
// ADR alanları (PSN, sınıf, PG, tünel, taşıma kategorisi...) OTOMATİK
// doldurulur — kullanıcı yalnızca firmaya özgü alanları (ticari ad,
// ambalaj, miktar) girer. Bu "şablona bağlı ekleme"dir: UN No Tablo A'da
// yoksa veritabanı tetikleyicisi kaydı reddeder (migration 027).
//
// Yetkiler: TMGD ekibi tam yönetim; 'company' rolü yalnızca ekleme +
// görme (düzenleme/silme butonları canWrite olmadan hiç çizilmez, RLS de
// ayrıca engeller).
// =========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { jsPDF as JsPDFType } from "jspdf";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import { useUser } from "@/hooks/useUser";

type UnRow = {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  class: string | null;
  classification_code: string | null;
  packing_group: string | null;
  tunnel_code: string | null;
  labels: string | null;
  transport_category: string | null;
  limited_quantity: string | null;
  excepted_quantity: string | null;
};

type FirmChemical = {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  adr_class: string | null;
  packing_group: string | null;
  tunnel_code: string | null;
  transport_category: string | null;
  trade_name: string | null;
  packaging_info: string | null;
  annual_amount: string | null;
  notes: string | null;
};

export default function KimyasalEnvanter({
  firmId,
  firmaAdi,
}: {
  firmId: string;
  firmaAdi: string;
}) {
  const { canWrite, profile } = useUser();
  // 'company' rolü ekleme yapabilir ama düzenleyemez/silemez.
  const ekleyebilir = canWrite || profile?.role === "company";

  const [liste, setListe] = useState<FirmChemical[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [mesaj, setMesaj] = useState("");

  // Arama
  const [sorgu, setSorgu] = useState("");
  const [sonuclar, setSonuclar] = useState<UnRow[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [acik, setAcik] = useState(false);
  const [secili, setSecili] = useState<UnRow | null>(null);
  const kutuRef = useRef<HTMLDivElement>(null);

  // Firmaya özgü alanlar
  const [ticariAd, setTicariAd] = useState("");
  const [ambalaj, setAmbalaj] = useState("");
  const [miktar, setMiktar] = useState("");

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const { data, error } = await supabase
      .from("firm_chemicals")
      .select(
        "id, un_number, proper_shipping_name, adr_class, packing_group, tunnel_code, transport_category, trade_name, packaging_info, annual_amount, notes"
      )
      .eq("firm_id", firmId)
      .order("un_number");
    if (error) {
      setListe([]);
      if (/does not exist|not find the table/i.test(error.message || "")) {
        setHata(
          "Kimyasal envanter için veritabanı güncellemesi henüz çalıştırılmamış. " +
            "Supabase → SQL Editor'de database/027_adr_transport_envanter.sql dosyasını çalıştır."
        );
      } else {
        setHata("Envanter yüklenemedi: " + hataCevir(error));
      }
    } else {
      setHata("");
      setListe((data as FirmChemical[]) || []);
    }
    setYukleniyor(false);
  }, [firmId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Tablo A araması (ADR sayfasındaki çalışan desenle aynı: 280ms debounce)
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = sorgu.trim();
      if (q.length < 2) {
        setSonuclar([]);
        return;
      }
      setAraniyor(true);
      const sayi = /^\d+$/.test(q);
      let qb = supabase.from("adr_un_numbers").select("*").limit(15);
      qb = sayi
        ? qb.ilike("un_number", `${q}%`)
        : qb.ilike("proper_shipping_name", `%${q}%`);
      const { data } = await qb.order("un_number");
      setSonuclar((data as UnRow[]) || []);
      setAraniyor(false);
    }, 280);
    return () => clearTimeout(t);
  }, [sorgu]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node))
        setAcik(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const zatenVar = useMemo(
    () =>
      secili
        ? liste.some(
            (l) =>
              l.un_number === secili.un_number &&
              l.proper_shipping_name === secili.proper_shipping_name
          )
        : false,
    [secili, liste]
  );

  async function ekle() {
    if (!secili) return;
    setMesaj("");
    const { error } = await supabase.from("firm_chemicals").insert({
      firm_id: firmId,
      adr_un_id: secili.id,
      un_number: secili.un_number,
      proper_shipping_name: secili.proper_shipping_name,
      adr_class: secili.class,
      classification_code: secili.classification_code,
      packing_group: secili.packing_group,
      tunnel_code: secili.tunnel_code,
      transport_category: secili.transport_category,
      labels: secili.labels,
      limited_quantity: secili.limited_quantity,
      excepted_quantity: secili.excepted_quantity,
      trade_name: ticariAd.trim() || null,
      packaging_info: ambalaj.trim() || null,
      annual_amount: miktar.trim() || null,
    });
    if (error) {
      setMesaj("Eklenemedi: " + hataCevir(error));
      return;
    }
    setMesaj(`✓ UN ${secili.un_number} envantere eklendi.`);
    setSecili(null);
    setSorgu("");
    setTicariAd("");
    setAmbalaj("");
    setMiktar("");
    yukle();
  }

  const [l1Uretiliyor, setL1Uretiliyor] = useState(false);

  // ---------------------------------------------------------------
  // L1 DOSYASINDAN İÇE AKTARMA
  //
  // Umut'un akışı: L1 envanter listesi (Excel) Belge Takip'in
  // "ADR Envanter Listesi" başlığındaki L1 maddesine yüklenir; firmanın
  // kimyasal envanteri BU DOSYADAN beslenir. Buton, L1'e yüklenmiş en
  // güncel dosyayı indirir, Excel'i ayrıştırır, UN kolonunu bulur,
  // Tablo A ile doğrular ve önizleme onayından sonra envantere yazar.
  // ---------------------------------------------------------------
  type IceAktarSatir = {
    un: string;
    ad: string; // dosyadaki ürün/ticari ad (trade_name olarak saklanır)
    miktar: string;
    ambalaj: string;
    tabloA: UnRow | null; // eşleşen Tablo A kaydı (null = bulunamadı)
    zatenVar: boolean;
  };
  const [iceAktarSatirlar, setIceAktarSatirlar] = useState<IceAktarSatir[] | null>(null);
  const [iceAktarDosyaAdi, setIceAktarDosyaAdi] = useState("");
  const [iceAktariliyor, setIceAktariliyor] = useState(false);

  async function l1DosyasindanOku() {
    setIceAktariliyor(true);
    setMesaj("");
    setIceAktarSatirlar(null);
    try {
      // 1) L1'e yüklenmiş EN GÜNCEL dosyayı bul
      const { data: dosyalar, error: dErr } = await supabase
        .from("firm_belge_dosyalari")
        .select("file_path, file_name, uploaded_at")
        .eq("firm_id", firmId)
        .eq("code", "L1")
        .order("uploaded_at", { ascending: false })
        .limit(1);
      if (dErr || !dosyalar || dosyalar.length === 0) {
        setMesaj(
          "Belge Takip'te L1 (ADR Envanter Listesi) maddesine yüklenmiş dosya bulunamadı. Önce dosyayı oraya yükle."
        );
        return;
      }
      const dosya = dosyalar[0];
      const u = dosya.file_name.toLowerCase();
      if (!/\.(xlsx|xls|csv)$/.test(u)) {
        setMesaj(
          `L1'deki son dosya "${dosya.file_name}" — Excel değil. İçe aktarma için L1'e .xlsx/.xls/.csv formatında liste yükle (PDF ayrıştırılamaz).`
        );
        return;
      }

      // 2) İndir
      const { data: url } = await supabase.storage
        .from("firm-files")
        .createSignedUrl(dosya.file_path, 300);
      if (!url?.signedUrl) {
        setMesaj("Dosya indirilemedi.");
        return;
      }
      const buf = await (await fetch(url.signedUrl)).arrayBuffer();

      // 3) Ayrıştır — başlık satırını ve kolonları sezgisel bul
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
      });

      const norm = (v: unknown) =>
        String(v ?? "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

      // Başlık satırı: "un" geçen hücresi olan ilk 15 satırdan biri
      let basIdx = -1;
      let unKol = -1;
      for (let i = 0; i < Math.min(grid.length, 15); i++) {
        for (let j = 0; j < (grid[i] || []).length; j++) {
          const h = norm(grid[i][j]);
          if (h === "un" || h === "un no" || h === "un numarası" || h === "un number" || h.startsWith("un ")) {
            basIdx = i;
            unKol = j;
            break;
          }
        }
        if (basIdx >= 0) break;
      }
      if (basIdx < 0) {
        setMesaj(
          `"${dosya.file_name}" içinde UN kolonu bulunamadı. Başlık satırında "UN No" benzeri bir kolon olmalı.`
        );
        return;
      }
      const basliklar = (grid[basIdx] || []).map(norm);
      const kolBul = (...adaylar: string[]) =>
        basliklar.findIndex((h) => adaylar.some((a) => h.includes(a)));
      const adKol = kolBul("ürün", "urun", "madde adı", "kimyasal", "ticari", "product", "ad");
      const miktarKol = kolBul("miktar", "yıllık", "yillik", "quantity", "amount");
      const ambalajKol = kolBul("ambalaj", "packag");

      // 4) Satırları topla
      const ham: { un: string; ad: string; miktar: string; ambalaj: string }[] = [];
      for (let i = basIdx + 1; i < grid.length; i++) {
        const row = grid[i] || [];
        const unHam = String(row[unKol] ?? "").replace(/\D/g, "");
        if (!unHam || unHam.length < 4) continue;
        const un = unHam.slice(0, 4);
        ham.push({
          un,
          ad: adKol >= 0 ? String(row[adKol] ?? "").trim() : "",
          miktar: miktarKol >= 0 ? String(row[miktarKol] ?? "").trim() : "",
          ambalaj: ambalajKol >= 0 ? String(row[ambalajKol] ?? "").trim() : "",
        });
      }
      if (ham.length === 0) {
        setMesaj("Dosyada UN numaralı satır bulunamadı.");
        return;
      }

      // 5) Tablo A doğrulaması (tek sorgu) + mükerrer kontrolü
      const benzersizUn = Array.from(new Set(ham.map((h) => h.un)));
      const { data: tabloA } = await supabase
        .from("adr_un_numbers")
        .select("*")
        .in("un_number", benzersizUn);
      const tabloAMap = new Map<string, UnRow[]>();
      ((tabloA as UnRow[]) || []).forEach((r) => {
        const list = tabloAMap.get(r.un_number) || [];
        list.push(r);
        tabloAMap.set(r.un_number, list);
      });

      setIceAktarSatirlar(
        ham.map((h) => {
          // Aynı UN'nin birden çok varyantı olabilir (örn. UN 1950 → 12 kayıt);
          // içe aktarmada İLK varyant önerilir, TMGD listeden düzeltebilir.
          const varyantlar = tabloAMap.get(h.un) || [];
          return {
            ...h,
            tabloA: varyantlar[0] || null,
            zatenVar: liste.some((l) => l.un_number === h.un),
          };
        })
      );
      setIceAktarDosyaAdi(dosya.file_name);
    } finally {
      setIceAktariliyor(false);
    }
  }

  async function iceAktarOnayla() {
    if (!iceAktarSatirlar) return;
    const eklenecek = iceAktarSatirlar.filter((r) => r.tabloA && !r.zatenVar);
    if (eklenecek.length === 0) {
      setMesaj("İçe aktarılacak yeni kayıt yok (hepsi mevcut veya Tablo A'da bulunamadı).");
      return;
    }
    setIceAktariliyor(true);
    try {
      const { error } = await supabase.from("firm_chemicals").insert(
        eklenecek.map((r) => ({
          firm_id: firmId,
          adr_un_id: r.tabloA!.id,
          un_number: r.tabloA!.un_number,
          proper_shipping_name: r.tabloA!.proper_shipping_name,
          adr_class: r.tabloA!.class,
          classification_code: r.tabloA!.classification_code,
          packing_group: r.tabloA!.packing_group,
          tunnel_code: r.tabloA!.tunnel_code,
          transport_category: r.tabloA!.transport_category,
          labels: r.tabloA!.labels,
          limited_quantity: r.tabloA!.limited_quantity,
          excepted_quantity: r.tabloA!.excepted_quantity,
          trade_name: r.ad || null,
          packaging_info: r.ambalaj || null,
          annual_amount: r.miktar || null,
        }))
      );
      if (error) {
        setMesaj("İçe aktarılamadı: " + hataCevir(error));
        return;
      }
      setMesaj(
        `✓ "${iceAktarDosyaAdi}" dosyasından ${eklenecek.length} kimyasal envantere aktarıldı.`
      );
      setIceAktarSatirlar(null);
      yukle();
    } finally {
      setIceAktariliyor(false);
    }
  }

  // ---------------------------------------------------------------
  // L1 — Tehlikeli Madde Envanter Listesi üretimi.
  //
  // Envanterdeki güncel kayıtlardan, sistemin belge standardına uygun
  // (dış çerçeve + başlık kutusu + zebra tablo) bir PDF üretir ve bunu
  // Belge Takip'teki L1 maddesine dosya olarak yükler — böylece envanter
  // ile L1 belgesi arasındaki bağ otomatik kurulur ve L1 maddesi
  // "tamamlandı" işaretlenir (dosya varlığı kanıttır, Belge Takip'teki
  // elle yükleme akışıyla aynı kural).
  // ---------------------------------------------------------------
  async function l1UretVeYukle() {
    if (liste.length === 0) {
      setMesaj("Envanter boş — önce kimyasal ekle.");
      return;
    }
    setL1Uretiliyor(true);
    setMesaj("");
    try {
      const { jsPDF } = await import("jspdf");
      const { LIBERATION_SANS_REGULAR_B64, LIBERATION_SANS_BOLD_B64 } =
        await import("@/lib/pdfFonts");
      const doc: JsPDFType = new jsPDF({ unit: "mm", format: "a4" });
      const FONT = "LiberationSans";
      doc.addFileToVFS("LiberationSans-Regular.ttf", LIBERATION_SANS_REGULAR_B64);
      doc.addFont("LiberationSans-Regular.ttf", FONT, "normal");
      doc.addFileToVFS("LiberationSans-Bold.ttf", LIBERATION_SANS_BOLD_B64);
      doc.addFont("LiberationSans-Bold.ttf", FONT, "bold");
      doc.setFont(FONT, "normal");

      const W = 210;
      const M = 12.4;
      const bugun = new Date().toLocaleDateString("tr-TR");

      const cerceve = () => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.7);
        doc.rect(8.5, 8.5, W - 17, 279);
        doc.setLineWidth(0.3);
      };
      const baslik = (sayfa: number, toplam: number) => {
        cerceve();
        doc.setDrawColor(0, 0, 0);
        doc.rect(M, M, W - 2 * M, 20);
        doc.line(M + 38, M, M + 38, M + 20);
        doc.line(W - M - 43, M, W - M - 43, M + 20);
        doc.setFont(FONT, "bold");
        doc.setFontSize(8);
        doc.text(firmaAdi, M + 19, M + 10, {
          align: "center",
          maxWidth: 34,
        });
        doc.setFontSize(12);
        doc.setTextColor(30, 58, 138);
        doc.text("LİSTE", (M + 38 + (W - M - 43)) / 2, M + 8, { align: "center" });
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text("Tehlikeli Madde Envanter Listesi", (M + 38 + (W - M - 43)) / 2, M + 14, {
          align: "center",
        });
        doc.setFontSize(7);
        doc.setFont(FONT, "normal");
        const sagX = W - M - 41;
        doc.text("Doküman No: L1", sagX, M + 5);
        doc.text(`Tarih: ${bugun}`, sagX, M + 10);
        doc.text(`Sayfa: ${sayfa} / ${toplam}`, sagX, M + 15);
      };

      // Tablo düzeni
      const kolonlar = [
        { b: "#", w: 8 },
        { b: "UN No", w: 16 },
        { b: "Resmi Taşıma Adı", w: 64 },
        { b: "Ticari Ad", w: 38 },
        { b: "Sınıf", w: 12 },
        { b: "PG", w: 10 },
        { b: "Tünel", w: 14 },
        { b: "Kat.", w: 10 },
        { b: "Yıllık Miktar", w: 13.2 },
      ];
      const tabloW = kolonlar.reduce((a, k) => a + k.w, 0);
      const satirlar = liste.map((k, i) => {
        const adSatir: string[] = doc.splitTextToSize(k.proper_shipping_name, 62);
        const ticariSatir: string[] = doc.splitTextToSize(k.trade_name || "—", 36);
        const yuk = Math.max(6, Math.max(adSatir.length, ticariSatir.length) * 3.4 + 2.6);
        return { k, i, adSatir, ticariSatir, yuk };
      });

      // Sayfalama hesabı
      const ustY = M + 24;
      const altSinir = 280;
      let sayfalar = 1;
      {
        let y = ustY + 7;
        for (const s2 of satirlar) {
          if (y + s2.yuk > altSinir) {
            sayfalar++;
            y = ustY + 7;
          }
          y += s2.yuk;
        }
      }

      let sayfa = 1;
      baslik(sayfa, sayfalar);
      let y = ustY;
      const tabloBasligi = () => {
        doc.setFillColor(235, 238, 245);
        doc.rect(M, y, tabloW, 7, "F");
        doc.rect(M, y, tabloW, 7);
        doc.setFont(FONT, "bold");
        doc.setFontSize(7);
        let x = M;
        kolonlar.forEach((c) => {
          doc.text(c.b, x + 1.5, y + 4.8);
          x += c.w;
        });
        y += 7;
        doc.setFont(FONT, "normal");
      };
      tabloBasligi();

      satirlar.forEach((s2) => {
        if (y + s2.yuk > altSinir) {
          doc.addPage();
          sayfa++;
          baslik(sayfa, sayfalar);
          y = ustY;
          tabloBasligi();
        }
        if (s2.i % 2 === 1) {
          doc.setFillColor(247, 248, 250);
          doc.rect(M, y, tabloW, s2.yuk, "F");
        }
        doc.rect(M, y, tabloW, s2.yuk);
        doc.setFontSize(7);
        let x = M;
        const hucre = (t: string, w: number, orta = false) => {
          doc.text(t, orta ? x + w / 2 : x + 1.5, y + 4.4, orta ? { align: "center" } : undefined);
          x += w;
        };
        hucre(String(s2.i + 1), 8, true);
        hucre(`UN ${s2.k.un_number}`, 16);
        doc.text(s2.adSatir, x + 1.5, y + 4.4);
        x += 64;
        doc.text(s2.ticariSatir, x + 1.5, y + 4.4);
        x += 38;
        hucre(s2.k.adr_class || "—", 12, true);
        hucre(s2.k.packing_group || "—", 10, true);
        hucre(s2.k.tunnel_code || "—", 14, true);
        hucre(s2.k.transport_category || "—", 10, true);
        hucre((s2.k.annual_amount || "—").slice(0, 10), 13.2);
        y += s2.yuk;
      });

      doc.setFontSize(6.5);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `${liste.length} kimyasal · ADR alanları Tablo A'dan alınmıştır · TMGD Yönetim Sistemi`,
        W / 2,
        284,
        { align: "center" }
      );

      // Belge Takip'e yükleme — elle yükleme akışıyla AYNI yol ve tablolar.
      const pdfBlob = doc.output("blob");
      const dosyaAdi = `L1_Envanter_Listesi_${bugun.replace(/\./g, "-")}.pdf`;
      const yol = `${firmId}/belge-takip/L1_genel/${Date.now()}_${dosyaAdi}`;

      const { error: upErr } = await supabase.storage
        .from("firm-files")
        .upload(yol, pdfBlob, { upsert: true, contentType: "application/pdf" });
      if (upErr) {
        setMesaj("L1 yüklenemedi: " + hataCevir(upErr));
        return;
      }
      const { error: dbErr } = await supabase.from("firm_belge_dosyalari").insert({
        firm_id: firmId,
        code: "L1",
        period: "",
        file_path: yol,
        file_name: dosyaAdi,
      });
      if (dbErr) {
        setMesaj("L1 kaydedilemedi: " + hataCevir(dbErr));
        return;
      }
      // Dosya varlığı maddenin karşılandığının kanıtı — Belge Takip kuralı.
      await supabase
        .from("firm_belgeleri")
        .upsert(
          { firm_id: firmId, code: "L1", period: "", done: true },
          { onConflict: "firm_id,code,period" }
        );

      doc.save(dosyaAdi);
      setMesaj(
        `✓ L1 listesi ${liste.length} kimyasalla üretildi, Belge Takip'e yüklendi ve indirildi.`
      );
    } finally {
      setL1Uretiliyor(false);
    }
  }

  async function sil(k: FirmChemical) {
    if (!confirm(`UN ${k.un_number} — ${k.proper_shipping_name} envanterden silinsin mi?`))
      return;
    const { error } = await supabase
      .from("firm_chemicals")
      .delete()
      .eq("id", k.id);
    if (error) {
      setMesaj("Silinemedi: " + hataCevir(error));
      return;
    }
    yukle();
  }

  return (
    <div>
      {hata && (
        <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-3 mb-4">
          {hata}
        </p>
      )}

      {/* L1 DOSYASINDAN İÇE AKTARMA — envanterin ana kaynağı Belge
          Takip'teki "ADR Envanter Listesi" (L1) dosyasıdır. */}
      {canWrite && !hata && (
        <div className="border rounded-xl p-4 mb-4 bg-blue-50/50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h4 className="font-semibold text-sm">
                Belge Takip&apos;teki L1 dosyasından içe aktar
              </h4>
              <p className="text-xs text-gray-500">
                &quot;ADR Envanter Listesi&quot; başlığına yüklenen en güncel
                Excel (.xlsx/.csv) okunur; UN numaraları Tablo A ile doğrulanıp
                envantere yazılır.
              </p>
            </div>
            <button
              onClick={l1DosyasindanOku}
              disabled={iceAktariliyor}
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {iceAktariliyor ? "Okunuyor..." : "📥 L1 Dosyasını Oku"}
            </button>
          </div>

          {iceAktarSatirlar && (
            <div className="mt-3">
              <p className="text-xs mb-2">
                <b>{iceAktarDosyaAdi}</b> — {iceAktarSatirlar.length} satır bulundu:{" "}
                <span className="text-green-700">
                  {iceAktarSatirlar.filter((r) => r.tabloA && !r.zatenVar).length} eklenecek
                </span>
                {" · "}
                <span className="text-gray-500">
                  {iceAktarSatirlar.filter((r) => r.zatenVar).length} zaten envanterde
                </span>
                {" · "}
                <span className="text-red-600">
                  {iceAktarSatirlar.filter((r) => !r.tabloA).length} Tablo A&apos;da yok
                </span>
              </p>
              <div className="max-h-56 overflow-auto border rounded bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-1.5 text-left">UN</th>
                      <th className="p-1.5 text-left">Dosyadaki Ad</th>
                      <th className="p-1.5 text-left">Tablo A Eşleşmesi</th>
                      <th className="p-1.5 text-center">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iceAktarSatirlar.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1.5 font-semibold">UN {r.un}</td>
                        <td className="p-1.5">{r.ad || "—"}</td>
                        <td className="p-1.5 text-gray-600">
                          {r.tabloA ? r.tabloA.proper_shipping_name.slice(0, 55) : "—"}
                        </td>
                        <td className="p-1.5 text-center">
                          {!r.tabloA ? (
                            <span className="text-red-600">Tablo A&apos;da yok</span>
                          ) : r.zatenVar ? (
                            <span className="text-gray-400">mevcut</span>
                          ) : (
                            <span className="text-green-700">eklenecek</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={iceAktarOnayla}
                  disabled={iceAktariliyor}
                  className="px-3 py-1.5 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
                >
                  ✓ Onayla ve Envantere Aktar
                </button>
                <button
                  onClick={() => setIceAktarSatirlar(null)}
                  className="px-3 py-1.5 rounded border text-xs bg-white hover:bg-gray-50"
                >
                  Vazgeç
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Birden çok varyantı olan UN numaralarında (örn. UN 1950) ilk
                varyant önerilir; aktarımdan sonra listeden silip doğru varyantı
                elle ekleyebilirsin.
              </p>
            </div>
          )}
        </div>
      )}

      {/* EKLEME — şablona bağlı: yalnızca Tablo A'dan seçim */}
      {ekleyebilir && !hata && (
        <div className="border rounded-xl p-4 mb-6 bg-gray-50">
          <h4 className="font-semibold mb-1">Envantere Kimyasal Ekle</h4>
          <p className="text-xs text-gray-500 mb-3">
            UN numarası veya madde adıyla ADR Tablo A&apos;da ara; ADR
            bilgileri otomatik doldurulur. Tablo A dışından madde eklenemez.
          </p>

          <div className="relative" ref={kutuRef}>
            <input
              className="border p-2 w-full rounded"
              placeholder="UN No veya madde adı (örn. 1203 veya BENZİN)"
              value={sorgu}
              onChange={(e) => {
                setSorgu(e.target.value);
                setSecili(null);
                setAcik(true);
              }}
              onFocus={() => setAcik(true)}
            />
            {acik && (sonuclar.length > 0 || araniyor) && (
              <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-72 overflow-auto">
                {araniyor && (
                  <p className="text-xs text-gray-400 p-2">Aranıyor...</p>
                )}
                {sonuclar.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSecili(r);
                      setSorgu(
                        `UN ${r.un_number} — ${r.proper_shipping_name.slice(0, 60)}`
                      );
                      setAcik(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0"
                  >
                    <span className="font-semibold">UN {r.un_number}</span>{" "}
                    {r.proper_shipping_name}
                    <span className="text-xs text-gray-400 ml-2">
                      Sınıf {r.class || "—"} · PG {r.packing_group || "—"} ·
                      Tünel {r.tunnel_code || "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {secili && (
            <div className="mt-3">
              {/* Tablo A'dan gelen (değiştirilemez) şablon alanları */}
              <div className="text-xs bg-white border rounded p-2 mb-3 grid grid-cols-2 md:grid-cols-4 gap-1">
                <span>Sınıf: <b>{secili.class || "—"}</b></span>
                <span>PG: <b>{secili.packing_group || "—"}</b></span>
                <span>Tünel: <b>{secili.tunnel_code || "—"}</b></span>
                <span>Taşıma Kat.: <b>{secili.transport_category || "—"}</b></span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input
                  className="border p-2 rounded text-sm"
                  placeholder="Ticari ad (opsiyonel)"
                  value={ticariAd}
                  onChange={(e) => setTicariAd(e.target.value)}
                />
                <input
                  className="border p-2 rounded text-sm"
                  placeholder="Ambalaj bilgisi (opsiyonel)"
                  value={ambalaj}
                  onChange={(e) => setAmbalaj(e.target.value)}
                />
                <input
                  className="border p-2 rounded text-sm"
                  placeholder="Yıllık miktar (opsiyonel)"
                  value={miktar}
                  onChange={(e) => setMiktar(e.target.value)}
                />
              </div>
              {zatenVar && (
                <p className="text-xs text-amber-600 mb-2">
                  Bu madde envanterde zaten var — yine de ekleyebilirsin
                  (farklı ambalaj/ticari ad için).
                </p>
              )}
              <button
                onClick={ekle}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Envantere Ekle
              </button>
            </div>
          )}

          {mesaj && <p className="text-sm mt-2">{mesaj}</p>}
        </div>
      )}

      {/* LİSTE */}
      {yukleniyor ? (
        <p className="text-sm text-gray-400">Envanter yükleniyor...</p>
      ) : liste.length === 0 && !hata ? (
        <p className="text-sm text-gray-400">
          Bu firmanın envanterinde henüz kimyasal yok.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-2">UN No</th>
                <th className="p-2">Resmi Taşıma Adı</th>
                <th className="p-2">Ticari Ad</th>
                <th className="p-2 text-center">Sınıf</th>
                <th className="p-2 text-center">PG</th>
                <th className="p-2 text-center">Tünel</th>
                <th className="p-2 text-center">Taş. Kat.</th>
                {canWrite && <th className="p-2"></th>}
              </tr>
            </thead>
            <tbody>
              {liste.map((k) => (
                <tr key={k.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-semibold whitespace-nowrap">
                    UN {k.un_number}
                  </td>
                  <td className="p-2">{k.proper_shipping_name}</td>
                  <td className="p-2 text-gray-500">{k.trade_name || "—"}</td>
                  <td className="p-2 text-center">{k.adr_class || "—"}</td>
                  <td className="p-2 text-center">{k.packing_group || "—"}</td>
                  <td className="p-2 text-center">{k.tunnel_code || "—"}</td>
                  <td className="p-2 text-center">
                    {k.transport_category || "—"}
                  </td>
                  {canWrite && (
                    <td className="p-2 text-right">
                      <button
                        onClick={() => sil(k)}
                        className="text-gray-400 hover:text-red-500"
                        title="Sil"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">
              {liste.length} kimyasal · ADR alanları Tablo A&apos;dan otomatik
              doldurulur.
            </p>
            {canWrite && (
              <button
                onClick={l1UretVeYukle}
                disabled={l1Uretiliyor}
                className="text-xs px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
                title="Envanterden L1 belgesi üret, Belge Takip'e yükle ve indir"
              >
                {l1Uretiliyor ? "Üretiliyor..." : "📄 L1 Listesi Üret → Belge Takip'e Yükle"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
