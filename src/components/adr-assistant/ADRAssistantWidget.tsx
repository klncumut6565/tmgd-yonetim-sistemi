"use client";

// src/components/adr-assistant/ADRAssistantWidget.tsx
//
// Kalıcı, yüzen ADR Asistanı sohbet penceresi. AppShell içinde bir kez
// mount edilir — sayfa/route değişse, üst/sol menüler değişse bile
// pencere ve sohbet geçmişi (aynı oturum içinde) korunur.
//
// Kapalı durumda: sağ altta 1 satırlık bar/pill.
// Açık durumda: sağ tarafta tam yükseklikte mesajlaşma paneli.
//
// Bağlam farkındalığı: usePathname() ile "/firms/[id]" rotası tespit
// edilir — kullanıcı hangi firmanın sayfasındaysa, gönderilen her mesaj
// o firmanın ID'sini taşır (mesaj gönderilirken YENİDEN okunur, yani
// sohbet ortasında firma değiştirilse bile sonraki mesajlar doğru
// firmaya bağlanır).
//
// NOT: Sohbet geçmişi şu an yalnızca bellekte (React state) tutuluyor —
// tam sayfa yenilemesinde (F5) sıfırlanır. Kalıcı geçmiş istenirse ayrı
// bir migration ile eklenebilir (bkz. session notları).

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/supabase/authFetch";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { ChatMessage } from "@/lib/ai/multiEngine";

type DisplayMessage = ChatMessage & { id: string; pending?: boolean; error?: boolean };

function useCurrentFirm() {
  const pathname = usePathname();
  const [firmId, setFirmId] = useState<string | null>(null);
  const [firmName, setFirmName] = useState<string | null>(null);

  useEffect(() => {
    const match = pathname?.match(/^\/firms\/([^/]+)/);
    const id = match ? match[1] : null;
    setFirmId(id);

    if (!id) {
      setFirmName(null);
      return;
    }

    let cancelled = false;
    supabase
      .from("firms")
      .select("name")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setFirmName(data?.name ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return { firmId, firmName };
}

export default function ADRAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { firmId, firmName } = useCurrentFirm();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { desteklenir: sesDesteklenir, dinliyor, hata: sesHatasi, baslat: sesBaslat, durdur: sesDurdur } =
    useSpeechToText();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  function mikrofonToggle() {
    if (dinliyor) {
      sesDurdur();
      return;
    }
    sesBaslat((metin) => {
      setInput((prev) => (prev ? prev + " " + metin : metin));
    });
  }

  async function gonder() {
    const question = input.trim();
    if (!question || sending) return;

    setInput("");
    setSending(true);

    const userMsg: DisplayMessage = { id: crypto.randomUUID(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);

    // Geçmiş — sadece rol/içerik (API'ye giden format)
    const history: ChatMessage[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await authFetch("/api/adr-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmId, // her gönderimde YENİDEN okunur — sohbet ortasında firma değişmiş olabilir
          question,
          history: history.slice(0, -1), // son mesaj zaten "question" olarak ayrı gidiyor
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: json.error ?? "Bir hata oluştu.", error: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: json.answer },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Bağlantı hatası: " + (e instanceof Error ? e.message : String(e)),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      gonder();
    }
  }

  // ---- KAPALI: sağ altta 1 satırlık bar ----
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-black text-white shadow-lg hover:bg-gray-800 transition"
      >
        <span>🤖</span>
        <span className="text-sm font-medium">ADR Asistanı</span>
        {firmName && (
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{firmName}</span>
        )}
      </button>
    );
  }

  // ---- AÇIK: sağ tarafta mesajlaşma paneli ----
  return (
    <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            🤖 ADR Asistanı
          </h2>
          <p className="text-xs text-gray-500">
            {firmName ? `Bağlam: ${firmName}` : "Genel sohbet (firma seçili değil)"}
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          title="Kapat (sohbet altta 1 satırlık bara döner)"
          className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500"
        >
          ✕
        </button>
      </div>

      {/* Mesaj listesi */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8 px-4">
            <p className="mb-2">👋 Merhaba! ADR ile ilgili sorularını buradan sorabilirsin.</p>
            {firmName ? (
              <p>
                Şu an <strong>{firmName}</strong> sayfasındasın — bu firmaya özel sorular
                ("UN 1203 için taşıma evrağı oluştur" gibi) bu bağlamda değerlendirilir.
              </p>
            ) : (
              <p>Bir firma sayfasına gidersen, sorularını o firma bağlamında yanıtlarım.</p>
            )}
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap " +
                (m.role === "user"
                  ? "bg-black text-white"
                  : m.error
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-indigo-50 text-gray-800 border border-indigo-100")
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-3.5 py-2 text-sm text-gray-500">
              ADR Asistanı yazıyor...
            </div>
          </div>
        )}
      </div>

      {/* Giriş alanı */}
      <div className="border-t p-3">
        {dinliyor && (
          <p className="text-xs text-red-500 mb-1">🔴 Dinleniyor...</p>
        )}
        {sesHatasi && <p className="text-xs text-amber-600 mb-1">{sesHatasi}</p>}
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 border rounded-lg p-2 text-sm resize-none"
            rows={2}
            placeholder="Soru yaz veya mikrofonla konuş... (Enter ile gönder)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {sesDesteklenir && (
            <button
              type="button"
              onClick={mikrofonToggle}
              title={dinliyor ? "Dinlemeyi durdur" : "Sesle sor"}
              className={
                "w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition " +
                (dinliyor ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 hover:bg-gray-200")
              }
            >
              🎤
            </button>
          )}
          <button
            onClick={gonder}
            disabled={sending || !input.trim()}
            className="w-9 h-9 shrink-0 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-40"
            title="Gönder"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
