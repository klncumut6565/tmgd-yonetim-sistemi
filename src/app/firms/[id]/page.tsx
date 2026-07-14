"use client";

// FİRMA DETAY — Sekmeli yapı (ROADMAP T-027)
// YENİ:
//  - "Belge Takip" sekmesi: faaliyet konularına göre şekillenen, akordeon
//    görünümlü belge/görev takip listesi + genel ilerleme yüzdesi
//  - Genel sekmesi: faaliyet konuları (çoklu seçim), sözleşme tarihi, logo

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";
import {
  ACTIVITIES,
  ACTIVITY_LABELS,
  buildChecklist,
  ChecklistSection,
  codeLabel,
  codeSection,
} from "@/lib/belgeKatalogu";
import FirmScopedCrud from "@/components/FirmScopedCrud";
import {
  VEHICLE_FIELDS,
  DRIVER_FIELDS,
  EMPLOYEE_FIELDS,
  VISIT_FIELDS,
} from "@/lib/firmScopedFields";

type Firm = {
  id: string;
  name: string;
  tax_number: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  activities: string[] | null;
  contract_start: string | null;
  logo_url: string | null;
};

type Row = Record<string, unknown> & { id: string };

type BelgeRow = {
  id: string;
  code: string;
  period: string;
  done: boolean;
  file_path: string | null;
};

type Attachment = {
  id: string;
  code: string;
  period: string;
  file_path: string;
  file_name: string;
};

