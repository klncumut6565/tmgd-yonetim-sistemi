"use client";

// BELGE OLUŞTUR — ortak bileşen
//  - Firma seçilir (ya da fixedFirmId ile sabitlenir) → firmanın faaliyet
//    konularına göre SADECE ilgili P/T/K/L/SA belgeleri listelenir
//    (kaynak: src/lib/belgeKatalogu.ts)
//  - Birden fazla belge seçilebilir, ek not girilebilir
//  - "Belgeyi Oluştur": her seçim için logolu A4 PDF indirir ve
//    firmanın Belge Takip listesinde ilgili maddeyi tamamlandı işaretler
//
// fixedFirmId verilirse (firma detay sayfasındaki "Belge Oluştur" sekmesi
// gibi) firma seçici tamamen gizlenir — kullanıcı yalnızca o firmaya ait
// belge oluşturabilir, başka bir sayfaya/menüye yönlendirilmez.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";
import {
  ACTIVITY_LABELS,
  CATALOG,
  CATEGORY_LABELS,
  CatalogCategory,
  CatalogItem,
  catalogForActivities,
} from "@/lib/belgeKatalogu";
import { belgeSablonu, BelgeSablonu } from "@/lib/belgeSablonlari";
import type { jsPDF as JsPDFType } from "jspdf";

type Firm = {
  id: string;
  name: string;
  activities: string[] | null;
  contract_start: string | null;
  logo_url: string | null;
  tmgd_assigned?: string | null;
};

const CATEGORY_ORDER: CatalogCategory[] = ["P", "T", "K", "L", "SA"];

type Props = {
  fixedFirmId?: string;   // verilirse firma seçici gizlenir, yalnızca bu firma için belge oluşturulur
  initialFirmId?: string; // verilirse firma seçici görünür ama başlangıçta bu firma seçili gelir
  compact?: boolean;      // true ise başlık (h1) gizlenir — üst sayfa kendi başlığını gösteriyorsa kullan
};

