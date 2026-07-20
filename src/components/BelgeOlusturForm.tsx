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
import { BELGE_GORSELLERI } from "@/lib/belgeGorselleri";
import {
  SIAM_LOGO_B64,
  SIAM_LOGO_EN_BOY,
  SIAM_QR_B64,
} from "@/lib/kapakVarliklari";
import type { jsPDF as JsPDFType } from "jspdf";

type Firm = {
  id: string;
  name: string;
  activities: string[] | null;
  contract_start: string | null;
  logo_url: string | null;
  /** Belge alt tablosundaki ONAYLAYAN kutusuna yazılacak tesis sorumlusu.
   *  Firma bazlı hatırlanır (migration 024). */
  approver_name: string | null;
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
  const [hazirlayanAdi, setHazirlayanAdi] = useState("");
  const [hazirlayanDurum, setHazirlayanDurum] = useState<"yok" | "bulundu" | "yükleniyor">("yok");
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
        .select("id, name, activities, contract_start, logo_url, approver_name");

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
        data = (retry.data || []).map((f) => ({
          ...f,
          activities: [],
          contract_start: null,
          approver_name: null,
        })) as typeof data;
        error = retry.error;
        if (!retry.error) {
          setError(
            "Faaliyet konuları görünmüyor — veritabanı güncellemesi (migration 010) henüz çalıştırılmamış."
          );
        }
      } else if (error) {
        setError("Firmalar yüklenemedi: " + hataCevir(error));
      }
      const gelenFirmalar = (data as Firm[]) || [];
      setFirms(gelenFirmalar);
      if (fixedFirmId) setFirmId(fixedFirmId);

      // Açılışta seçili bir firma varsa (tek firma modu ya da bağlantıyla
      // gelinen firma) onun kayıtlı onaylayan ismini alana yerleştir.
      const acilistakiId = fixedFirmId || initialFirmId;
      if (acilistakiId) {
        const f = gelenFirmalar.find((x) => x.id === acilistakiId);
        if (f?.approver_name) setOnaylayanAdi(f.approver_name);
      }
    })();
  }, [fixedFirmId]);

  const firm = useMemo(
    () => firms.find((f) => f.id === firmId) || null,
    [firms, firmId]
  );

  // Seçili firmaya atanmış TMGD'nin adını güvenli bir RPC ile getir
  // (public.get_firm_tmgd_name — yalnızca çağıranın erişimi olan firmalar
  // için isim döner, user_firms/profiles tablolarının RLS'ini genişletmeye
  // gerek kalmadan). Atama, Yönetim → Firma Atamaları'ndan yapılır.
  useEffect(() => {
    if (!firm) {
      setHazirlayanAdi("");
      setHazirlayanDurum("yok");
      return;
    }
    setHazirlayanDurum("yükleniyor");
    (async () => {
      const { data, error } = await supabase.rpc("get_firm_tmgd_name", {
        p_firm_id: firm.id,
      });
      if (error) {
        setHazirlayanAdi("");
        setHazirlayanDurum("yok");
        return;
      }
      setHazirlayanAdi((data as string) || "");
      setHazirlayanDurum(data ? "bulundu" : "yok");
    })();
  }, [firm]);

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
    // Onaylayan (tesis sorumlusu) firma bazlı hatırlanır: seçilen firmaya
    // en son kaydedilmiş isim alana otomatik gelir.
    const yeniFirma = firms.find((f) => f.id === id);
    setOnaylayanAdi(yeniFirma?.approver_name || "");
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

  // Bir dataURL'in gerçek piksel en/boy oranını okur (tarayıcının Image
  // nesnesi üzerinden) — logo, PDF'teki kare kutuya ORANI KORUNARAK
  // sığdırılabilsin diye (aksi halde geniş/dar logolar kutuya zorlanıp
  // ezilir/gerilir).
  function gorselEnBoyOrani(dataUrl: string): Promise<number> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
      img.onerror = () => resolve(1);
      img.src = dataUrl;
    });
  }

  // Bir File nesnesini doğrudan (storage'a yüklemeden) jsPDF için dataURL'e çevirir
  async function fileToLogoData(file: File): Promise<{ data: string; fmt: "PNG" | "JPEG"; enBoyOrani: number }> {
    const fmt: "PNG" | "JPEG" = file.type.includes("png") ? "PNG" : "JPEG";
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const enBoyOrani = await gorselEnBoyOrani(data);
    return { data, fmt, enBoyOrani };
  }

  // Logo'yu imzalı URL üzerinden dataURL'e çevir (jsPDF için)
  async function logoDataUrl(path: string): Promise<{ data: string; fmt: "PNG" | "JPEG"; enBoyOrani: number } | null> {
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
      const enBoyOrani = await gorselEnBoyOrani(dataUrl);
      return { data: dataUrl, fmt, enBoyOrani };
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

      // Onaylayan (tesis sorumlusu) firma bazlı hatırlanır: bu üretimde
      // yazılan isim, önceki kayıttan farklıysa firmaya işlenir; böylece
      // aynı firma bir daha seçildiğinde alan kendiliğinden dolu gelir.
      const yeniOnaylayan = onaylayanAdi.trim();
      if (yeniOnaylayan && yeniOnaylayan !== (firm.approver_name || "")) {
        const { error: kayitHatasi } = await supabase
          .from("firms")
          .update({ approver_name: yeniOnaylayan })
          .eq("id", firm.id);

        if (kayitHatasi) {
          // Kolon yoksa (migration 024 çalıştırılmamışsa) belge üretimi
          // engellenmez; yalnızca isim hatırlanmaz ve kullanıcı bilgilendirilir.
          if (/approver_name/i.test(kayitHatasi.message || "")) {
            setError(
              "Onaylayan ismi firmaya kaydedilemedi — veritabanı güncellemesi (024_firma_onaylayan_kisi.sql) henüz çalıştırılmamış."
            );
          }
        } else {
          setFirms((prev) =>
            prev.map((f) =>
              f.id === firm.id ? { ...f, approver_name: yeniOnaylayan } : f
            )
          );
        }
      }

      for (const code of selected) {
        const item = CATALOG.find((c) => c.code === code);
        if (!item) continue;

        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const sablon = belgeSablonu(item.code);

        if (sablon) {
          // Kapakta yazacak "TEHLİKELİ MADDE FAALİYET BELGESİ KAPSAMI"
          // bilgisi: belgenin kendi faaliyet konuları, firmanınkilerle
          // kesiştirilerek bulunur. Belge tüm firmalar için ortaksa
          // (activities boş) firmanın tüm faaliyetleri yazılır.
          const firmaFaaliyetleri = firm.activities || [];
          const belgeFaaliyetleri =
            item.activities.length === 0
              ? firmaFaaliyetleri
              : item.activities.filter((a) => firmaFaaliyetleri.includes(a));
          const faaliyetKapsami = (
            belgeFaaliyetleri.length > 0 ? belgeFaaliyetleri : item.activities
          )
            .map((a) => ACTIVITY_LABELS[a] || a)
            .join(" · ");

          await renderYapilandirilmisBelge(
            doc,
            firm.name,
            item.code,
            item.name,
            sablon,
            logo,
            notes,
            hazirlayanAdi,
            onaylayanAdi.trim(),
            faaliyetKapsami
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

          {firm && hazirlayanDurum !== "yükleniyor" && (
            <div className="mb-4 text-xs">
              {hazirlayanDurum === "yok" && (
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠ Bu firmaya atanmış bir TMGD bulunamadı (veya bu belgeyi
                  oluşturan hesabın bu firmaya erişimi yok) — belgelerde
                  &quot;HAZIRLAYAN&quot; altında isim yazılmayacak. Atama,
                  Yönetim → Firma Atamaları sekmesinden (yalnızca yönetici)
                  yapılır.
                </p>
              )}
              {hazirlayanDurum === "bulundu" && (
                <p className="text-green-700 bg-green-50 border border-green-200 rounded p-2">
                  ✓ HAZIRLAYAN: {hazirlayanAdi}
                </p>
              )}
            </div>
          )}

          <label className="block mb-4">
            <span className="text-sm text-gray-600">
              Onaylayan — Tesis Sorumlusu (opsiyonel)
            </span>
            <input
              type="text"
              className="border p-2 w-full rounded mt-1"
              placeholder="Boş bırakılırsa 'Sorumlu Kişi' yazılır"
              value={onaylayanAdi}
              onChange={(e) => setOnaylayanAdi(e.target.value)}
            />
            <span className="text-xs text-gray-400">
              Belge alt tablosundaki &quot;ONAYLAYAN&quot; kutusuna yazılacak isim.
              Bir kez yazıldığında bu firmaya kaydedilir; firma tekrar
              seçildiğinde kendiliğinden gelir.
              {firm?.approver_name && onaylayanAdi === firm.approver_name && (
                <span className="text-green-600">
                  {" "}
                  ✓ {firm.name} için kayıtlı.
                </span>
              )}
            </span>
          </label>

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

type LogoData = { data: string; fmt: "PNG" | "JPEG"; enBoyOrani: number } | null;

// Bir logoyu, verilen kare kutuya en/boy oranını BOZMADAN sığdırır (contain)
// ve kutu içinde ortalar — geniş/dar logoların ezilip/gerilmesini önler.
function logoKutusuHesapla(enBoyOrani: number, kutuX: number, kutuY: number, kutuBoyut: number) {
  const oran = enBoyOrani > 0 ? enBoyOrani : 1;
  let w = kutuBoyut;
  let h = kutuBoyut;
  if (oran > 1) {
    // geniş logo: genişlik kutuyu doldurur, yükseklik oranla küçülür
    h = kutuBoyut / oran;
  } else if (oran < 1) {
    // dar/uzun logo: yükseklik kutuyu doldurur, genişlik oranla küçülür
    w = kutuBoyut * oran;
  }
  return { x: kutuX + (kutuBoyut - w) / 2, y: kutuY + (kutuBoyut - h) / 2, w, h };
}

// Logoyu KARE değil, verilen DİKDÖRTGEN alana en/boy oranını bozmadan
// sığdırır ve ortalar. Başlık kutusunun sol hücresi geniş ama alçak
// olduğundan, kare kutuya sığdırmak logoyu gereksiz küçültüyordu.
// Ölçüler her iki boyutun da sınırından küçük seçildiği için taşma olamaz.
function logoAlanaSigdir(
  enBoyOrani: number,
  alanX: number,
  alanY: number,
  alanGenislik: number,
  alanYukseklik: number
) {
  const oran = enBoyOrani > 0 ? enBoyOrani : 1;
  // Önce yüksekliği doldur, genişlik taşarsa genişliğe göre yeniden ölçekle.
  let h = alanYukseklik;
  let w = h * oran;
  if (w > alanGenislik) {
    w = alanGenislik;
    h = w / oran;
  }
  return {
    x: alanX + (alanGenislik - w) / 2,
    y: alanY + (alanYukseklik - h) / 2,
    w,
    h,
  };
}

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
      const box = logoKutusuHesapla(logo.enBoyOrani, 15, 12, 24);
      doc.addImage(logo.data, logo.fmt, box.x, box.y, box.w, box.h);
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
  | { tur: "tablo"; headers?: string[]; rows: string[][]; note?: string; colWidths?: number[] }
  | { tur: "gorseller"; ids: string[]; sutun: number; yukseklik: number; note?: string };

// Sayfa geometrisi — orijinal TMGDK belgelerinden ölçülerek alınmıştır:
// dış çerçeve 8,5 mm, başlık kutusu 12,4 mm'den başlar, içerik alanı
// başlık kutusunun altından imza tablosunun üstüne (244 mm) kadar sürer.
const M = 12.4; // içerik kenar boşluğu (= başlık kutusu sol kenarı)
const W = 210;
const H = 297;
const CERCEVE_KENAR = 8.5; // dış çerçevenin sayfa kenarına uzaklığı
const CERCEVE_ALT = 287.5; // dış çerçevenin alt kenarı
const ALT_TABLO_UST = 244; // imza tablosu üst kenarı (içerik sayfaları)
const ALT_TABLO_YUKSEKLIK = 35.5;
const FOOTER_UST = ALT_TABLO_UST - 2; // içerik bitişi (alt tablo öncesi)

/** Her sayfaya orijinal belgedeki dış çerçeveyi çizer. */
function cerceveCiz(doc: JsPDFType) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.7);
  doc.rect(
    CERCEVE_KENAR,
    CERCEVE_KENAR,
    W - 2 * CERCEVE_KENAR,
    CERCEVE_ALT - CERCEVE_KENAR
  );
  doc.setLineWidth(0.3);
}
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

  // Amaç / Kapsam / Tanımlar da orijinal belgelerdeki gibi numaralı
  // bölümlerdir; gövde bölümlerinin numaraları bunların ardından devam eder.
  let bolumNo = 0;
  const bolumBasligi = (ad: string) => `${++bolumNo}. ${ad}`;

  if (sablon.amac) {
    satirlar.push({ tur: "altbaslik", metin: bolumBasligi("Amaç") });
    doc.setFontSize(9.5);
    doc.splitTextToSize(sablon.amac, genislik).forEach((t: string) =>
      satirlar.push({ tur: "paragraf", metin: t })
    );
  }
  if (sablon.kapsam) {
    satirlar.push({ tur: "altbaslik", metin: bolumBasligi("Kapsam") });
    doc.setFontSize(9.5);
    doc.splitTextToSize(sablon.kapsam, genislik).forEach((t: string) =>
      satirlar.push({ tur: "paragraf", metin: t })
    );
  }
  if (sablon.tanimlar && sablon.tanimlar.length > 0) {
    satirlar.push({ tur: "altbaslik", metin: bolumBasligi("Tanımlar") });
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
      satirlar.push({ tur: "tablo", headers: b.headers, rows: b.rows, note: b.note, colWidths: b.colWidths });
    } else if (b.type === "images") {
      satirlar.push({
        tur: "gorseller",
        ids: b.ids.filter((id) => BELGE_GORSELLERI[id]),
        sutun: b.sutun ?? 4,
        yukseklik: b.yukseklik ?? 22,
        note: b.note,
      });
    }
  });

  return satirlar;
}