const TABS = [
  { key: "belge_takip", label: "Belge Takip" },
  { key: "tasks", label: "Görevler" },
  { key: "documents", label: "Belgeler" },
  { key: "belge_olustur", label: "Belge Oluştur" },
  { key: "vehicles", label: "Araçlar" },
  { key: "drivers", label: "Sürücüler" },
  { key: "employees", label: "Personeller" },
  { key: "visits", label: "Ziyaretler" },
  { key: "genel", label: "Düzenle" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// "Belge Oluştur" bu sayfada bir sekme değil, /belge-olustur sayfasına
// firma ön seçili olarak yönlendiren bir kısayoldur (o sayfadaki PDF
// oluşturma mantığını burada tekrar etmemek için).
const NAVIGATE_TABS: Partial<Record<TabKey, (firmId: string) => string>> = {
  belge_olustur: (firmId) => `/belge-olustur?firm=${firmId}`,
};

// Her sekmenin listede göstereceği kolonlar
// NOT: "documents" artık genel tablo yerine firm_belge_dosyalari'ndan
// birleştirilmiş özel bir görünüm kullanıyor (aşağıda ayrıca render edilir).
const TAB_COLUMNS: Record<string, { key: string; label: string }[]> = {
  tasks: [
    { key: "title", label: "Görev" },
    { key: "status", label: "Durum" },
    { key: "priority", label: "Öncelik" },
    { key: "due_date", label: "Termin" },
  ],
  vehicles: [
    { key: "plate_number", label: "Plaka" },
    { key: "brand", label: "Marka" },
    { key: "adr_valid_until", label: "ADR Geçerlilik" },
    { key: "status", label: "Durum" },
  ],
  drivers: [
    { key: "first_name", label: "Ad" },
    { key: "last_name", label: "Soyad" },
    { key: "adr_certificate_no", label: "ADR Belge No" },
    { key: "adr_valid_until", label: "ADR Geçerlilik" },
  ],
  employees: [
    { key: "first_name", label: "Ad" },
    { key: "last_name", label: "Soyad" },
    { key: "department", label: "Departman" },
    { key: "position", label: "Pozisyon" },
  ],
  visits: [
    { key: "visit_date", label: "Tarih" },
    { key: "visit_type", label: "Tür" },
    { key: "summary", label: "Özet" },
    { key: "next_visit_date", label: "Sonraki Ziyaret" },
  ],
};

const ORDER_BY: Record<string, string> = {
  tasks: "created_at",
  vehicles: "created_at",
  drivers: "created_at",
  employees: "created_at",
  visits: "visit_date",
};

const TR_VALUES: Record<string, string> = {
  todo: "Yapılacak",
  in_progress: "Devam Ediyor",
  review: "Kontrolde",
  completed: "Tamamlandı",
  cancelled: "İptal",
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
  draft: "Taslak",
  active: "Aktif",
  inactive: "Pasif",
  passive: "Pasif",
  archived: "Arşiv",
  sold: "Satıldı",
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const s = String(value);
  return TR_VALUES[s] || s;
}

export default function FirmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { canWrite } = useUser();
  const router = useRouter();

  const [firm, setFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("belge_takip");

  // Genel sekmesi form durumu
  const [form, setForm] = useState<Partial<Firm>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Liste sekmeleri
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  // Belge Takip
  const [belgeler, setBelgeler] = useState<BelgeRow[]>([]);
  const [belgeLoading, setBelgeLoading] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [fileMsg, setFileMsg] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const loadFirm = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("firms")
      .select("*")
      .eq("id", id)
      .single();

    const f = (data as Firm) || null;
    setFirm(f);
    setForm(f || {});
    setLoading(false);

    // Logo önizlemesi için imzalı URL üret
    if (f?.logo_url) {
      const { data: signed } = await supabase.storage
        .from("firm-files")
        .createSignedUrl(f.logo_url, 3600);
      setLogoUrl(signed?.signedUrl || null);
    } else {
      setLogoUrl(null);
    }
  }, [id]);

  const loadRows = useCallback(
    async (table: string) => {
      setRowsLoading(true);
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("firm_id", id)
        .order(ORDER_BY[table] || "created_at", { ascending: false })
        .limit(100);

      setRows((data as Row[]) || []);
      setRowsLoading(false);
    },
    [id]
  );

  const loadBelgeler = useCallback(async () => {
    setBelgeLoading(true);
    const [belgelerRes, ekRes] = await Promise.all([
      supabase
        .from("firm_belgeleri")
        .select("id, code, period, done, file_path")
        .eq("firm_id", id),
      supabase
        .from("firm_belge_dosyalari")
        .select("id, code, period, file_path, file_name")
        .eq("firm_id", id)
        .order("uploaded_at", { ascending: true }),
    ]);
    setBelgeler((belgelerRes.data as BelgeRow[]) || []);

    if (ekRes.error) {
      setAttachments([]);
      if (/does not exist|not find the table/i.test(ekRes.error.message || "")) {
        setFileMsg(
          "Çoklu dosya eki özelliği için veritabanı güncellemesi (migration 011) henüz çalıştırılmamış. " +
            "Supabase → SQL Editor'de database/011_belge_dosya_ekleri.sql dosyasını çalıştır."
        );
      }
    } else {
      setAttachments((ekRes.data as Attachment[]) || []);
    }
    setBelgeLoading(false);
  }, [id]);

  useEffect(() => {
    loadFirm();
  }, [loadFirm]);

  useEffect(() => {
    if (tab === "belge_takip" || tab === "documents") loadBelgeler();
    else if (tab === "tasks") loadRows(tab);
  }, [tab, loadRows, loadBelgeler]);

  // Araçlar / Sürücüler yalnızca Taşımacı faaliyeti olan firmalarda anlamlı —
  // taşımacılık faaliyeti olmayan firmalarda bu sekmeler gizlenir.
  const isTasimaci = (firm?.activities || []).includes("tasimaci");
  const TASIMACI_SEKMELERI: TabKey[] = ["vehicles", "drivers"];
  const visibleTabs = TABS.filter(
    (t) => isTasimaci || !TASIMACI_SEKMELERI.includes(t.key)
  );

  // Firma yüklendiğinde/faaliyeti değiştiğinde, o an gizli bir sekmedeysek
  // (örn. Taşımacı işaretini kaldırdıysak) otomatik olarak Belge Takip'e dön.
  useEffect(() => {
    if (firm && !isTasimaci && TASIMACI_SEKMELERI.includes(tab)) {
      setTab("belge_takip");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firm, isTasimaci]);

  // Takip bölümleri — firma faaliyetlerine göre
  const sections: ChecklistSection[] = useMemo(() => {
    if (!firm) return [];
    return buildChecklist(firm.activities || [], firm.contract_start);
  }, [firm]);

  const doneSet = useMemo(() => {
    const s = new Set<string>();
    belgeler.forEach((b) => {
      if (b.done) s.add(`${b.code}|${b.period}`);
    });
    return s;
  }, [belgeler]);

  // Her madde için yüklenmiş dosyalar (birden fazla olabilir)
  const attachmentsByItem = useMemo(() => {
    const m = new Map<string, Attachment[]>();
    attachments.forEach((a) => {
      const key = `${a.code}|${a.period}`;
      const list = m.get(key) || [];
      list.push(a);
      m.set(key, list);
    });
    return m;
  }, [attachments]);

  const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];

  // Birden fazla dosya seçilebilir — her biri ayrı bir ek olarak yüklenir.
  async function uploadItemFiles(code: string, period: string, fileList: FileList) {
    if (!canWrite || fileList.length === 0) return;
    const key = `${code}|${period}`;
    const files = Array.from(fileList);

    const invalid = files.find((f) => {
      const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
      return !ALLOWED_EXT.includes(ext);
    });
    if (invalid) {
      setFileMsg(
        `Desteklenmeyen dosya türü: "${invalid.name}". İzin verilenler: PDF, Word, JPEG, PNG.`
      );
      return;
    }

    setUploadingKey(key);
    setFileMsg("");

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const path = `${id}/belge-takip/${code}_${period || "genel"}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("firm-files")
        .upload(path, file, { upsert: true });

      if (upErr) {
        setFileMsg(`"${file.name}" yüklenemedi: ` + hataCevir(upErr));
        continue;
      }

      const { error: dbErr } = await supabase.from("firm_belge_dosyalari").insert({
        firm_id: id,
        code,
        period,
        file_path: path,
        file_name: file.name,
      });
      if (dbErr) {
        setFileMsg(`"${file.name}" kaydedilemedi: ` + hataCevir(dbErr));
      }
    }

    // En az bir dosya eklendiyse madde otomatik "tamamlandı" işaretlenir —
    // dosyaların varlığı zaten maddenin karşılandığının kanıtıdır.
    await supabase.from("firm_belgeleri").upsert(
      { firm_id: id, code, period, done: true },
      { onConflict: "firm_id,code,period" }
    );

    setUploadingKey(null);
    loadBelgeler();
  }

  async function downloadItemFile(path: string) {
    const { data, error } = await supabase.storage
      .from("firm-files")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      setFileMsg("İndirme bağlantısı oluşturulamadı: " + hataCevir(error));
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function removeAttachment(attachmentId: string) {
    if (!canWrite) return;
    const ok = window.confirm("Bu dosyayı listeden kaldırmak istiyor musun?");
    if (!ok) return;

    const { error } = await supabase
      .from("firm_belge_dosyalari")
      .delete()
      .eq("id", attachmentId);

    if (error) {
      setFileMsg("Kaldırılamadı: " + hataCevir(error));
      return;
    }
    loadBelgeler();
  }

  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    sections.forEach((sec) =>
      sec.items.forEach((it) => {
        total++;
        if (doneSet.has(`${it.code}|${it.period}`)) done++;
      })
    );
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [sections, doneSet]);

  async function toggleItem(code: string, period: string) {
    if (!canWrite) return;
    const key = `${code}|${period}`;
    const isDone = doneSet.has(key);

    const { error } = await supabase.from("firm_belgeleri").upsert(
      { firm_id: id, code, period, done: !isDone },
      { onConflict: "firm_id,code,period" }
    );
    if (!error) loadBelgeler();
  }

  async function saveFirm() {
    setSaving(true);
    setSaveMsg("");

    const { error } = await supabase
      .from("firms")
      .update({
        name: form.name,
        tax_number: form.tax_number,
        city: form.city,
        district: form.district,
        address: form.address,
        phone: form.phone,
        email: form.email,
        notes: form.notes,
        status: form.status,
        activities: form.activities || [],
        contract_start: form.contract_start || null,
      })
      .eq("id", id);

    setSaving(false);
    setSaveMsg(error ? "Kaydedilemedi: " + hataCevir(error) : "✓ Kaydedildi");
    if (!error) loadFirm();
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const path = `${id}/logo/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("firm-files")
      .upload(path, file, { upsert: true });

    if (upErr) {
      setSaveMsg("Logo yüklenemedi: " + hataCevir(upErr));
    } else {
      await supabase.from("firms").update({ logo_url: path }).eq("id", id);
      await loadFirm();
      setSaveMsg("✓ Logo güncellendi");
    }
    setLogoUploading(false);
  }

  if (loading) {
    return <div className="p-8 text-gray-500">Yükleniyor...</div>;
  }

  if (!firm) {
    return (
      <div className="p-8">
        <p className="text-gray-600 mb-4">
          Firma bulunamadı ya da bu firmaya erişim yetkin yok.
        </p>
        <Link href="/firms" className="underline">
          ← Firmalar listesine dön
        </Link>
      </div>
    );
  }

  const set = (key: keyof Firm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function toggleFormActivity(key: string) {
    setForm((f) => {
      const cur = (f.activities as string[]) || [];
      return {
        ...f,
        activities: cur.includes(key)
          ? cur.filter((a) => a !== key)
          : [...cur, key],
      };
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="logo" className="h-10 w-10 object-contain rounded" />
          )}
          <h1 className="text-3xl font-bold">{firm.name}</h1>
        </div>
        <Link href="/firms" className="text-sm text-gray-500 hover:underline">
          ← Firmalar
        </Link>
      </div>
      <p className="text-gray-500 mb-2">
        {[firm.city, firm.district].filter(Boolean).join(" / ") || "Konum girilmemiş"}
        {" · "}
        <span className="text-gray-700">{display(firm.status)}</span>
      </p>
      {(firm.activities || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {(firm.activities || []).map((a) => (
            <span key={a} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
              {ACTIVITY_LABELS[a] || a}
            </span>
          ))}
        </div>
      )}

      {/* Sekmeler */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {visibleTabs.map((t) => {
          const navigateTo = NAVIGATE_TABS[t.key];
          return (
            <button
              key={t.key}
              onClick={() =>
                navigateTo ? router.push(navigateTo(id)) : setTab(t.key)
              }
              className={
                "px-4 py-2 rounded-t whitespace-nowrap " +
                (tab === t.key && !navigateTo
                  ? "bg-black text-white"
                  : "hover:bg-gray-100 text-gray-600")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* GENEL — düzenlenebilir form */}
      {tab === "genel" && (
        <div className="max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">Firma Adı *</span>
              <input className="border p-2 w-full rounded mt-1" value={form.name || ""} onChange={set("name")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Vergi No</span>
              <input className="border p-2 w-full rounded mt-1" value={form.tax_number || ""} onChange={set("tax_number")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Şehir</span>
              <input className="border p-2 w-full rounded mt-1" value={form.city || ""} onChange={set("city")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">İlçe</span>
              <input className="border p-2 w-full rounded mt-1" value={form.district || ""} onChange={set("district")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Telefon</span>
              <input className="border p-2 w-full rounded mt-1" value={form.phone || ""} onChange={set("phone")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">E-posta</span>
              <input className="border p-2 w-full rounded mt-1" value={form.email || ""} onChange={set("email")} />
            </label>

            {/* Faaliyet konuları */}
            <div className="col-span-2">
              <span className="text-sm text-gray-600">
                Faaliyet konuları <span className="text-gray-400">(birden fazla seçebilirsiniz)</span>
              </span>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {ACTIVITIES.map((a) => {
                  const selected = ((form.activities as string[]) || []).includes(a.key);
                  return (
                    <button
                      key={a.key}
                      type="button"
                      disabled={!canWrite}
                      onClick={() => toggleFormActivity(a.key)}
                      className={
                        "border rounded px-2 py-1.5 text-sm transition " +
                        (selected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "hover:bg-gray-50") +
                        (!canWrite ? " opacity-60 cursor-not-allowed" : "")
                      }
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="text-sm text-gray-600">
                Sözleşme / Başlangıç Tarihi
              </span>
              <input
                type="date"
                className="border p-2 w-full rounded mt-1"
                value={form.contract_start || ""}
                onChange={set("contract_start")}
              />
            </label>

            {/* Logo */}
            <label className="block">
              <span className="text-sm text-gray-600">Firma logosu</span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                disabled={!canWrite || logoUploading}
                className="border p-2 w-full rounded mt-1 text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                }}
              />
              {logoUploading && (
                <span className="text-xs text-gray-500">Logo yükleniyor...</span>
              )}
            </label>

            <label className="block col-span-2">
              <span className="text-sm text-gray-600">Adres</span>
              <input className="border p-2 w-full rounded mt-1" value={form.address || ""} onChange={set("address")} />
            </label>
            <label className="block col-span-2">
              <span className="text-sm text-gray-600">Notlar</span>
              <textarea className="border p-2 w-full rounded mt-1" rows={3} value={form.notes || ""} onChange={set("notes")} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Durum</span>
              <select className="border p-2 w-full rounded mt-1" value={form.status || "active"} onChange={set("status")}>
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
                <option value="archived">Arşiv</option>
              </select>
            </label>
          </div>

          {canWrite ? (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={saveFirm}
                disabled={saving}
                className="px-5 py-2 rounded bg-black text-white disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              {saveMsg && <span className="text-sm text-gray-600">{saveMsg}</span>}
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-400">
              Hesabın salt okunur — firma bilgilerini görüntüleyebilir ama değiştiremezsin.
            </p>
          )}
        </div>
      )}

      {/* BELGE TAKİP — faaliyete göre şekillenen akordeon liste */}
      {tab === "belge_takip" && (
        <div className="max-w-4xl">
          {/* Genel ilerleme */}
          <div className="flex items-center justify-between border rounded-xl p-4 mb-4">
            <div>
              <p className="font-semibold">Genel İlerleme</p>
              <p className="text-sm text-gray-500">
                {totals.done} / {totals.total} madde tamamlandı
              </p>
            </div>
            <div className="text-right">
              <span
                className={
                  "text-3xl font-bold " +
                  (totals.pct >= 80
                    ? "text-green-600"
                    : totals.pct >= 40
                    ? "text-amber-600"
                    : "text-red-500")
                }
              >
                {totals.pct}%
              </span>
            </div>
          </div>

          {(firm.activities || []).length === 0 && (
            <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
              Bu firma için faaliyet konusu seçilmemiş — liste yalnızca ortak
              belgeleri gösteriyor. Genel sekmesinden faaliyet konularını seç.
            </p>
          )}

          {belgeLoading && <p className="text-gray-500 mb-2">Yükleniyor...</p>}

          {fileMsg && (
            <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
              {fileMsg}
            </p>
          )}

          <div className="space-y-2">
            {sections.map((sec, idx) => {
              const secDone = sec.items.filter((it) =>
                doneSet.has(`${it.code}|${it.period}`)
              ).length;
              const open = openSection === sec.key;
              return (
                <div key={sec.key} className="border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenSection(open ? null : sec.key)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-semibold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-sm">{sec.title}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span
                        className={
                          "text-xs font-semibold px-2 py-0.5 rounded " +
                          (secDone === sec.items.length
                            ? "bg-green-100 text-green-700"
                            : "bg-red-50 text-red-500")
                        }
                      >
                        {secDone}/{sec.items.length}
                      </span>
                      <span className="text-gray-400">{open ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {open && (
                    <div className="border-t divide-y">
                      {sec.items.map((it) => {
                        const itemKey = `${it.code}|${it.period}`;
                        const done = doneSet.has(itemKey);
                        const itemFiles = attachmentsByItem.get(itemKey) || [];
                        const uploading = uploadingKey === itemKey;
                        const inputId = `dosya-${sec.key}-${it.code}-${it.period}`;

                        return (
                          <div key={itemKey} className="px-4 py-2 text-sm hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <label className={"flex items-center gap-3 flex-1 min-w-0 " + (canWrite ? "cursor-pointer" : "")}>
                                <input
                                  type="checkbox"
                                  checked={done}
                                  disabled={!canWrite}
                                  onChange={() => toggleItem(it.code, it.period)}
                                  className="w-4 h-4 shrink-0"
                                />
                                <span className={"truncate " + (done ? "line-through text-gray-400" : "")}>
                                  {it.label}
                                </span>
                                {itemFiles.length > 0 && (
                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">
                                    {itemFiles.length} dosya
                                  </span>
                                )}
                              </label>

                              {/* Dosya ekleme — çoklu seçim, PDF/Word/JPEG/PNG */}
                              <div className="flex items-center gap-1 shrink-0">
                                {uploading && (
                                  <span className="text-xs text-gray-400">Yükleniyor...</span>
                                )}

                                {!uploading && canWrite && (
                                  <label
                                    htmlFor={inputId}
                                    title="PDF, Word, JPEG veya PNG yükle (birden fazla dosya seçilebilir)"
                                    className="text-xs px-2 py-1 rounded border text-gray-500 hover:bg-gray-100 cursor-pointer"
                                  >
                                    📎 Dosya Ekle
                                  </label>
                                )}

                                {!uploading && !canWrite && itemFiles.length === 0 && (
                                  <span className="text-xs text-gray-300">Dosya yok</span>
                                )}

                                {canWrite && (
                                  <input
                                    id={inputId}
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,image/png,image/jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                        uploadItemFiles(it.code, it.period, e.target.files);
                                      }
                                      e.target.value = "";
                                    }}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Yüklenmiş dosyaların listesi */}
                            {itemFiles.length > 0 && (
                              <div className="mt-1.5 ml-7 space-y-1">
                                {itemFiles.map((f) => (
                                  <div key={f.id} className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="truncate flex-1 min-w-0">📄 {f.file_name}</span>
                                    <button
                                      onClick={() => downloadItemFile(f.file_path)}
                                      title="İndir"
                                      className="shrink-0 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    >
                                      ⬇
                                    </button>
                                    {canWrite && (
                                      <button
                                        onClick={() => removeAttachment(f.id)}
                                        title="Kaldır"
                                        className="shrink-0 px-1.5 py-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BELGELER — firmanın Belge Takip üzerinden yüklediği TÜM dosyaların
          birleştirilmiş görünümü (firm_belge_dosyalari). Bu, firma için asıl
          belge deposu — buradaki her kayıt Belge Takip'teki bir maddeye bağlı. */}
      {tab === "documents" && (
        <div>
          {belgeLoading && <p className="text-gray-500 mb-2">Yükleniyor...</p>}

          {fileMsg && (
            <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
              {fileMsg}
            </p>
          )}

          {!belgeLoading && attachments.length === 0 && !fileMsg && (
            <div className="border rounded-xl p-8 text-center text-gray-400">
              <p>Bu firmaya henüz hiç belge yüklenmemiş.</p>
              <button
                onClick={() => setTab("belge_takip")}
                className="mt-2 text-sm text-blue-600 underline"
              >
                Belge Takip sekmesinden dosya ekle
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">Dosya</th>
                    <th className="text-left p-3 font-medium text-gray-600">İlgili Madde</th>
                    <th className="text-left p-3 font-medium text-gray-600">Kategori</th>
                    {canWrite && <th className="p-3" />}
                  </tr>
                </thead>
                <tbody>
                  {[...attachments]
                    .sort((a, b) => (a.file_name > b.file_name ? 1 : -1))
                    .map((f) => (
                      <tr key={f.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">
                          <button
                            onClick={() => downloadItemFile(f.file_path)}
                            className="text-blue-600 hover:underline text-left"
                          >
                            📄 {f.file_name}
                          </button>
                        </td>
                        <td className="p-3 text-gray-600">{codeLabel(f.code, f.period)}</td>
                        <td className="p-3 text-gray-400 text-xs">{codeSection(f.code)}</td>
                        {canWrite && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => removeAttachment(f.id)}
                              className="text-xs text-gray-400 hover:text-red-500"
                            >
                              Kaldır
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* GÖREVLER — basit salt okunur liste (görev CRUD'u /tasks Kanban ekranında) */}
      {tab === "tasks" && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {TAB_COLUMNS.tasks.map((c) => (
                  <th key={c.key} className="text-left p-3 font-medium text-gray-600">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsLoading && (
                <tr>
                  <td colSpan={TAB_COLUMNS.tasks.length} className="p-4 text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              )}
              {!rowsLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={TAB_COLUMNS.tasks.length} className="p-4 text-gray-500">
                    Bu firmaya ait kayıt yok.
                  </td>
                </tr>
              )}
              {!rowsLoading &&
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    {TAB_COLUMNS.tasks.map((c) => (
                      <td key={c.key} className="p-3">
                        {display(row[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 p-3 border-t">
            Görev eklemek/düzenlemek için{" "}
            <Link href="/tasks" className="text-blue-600 underline">
              Görevler
            </Link>{" "}
            ekranını kullan.
          </p>
        </div>
      )}

      {/* ARAÇLAR / SÜRÜCÜLER / PERSONELLER / ZİYARETLER — bu firmaya sabitlenmiş,
          tam CRUD (ekle/düzenle/sil) destekli gömülü bileşenler. */}
      {tab === "vehicles" && (
        <FirmScopedCrud
          table="vehicles"
          title="Araçlar"
          fields={VEHICLE_FIELDS}
          searchKeys={["plate_number", "brand", "model", "vehicle_type"]}
          fixedFirmId={id}
          compact
        />
      )}

      {tab === "drivers" && (
        <FirmScopedCrud
          table="drivers"
          title="Sürücüler"
          fields={DRIVER_FIELDS}
          searchKeys={["first_name", "last_name", "phone", "national_id"]}
          fixedFirmId={id}
          compact
        />
      )}

      {tab === "employees" && (
        <FirmScopedCrud
          table="employees"
          title="Personeller"
          fields={EMPLOYEE_FIELDS}
          searchKeys={["first_name", "last_name", "department", "position"]}
          fixedFirmId={id}
          compact
        />
      )}

      {tab === "visits" && (
        <FirmScopedCrud
          table="visits"
          title="Ziyaretler"
          fields={VISIT_FIELDS}
          searchKeys={["visit_type", "summary"]}
          orderBy="visit_date"
          fixedFirmId={id}
          compact
        />
      )}
    </div>
  );
}
