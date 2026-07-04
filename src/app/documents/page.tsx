"use client";

// BELGELER SAYFASI — Tam sürüm
//  - Firma bazlı belge listesi (arama + durum filtresi)
//  - Yeni belge ekleme: ad, tür, geçerlilik tarihi, açıklama, dosya yükleme
//  - Dosya yükleme → Supabase Storage (firm-files bucket)
//  - Geçerlilik tarihi renk rozeti (süresi geçmiş / yaklaşıyor / geçerli)
//  - canWrite: salt okunur kullanıcılar ekleyemez/silemez

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

type Firm = { id: string; name: string };
type DocType = { id: string; code: string; name: string };

type Doc = {
  id: string;
  title: string;
  status: string;
  current_version: number;
  expiry_date: string | null;
  valid_from: string | null;
  description: string | null;
  updated_at: string;
  document_type_id: string;
  firm_id: string;
  firms: { name: string } | null;
  document_types: { name: string; code: string } | null;
  files: { id: string; original_name: string; storage_path: string }[];
};

const STATUS_TR: Record<string, string> = {
  draft: "Taslak",
  active: "Aktif",
  review: "Kontrolde",
  archived: "Arşiv",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  review: "bg-blue-100 text-blue-700",
  archived: "bg-gray-200 text-gray-500",
};