// ---- Tablo ölçümü + çizimi -------------------------------------------
// Sütun genişlikleri: ilk sütun biraz daha geniş (etiket sütunu), kalanlar eşit paylaşır.
function tabloKolonGenislikleri(genislik: number, kolonSayisi: number, ozelOranlar?: number[]): number[] {
  if (kolonSayisi <= 1) return [genislik];
  if (ozelOranlar && ozelOranlar.length === kolonSayisi) {
    const toplam = ozelOranlar.reduce((a, b) => a + b, 0);
    return ozelOranlar.map((o) => (genislik * o) / toplam);
  }
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
  tablo: { headers?: string[]; rows: string[][]; note?: string; colWidths?: number[] },
  genislik: number
): number {
  const kolonSayisi = (tablo.headers || tablo.rows[0] || []).length;
  const kolonGenislikleri = tabloKolonGenislikleri(genislik, kolonSayisi, tablo.colWidths);
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
  tablo: { headers?: string[]; rows: string[][]; note?: string; colWidths?: number[] },
  x: number,
  yBaslangic: number,
  genislik: number
) {
  const kolonSayisi = (tablo.headers || tablo.rows[0] || []).length;
  const kolonGenislikleri = tabloKolonGenislikleri(genislik, kolonSayisi, tablo.colWidths);
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
// Bölüm başlıklarından önce bırakılan ek boşluk (~1 satır) — bölüm
// başlıklarının bir önceki satırın hemen dibine yapışmasını önler.
const ALTBASLIK_ON_BOSLUK = 4.6;

function gorsellerYuksekligiHesapla(
  doc: JsPDFType,
  satir: { ids: string[]; sutun: number; yukseklik: number; note?: string },
  genislik: number
): number {
  const satirSayisi = Math.ceil(satir.ids.length / satir.sutun);
  let y = satirSayisi * (satir.yukseklik + 4) + 2;
  if (satir.note) {
    doc.setFontSize(7.5);
    doc.setFont(FONT, "normal");
    y += doc.splitTextToSize(satir.note, genislik).length * 3.8 + 2;
  }
  return y;
}

function gorsellerCiz(
  doc: JsPDFType,
  satir: { ids: string[]; sutun: number; yukseklik: number; note?: string },
  x: number,
  yBaslangic: number,
  genislik: number
) {
  const hucreGenislik = genislik / satir.sutun;
  let y = yBaslangic;
  satir.ids.forEach((id, i) => {
    const veri = BELGE_GORSELLERI[id];
    if (!veri) return;
    const sutunNo = i % satir.sutun;
    if (sutunNo === 0 && i > 0) y += satir.yukseklik + 4;
    const ozellik = doc.getImageProperties
      ? doc.getImageProperties(veri)
      : { width: 1, height: 1 };
    const oran = ozellik.width / ozellik.height || 1;
    let h = satir.yukseklik;
    let w = h * oran;
    if (w > hucreGenislik - 4) {
      w = hucreGenislik - 4;
      h = w / oran;
    }
    const gx = x + sutunNo * hucreGenislik + (hucreGenislik - w) / 2;
    const gy = y + (satir.yukseklik - h) / 2;
    try {
      doc.addImage(veri, "JPEG", gx, gy, w, h);
    } catch {
      /* görsel eklenemezse belge yine üretilsin */
    }
  });
  if (satir.note) {
    y += satir.yukseklik + 5;
    doc.setFontSize(7.5);
    doc.setFont(FONT, "normal");
    doc.setTextColor(110, 110, 110);
    doc.text(doc.splitTextToSize(satir.note, genislik), x, y);
    doc.setTextColor(0, 0, 0);
  }
}

function satirYuksekligi(doc: JsPDFType, satir: Satir, genislik: number): number {
  if (satir.tur === "gorseller") return gorsellerYuksekligiHesapla(doc, satir, genislik);
  if (satir.tur === "tablo") return tabloYuksekligiHesapla(doc, satir, genislik);
  return SATIR_YUKSEKLIGI[satir.tur] + (satir.tur === "altbaslik" ? 2 + ALTBASLIK_ON_BOSLUK : 0);
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
  doc.setFontSize(9.5);
  doc.setFont(FONT, "bold");
  const adLines: string[] = doc.splitTextToSize(belgeAdi, ortaGenislik);
  const tabanYukseklik = 24; // logo/sağ blok için asgari
  const adBlokYuksekligi = 9 + adLines.length * 4.8 + 3;
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
  adLines: string[],
  sayfaEtiketi?: string
) {
  const ustY = M; // başlık kutusu üst kenarı (çerçevenin hemen altı)

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, ustY, W - 2 * M, yukseklik);
  doc.line(M + 38, ustY, M + 38, ustY + yukseklik);
  doc.line(W - M - 45, ustY, W - M - 45, ustY + yukseklik);

  // Sol: logo / firma adı
  if (logo) {
    try {
      // Sol hücre 38 mm genişliğinde; 2,5 mm kenar boşluğu bırakılır.
      // Yükseklik hücreyle sınırlı, ayrıca 22 mm ile tavanlanır (belge adı
      // uzayıp kutu büyüdüğünde logo orantısız büyümesin).
      const kenar = 2.5;
      const alanG = 38 - 2 * kenar;
      const alanY = Math.min(yukseklik - 2 * kenar, 22);
      const box = logoAlanaSigdir(
        logo.enBoyOrani,
        M + kenar,
        ustY + kenar,
        alanG,
        alanY
      );
      doc.addImage(logo.data, logo.fmt, box.x, box.y, box.w, box.h);
    } catch {
      /* yoksay */
    }
  } else {
    doc.setFontSize(7);
    doc.setFont(FONT, "bold");
    const firmLines = doc.splitTextToSize(firmAdi, 34);
    doc.text(firmLines, M + 2, ustY + yukseklik / 2 - (firmLines.length - 1) * 2);
  }

  // Orta: doküman türü + belge adı (dikey ortalanmış).
  // KONTROL FORMU türünde tür yazısı basılmaz (belge adı zaten "... Kontrol
  // Formu" içerir); belge adı kutu içinde dikey ortalanır.
  const ortaX = M + 38 + (W - 2 * M - 38 - 45) / 2;
  const turuGoster = sablon.docType !== "KONTROL FORMU";
  if (turuGoster) {
    doc.setFontSize(12);
    doc.setFont(FONT, "bold");
    doc.setTextColor(...RENK_VURGU);
    doc.text(sablon.docType, ortaX, ustY + 8, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9.5);
    doc.setFont(FONT, "bold");
    doc.text(adLines, ortaX, ustY + 14, { align: "center" });
  } else {
    doc.setFontSize(11);
    doc.setFont(FONT, "bold");
    doc.setTextColor(...RENK_VURGU);
    const adBlokYuksekligi = adLines.length * 4.8;
    const adBaslangicY = ustY + yukseklik / 2 - adBlokYuksekligi / 2 + 3.4;
    doc.text(adLines, ortaX, adBaslangicY, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Sağ: doküman no / tarihler / sayfa no
  doc.setFontSize(7);
  doc.setFont(FONT, "normal");
  const sagX = W - M - 43;
  doc.text(`Doküman No: ${code}`, sagX, ustY + 5);
  doc.text(`Yayın Tarihi: ${sablon.yayinTarihi}`, sagX, ustY + 10);
  doc.text(`Revizyon Tarihi: ${bugun}`, sagX, ustY + 15);
  doc.text(
    sayfaEtiketi ?? `Sayfa No: Sayfa ${sayfaNo} / ${toplamSayfa}`,
    sagX,
    ustY + 20
  );
}

function altTabloCiz(
  doc: JsPDFType,
  hazirlayanAdi: string,
  onaylayanAdi: string,
  ustY?: number,
  ozelYukseklik?: number
) {
  const y = ustY ?? ALT_TABLO_UST;
  const yukseklik = ozelYukseklik ?? ALT_TABLO_YUKSEKLIK;
  const kolonGenislik = (W - 2 * M) / 3;

  // KONTROL EDEN kutusu firma/atamadan bağımsız her zaman sabit TMGD Koordinatörü'dür.
  const isimler = [hazirlayanAdi.trim(), "YAKUP ATAŞ", onaylayanAdi.trim()];

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, y, W - 2 * M, yukseklik);
  doc.line(M + kolonGenislik, y, M + kolonGenislik, y + yukseklik);
  doc.line(M + kolonGenislik * 2, y, M + kolonGenislik * 2, y + yukseklik);

  const basliklar = ["HAZIRLAYAN", "KONTROL EDEN", "ONAYLAYAN"];
  // ONAYLAYAN sütununda unvan, isim girilip girilmediğine göre değişir:
  // isim varsa altına gerçek unvanı olan "Tesis Sorumlusu" yazılır, isim
  // yoksa kutuda yalnızca "Sorumlu Kişi" yer tutucusu kalır.
  const altBasliklar = [
    "Tehlikeli Madde Güvenlik Danışmanı",
    "Tehlikeli Madde Güvenlik Danışmanı Koordinatörü",
    "Sorumlu Kişi",
  ];
  const isimliUnvanlar = [
    altBasliklar[0],
    altBasliklar[1],
    "Tesis Sorumlusu",
  ];

  basliklar.forEach((b, i) => {
    const x = M + kolonGenislik * i + kolonGenislik / 2;
    const isim = isimler[i];

    doc.setFontSize(7.5);
    doc.setFont(FONT, "bold");
    doc.text(b, x, y + 5, { align: "center" });

    if (isim) {
      // İsim varsa: kalın isim satırı ortada, hemen altında kişinin unvanı.
      doc.setFontSize(7.5);
      doc.setFont(FONT, "bold");
      doc.text(isim.toLocaleUpperCase("tr-TR"), x, y + 10.5, { align: "center", maxWidth: kolonGenislik - 4 });
      doc.setFontSize(6);
      doc.setFont(FONT, "normal");
      doc.text(isimliUnvanlar[i], x, y + 14.3, { align: "center", maxWidth: kolonGenislik - 4 });
    } else {
      // İsim bilinmiyorsa (ör. firmaya TMGD ataması yapılmamış / onaylayan girilmemiş):
      // yalnızca rol adı gösterilir.
      doc.setFontSize(6.5);
      doc.setFont(FONT, "normal");
      doc.text(altBasliklar[i], x, y + 10.5, { align: "center", maxWidth: kolonGenislik - 4 });
    }
  });
}

// ---------------------------------------------------------------------
// KAPAK SAYFASI
//
// Her belgenin ilk sayfası. Referans TMGDK formatına uygun olarak:
//   • üstte standart başlık kutusu (firma logosu + belge adı + doküman no,
//     sayfa alanında "Kapak Sayfası" yazar),
//   • ortada firma unvanı ve belgenin konusu,
//   • altında faaliyet belgesi kapsamı,
//   • en altta HAZIRLAYAN/KONTROL EDEN/ONAYLAYAN tablosu,
//   • sağ alt köşede TMGDK kurumsal logosu ve karekodu bulunur.
//
// Karekod ve TMGDK logosu firmadan bağımsızdır; başka firmaların logoları
// kapakta yer almaz (yalnızca belgenin düzenlendiği firmanın logosu).
// ---------------------------------------------------------------------
function kapakSayfasiCiz(
  doc: JsPDFType,
  firmAdi: string,
  code: string,
  belgeAdi: string,
  sablon: BelgeSablonu,
  logo: LogoData,
  bugun: string,
  faaliyetKapsami: string,
  hazirlayanAdi: string,
  onaylayanAdi: string,
  baslikYukseklik: number,
  adLines: string[]
) {
  cerceveCiz(doc);
  baslikTablosuCiz(
    doc,
    firmAdi,
    code,
    belgeAdi,
    sablon,
    logo,
    bugun,
    1,
    1,
    baslikYukseklik,
    adLines,
    "Sayfa No: Kapak Sayfası"
  );

  const genislik = W - 2 * M;
  const ortaX = W / 2;

  // Firma unvanı — sayfanın üst-orta bölümünde, büyük ve kalın
  doc.setFontSize(15);
  doc.setFont(FONT, "bold");
  const unvanSatirlari: string[] = doc.splitTextToSize(
    firmAdi.toLocaleUpperCase("tr-TR"),
    genislik - 20
  );
  let y = 105;
  unvanSatirlari.forEach((satir) => {
    doc.text(satir, ortaX, y, { align: "center" });
    y += 8;
  });

  // Belgenin konusu — madde işaretli, referans belgedeki gibi
  y += 8;
  doc.setFontSize(10.5);
  doc.setFont(FONT, "bold");
  const konu = `${belgeAdi} (${code})`;
  const konuSatirlari: string[] = doc.splitTextToSize(konu, genislik - 24);
  doc.circle(M + 8, y - 1.4, 0.9, "F");
  konuSatirlari.forEach((satir) => {
    doc.text(satir, M + 13, y);
    y += 5.4;
  });

  // Faaliyet belgesi kapsamı
  if (faaliyetKapsami) {
    doc.setFontSize(11);
    doc.setFont(FONT, "bold");
    const kapsamSatirlari: string[] = doc.splitTextToSize(
      `TEHLİKELİ MADDE FAALİYET BELGESİ KAPSAMI: ${faaliyetKapsami.toLocaleUpperCase("tr-TR")}`,
      genislik - 10
    );
    let ky = 205;
    kapsamSatirlari.forEach((satir) => {
      doc.text(satir, ortaX, ky, { align: "center" });
      ky += 6;
    });
  }

  // İmza tablosu (kapakta içerik sayfalarına göre daha yukarıda)
  altTabloCiz(doc, hazirlayanAdi, onaylayanAdi, 218, 42.7);

  // Sağ alt köşe: TMGDK kurumsal logosu + karekod
  const qrBoyut = 22;
  const qrX = W - M - qrBoyut;
  const qrY = 263;
  try {
    doc.addImage(SIAM_QR_B64, "PNG", qrX, qrY, qrBoyut, qrBoyut);
  } catch {
    /* karekod eklenemezse belge yine üretilsin */
  }

  const logoYukseklik = 11;
  const logoGenislik = logoYukseklik * SIAM_LOGO_EN_BOY;
  try {
    doc.addImage(
      SIAM_LOGO_B64,
      "JPEG",
      qrX - logoGenislik - 4,
      qrY + (qrBoyut - logoYukseklik) / 2,
      logoGenislik,
      logoYukseklik
    );
  } catch {
    /* logo eklenemezse belge yine üretilsin */
  }
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
  onaylayanAdi: string,
  faaliyetKapsami: string
) {
  await fontuKaydet(doc);

  const bugun = new Date().toLocaleDateString("tr-TR");
  // İçerik ana başlığında kod ön eki (SA1 — vb.) kullanılmaz; kod zaten
  // başlık kutusundaki "Doküman No" alanında yer alır.
  const tamBaslik = belgeAdi;

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

  // Kapak sayfası her belgenin ilk sayfasıdır; içerik ondan sonra başlar.
  kapakSayfasiCiz(
    doc,
    firmAdi,
    code,
    belgeAdi,
    sablon,
    logo,
    bugun,
    faaliyetKapsami,
    hazirlayanAdi,
    onaylayanAdi,
    baslikYukseklik,
    adLines
  );

  sayfalar.forEach((sayfaSatirlari, idx) => {
    doc.addPage(); // kapak 1. sayfa olduğundan içerik her zaman yeni sayfada
    cerceveCiz(doc);

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
        y += ALTBASLIK_ON_BOSLUK; // bölüm başlığı öncesi ~1 satır nefes boşluğu
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
      } else if (satir.tur === "gorseller") {
        gorsellerCiz(doc, satir, M, y, genislik);
        y += gorsellerYuksekligiHesapla(doc, satir, genislik);
      } else {
        doc.setFontSize(9.5);
        doc.setFont(FONT, "normal");
        doc.text(satir.metin, M + 2, y);
        y += SATIR_YUKSEKLIGI.madde;
      }
    }
  });
}
