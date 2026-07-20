"use client";

// Firmaya bağlı kayıtları yöneten ortak bileşen.
// Araçlar / Sürücüler / Personeller / Ziyaretler sayfaları bunu kullanır.
//
// Özellikler:
//  - Firma seçimi (önce firma seçilir, sonra o firmanın kayıtları gelir)
//  - Arama (girilen metne göre listeyi anlık filtreler)
//  - Ekleme + Düzenleme (aynı form, "düzenle" tıklanınca alanlar dolar)
//  - Silme (onaylı)
//
// Her sayfa kendi alan tanımlarını (FieldDef[]) ve tablo adını verir.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

export type FieldType = "text" | "number" | "date" | "select" | "textarea";

export type FieldDef = {
  key: string;                 // veritabanı sütun adı
  label: string;               // ekranda görünen etiket
  type?: FieldType;            // varsayılan: text
  required?: boolean;          // zorunlu alan mı
  options?: { value: string; label: string }[]; // type=select için
  inTable?: boolean;           // listede sütun olarak gösterilsin mi (varsayılan true)
  defaultValue?: string;       // yeni kayıt formu açıldığında alanın ön dolu geleceği metin (örn. rapor şablonu)
  textareaRows?: number;       // type=textarea için satır sayısı (varsayılan 4)
  maxLength?: number;          // veritabanındaki varchar(n) sınırı; girişte de engellenir
                               // (örn. plate_number varchar(20), national_id varchar(20))
};

type Firm = { id: string; name: string; activities?: string[] | null; orphan?: boolean };
type Row = Record<string, unknown> & { id: string };

type Props = {
  table: string;               // supabase tablo adı (örn. "vehicles")
  title: string;               // sayfa başlığı
  fields: FieldDef[];          // form + tablo alanları
  searchKeys: string[];        // arama hangi alanlarda yapılsın
  orderBy?: string;            // sıralama alanı (varsayılan created_at)
  requireActivity?: string;    // yalnızca bu faaliyet konusuna sahip firmalar listelenir (örn. "tasimaci")
  fixedFirmId?: string;        // verilirse firma seçici gizlenir, kayıtlar sabit bu firmaya bağlanır
                                // (firma detay sayfasındaki sekmelerden gömülü kullanım için)
  compact?: boolean;           // true ise başlık (h1) ve firma seçici satırı gizlenir — üst düzey
                                // sayfa (örn. firma detay) kendi başlığını zaten gösteriyorsa kullan
  notepadField?: string;       // verilirse bu alan Ekle/Düzenle modalından ÇIKARILIR ve
                                // ekranın sağında bağımsız bir not defteri paneli olarak gösterilir
  notepadLabel?: string;       // not defteri panelinin başlığı
  notepadTemplate?: string;    // yeni kayıt oluşturulduğunda not defterine ön dolu gelecek şablon
  dosyaEki?: boolean;          // true ise her kayda dosya eklenebilir ve sağda önizleme paneli açılır
                               // (araç ruhsat/muayene, sürücü SRC5, personel eğitim belgesi vb.)
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  inactive: "Pasif",
  sold: "Satıldı",
};

