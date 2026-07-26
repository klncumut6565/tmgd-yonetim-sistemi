"use client";

// Firma detay sayfasi icin "Notlar" sekmesi (Faz 3 MVP).
// Kronolojik, serbest metin not akisi — musteri gorusmesi notlari,
// hatirlatmalar, gozlemler. RLS zaten sadece super_admin'e aciyor;
// bu bilesen ayrica ust bilesen (page.tsx) tarafindan da sadece
// super_admin'e gosteriliyor (cift katman).

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useSpeechToText } from "@/hooks/useSpeechToText";

type Note = {
  id: string;
  firm_id: string;
  author_id: string | null;
  content: string;
  is_assistant: boolean;
  created_at: string;
  updated_at: string;
};

type AuthorMap = Record<string, string>;

export default function FirmNotesTab({ firmId }: { firmId: string }) {
  const { profile } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [authors, setAuthors] = useState<AuthorMap>({});
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  async function loadNotes() {
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("firm_notes")
      .select("*")
      .eq("firm_id", firmId)
      .order("created_at", { ascending: false });

    if (err) {
      setError(
        "Notlar yüklenemedi — veritabanı güncellemesi (migration 031) henüz çalıştırılmamış olabilir. " +
          err.message
      );
      setNotes([]);
      setLoading(false);
      return;
    }

    const noteRows = (data as Note[]) ?? [];
    setNotes(noteRows);

    // Yazar adlarını çek
    const authorIds = Array.from(
      new Set(noteRows.map((n) => n.author_id).filter((id): id is string => !!id))
    );
    if (authorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", authorIds);
      const map: AuthorMap = {};
      (profs ?? []).forEach((p: { id: string; full_name: string | null; email: string | null }) => {
        map[p.id] = p.full_name || p.email || "—";
      });
      setAuthors(map);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId]);

  const { desteklenir: sesDesteklenir, dinliyor, hata: sesHatasi, baslat: sesBaslat, durdur: sesDurdur } =
    useSpeechToText();

  function mikrofonToggle() {
    if (dinliyor) {
      sesDurdur();
      return;
    }
    sesBaslat((metin) => {
      setNewContent((prev) => (prev ? prev + " " + metin : metin));
    });
  }

  async function addNote() {
    if (!newContent.trim()) return;
    setSaving(true);
    setError("");

    const { error: err } = await supabase.from("firm_notes").insert({
      firm_id: firmId,
      author_id: profile?.id ?? null,
      is_assistant: false,
      content: newContent.trim(),
    });

    setSaving(false);

    if (err) {
      setError("Not kaydedilemedi: " + err.message);
      return;
    }

    setNewContent("");
    loadNotes();
  }

  async function saveEdit() {
    if (!editingId || !editContent.trim()) return;
    const { error: err } = await supabase
      .from("firm_notes")
      .update({ content: editContent.trim() })
      .eq("id", editingId);

    if (err) {
      setError("Güncellenemedi: " + err.message);
      return;
    }

    setEditingId(null);
    setEditContent("");
    loadNotes();
  }

  async function deleteNote(id: string) {
    const ok = window.confirm("Bu notu silmek istediğine emin misin?");
    if (!ok) return;

    const { error: err } = await supabase.from("firm_notes").delete().eq("id", id);
    if (err) {
      setError("Silinemedi: " + err.message);
      return;
    }
    loadNotes();
  }

  function formatDate(d: string): string {
    return new Date(d).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h2 className="text-lg font-bold">📝 Notlar</h2>
        <p className="text-sm text-gray-500">
          Müşteri görüşmesi notları, hatırlatmalar, gözlemler — kronolojik olarak burada tutulur.
        </p>
      </div>

      {/* Yeni not ekleme */}
      <div className="border rounded-xl p-4 mb-6 bg-gray-50">
        <div className="relative">
          <textarea
            className="border p-3 w-full rounded text-sm pr-12"
            rows={3}
            placeholder="Yeni not yaz... (örn. '15 Temmuz'da firma ile görüşüldü, SDS güncellemesi bekleniyor')"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          {sesDesteklenir && (
            <button
              type="button"
              onClick={mikrofonToggle}
              title={dinliyor ? "Dinlemeyi durdur" : "Sesle not gir"}
              className={
                "absolute right-2 top-2 w-8 h-8 rounded-full flex items-center justify-center text-sm transition " +
                (dinliyor
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200")
              }
            >
              🎤
            </button>
          )}
        </div>
        {dinliyor && (
          <p className="text-xs text-red-500 mt-1">🔴 Dinleniyor... konuşmayı bitirince mikrofon simgesine tekrar bas.</p>
        )}
        {sesHatasi && (
          <p className="text-xs text-amber-600 mt-1">{sesHatasi}</p>
        )}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">
            {sesDesteklenir ? "🎤 mikrofonla sesli not girebilirsin" : ""}
          </span>
          <button
            onClick={addNote}
            disabled={saving || !newContent.trim()}
            className="px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Not Ekle"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          {error}
        </p>
      )}

      {loading && <p className="text-gray-500">Yükleniyor...</p>}

      {!loading && notes.length === 0 && !error && (
        <p className="text-gray-400 text-sm">Bu firma için henüz not eklenmemiş.</p>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className={
              "border rounded-xl p-3 " +
              (note.is_assistant ? "bg-indigo-50 border-indigo-200" : "")
            }
          >
            {editingId === note.id ? (
              <div>
                <textarea
                  className="border p-2 w-full rounded text-sm"
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={saveEdit}
                    className="text-xs px-3 py-1 bg-black text-white rounded"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs px-3 py-1 border rounded"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">
                  {note.is_assistant && <span className="mr-1">🤖</span>}
                  {note.content}
                </p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>
                    {note.is_assistant ? "ADR Asistanı" : authors[note.author_id ?? ""] ?? "—"} · {formatDate(note.created_at)}
                    {note.updated_at !== note.created_at && " (düzenlendi)"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(note.id);
                        setEditContent(note.content);
                      }}
                      className="hover:text-gray-700"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="hover:text-red-500"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
