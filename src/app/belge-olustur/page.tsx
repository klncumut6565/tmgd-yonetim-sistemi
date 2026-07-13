"use client";

// BELGE OLUŞTUR
//  - Firma seçilir → firmanın faaliyet konularına göre SADECE ilgili
//    P/T/K/L/SA belgeleri listelenir (kaynak: src/lib/belgeKatalogu.ts)
//  - Birden fazla belge seçilebilir, ek not girilebilir
//  - "Belgeyi Oluştur": her seçim için logolu A4 PDF indirir ve
//    firmanın Belge Takip listesinde ilgili maddeyi tamamlandı işaretler

import { useEffect, useMemo, useState } from "react";
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

export default function BelgeOlusturPage() {
  const { canWrite } = useUser();

  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmId, setFirmId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      let { data, error } = await supabase
        .from("firms")
        .select("id, name, activities, contract_start, logo_url")
        .eq("status", "active")
        .order("name");

      if (error && /does not exist/i.test(error.message || "")) {
        const retry = await supabase
          .from("firms")
          .select("id, name, logo_url")
          .eq("status", "active")
          .order("name");
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
    })();
  }, []);

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
      const logo = firm.logo_url ? await logoDataUrl(firm.logo_url) : null;
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
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Belge Oluştur</h1>

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
        {/* SOL: firma + notlar + oluştur */}
        <div>
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
            <span className="text-gray-600">Logo (isteğe bağlı)</span>
            <p className="mt-1">
              {firm?.logo_url ? (
                <span className="text-green-700">✓ Firma logosu belgeye eklenecek</span>
              ) : (
                <span className="text-gray-500">
                  Logo yok —{" "}
                  {firm ? (
                    <Link href={`/firms/${firm.id}`} className="text-blue-600 underline">
                      Logo Yönetimine Git
                    </Link>
                  ) : (
                    "önce firma seçin"
                  )}
                </span>
              )}
            </p>
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
              Belge türlerini görmek için önce firma seçin.
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