export default function BelgeOlusturForm({ fixedFirmId, initialFirmId, compact = false }: Props) {
  const { canWrite } = useUser();

  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmId, setFirmId] = useState(fixedFirmId || initialFirmId || "");
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [onaylayanAdi, setOnaylayanAdi] = useState("");
  const [tmgdNameMap, setTmgdNameMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [tempLogoFile, setTempLogoFile] = useState<File | null>(null);
  const [tempLogoPreview, setTempLogoPreview] = useState<string | null>(null);
  const [useTempLogo, setUseTempLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      // fixedFirmId varsa yalnızca o tek firmayı çek (firma seçici zaten yok);
      // yoksa aktif firmaların tamamını çekip seçiciye doldur.
      let query = supabase
        .from("firms")
        .select("id, name, activities, contract_start, logo_url, tmgd_assigned");

      query = fixedFirmId
        ? query.eq("id", fixedFirmId)
        : query.eq("status", "active").order("name");

      let { data, error } = await query;

      if (error && /does not exist/i.test(error.message || "")) {
        // tmgd_assigned kolonu henüz yoksa (migration çalıştırılmamışsa) onsuz dene
        let retryQuery = supabase
          .from("firms")
          .select("id, name, activities, contract_start, logo_url");
        retryQuery = fixedFirmId
          ? retryQuery.eq("id", fixedFirmId)
          : retryQuery.eq("status", "active").order("name");
        const retry = await retryQuery;
        data = (retry.data || []).map((f) => ({ ...f, tmgd_assigned: null })) as typeof data;
        error = retry.error;

        if (error && /does not exist/i.test(error.message || "")) {
          let retry2Query = supabase.from("firms").select("id, name, logo_url");
          retry2Query = fixedFirmId
            ? retry2Query.eq("id", fixedFirmId)
            : retry2Query.eq("status", "active").order("name");
          const retry2 = await retry2Query;
          data = (retry2.data || []).map((f) => ({
            ...f,
            activities: [],
            contract_start: null,
            tmgd_assigned: null,
          })) as typeof data;
          error = retry2.error;
          if (!retry2.error) {
            setError(
              "Faaliyet konuları görünmüyor — veritabanı güncellemesi (migration 010) henüz çalıştırılmamış."
            );
          }
        }
      } else if (error) {
        setError("Firmalar yüklenemedi: " + hataCevir(error));
      }
      setFirms((data as Firm[]) || []);
      if (fixedFirmId) setFirmId(fixedFirmId);

      // Atanmış TMGD'lerin adlarını ayrı bir sorguyla getir (embedding/RLS
      // belirsizliğinden kaçınmak için firms.tmgd_assigned → profiles.full_name eşlemesi).
      const tmgdIds = Array.from(
        new Set(((data as Firm[]) || []).map((f) => f.tmgd_assigned).filter((v): v is string => !!v))
      );
      if (tmgdIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", tmgdIds);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: { id: string; full_name: string }) => {
          map[p.id] = p.full_name;
        });
        setTmgdNameMap(map);
      }
    })();
  }, [fixedFirmId]);

  const firm = useMemo(
    () => firms.find((f) => f.id === firmId) || null,
    [firms, firmId]
  );

  // Firma faaliyetlerine göre filtrelenmiş katalog, kategoriye göre gruplu
  const grouped = useMemo(() => {
    if (!firm) return [];
    const items = catalogForActivities(firm.activities || []);
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat],
      items: items.filter((i) => i.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [firm]);

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function changeFirm(id: string) {
    setFirmId(id);
    setSelected([]);
    setMsg("");
    setError("");
    clearTempLogo();
  }

  // Seçili firmanın KAYITLI logosu için küçük önizleme (imzalı URL) —
  // bu, firma kaydı sırasında yüklenen ve tüm belgelerde varsayılan
  // olarak kullanılan logodur. Bu bileşen bu logoyu DEĞİŞTİRMEZ.
  useEffect(() => {
    (async () => {
      if (!firm?.logo_url) {
        setLogoPreview(null);
        return;
      }
      const { data } = await supabase.storage
        .from("firm-files")
        .createSignedUrl(firm.logo_url, 3600);
      setLogoPreview(data?.signedUrl || null);
    })();
  }, [firm?.logo_url]);

  // Geçici logo seçildiğinde yalnızca ekranda önizleme + oluşturulacak
  // PDF'lerde kullanılır; firma kaydına (firms.logo_url) hiç yazılmaz.
  function selectTempLogo(file: File) {
    setTempLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setTempLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setUseTempLogo(true);
  }

  function clearTempLogo() {
    setTempLogoFile(null);
    setTempLogoPreview(null);
    setUseTempLogo(false);
  }

  // Bir File nesnesini doğrudan (storage'a yüklemeden) jsPDF için dataURL'e çevirir
  async function fileToLogoData(file: File): Promise<{ data: string; fmt: "PNG" | "JPEG" }> {
    const fmt: "PNG" | "JPEG" = file.type.includes("png") ? "PNG" : "JPEG";
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    return { data, fmt };
  }

  // Logo'yu imzalı URL üzerinden dataURL'e çevir (jsPDF için)
  async function logoDataUrl(path: string): Promise<{ data: string; fmt: "PNG" | "JPEG" } | null> {
    try {
      const { data: signed } = await supabase.storage
        .from("firm-files")
        .createSignedUrl(path, 600);
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
      return { data: dataUrl, fmt };
    } catch {
      return null;
    }
  }

  async function generate() {
    if (!firm || selected.length === 0) return;
    setBusy(true);
    setMsg("");
    setError("");

    try {
      const { jsPDF } = await import("jspdf");
      // Öncelik: bu oturum için geçici logo seçildiyse o kullanılır,
      // aksi halde firmanın kayıtlı (varsayılan) logosu kullanılır.
      const logo = useTempLogo && tempLogoFile
        ? await fileToLogoData(tempLogoFile)
        : firm.logo_url
          ? await logoDataUrl(firm.logo_url)
          : null;
      const bugun = new Date().toLocaleDateString("tr-TR");

      for (const code of selected) {
        const item = CATALOG.find((c) => c.code === code);
        if (!item) continue;

        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const sablon = belgeSablonu(item.code);

        if (sablon) {
          const hazirlayanAdi = firm.tmgd_assigned ? tmgdNameMap[firm.tmgd_assigned] || "" : "";
          await renderYapilandirilmisBelge(
            doc,
            firm.name,
            item.code,
            item.name,
            sablon,
            logo,
            notes,
            hazirlayanAdi,
            onaylayanAdi.trim()
          );
        } else {
          await fontuKaydet(doc);
          renderBasitBelge(doc, firm, item, logo, notes, bugun);
        }

        doc.save(`${firm.name}_${item.code}.pdf`);

        // Belge Takip'te tamamlandı işaretle
        await supabase.from("firm_belgeleri").upsert(
          {
            firm_id: firm.id,
            code: item.code,
            period: "",
            done: true,
            note: notes.trim() || null,
          },
          { onConflict: "firm_id,code,period" }
        );
      }

      setMsg(`✓ ${selected.length} belge oluşturuldu ve Belge Takip listesinde işaretlendi.`);
      setSelected([]);
    } catch (e) {
      setError("Belge oluşturulamadı: " + hataCevir(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "" : "p-8"}>
      {!compact && <h1 className="text-3xl font-bold mb-6">Belge Oluştur</h1>}

      {error && (
        <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          {error}
        </p>
      )}
      {msg && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded p-3 mb-4">
          {msg}
        </p>
      )}

      {/* Yan yana: solda form, sağda belge türleri */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SOL: firma (yalnızca fixedFirmId yoksa) + notlar + oluştur */}
        <div>
          {!fixedFirmId && (
            <label className="block mb-4">
              <span className="text-sm text-gray-600">Firma adı *</span>
              <select
                className="border p-2 w-full rounded mt-1"
                value={firmId}
                onChange={(e) => changeFirm(e.target.value)}
              >
                <option value="">Firma seçin...</option>
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {firm && (
            <div className="mb-4">
              <span className="text-sm text-gray-600">Faaliyet konuları</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(firm.activities || []).length === 0 && (
                  <span className="text-xs text-gray-400">
                    Seçili faaliyet yok — yalnızca ortak belgeler listelenir.
                  </span>
                )}
                {(firm.activities || []).map((a) => (
                  <span
                    key={a}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                  >
                    {ACTIVITY_LABELS[a] || a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 text-sm">
            <span className="text-gray-600">Logo</span>

            {!firm && (
              <p className="mt-1 text-gray-400">
                {fixedFirmId ? "Firma bilgisi yükleniyor..." : "Önce firma seçin."}
              </p>
            )}

            {firm && !useTempLogo && (
              <div className="mt-1 flex items-center gap-3">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt="Firma logosu"
                    className="h-10 w-10 object-contain rounded border bg-white shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded border border-dashed flex items-center justify-center text-gray-300 text-xs shrink-0">
                    Logo
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {firm.logo_url ? (
                    <p className="text-green-700 text-xs">
                      ✓ Firmanın kayıtlı logosu kullanılacak (varsayılan)
                    </p>
                  ) : (
                    <p className="text-gray-500 text-xs">
                      Bu firma için kayıtlı logo yok — belgeler logosuz oluşturulur.
                      {!fixedFirmId && (
                        <>
                          {" "}
                          <Link href={`/firms/${firm.id}`} className="text-blue-600 underline">
                            Firma kaydına logo ekle
                          </Link>
                        </>
                      )}
                    </p>
                  )}

                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="text-xs text-gray-400 underline hover:text-gray-600"
                    >
                      Bu belge(ler) için farklı/geçici logo kullan
                    </button>
                  )}
                </div>
              </div>
            )}

            {firm && useTempLogo && (
              <div className="mt-1 flex items-center gap-3">
                {tempLogoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tempLogoPreview}
                    alt="Geçici logo"
                    className="h-10 w-10 object-contain rounded border bg-white shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-amber-700 text-xs">
                    ⚠ Geçici logo seçildi — yalnızca bu oluşturmada kullanılır, firma
                    kaydına kaydedilmez.
                  </p>
                  <button
                    type="button"
                    onClick={clearTempLogo}
                    className="text-xs text-blue-600 underline"
                  >
                    Vazgeç, firmanın kayıtlı logosunu kullan
                  </button>
                </div>
              </div>
            )}

            {canWrite && (
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) selectTempLogo(f);
                  e.target.value = "";
                }}
              />
            )}
          </div>

          <label className="block mb-4">
            <span className="text-sm text-gray-600">Ek notlar / içerik</span>
            <textarea
              className="border p-2 w-full rounded mt-1"
              rows={5}
              placeholder="Belgeye eklenecek özel bilgiler..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-gray-600">Onaylayan (opsiyonel)</span>
            <input
              type="text"
              className="border p-2 w-full rounded mt-1"
              placeholder="Boş bırakılırsa 'Sorumlu Kişi' yazılır"
              value={onaylayanAdi}
              onChange={(e) => setOnaylayanAdi(e.target.value)}
            />
            <span className="text-xs text-gray-400">
              Belge alt tablosundaki &quot;ONAYLAYAN&quot; kutusuna yazılacak isim.
            </span>
          </label>

          <button
            onClick={generate}
            disabled={!canWrite || busy || !firm || selected.length === 0}
            className="w-full px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {busy
              ? "Oluşturuluyor..."
              : `✦ Belgeyi Oluştur${selected.length ? ` (${selected.length})` : ""}`}
          </button>
          {!canWrite && (
            <p className="text-xs text-gray-400 mt-2">
              Hesabın salt okunur — belge oluşturamazsın.
            </p>
          )}
        </div>

        {/* SAĞ: faaliyete göre filtrelenmiş belge türleri */}
        <div className="lg:col-span-2">
          <span className="text-sm text-gray-600">Belge Türü *</span>

          {!firm && (
            <p className="text-sm text-gray-400 border rounded-xl p-6 mt-2 text-center">
              {fixedFirmId
                ? "Firma bilgisi yükleniyor..."
                : "Belge türlerini görmek için önce firma seçin."}
            </p>
          )}

          {firm &&
            grouped.map((g) => (
              <div key={g.cat} className="mt-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
                  {g.label}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                  {g.items.map((item) => {
                    const sel = selected.includes(item.code);
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => toggle(item.code)}
                        title={item.name}
                        className={
                          "border rounded-lg px-2 py-2 text-center transition " +
                          (sel
                            ? "bg-blue-600 text-white border-blue-600"
                            : "hover:bg-gray-50")
                        }
                      >
                        <span className="block font-bold text-sm">{item.code}</span>
                        <span
                          className={
                            "block text-[10px] leading-tight mt-0.5 " +
                            (sel ? "text-blue-100" : "text-gray-500")
                          }
                        >
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

type LogoData = { data: string; fmt: "PNG" | "JPEG" } | null;

// ŞABLONU OLMAYAN kodlar için eski/basit tek sayfalık çerçeve (değişmedi).
function renderBasitBelge(
  doc: JsPDFType,
  firm: { name: string },
  item: CatalogItem,
  logo: LogoData,
  notes: string,
  bugun: string
) {
  const W = 210;

  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, W, 4, "F");

  if (logo) {
    try {
      doc.addImage(logo.data, logo.fmt, 15, 12, 24, 24);
    } catch {
      /* logo eklenemezse belge yine üretilsin */
    }
  }

  doc.setFontSize(16);
  doc.setFont(FONT, "bold");
  doc.text(firm.name, logo ? 45 : 15, 20);

  doc.setFontSize(10);
  doc.setFont(FONT, "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(`Belge Kodu: ${item.code}`, logo ? 45 : 15, 27);
  doc.text(`Tarih: ${bugun}`, logo ? 45 : 15, 32);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(13);
  doc.setFont(FONT, "bold");
  const nameLines = doc.splitTextToSize(`${item.code} — ${item.name}`, W - 30);
  doc.text(nameLines, 15, 48);

  let y = 48 + nameLines.length * 6 + 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, W - 15, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont(FONT, "normal");
  doc.setTextColor(90, 90, 90);
  const acts =
    item.activities.length === 0
      ? "Tüm faaliyet konuları"
      : item.activities.map((a) => ACTIVITY_LABELS[a] || a).join(", ");
  doc.text(`Kategori: ${CATEGORY_LABELS[item.category]}   ·   Faaliyet: ${acts}`, 15, y);
  y += 10;
  doc.setTextColor(0, 0, 0);

  if (notes.trim()) {
    doc.setFontSize(11);
    doc.setFont(FONT, "bold");
    doc.text("Notlar / İçerik", 15, y);
    y += 6;
    doc.setFont(FONT, "normal");
    doc.setFontSize(10);
    const noteLines = doc.splitTextToSize(notes.trim(), W - 30);
    doc.text(noteLines, 15, y);
    y += noteLines.length * 5 + 8;
  }

  doc.setDrawColor(220, 220, 220);
  doc.rect(15, y, W - 30, Math.max(40, 240 - y));

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${firm.name} · ${item.code} · TMGD Yönetim Sistemi tarafından ${bugun} tarihinde oluşturuldu`,
    15,
    290
  );
}

// ---------------------------------------------------------------------
// ŞABLONU OLAN kodlar için çok sayfalı, gerçek TMGDK belge formatında
// (Doküman No / Yayın-Revizyon Tarihi / Sayfa No başlık tablosu +
// Amaç/Kapsam/Tanımlar/bölümler + Hazırlayan/Kontrol Eden/Onaylayan alt
// tablosu her sayfada tekrarlanır) PDF üretir.
// ---------------------------------------------------------------------

type Satir =
  | { tur: "baslik"; metin: string }
  | { tur: "altbaslik"; metin: string }
  | { tur: "paragraf"; metin: string }
  | { tur: "madde"; metin: string; numara?: number }
  | { tur: "tablo"; headers?: string[]; rows: string[][]; note?: string };

const M = 15;
const W = 210;
const H = 297;
const FOOTER_UST = 270; // içerik bitişi (alt tablo öncesi)
const FONT = "LiberationSans"; // Türkçe karakter destekli gömülü font (bkz. pdfFonts.ts)
const RENK_VURGU: [number, number, number] = [30, 64, 175]; // kurumsal mavi (subheading, çizgiler)
const SATIR_YUKSEKLIGI: Record<"baslik" | "altbaslik" | "paragraf" | "madde", number> = {
  baslik: 7,
  altbaslik: 6.5,
  paragraf: 4.6,
  madde: 4.6,
};

// jsPDF'e gömülü TTF fontu bir kez tanıtır. Her doc örneği için ayrı çağrılmalı.
async function fontuKaydet(doc: JsPDFType) {
  const { LIBERATION_SANS_REGULAR_B64, LIBERATION_SANS_BOLD_B64 } = await import(
    "@/lib/pdfFonts"
  );
  doc.addFileToVFS("LiberationSans-Regular.ttf", LIBERATION_SANS_REGULAR_B64);
  doc.addFont("LiberationSans-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("LiberationSans-Bold.ttf", LIBERATION_SANS_BOLD_B64);
  doc.addFont("LiberationSans-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
}

function duzMetneCevir(doc: JsPDFType, sablon: BelgeSablonu, belgeAdi: string): Satir[] {
  const genislik = W - 2 * M;
  const satirlar: Satir[] = [];

  satirlar.push({ tur: "baslik", metin: belgeAdi });

  if (sablon.amac) {
    satirlar.push({ tur: "altbaslik", metin: "Amaç" });
    doc.setFontSize(9.5);
    doc.splitTextToSize(sablon.amac, genislik).forEach((t: string) =>
      satirlar.push({ tur: "paragraf", metin: t })
    );
  }
  if (sablon.kapsam) {
    satirlar.push({ tur: "altbaslik", metin: "Kapsam" });
    doc.setFontSize(9.5);
    doc.splitTextToSize(sablon.kapsam, genislik).forEach((t: string) =>
      satirlar.push({ tur: "paragraf", metin: t })
    );
  }
  if (sablon.tanimlar && sablon.tanimlar.length > 0) {
    satirlar.push({ tur: "altbaslik", metin: "Tanımlar" });
    doc.setFontSize(9.5);
    sablon.tanimlar.forEach((t) => {
      doc.splitTextToSize(`${t.terim}: ${t.tanim}`, genislik - 4).forEach((line: string) =>
        satirlar.push({ tur: "madde", metin: line })
      );
    });
  }

  sablon.blocks.forEach((b) => {
    if (b.type === "subheading") {
      satirlar.push({ tur: "altbaslik", metin: b.text });
    } else if (b.type === "paragraph") {
      doc.setFontSize(9.5);
      doc.splitTextToSize(b.text, genislik).forEach((t: string) =>
        satirlar.push({ tur: "paragraf", metin: t })
      );
    } else if (b.type === "bullet") {
      doc.setFontSize(9.5);
      b.items.forEach((item) => {
        doc.splitTextToSize(`•  ${item}`, genislik - 4).forEach((line: string) =>
          satirlar.push({ tur: "madde", metin: line })
        );
      });
    } else if (b.type === "numbered") {
      doc.setFontSize(9.5);
      b.items.forEach((item, i) => {
        doc.splitTextToSize(`${i + 1}.  ${item}`, genislik - 4).forEach((line: string) =>
          satirlar.push({ tur: "madde", metin: line })
        );
      });
    } else if (b.type === "table") {
      satirlar.push({ tur: "tablo", headers: b.headers, rows: b.rows, note: b.note });
    }
  });

  return satirlar;
}

// ---- Tablo ölçümü + çizimi -------------------------------------------
// Sütun genişlikleri: ilk sütun biraz daha geniş (etiket sütunu), kalanlar eşit paylaşır.
function tabloKolonGenislikleri(genislik: number, kolonSayisi: number): number[] {
  if (kolonSayisi <= 1) return [genislik];
  const ilkOran = 1.3;
  const toplamOran = ilkOran + (kolonSayisi - 1);
  const birim = genislik / toplamOran;
  return [birim * ilkOran, ...Array(kolonSayisi - 1).fill(birim)];
}

function tabloHucreSatirlari(
  doc: JsPDFType,
  metin: string,
  genislik: number,
  fontSize: number,
  kalin: boolean
): string[] {
  doc.setFontSize(fontSize);
  doc.setFont(FONT, kalin ? "bold" : "normal");
  return metin.split("\n").flatMap((parca) => doc.splitTextToSize(parca, genislik - 3));
}

const TABLO_SATIR_YUKSEKLIGI = 4.6;
const TABLO_PADDING = 1.6;

function tabloYuksekligiHesapla(
  doc: JsPDFType,
  tablo: { headers?: string[]; rows: string[][]; note?: string },
  genislik: number
): number {
  const kolonSayisi = (tablo.headers || tablo.rows[0] || []).length;
  const kolonGenislikleri = tabloKolonGenislikleri(genislik, kolonSayisi);
  let yukseklik = 0;

  if (tablo.headers) {
    const satirSayilari = tablo.headers.map(
      (h, i) => tabloHucreSatirlari(doc, h, kolonGenislikleri[i], 7.5, true).length
    );
    yukseklik += Math.max(...satirSayilari) * TABLO_SATIR_YUKSEKLIGI + TABLO_PADDING * 2;
  }
  tablo.rows.forEach((row) => {
    const satirSayilari = row.map(
      (hucre, i) => tabloHucreSatirlari(doc, hucre, kolonGenislikleri[i], 8, false).length
    );
    yukseklik += Math.max(...satirSayilari) * TABLO_SATIR_YUKSEKLIGI + TABLO_PADDING * 2;
  });
  if (tablo.note) {
    doc.setFontSize(7.5);
    doc.setFont(FONT, "normal");
    yukseklik += doc.splitTextToSize(tablo.note, genislik).length * 3.8 + 3;
  }
  return yukseklik + 2; // alt boşluk
}

function tabloCiz(
  doc: JsPDFType,
  tablo: { headers?: string[]; rows: string[][]; note?: string },
  x: number,
  yBaslangic: number,
  genislik: number
) {
  const kolonSayisi = (tablo.headers || tablo.rows[0] || []).length;
  const kolonGenislikleri = tabloKolonGenislikleri(genislik, kolonSayisi);
  let y = yBaslangic;

  const satirCiz = (
    hucreler: string[],
    fontSize: number,
    kalin: boolean,
    doluRenk: [number, number, number] | null
  ) => {
    const hucreSatirlari = hucreler.map((h, i) =>
      tabloHucreSatirlari(doc, h, kolonGenislikleri[i], fontSize, kalin)
    );
    const satirYuksekligi =
      Math.max(...hucreSatirlari.map((s) => s.length)) * TABLO_SATIR_YUKSEKLIGI + TABLO_PADDING * 2;

    if (doluRenk) {
      doc.setFillColor(...doluRenk);
      doc.rect(x, y, genislik, satirYuksekligi, "F");
    }
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.2);

    let kx = x;
    hucreSatirlari.forEach((satirlar, i) => {
      doc.setFontSize(fontSize);
      doc.setFont(FONT, kalin ? "bold" : "normal");
      doc.setTextColor(kalin && doluRenk ? 255 : 20, kalin && doluRenk ? 255 : 20, kalin && doluRenk ? 255 : 20);
      doc.text(satirlar, kx + kolonGenislikleri[i] / 2, y + TABLO_PADDING + TABLO_SATIR_YUKSEKLIGI * 0.75, {
        align: "center",
        maxWidth: kolonGenislikleri[i] - 3,
      });
      doc.rect(kx, y, kolonGenislikleri[i], satirYuksekligi);
      kx += kolonGenislikleri[i];
    });
    doc.setTextColor(0, 0, 0);
    y += satirYuksekligi;
  };

  if (tablo.headers) satirCiz(tablo.headers, 7.5, true, RENK_VURGU);
  tablo.rows.forEach((row, i) => satirCiz(row, 8, false, i % 2 === 1 ? [245, 247, 251] : null));

  if (tablo.note) {
    y += 2.5;
    doc.setFontSize(7.5);
    doc.setFont(FONT, "normal");
    doc.setTextColor(110, 110, 110);
    const noteLines = doc.splitTextToSize(tablo.note, genislik);
    doc.text(noteLines, x, y);
    doc.setTextColor(0, 0, 0);
  }
}

// ---- Sayfalara bölme (dinamik başlık yüksekliğini dikkate alır) ------
function satirYuksekligi(doc: JsPDFType, satir: Satir, genislik: number): number {
  if (satir.tur === "tablo") return tabloYuksekligiHesapla(doc, satir, genislik);
  return SATIR_YUKSEKLIGI[satir.tur] + (satir.tur === "altbaslik" ? 2 : 0);
}

function sayfalaraBol(
  doc: JsPDFType,
  satirlar: Satir[],
  headerAlt: number
): Satir[][] {
  const genislik = W - 2 * M;
  const kullanilabilirYukseklik = FOOTER_UST - headerAlt;
  const sayfalar: Satir[][] = [];
  let mevcutSayfa: Satir[] = [];
  let mevcutYukseklik = 0;

  for (const satir of satirlar) {
    const yukseklik = satirYuksekligi(doc, satir, genislik);
    if (mevcutYukseklik + yukseklik > kullanilabilirYukseklik && mevcutSayfa.length > 0) {
      sayfalar.push(mevcutSayfa);
      mevcutSayfa = [];
      mevcutYukseklik = 0;
    }
    mevcutSayfa.push(satir);
    mevcutYukseklik += yukseklik;
  }
  if (mevcutSayfa.length > 0) sayfalar.push(mevcutSayfa);
  return sayfalar.length > 0 ? sayfalar : [[]];
}

// Belge adının orta sütunda kaç satıra sarılacağını ölçüp başlık kutusunun
// gerçek yüksekliğini (ve dolayısıyla içeriğin başlayacağı Y konumunu)
// hesaplar. Bu, uzun belge adlarının kutu dışına taşmasını önler.
function baslikYuksekligiHesapla(doc: JsPDFType, belgeAdi: string): { yukseklik: number; adLines: string[] } {
  const ortaGenislik = W - 2 * M - 38 - 45 - 6;
  doc.setFontSize(8.5);
  doc.setFont(FONT, "normal");
  const adLines: string[] = doc.splitTextToSize(belgeAdi, ortaGenislik);
  const tabanYukseklik = 24; // logo/sağ blok için asgari
  const adBlokYuksekligi = 9 + adLines.length * 4.4 + 3;
  return { yukseklik: Math.max(tabanYukseklik, adBlokYuksekligi), adLines };
}

function baslikTablosuCiz(
  doc: JsPDFType,
  firmAdi: string,
  code: string,
  belgeAdi: string,
  sablon: BelgeSablonu,
  logo: LogoData,
  bugun: string,
  sayfaNo: number,
  toplamSayfa: number,
  yukseklik: number,
  adLines: string[]
) {
  const ustY = 8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, ustY, W - 2 * M, yukseklik);
  doc.line(M + 38, ustY, M + 38, ustY + yukseklik);
  doc.line(W - M - 45, ustY, W - M - 45, ustY + yukseklik);

  // Sol: logo / firma adı
  if (logo) {
    try {
      doc.addImage(logo.data, logo.fmt, M + 3, ustY + 3, 18, 18);
    } catch {
      /* yoksay */
    }
  } else {
    doc.setFontSize(7);
    doc.setFont(FONT, "bold");
    const firmLines = doc.splitTextToSize(firmAdi, 34);
    doc.text(firmLines, M + 2, ustY + yukseklik / 2 - (firmLines.length - 1) * 2);
  }

  // Orta: doküman türü + belge adı (dikey ortalanmış)
  const ortaX = M + 38 + (W - 2 * M - 38 - 45) / 2;
  doc.setFontSize(12);
  doc.setFont(FONT, "bold");
  doc.setTextColor(...RENK_VURGU);
  doc.text(sablon.docType, ortaX, ustY + 8, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8.5);
  doc.setFont(FONT, "normal");
  doc.text(adLines, ortaX, ustY + 14, { align: "center" });

  // Sağ: doküman no / tarihler / sayfa no
  doc.setFontSize(7);
  doc.setFont(FONT, "normal");
  const sagX = W - M - 43;
  doc.text(`Doküman No: ${code}`, sagX, ustY + 5);
  doc.text(`Yayın Tarihi: ${sablon.yayinTarihi}`, sagX, ustY + 10);
  doc.text(`Revizyon Tarihi: ${bugun}`, sagX, ustY + 15);
  doc.text(`Sayfa No: Sayfa ${sayfaNo} / ${toplamSayfa}`, sagX, ustY + 20);
}

function altTabloCiz(doc: JsPDFType, hazirlayanAdi: string, onaylayanAdi: string) {
  const y = 275;
  const yukseklik = 18;
  const kolonGenislik = (W - 2 * M) / 3;

  // KONTROL EDEN kutusu firma/atamadan bağımsız her zaman sabit TMGD Koordinatörü'dür.
  const isimler = [hazirlayanAdi.trim(), "YAKUP ATAŞ", onaylayanAdi.trim()];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, y, W - 2 * M, yukseklik);
  doc.line(M + kolonGenislik, y, M + kolonGenislik, y + yukseklik);
  doc.line(M + kolonGenislik * 2, y, M + kolonGenislik * 2, y + yukseklik);

  const basliklar = ["HAZIRLAYAN", "KONTROL EDEN", "ONAYLAYAN"];
  const altBasliklar = ["Tehlikeli Madde Güvenlik Danışmanı", "Tehlikeli Madde Güvenlik Danışmanı Koordinatörü", "Sorumlu Kişi"];

  basliklar.forEach((b, i) => {
    const x = M + kolonGenislik * i + kolonGenislik / 2;
    const isim = isimler[i];

    doc.setFontSize(7.5);
    doc.setFont(FONT, "bold");
    doc.text(b, x, y + 4, { align: "center" });

    if (isim) {
      // İsim varsa: kalın isim satırı + altında rol/unvan, imza çizgisi en altta.
      doc.setFontSize(7);
      doc.setFont(FONT, "bold");
      doc.text(isim.toLocaleUpperCase("tr-TR"), x, y + 8.5, { align: "center", maxWidth: kolonGenislik - 4 });
      doc.setFontSize(6);
      doc.setFont(FONT, "normal");
      doc.text(altBasliklar[i], x, y + 12.3, { align: "center", maxWidth: kolonGenislik - 4 });
    } else {
      // İsim bilinmiyorsa (ör. firmaya TMGD ataması yapılmamış / onaylayan girilmemiş):
      // yalnızca rol adı gösterilir — eski davranışla aynı.
      doc.setFontSize(6.5);
      doc.setFont(FONT, "normal");
      doc.text(altBasliklar[i], x, y + 9, { align: "center", maxWidth: kolonGenislik - 4 });
    }

    doc.setFontSize(7);
    doc.setFont(FONT, "normal");
    doc.text("……………………………", x, y + 16, { align: "center" });
  });
}

async function renderYapilandirilmisBelge(
  doc: JsPDFType,
  firmAdi: string,
  code: string,
  belgeAdi: string,
  sablon: BelgeSablonu,
  logo: LogoData,
  notlar: string,
  hazirlayanAdi: string,
  onaylayanAdi: string
) {
  await fontuKaydet(doc);

  const bugun = new Date().toLocaleDateString("tr-TR");
  const tamBaslik = `${code} — ${belgeAdi}`;

  const satirlar = duzMetneCevir(doc, sablon, tamBaslik);
  if (notlar.trim()) {
    satirlar.push({ tur: "altbaslik", metin: "Ek Notlar" });
    doc.setFontSize(9.5);
    doc.splitTextToSize(notlar.trim(), W - 2 * M).forEach((t: string) =>
      satirlar.push({ tur: "paragraf", metin: t })
    );
  }

  // Başlık kutusu yüksekliği belge adına göre değişir (uzun adlarda taşmayı önler);
  // içerik başlangıç Y'si buna göre dinamik olarak ayarlanır.
  const { yukseklik: baslikYukseklik, adLines } = baslikYuksekligiHesapla(doc, belgeAdi);
  const headerAlt = 8 + baslikYukseklik + 8; // kutunun altı + boşluk

  const sayfalar = sayfalaraBol(doc, satirlar, headerAlt);
  const toplamSayfa = sayfalar.length;
  const genislik = W - 2 * M;

  sayfalar.forEach((sayfaSatirlari, idx) => {
    if (idx > 0) doc.addPage();

    baslikTablosuCiz(doc, firmAdi, code, belgeAdi, sablon, logo, bugun, idx + 1, toplamSayfa, baslikYukseklik, adLines);
    altTabloCiz(doc, hazirlayanAdi, onaylayanAdi);

    let y = headerAlt;
    for (const satir of sayfaSatirlari) {
      if (satir.tur === "baslik") {
        doc.setFontSize(13);
        doc.setFont(FONT, "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(satir.metin, M, y);
        // başlığın altına ince vurgu çizgisi — sayfaya "tasarlanmış belge" hissi katar
        doc.setDrawColor(...RENK_VURGU);
        doc.setLineWidth(0.6);
        doc.line(M, y + 1.8, M + genislik, y + 1.8);
        y += SATIR_YUKSEKLIGI.baslik + 1;
      } else if (satir.tur === "altbaslik") {
        doc.setFillColor(...RENK_VURGU);
        doc.rect(M, y - 3.2, 1.3, 5.4, "F"); // sol vurgu çubuğu
        doc.setFontSize(10.5);
        doc.setFont(FONT, "bold");
        doc.setTextColor(...RENK_VURGU);
        doc.text(satir.metin, M + 3.5, y + 1.2);
        doc.setTextColor(0, 0, 0);
        y += SATIR_YUKSEKLIGI.altbaslik + 2;
      } else if (satir.tur === "paragraf") {
        doc.setFontSize(9.5);
        doc.setFont(FONT, "normal");
        doc.text(satir.metin, M, y);
        y += SATIR_YUKSEKLIGI.paragraf;
      } else if (satir.tur === "tablo") {
        tabloCiz(doc, satir, M, y, genislik);
        y += tabloYuksekligiHesapla(doc, satir, genislik);
      } else {
        doc.setFontSize(9.5);
        doc.setFont(FONT, "normal");
        doc.text(satir.metin, M + 2, y);
        y += SATIR_YUKSEKLIGI.madde;
      }
    }
  });
}