export default function FirmScopedCrud({
  table,
  title,
  fields,
  searchKeys,
  orderBy = "created_at",
  requireActivity,
  fixedFirmId,
  compact = false,
  notepadField,
  notepadLabel,
  notepadTemplate,
  dosyaEki = false,
}: Props) {
  const { canWrite } = useUser();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmId, setFirmId] = useState(fixedFirmId || "");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Form durumu (not defteri alanı hariç — o ayrı bir panelde yönetilir)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  // Tarayıcı otomatik doldurma (autofill) React'in onChange'ini tetiklemeden
  // DOM'a değer yazabiliyor — bu durumda "form" state boş kalsa da ekranda
  // alan dolu görünür ve kaydet'e basınca "alan zorunlu" hatası yanlışlıkla
  // tetiklenir. saveForm() bu ref'ler üzerinden gerçek DOM değerini okuyup
  // state ile karşılaştırarak bu senaryoyu da güvenceye alır (onBlur'un
  // yakalayamadığı, örn. autofill'in birden fazla alanı aynı anda doldurduğu
  // ve kullanıcının o alana hiç tek tek dokunmadığı durumlar için).
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>({});

  // Not defteri paneli durumu
  const [notepadRowId, setNotepadRowId] = useState<string | null>(null);

  // ---- Dosya ekleri (dosyaEki=true olduğunda) --------------------------
  type KayitDosya = { id: string; kayit_id: string; file_path: string; file_name: string };
  const [dosyalar, setDosyalar] = useState<KayitDosya[]>([]);
  const [dosyaRowId, setDosyaRowId] = useState<string | null>(null);
  const [dosyaYukleniyor, setDosyaYukleniyor] = useState(false);
  const [dosyaMsg, setDosyaMsg] = useState("");
  const [onizleme, setOnizleme] = useState<{
    id: string;
    ad: string;
    url: string;
    tur: "pdf" | "gorsel" | "diger";
  } | null>(null);
  const [onizlemeYukleniyor, setOnizlemeYukleniyor] = useState(false);
  const [notepadText, setNotepadText] = useState("");
  const [notepadSaving, setNotepadSaving] = useState(false);
  const [notepadMsg, setNotepadMsg] = useState("");

  const tableFields = fields.filter((f) => f.inTable !== false && f.key !== notepadField);
  const modalFields = fields.filter((f) => f.key !== notepadField);

  async function loadFirms() {
    let { data, error } = await supabase
      .from("firms")
      .select("id, name, activities")
      .order("name");

    // "activities" kolonu henüz eklenmemişse (migration 010 çalıştırılmadıysa)
    // filtre uygulanamaz — tüm firmaları göster, kullanıcıyı bilgilendir.
    if (error && /does not exist/i.test(error.message || "")) {
      const retry = await supabase.from("firms").select("id, name").order("name");
      data = (retry.data || []).map((f) => ({ ...f, activities: null })) as typeof data;
      error = retry.error;
      if (!retry.error && requireActivity) {
        setError(
          "Faaliyet filtresi uygulanamadı — veritabanı güncellemesi (migration 010) henüz çalıştırılmamış."
        );
      }
    } else if (error) {
      setError("Firmalar yüklenemedi: " + hataCevir(error));
      return;
    }

    const activityMatch = requireActivity
      ? (data || []).filter((f) => (f.activities || []).includes(requireActivity))
      : data || [];

    let list: Firm[] = activityMatch;

    // Faaliyet filtresi varsa: bu filtreye UYMAYAN ama tabloda (örn. vehicles)
    // hâlâ kaydı olan firmalar da listeye eklenir — böylece bir firmanın
    // faaliyeti sonradan değiştirildiğinde (örn. Taşımacı işareti kaldırıldığında)
    // ona bağlı kayıtlar "hayalet" (görünmez, silinemez) hâle gelmez.
    if (requireActivity) {
      const { data: ownerRows } = await supabase.from(table).select("firm_id");
      const ownerFirmIds = new Set((ownerRows || []).map((r: { firm_id: string }) => r.firm_id));
      const matchedIds = new Set(activityMatch.map((f) => f.id));
      const orphanFirms: Firm[] = (data || [])
        .filter((f) => ownerFirmIds.has(f.id) && !matchedIds.has(f.id))
        .map((f) => ({ ...f, orphan: true }));
      list = [...activityMatch, ...orphanFirms];
    }

    setFirms(list);
    if (list.length > 0) {
      setFirmId((prev) => (prev && list.some((f) => f.id === prev) ? prev : list[0].id));
    } else {
      setFirmId("");
    }
  }

  async function loadRows(targetFirmId: string) {
    if (!targetFirmId) return;
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("firm_id", targetFirmId)
      .order(orderBy, { ascending: false });

    if (error) {
      setError("Kayıtlar yüklenemedi: " + hataCevir(error));
      setRows([]);
    } else {
      setRows((data as Row[]) || []);
    }
    setLoading(false);
  }

  // Bu firmanın bu tablodaki kayıtlarına ait tüm dosya ekleri
  const loadDosyalar = useCallback(
    async (targetFirmId: string) => {
      if (!dosyaEki || !targetFirmId) return;
      const { data, error } = await supabase
        .from("kayit_dosyalari")
        .select("id, kayit_id, file_path, file_name")
        .eq("firm_id", targetFirmId)
        .eq("tablo_adi", table)
        .order("uploaded_at", { ascending: true });

      if (error) {
        setDosyalar([]);
        if (/does not exist|not find the table/i.test(error.message || "")) {
          setDosyaMsg(
            "Dosya ekleme özelliği için veritabanı güncellemesi henüz çalıştırılmamış. " +
              "Supabase → SQL Editor'de database/025_kayit_dosya_ekleri.sql dosyasını çalıştır."
          );
        }
        return;
      }
      setDosyalar((data as KayitDosya[]) || []);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dosyaEki, table]
  );

  // Kayıt bazlı dosya listesi
  const dosyalarByRow = useMemo(() => {
    const m = new Map<string, KayitDosya[]>();
    dosyalar.forEach((d) => {
      const list = m.get(d.kayit_id) || [];
      list.push(d);
      m.set(d.kayit_id, list);
    });
    return m;
  }, [dosyalar]);

  function dosyaTuru(ad: string): "pdf" | "gorsel" | "diger" {
    const u = ad.toLowerCase();
    if (u.endsWith(".pdf")) return "pdf";
    if (/\.(jpg|jpeg|png|gif|webp)$/.test(u)) return "gorsel";
    return "diger";
  }

  async function onizlemeAc(d: KayitDosya) {
    setOnizlemeYukleniyor(true);
    setOnizleme(null);
    const { data, error } = await supabase.storage
      .from("firm-files")
      .createSignedUrl(d.file_path, 3600);
    setOnizlemeYukleniyor(false);
    if (error || !data?.signedUrl) {
      setDosyaMsg("Önizleme bağlantısı oluşturulamadı: " + hataCevir(error));
      return;
    }
    setOnizleme({
      id: d.id,
      ad: d.file_name,
      url: data.signedUrl,
      tur: dosyaTuru(d.file_name),
    });
  }

  async function dosyaYukle(rowId: string, file: File) {
    if (!firmId) return;
    setDosyaYukleniyor(true);
    setDosyaMsg("");

    // Dosya adındaki Türkçe karakter ve boşluklar Storage yolunda sorun
    // çıkarabildiği için yol güvenli hale getirilir; orijinal ad ayrıca saklanır.
    const uzanti = file.name.includes(".") ? file.name.split(".").pop() : "";
    const guvenliAd = `${Date.now()}${uzanti ? "." + uzanti : ""}`;
    const yol = `${firmId}/${table}/${rowId}/${guvenliAd}`;

    const { error: upErr } = await supabase.storage
      .from("firm-files")
      .upload(yol, file, { upsert: false });

    if (upErr) {
      setDosyaYukleniyor(false);
      setDosyaMsg("Dosya yüklenemedi: " + hataCevir(upErr));
      return;
    }

    const { error: dbErr } = await supabase.from("kayit_dosyalari").insert({
      firm_id: firmId,
      tablo_adi: table,
      kayit_id: rowId,
      file_path: yol,
      file_name: file.name,
    });

    setDosyaYukleniyor(false);
    if (dbErr) {
      // Kayıt açılamadıysa yüklenen dosyayı geride bırakma
      await supabase.storage.from("firm-files").remove([yol]);
      setDosyaMsg("Dosya kaydedilemedi: " + hataCevir(dbErr));
      return;
    }
    await loadDosyalar(firmId);
  }

  async function dosyaSil(d: KayitDosya) {
    if (!confirm(`"${d.file_name}" silinsin mi?`)) return;
    const { error } = await supabase
      .from("kayit_dosyalari")
      .delete()
      .eq("id", d.id);
    if (error) {
      setDosyaMsg("Dosya silinemedi: " + hataCevir(error));
      return;
    }
    await supabase.storage.from("firm-files").remove([d.file_path]);
    if (onizleme?.id === d.id) setOnizleme(null);
    if (firmId) await loadDosyalar(firmId);
  }

  useEffect(() => {
    if (!fixedFirmId) loadFirms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (firmId) {
      loadRows(firmId);
      loadDosyalar(firmId);
    }
    setDosyaRowId(null);
    setOnizleme(null);
    if (notepadField) {
      setNotepadRowId(null);
      setNotepadText("");
      setNotepadMsg("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId]);

  // Arama filtresi (anlık, istemci tarafında)
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [rows, search, searchKeys]);

  function openCreateForm() {
    setEditingId(null);
    const initial: Record<string, string> = {};
    modalFields.forEach((f) => {
      if (f.defaultValue) initial[f.key] = f.defaultValue;
    });
    setForm(initial);
    setShowForm(true);
  }

  function openEditForm(row: Row) {
    setEditingId(row.id);
    const filled: Record<string, string> = {};
    modalFields.forEach((f) => {
      const v = row[f.key];
      filled[f.key] = v == null ? "" : String(v);
    });
    setForm(filled);
    setShowForm(true);
  }

  // Not defterini bir kayda açar — soldaki listeden bir satıra tıklanınca
  // ya da "📝 Not" düğmesine basılınca çağrılır.
  function openNotepad(row: Row) {
    if (!notepadField) return;
    setNotepadRowId(row.id);
    setNotepadText(row[notepadField] == null ? "" : String(row[notepadField]));
    setNotepadMsg("");
  }

  async function saveNotepad() {
    if (!notepadRowId || !notepadField) return;
    setNotepadSaving(true);
    setNotepadMsg("");

    const { error } = await supabase
      .from(table)
      .update({ [notepadField]: notepadText || null })
      .eq("id", notepadRowId);

    setNotepadSaving(false);
    if (error) {
      setNotepadMsg("Kaydedilemedi: " + hataCevir(error));
      return;
    }
    setNotepadMsg("✓ Kaydedildi");
    loadRows(firmId);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({});
  }

  async function saveForm() {
    setError("");

    // Kaydetmeden önce gerçek DOM değerleriyle senkronize ol — tarayıcı
    // autofill'i React state'ini güncellemeden alanı doldurmuş olabilir.
    const guncelForm: Record<string, string> = { ...form };
    for (const f of modalFields) {
      const el = fieldRefs.current[f.key];
      if (el && el.value !== (form[f.key] || "")) {
        guncelForm[f.key] = el.value;
      }
    }
    if (JSON.stringify(guncelForm) !== JSON.stringify(form)) {
      setForm(guncelForm);
    }

    // Zorunlu alan kontrolü
    for (const f of modalFields) {
      if (f.required && !guncelForm[f.key]?.trim()) {
        setError(`"${f.label}" alanı zorunlu.`);
        return;
      }
    }

    // Boş stringleri null'a çevir, sayıları dönüştür
    const payload: Record<string, unknown> = { firm_id: firmId };
    for (const f of modalFields) {
      const raw = guncelForm[f.key];
      if (raw === undefined || raw === "") {
        payload[f.key] = null;
      } else if (f.type === "number") {
        payload[f.key] = Number(raw);
      } else {
        payload[f.key] = raw;
      }
    }

    if (editingId) {
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", editingId);
      if (error) {
        setError("Güncellenemedi: " + hataCevir(error));
        return;
      }
      closeForm();
      loadRows(firmId);
    } else {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      if (error) {
        setError("Kaydedilemedi: " + hataCevir(error));
        return;
      }
      closeForm();
      loadRows(firmId);

      // Yeni kayıt oluşturulunca, varsa not defterini bu kayda açar ve
      // şablonla ön doldurur — ayrıca kaydedilmesi gerekir.
      if (notepadField && data) {
        setNotepadRowId(data.id as string);
        setNotepadText(notepadTemplate || "");
        setNotepadMsg("");
      }
    }
  }

  async function deleteRow(row: Row) {
    const onay = window.confirm("Bu kaydı silmek istediğine emin misin?");
    if (!onay) return;

    const { error } = await supabase.from(table).delete().eq("id", row.id);
    if (error) {
      setError("Silinemedi: " + hataCevir(error));
      return;
    }
    if (notepadRowId === row.id) {
      setNotepadRowId(null);
      setNotepadText("");
      setNotepadMsg("");
    }
    loadRows(firmId);
  }

  function renderCell(row: Row, f: FieldDef) {
    const v = row[f.key];
    if (v == null || v === "") return "—";
    if (f.key === "status") return STATUS_LABELS[String(v)] || String(v);
    if (f.type === "select" && f.options) {
      const opt = f.options.find((o) => o.value === String(v));
      return opt ? opt.label : String(v);
    }
    return String(v);
  }

  return (
    <div className={compact ? "" : "p-6"}>
      <div className={notepadField || dosyaEki ? "lg:flex lg:gap-6 lg:items-start" : ""}>
        <div className={notepadField || dosyaEki ? "flex-1 min-w-0" : ""}>
          <div className="flex items-center justify-between mb-4">
            {!compact && <h1 className="text-3xl font-bold">{title}</h1>}
            {canWrite && (
              <button
                onClick={openCreateForm}
                disabled={!firmId}
                className={
                  "bg-black text-white px-4 py-2 rounded disabled:opacity-40" +
                  (compact ? " ml-auto" : "")
                }
              >
                + Yeni Ekle
              </button>
            )}
          </div>

          {/* Firma seçimi (sabit firmaya gömülüyse gizli) + arama */}
          <div className="flex flex-wrap gap-3 mb-4">
            {!fixedFirmId && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Firma</label>
                <select
                  value={firmId}
                  onChange={(e) => setFirmId(e.target.value)}
                  className="border p-2 rounded min-w-[220px]"
                >
                  {firms.length === 0 && (
                    <option value="">
                      {requireActivity ? "Uygun faaliyette firma yok" : "Firma yok"}
                    </option>
                  )}
                  {firms.map((firm) => (
                    <option key={firm.id} value={firm.id}>
                      {firm.orphan ? `⚠ ${firm.name} (faaliyeti uymuyor)` : firm.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1 min-w-[220px]">
              {!compact && <label className="block text-sm text-gray-600 mb-1">Ara</label>}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Listede ara..."
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Seçili firma faaliyet filtresine uymuyor ama kaydı var — uyar */}
          {firms.find((f) => f.id === firmId)?.orphan && (
            <div className="mb-4 p-3 rounded bg-amber-50 text-amber-800 text-sm">
              ⚠ Bu firmanın faaliyet konuları arasında artık {requireActivity === "tasimaci" ? "Taşımacı" : requireActivity}{" "}
              yok, ama aşağıda hâlâ kayıtları görünüyor. İstersen kayıtları burada silebilir,
              ya da firmanın Genel bilgilerinden faaliyet konusunu tekrar ekleyebilirsin.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {notepadField && filteredRows.length > 0 && (
            <p className="text-xs text-gray-400 mb-2">
              Bir kayda tıklayınca sağdaki not defteri o kayıt için açılır.
            </p>
          )}

          {/* Tablo */}
          <div className="border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  {tableFields.map((f) => (
                    <th key={f.key} className="text-left p-3 font-medium">
                      {f.label}
                    </th>
                  ))}
                  {(canWrite || notepadField) && (
                    <th className="text-right p-3 font-medium">İşlemler</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={tableFields.length + (canWrite ? 1 : 0)} className="p-4 text-gray-500">
                      Yükleniyor...
                    </td>
                  </tr>
                )}

                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={tableFields.length + (canWrite ? 1 : 0)} className="p-4 text-gray-500">
                      {!firmId
                        ? requireActivity && firms.length === 0
                          ? "Bu faaliyet konusuna sahip firma bulunamadı. Firma faaliyet konularını Firmalar sayfasından düzenleyebilirsin."
                          : "Önce bir firma seç."
                        : canWrite
                          ? "Kayıt bulunamadı. Sağ üstten yeni ekleyebilirsin."
                          : "Kayıt bulunamadı."}
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (notepadField) openNotepad(row);
                        if (dosyaEki) {
                          setDosyaRowId(row.id);
                          setOnizleme(null);
                        }
                      }}
                      className={
                        "border-b last:border-0" +
                        (notepadField || dosyaEki ? " cursor-pointer hover:bg-gray-50" : "") +
                        ((notepadField && notepadRowId === row.id) ||
                        (dosyaEki && dosyaRowId === row.id)
                          ? " bg-blue-50"
                          : "")
                      }
                    >
                      {tableFields.map((f) => (
                        <td key={f.key} className="p-3">
                          {renderCell(row, f)}
                        </td>
                      ))}
                      {(canWrite || notepadField || dosyaEki) && (
                        <td className="p-3 text-right whitespace-nowrap">
                          {dosyaEki && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDosyaRowId(row.id);
                                setOnizleme(null);
                                setDosyaMsg("");
                              }}
                              title="Dosyalar"
                              className={
                                "mr-3 hover:underline " +
                                (dosyaRowId === row.id
                                  ? "text-blue-600 font-semibold"
                                  : "text-gray-500")
                              }
                            >
                              📎 Dosya
                              {(dosyalarByRow.get(row.id)?.length || 0) > 0 && (
                                <span className="ml-1 text-xs bg-blue-100 text-blue-700 rounded-full px-1.5">
                                  {dosyalarByRow.get(row.id)?.length}
                                </span>
                              )}
                            </button>
                          )}
                          {notepadField && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openNotepad(row);
                              }}
                              title={notepadLabel || "Not defteri"}
                              className="text-gray-500 hover:underline mr-3"
                            >
                              📝 Not
                            </button>
                          )}
                          {canWrite && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditForm(row);
                                }}
                                className="text-blue-600 hover:underline mr-3"
                              >
                                Düzenle
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRow(row);
                                }}
                                className="text-red-600 hover:underline"
                              >
                                Sil
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DOSYA EKLERİ — ekranın sağında; seçili kaydın dosyaları listelenir
            ve seçilen dosya panelde önizlenir. */}
        {dosyaEki && (
          <div className="lg:w-[420px] shrink-0 mt-6 lg:mt-0">
            <div className="border rounded-xl overflow-hidden lg:sticky lg:top-4 bg-white">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h3 className="font-bold">Dosyalar</h3>
                {dosyaRowId ? (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Seçili kayda ait belgeler
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Soldaki listeden bir kayıt seç
                  </p>
                )}
              </div>

              {dosyaMsg && (
                <p className="text-xs text-red-600 px-4 py-2 border-b">{dosyaMsg}</p>
              )}

              {dosyaRowId && (
                <div className="p-3 border-b">
                  {canWrite && (
                    <label className="block mb-2">
                      <span className="text-xs text-gray-500">
                        {dosyaYukleniyor ? "Yükleniyor..." : "Dosya ekle"}
                      </span>
                      <input
                        type="file"
                        disabled={dosyaYukleniyor}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f && dosyaRowId) dosyaYukle(dosyaRowId, f);
                          e.target.value = "";
                        }}
                        className="block w-full text-xs mt-1"
                      />
                    </label>
                  )}

                  {(dosyalarByRow.get(dosyaRowId)?.length || 0) === 0 ? (
                    <p className="text-xs text-gray-400">
                      Bu kayda henüz dosya eklenmemiş.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {dosyalarByRow.get(dosyaRowId)?.map((d) => (
                        <li
                          key={d.id}
                          className={
                            "flex items-center gap-2 text-xs rounded px-1 " +
                            (onizleme?.id === d.id
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-600")
                          }
                        >
                          <button
                            onClick={() => onizlemeAc(d)}
                            title="Önizle"
                            className="truncate flex-1 min-w-0 text-left hover:underline"
                          >
                            📄 {d.file_name}
                          </button>
                          {canWrite && (
                            <button
                              onClick={() => dosyaSil(d)}
                              title="Sil"
                              className="text-gray-400 hover:text-red-500 shrink-0"
                            >
                              ✕
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="h-[520px] bg-gray-50">
                {onizlemeYukleniyor && (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    Önizleme hazırlanıyor...
                  </div>
                )}

                {!onizlemeYukleniyor && !onizleme && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6 text-gray-400">
                    <span className="text-4xl mb-3">📄</span>
                    <p className="text-sm">
                      Dosya adına tıklayınca içeriği burada görüntülenir.
                    </p>
                  </div>
                )}

                {!onizlemeYukleniyor && onizleme?.tur === "pdf" && (
                  <iframe
                    src={onizleme.url}
                    title={onizleme.ad}
                    className="w-full h-full border-0"
                  />
                )}

                {!onizlemeYukleniyor && onizleme?.tur === "gorsel" && (
                  <div className="h-full overflow-auto p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={onizleme.url}
                      alt={onizleme.ad}
                      className="max-w-full mx-auto"
                    />
                  </div>
                )}

                {!onizlemeYukleniyor && onizleme?.tur === "diger" && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6 text-gray-500">
                    <span className="text-4xl mb-3">📎</span>
                    <p className="text-sm mb-4">
                      Bu dosya türü tarayıcıda önizlenemiyor. İndirerek
                      açabilirsin.
                    </p>
                    <a
                      href={onizleme.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
                    >
                      ⬇ İndir
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NOT DEFTERİ — modaldan bağımsız, ekranın sağında sabit panel */}
        {notepadField && (
          <div className="lg:w-96 shrink-0 mt-6 lg:mt-0">
            <div className="border rounded-xl p-4 lg:sticky lg:top-4">
              <h3 className="font-bold mb-1">{notepadLabel || "Not Defteri"}</h3>

              {!notepadRowId && (
                <p className="text-sm text-gray-400 mt-2">
                  Not defterini açmak için soldaki listeden bir kayda tıkla, ya da{" "}
                  {canWrite ? "yeni bir kayıt ekle." : "bir kayıt seçilmesini bekle."}
                </p>
              )}

              {notepadRowId && (
                <>
                  <textarea
                    rows={18}
                    value={notepadText}
                    onChange={(e) => setNotepadText(e.target.value)}
                    disabled={!canWrite}
                    className="border p-2 rounded w-full font-mono text-xs mt-2"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    {canWrite && (
                      <button
                        onClick={saveNotepad}
                        disabled={notepadSaving}
                        className="px-3 py-1.5 rounded bg-black text-white text-sm disabled:opacity-50"
                      >
                        {notepadSaving ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                    )}
                    {notepadMsg && <span className="text-xs text-gray-500">{notepadMsg}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ekle/Düzenle formu (basit modal) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Kaydı Düzenle" : "Yeni Kayıt"}
            </h2>

            <div className="space-y-3">
              {modalFields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-600 mb-1">
                    {f.label}
                    {f.required && <span className="text-red-500"> *</span>}
                  </label>

                  {f.type === "select" ? (
                    <select
                      name={f.key}
                      ref={(el) => {
                        fieldRefs.current[f.key] = el;
                      }}
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Seçiniz</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      name={f.key}
                      ref={(el) => {
                        fieldRefs.current[f.key] = el;
                      }}
                      autoComplete="off"
                      rows={f.textareaRows || 10}
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                      className="border p-2 rounded w-full font-mono text-xs"
                    />
                  ) : (
                    <input
                      name={f.key}
                      ref={(el) => {
                        fieldRefs.current[f.key] = el;
                      }}
                      autoComplete="off"
                      type={
                        f.type === "date"
                          ? "date"
                          : f.type === "number"
                          ? "number"
                          : "text"
                      }
                      maxLength={f.maxLength}
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm({ ...form, [f.key]: e.target.value })
                      }
                      onBlur={(e) => {
                        // Tarayıcı otomatik doldurma (autofill) bazı durumlarda
                        // değeri React'in onChange'ini tetiklemeden DOM'a
                        // yazabiliyor; bu da state'te alan boş kalsa da
                        // ekranda dolu görünmesine ve "alan zorunlu" hatasının
                        // yanlışlıkla tetiklenmesine yol açabiliyor. Odaktan
                        // çıkışta gerçek DOM değeriyle senkronize ederek bunu
                        // güvenceye alıyoruz.
                        if (e.target.value !== (form[f.key] || "")) {
                          setForm({ ...form, [f.key]: e.target.value });
                        }
                      }}
                      className="border p-2 rounded w-full"
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded border"
              >
                Vazgeç
              </button>
              <button
                onClick={saveForm}
                className="px-4 py-2 rounded bg-black text-white"
              >
                {editingId ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