function expiryBadge(dateStr: string | null) {
  if (!dateStr) return null;
  const days = Math.round(
    (new Date(dateStr).getTime() - Date.now()) / 86400000
  );
  let cls = "bg-gray-100 text-gray-600";
  let label = `${new Date(dateStr).toLocaleDateString("tr-TR")}`;
  if (days < 0) {
    cls = "bg-red-100 text-red-700";
    label += ` (${Math.abs(days)} gün geçti)`;
  } else if (days <= 30) {
    cls = "bg-amber-100 text-amber-800";
    label += ` (${days} gün kaldı)`;
  } else {
    label += ` (${days} gün kaldı)`;
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

export default function DocumentsPage() {
  const { canWrite } = useUser();

  const [firms, setFirms] = useState<Firm[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtreler
  const [firmId, setFirmId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Yeni belge formu
  const [showForm, setShowForm] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fTypeId, setFTypeId] = useState("");
  const [fStatus, setFStatus] = useState("active");
  const [fExpiry, setFExpiry] = useState("");
  const [fValidFrom, setFValidFrom] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fFile, setFFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Detay genişletme
  const [expanded, setExpanded] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    const [firmRes, typeRes, docRes] = await Promise.all([
      supabase.from("firms").select("id, name").order("name"),
      supabase.from("document_types").select("id, code, name").eq("is_active", true).order("code"),
      supabase
        .from("documents")
        .select(`id, title, status, current_version, expiry_date, valid_from,
                 description, updated_at, document_type_id, firm_id,
                 firms(name), document_types(name, code),
                 files(id, original_name, storage_path)`)
        .order("updated_at", { ascending: false }),
    ]);

    if (firmRes.error) setError(hataCevir(firmRes.error));
    const firmList = (firmRes.data as Firm[]) || [];
    setFirms(firmList);
    if (firmList.length > 0 && !firmId) setFirmId(firmList[0].id);

    setDocTypes((typeRes.data as DocType[]) || []);
    if (typeRes.data && typeRes.data.length > 0 && !fTypeId)
      setFTypeId(typeRes.data[0].id);

    setDocs((docRes.data as unknown as Doc[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (firmId && d.firm_id !== firmId) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      const q = search.trim().toLocaleLowerCase("tr");
      if (!q) return true;
      return (
        d.title.toLocaleLowerCase("tr").includes(q) ||
        (d.document_types?.name || "").toLocaleLowerCase("tr").includes(q) ||
        (d.firms?.name || "").toLocaleLowerCase("tr").includes(q)
      );
    });
  }, [docs, firmId, statusFilter, search]);

  function resetForm() {
    setFTitle(""); setFTypeId(docTypes[0]?.id || "");
    setFStatus("active"); setFExpiry(""); setFValidFrom("");
    setFDesc(""); setFFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    if (!fTitle.trim()) { setError("Belge adı zorunlu."); return; }
    if (!firmId) { setError("Önce bir firma seç."); return; }
    if (!fTypeId) { setError("Belge türü seç."); return; }
    setSaving(true); setError("");

    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;

    // 1) Belgeyi kaydet
    const { data: newDoc, error: docErr } = await supabase
      .from("documents")
      .insert({
        title: fTitle.trim(),
        firm_id: firmId,
        document_type_id: fTypeId,
        status: fStatus,
        expiry_date: fExpiry || null,
        valid_from: fValidFrom || null,
        description: fDesc.trim() || null,
        created_by: uid,
        updated_by: uid,
      })
      .select()
      .single();

    if (docErr) { setError(hataCevir(docErr)); setSaving(false); return; }

    // 2) Dosya varsa Storage'a yükle
    if (fFile && newDoc) {
      const ext = fFile.name.split(".").pop();
      const path = `${firmId}/${newDoc.id}/v1.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("firm-files")
        .upload(path, fFile, { upsert: true });

      if (uploadErr) {
        // Belge kaydedildi ama dosya yüklenmedi — uyar, devam et
        setError(
          `Belge kaydedildi ancak dosya yüklenemedi: ${hataCevir(uploadErr)}`
        );
      } else {
        // files tablosuna kayıt ekle
        await supabase.from("files").insert({
          firm_id: firmId,
          document_id: newDoc.id,
          uploaded_by: uid,
          file_name: path,
          original_name: fFile.name,
          storage_path: path,
          file_extension: ext,
          mime_type: fFile.type,
          file_size: fFile.size,
          version_no: 1,
          is_latest: true,
        });
      }
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
    loadAll();
  }

  async function handleDelete(doc: Doc) {
    if (!window.confirm(`"${doc.title}" belgesini silmek istediğine emin misin?`)) return;
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) setError(hataCevir(error));
    else loadAll();
  }

  async function getDownloadUrl(path: string) {
    const { data } = await supabase.storage
      .from("firm-files")
      .createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function handleStatusChange(doc: Doc, status: string) {
    const { error } = await supabase
      .from("documents").update({ status, updated_at: new Date().toISOString() })
      .eq("id", doc.id);
    if (error) setError(hataCevir(error));
    else loadAll();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Belgeler</h1>
        {canWrite && (
          <button
            onClick={() => { setShowForm(true); resetForm(); }}
            className="px-4 py-2 rounded bg-black text-white"
          >
            + Yeni Belge
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          {error}
        </p>
      )}

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={firmId} onChange={(e) => setFirmId(e.target.value)}
          className="border p-2 rounded text-sm min-w-[180px]">
          <option value="">Tüm firmalar</option>
          {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded text-sm">
          <option value="all">Tüm durumlar</option>
          {Object.entries(STATUS_TR).map(([k, v]) =>
            <option key={k} value={k}>{v}</option>)}
        </select>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Belge adı, tür ara..." className="border p-2 rounded text-sm flex-1 min-w-[200px]" />
      </div>

      {/* Belge listesi */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium text-gray-600">Belge</th>
              <th className="text-left p-3 font-medium text-gray-600">Tür</th>
              <th className="text-left p-3 font-medium text-gray-600">Firma</th>
              <th className="text-left p-3 font-medium text-gray-600">Durum</th>
              <th className="text-left p-3 font-medium text-gray-600">Geçerlilik</th>
              <th className="text-left p-3 font-medium text-gray-600">Ver.</th>
              {canWrite && <th className="p-3" />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="p-4 text-gray-500">Yükleniyor...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-gray-500">Belge bulunamadı.</td></tr>
            )}
            {filtered.map((doc) => (
              <>
                <tr
                  key={doc.id}
                  onClick={() => setExpanded(expanded === doc.id ? null : doc.id)}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                >
                  <td className="p-3 font-medium">{doc.title}</td>
                  <td className="p-3 text-gray-500">
                    {doc.document_types
                      ? `[${doc.document_types.code}] ${doc.document_types.name}`
                      : "—"}
                  </td>
                  <td className="p-3 text-gray-500">{doc.firms?.name || "—"}</td>
                  <td className="p-3">
                    {canWrite ? (
                      <select
                        value={doc.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStatusChange(doc, e.target.value)}
                        className={`text-xs px-2 py-0.5 rounded border-0 outline-none cursor-pointer ${STATUS_COLORS[doc.status]}`}
                      >
                        {Object.entries(STATUS_TR).map(([k, v]) =>
                          <option key={k} value={k}>{v}</option>)}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[doc.status]}`}>
                        {STATUS_TR[doc.status] || doc.status}
                      </span>
                    )}
                  </td>
                  <td className="p-3">{expiryBadge(doc.expiry_date)}</td>
                  <td className="p-3 text-gray-500">v{doc.current_version}</td>
                  {canWrite && (
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleDelete(doc)}
                        className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
                        Sil
                      </button>
                    </td>
                  )}
                </tr>

                {/* Genişletilmiş detay satırı */}
                {expanded === doc.id && (
                  <tr key={`${doc.id}-detail`} className="border-t bg-gray-50">
                    <td colSpan={canWrite ? 7 : 6} className="px-4 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        {doc.description && (
                          <div className="sm:col-span-2">
                            <span className="text-xs text-gray-400 block mb-0.5">Açıklama</span>
                            <span>{doc.description}</span>
                          </div>
                        )}
                        {doc.valid_from && (
                          <div>
                            <span className="text-xs text-gray-400 block mb-0.5">Geçerlilik başlangıcı</span>
                            <span>{new Date(doc.valid_from).toLocaleDateString("tr-TR")}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-gray-400 block mb-0.5">Son güncelleme</span>
                          <span>{new Date(doc.updated_at).toLocaleDateString("tr-TR")}</span>
                        </div>
                        {doc.files.length > 0 && (
                          <div className="sm:col-span-3">
                            <span className="text-xs text-gray-400 block mb-1">Dosyalar</span>
                            <div className="flex flex-wrap gap-2">
                              {doc.files.map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => getDownloadUrl(f.storage_path)}
                                  className="text-xs px-3 py-1.5 rounded border hover:bg-white flex items-center gap-1.5"
                                >
                                  📎 {f.original_name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {doc.files.length === 0 && (
                          <div className="sm:col-span-3 text-gray-400 text-xs">
                            Henüz dosya eklenmemiş.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Yeni belge formu — modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold mb-5">Yeni Belge</h2>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-600">Firma *</span>
                <select value={firmId} onChange={(e) => setFirmId(e.target.value)}
                  className="border p-2 w-full rounded mt-1 text-sm">
                  {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">Belge Adı *</span>
                <input className="border p-2 w-full rounded mt-1" value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)} placeholder="Örn: 2025 Yıllık Faaliyet Raporu" />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">Belge Türü *</span>
                <select className="border p-2 w-full rounded mt-1 text-sm" value={fTypeId}
                  onChange={(e) => setFTypeId(e.target.value)}>
                  {docTypes.map((t) => (
                    <option key={t.id} value={t.id}>[{t.code}] {t.name}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">Geçerlilik Başlangıcı</span>
                  <input type="date" className="border p-2 w-full rounded mt-1 text-sm"
                    value={fValidFrom} onChange={(e) => setFValidFrom(e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600">Geçerlilik Bitiş *</span>
                  <input type="date" className="border p-2 w-full rounded mt-1 text-sm"
                    value={fExpiry} onChange={(e) => setFExpiry(e.target.value)} />
                </label>
              </div>

              <label className="block">
                <span className="text-sm text-gray-600">Durum</span>
                <select className="border p-2 w-full rounded mt-1 text-sm" value={fStatus}
                  onChange={(e) => setFStatus(e.target.value)}>
                  {Object.entries(STATUS_TR).map(([k, v]) =>
                    <option key={k} value={k}>{v}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">Açıklama</span>
                <textarea className="border p-2 w-full rounded mt-1 text-sm" rows={2}
                  value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">Dosya Yükle (opsiyonel)</span>
                <input ref={fileRef} type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={(e) => setFFile(e.target.files?.[0] || null)}
                  className="border p-2 w-full rounded mt-1 text-sm" />
                <span className="text-xs text-gray-400">
                  PDF, Word, Excel, PNG, JPG — maks. 50 MB
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 rounded bg-black text-white disabled:opacity-50">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button onClick={() => { setShowForm(false); resetForm(); setError(""); }}
                className="flex-1 py-2 rounded border">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
