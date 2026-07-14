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
  catalogForActivities,
} from "@/lib/belgeKatalogu";

type Firm = {
  id: string;
  name: string;
  activities: string[] | null;
  contract_start: string | null;
  logo_url: string | null;
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
        .select("id, name, activities, contract_start, logo_url");

      query = fixedFirmId
        ? query.eq("id", fixedFirmId)
        : query.eq("status", "active").order("name");

      let { data, error } = await query;

      if (error && /does not exist/i.test(error.message || "")) {
        let retryQuery = supabase.from("firms").select("id, name, logo_url");
        retryQuery = fixedFirmId
          ? retryQuery.eq("id", fixedFirmId)
          : retryQuery.eq("status", "active").order("name");
        const retry = await retryQuery;
        data = (retry.data || []).map((f) => ({ ...f, activities: [], contract_start: null })) as typeof data;
        error = retry.error;
        if (!retry.error) {
          setError(
            "Faaliyet konuları görünmüyor — veritabanı güncellemesi (migration 010) henüz çalıştırılmamış."
          );
        }
      } else if (error) {
        setError("Firmalar yüklenemedi: " + hataCevir(error));
      }
      setFirms((data as Firm[]) || []);
      if (fixedFirmId) setFirmId(fixedFirmId);
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
        const W = 210;

        // Üst şerit
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, W, 4, "F");

        // Logo
        if (logo) {
          try {
            doc.addImage(logo.data, logo.fmt, 15, 12, 24, 24);
          } catch {
            /* logo eklenemezse belge yine üretilsin */
          }
        }

        // Başlık bloğu
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(firm.name, logo ? 45 : 15, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(90, 90, 90);
        doc.text(`Belge Kodu: ${item.code}`, logo ? 45 : 15, 27);
        doc.text(`Tarih: ${bugun}`, logo ? 45 : 15, 32);
        doc.setTextColor(0, 0, 0);

        // Belge adı
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        const nameLines = doc.splitTextToSize(`${item.code} — ${item.name}`, W - 30);
        doc.text(nameLines, 15, 48);

        let y = 48 + nameLines.length * 6 + 4;
        doc.setDrawColor(200, 200, 200);
        doc.line(15, y, W - 15, y);
        y += 8;

        // Kategori + faaliyet bilgisi
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(90, 90, 90);
        const acts =
          item.activities.length === 0
            ? "Tüm faaliyet konuları"
            : item.activities.map((a) => ACTIVITY_LABELS[a] || a).join(", ");
        doc.text(`Kategori: ${CATEGORY_LABELS[item.category]}   ·   Faaliyet: ${acts}`, 15, y);
        y += 10;
        doc.setTextColor(0, 0, 0);

        // Ek notlar / içerik
        if (notes.trim()) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Notlar / İçerik", 15, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          const noteLines = doc.splitTextToSize(notes.trim(), W - 30);
          doc.text(noteLines, 15, y);
          y += noteLines.length * 5 + 8;
        }

        // İçerik alanı çerçevesi (elle doldurma / revizyon için)
        doc.setDrawColor(220, 220, 220);
        doc.rect(15, y, W - 30, Math.max(40, 240 - y));

        // Alt bilgi
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `${firm.name} · ${item.code} · TMGD Yönetim Sistemi tarafından ${bugun} tarihinde oluşturuldu`,
          15,
          290
        );

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
