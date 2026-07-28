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
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/supabase/authFetch";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type { ChatMessage } from "@/lib/ai/multiEngine";
import { actionToUrl } from "@/lib/ai/actions";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const { firmId, firmName } = useCurrentFirm();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sesli görüşme: mikrofona bir kez basınca başlar, tekrar basana ya da
  // "Görüşmeyi Bitir"e basana kadar devam eder — konuş, otomatik gönderilir,
  // cevap sesli gelir, cevap bitince OTOMATİK tekrar dinlemeye döner.
  // Stale closure sorunlarını önlemek için hem state hem ref tutuluyor.
  const [sesliGorusmeAktif, setSesliGorusmeAktif] = useState(false);
  const sesliGorusmeRef = useRef(false);
  function sesliGorusmeyiAyarla(deger: boolean) {
    sesliGorusmeRef.current = deger;
    setSesliGorusmeAktif(deger);
  }

  const {
    desteklenir: sesDesteklenir,
    dinliyor,
    hata: sesHatasi,
    hataKodu: sesHataKodu,
    baslat: sesBaslat,
    durdur: sesDurdur,
  } = useSpeechToText();
  const { desteklenir: ttsDesteklenir, konusuyor, konus, durdur: ttsDurdur, kilidiAc: ttsKilidiAc } = useTextToSpeech();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const [sesizDenemeSayisi, setSesizDenemeSayisi] = useState(0);

  function dinlemeyeBasla() {
    sesBaslat((metin) => {
      setSesizDenemeSayisi(0); // başarılı algılama — sayaç sıfırlanır
      gonder(metin);
    }, false); // false = tek cümle bitince (sessizlik) otomatik durur
  }

  // Ses algılanamadı (sessizlik/gürültü) ama görüşme hâlâ aktifse —
  // kullanıcıyı tekrar mikrofona bastırmadan otomatik dinlemeye devam et.
  // ÜST ÜSTE 3 kez algılanamazsa artık otomatik denemeyi DURDUR ve net bir
  // mesaj göster — aksi halde masaüstünde gerçek bir mikrofon erişim
  // sorunu (işletim sistemi seviyesinde izin kapalı vb.) sessizce sonsuz
  // döngüye girip kullanıcıya hiçbir şey göstermeden takılı kalabilir.
  useEffect(() => {
    if (sesHataKodu === "no-speech" && sesliGorusmeRef.current) {
      if (sesizDenemeSayisi >= 2) {
        sesliGorusmeyiAyarla(false);
        setSesizDenemeSayisi(0);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "🎤 Mikrofon birkaç kez ses algılayamadı, görüşmeyi durdurdum. Tarayıcı izni açık görünüyorsa " +
              "sorun muhtemelen İŞLETİM SİSTEMİ seviyesinde: Windows'ta Ayarlar → Gizlilik → Mikrofon → " +
              "\"Uygulamaların mikrofona erişmesine izin ver\" açık mı ve tarayıcı (Chrome/Edge) listede izinli mi kontrol et. " +
              "Mac'te Sistem Ayarları → Gizlilik ve Güvenlik → Mikrofon → tarayıcı işaretli mi bak.",
            error: true,
          },
        ]);
        return;
      }
      const t = setTimeout(() => {
        setSesizDenemeSayisi((n) => n + 1);
        dinlemeyeBasla();
      }, 500);
      return () => clearTimeout(t);
    }
    // Gerçek bir sorun (izin yok, mikrofon yok, ağ) ise görüşmeyi sonlandır
    if (sesHataKodu && sesHataKodu !== "no-speech" && sesHataKodu !== "aborted") {
      sesliGorusmeyiAyarla(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesHataKodu]);

  function mikrofonTikla() {
    if (sesliGorusmeAktif) {
      // Görüşme sürüyorken tıklamak = görüşmeyi bitir
      sesliGorusmeyiAyarla(false);
      sesDurdur();
      ttsDurdur();
      return;
    }
    // MOBİL FIX: TTS kilidini burada, dokunma olayının İÇİNDE (senkron) aç.
    // dinlemeyeBasla() içindeki getUserMedia await'i yüzünden bundan sonrası
    // artık "kullanıcı dokunması" sayılmıyor — mobil tarayıcılar bu noktadan
    // sonra çağrılan speechSynthesis.speak()'i sessizce yok sayabilir.
    if (ttsDesteklenir) ttsKilidiAc();

    // Yeni görüşme başlat
    sesliGorusmeyiAyarla(true);
    dinlemeyeBasla();
  }

  async function gonder(overrideText?: string) {
    const question = (overrideText ?? input).trim();
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
        const detayMetni = Array.isArray(json.details)
          ? json.details.map((d: { provider: string; message: string }) => `• ${d.provider}: ${d.message}`).join("\n")
          : "";
        const hataMetni = (json.error ?? "Bir hata oluştu.") + (detayMetni ? "\n\n" + detayMetni : "");
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: hataMetni, error: true },
        ]);
        if (sesliGorusmeRef.current && ttsDesteklenir) {
          konus("Bir hata oluştu, lütfen tekrar dener misin.", () => {
            if (sesliGorusmeRef.current) dinlemeyeBasla();
          });
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: json.answer },
        ]);

        if (sesliGorusmeRef.current && ttsDesteklenir) {
          // Cevap seslendirilir; bitince GÖRÜŞME hâlâ aktifse otomatik
          // olarak tekrar dinlemeye geçilir — gerçek karşılıklı konuşma,
          // kullanıcının tekrar mikrofona basmasına gerek kalmaz.
          konus(json.answer as string, () => {
            if (sesliGorusmeRef.current) dinlemeyeBasla();
          });
        }

        if (json.action) {
          const url = actionToUrl(json.action, firmId);
          if (url) {
            router.push(url);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "Bu işlem için önce bir firma sayfasına gitmen gerekiyor.",
                error: true,
              },
            ]);
          }
        }
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
      if (sesliGorusmeRef.current && ttsDesteklenir) {
        konus("Bağlantı hatası oluştu.", () => {
          if (sesliGorusmeRef.current) dinlemeyeBasla();
        });
      }
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
    <>
      {/* Karartma (backdrop) — mobilde panel dışına dokununca kapansın,
          ayrıca panelin "sayfayı kaplamadığını" görsel olarak belirginleştirir. */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={() => setOpen(false)}
      />
      <div className="fixed right-0 top-0 h-full w-[88%] max-w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            🤖 ADR Asistanı
            {sesliGorusmeAktif && (
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                📞 Görüşme Aktif
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500">
            {firmName ? `Bağlam: ${firmName}` : "Genel sohbet (firma seçili değil)"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {sesliGorusmeAktif && (
            <button
              onClick={() => {
                sesliGorusmeyiAyarla(false);
                sesDurdur();
                ttsDurdur();
              }}
              title="Sesli görüşmeyi bitir"
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-600 text-white hover:bg-red-700"
            >
              🛑 Bitir
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            title="Kapat (sohbet altta 1 satırlık bara döner)"
            className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500"
          >
            ✕
          </button>
        </div>
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

        {konusuyor && (
          <div className="flex justify-start">
            <div className="bg-indigo-100 border border-indigo-200 rounded-2xl px-3.5 py-2 text-sm text-indigo-700 flex items-center gap-2">
              <span className="flex gap-0.5">
                <span className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" />
                <span className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse [animation-delay:300ms]" />
              </span>
              🔊 Konuşuyor...
              <button onClick={ttsDurdur} className="ml-1 text-xs underline text-indigo-500">
                Durdur
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Giriş alanı */}
      <div className="border-t p-3">
        {dinliyor && (
          <p className="text-xs text-red-500 mb-1">🔴 Dinliyorum...</p>
        )}
        {sesliGorusmeAktif && !dinliyor && !konusuyor && (
          <p className="text-xs text-indigo-500 mb-1">⏳ Bir sonraki cümlen için hazırlanıyor...</p>
        )}
        {!sesliGorusmeAktif && sesDesteklenir && !sending && (
          <p className="text-xs text-gray-400 mb-1">🎤 Mikrofona bas — konuş, otomatik gönderilir, cevap sesli gelir.</p>
        )}
        {sesHatasi && <p className="text-xs text-amber-600 mb-1">{sesHatasi}</p>}
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 border rounded-lg p-2 text-sm resize-none"
            rows={2}
            placeholder="Soru yaz... (Enter ile gönder)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {sesDesteklenir && (
            <button
              type="button"
              onClick={mikrofonTikla}
              title={sesliGorusmeAktif ? "Görüşmeyi bitir" : "Sesli görüşme başlat"}
              className={
                "w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition " +
                (dinliyor
                  ? "bg-red-500 text-white animate-pulse"
                  : sesliGorusmeAktif
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200")
              }
            >
              {sesliGorusmeAktif ? "📞" : "🎤"}
            </button>
          )}
          <button
            onClick={() => gonder()}
            disabled={sending || !input.trim()}
            className="w-9 h-9 shrink-0 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-40"
            title="Gönder"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
