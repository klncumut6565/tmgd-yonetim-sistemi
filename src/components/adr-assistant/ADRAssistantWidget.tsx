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
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type { ChatMessage } from "@/lib/ai/multiEngine";
import { actionToUrl } from "@/lib/ai/actions";
import { yerelNiyetCoz } from "@/lib/ai/localIntent";
import { halusinasyonMu, yankiMi } from "@/lib/ai/halusinasyon";

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
  /**
   * Mesaj listesinin GÜNCEL kopyası.
   *
   * Sesli akışta gonder() bir geri çağırma zincirinin içinden çağrılıyor
   * (kayıt bitti → transkripsiyon → gonder). Bu closure kurulduğu andaki
   * `messages` değerini yakalar; sohbet ilerledikçe o değer bayatlar ve
   * API'ye BOŞ/eski geçmiş gider — asistan her seferinde konuşmayı
   * sıfırdan başlamış gibi davranır. Ref her zaman güncel olduğu için
   * geçmiş buradan okunuyor.
   */
  const messagesRef = useRef<DisplayMessage[]>([]);
  /**
   * Asistanın en son seslendirdiği metin — yankı tespiti için.
   * Hoparlörden sızan ses mikrofona girip yazıya döküldüğünde, bu metinle
   * karşılaştırılıp elenir (asistanın kendi kendine konuşmasını önler).
   */
  const sonSeslendirilenRef = useRef<string | null>(null);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
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
    tarayiciUyarisi,
    gunluk,
    gunluguTemizle,
    baslat: sesBaslat,
    durdur: sesDurdur,
  } = useSpeechToText();
  const {
    desteklenir: kayitDesteklenir,
    kaydediyor,
    seviye: sesSeviyesi,
    hata: kayitHatasi,
    baslat: kayitBaslat,
    durdur: kayitDurdur,
  } = useAudioRecorder();
  const { desteklenir: ttsDesteklenir, konusuyor, konus, durdur: ttsDurdur, kilidiAc: ttsKilidiAc } = useTextToSpeech();

  // Sunucu tarafı transkripsiyon (MediaRecorder + /api/speech-to-text)
  // varsayılan yöntemdir: her tarayıcıda AYNI şekilde çalışır. Web Speech
  // API yalnızca kayıt desteklenmiyorsa yedek olarak kullanılır.
  const sunucuTranskripsiyon = kayitDesteklenir;
  const herhangiSesDestegi = kayitDesteklenir || sesDesteklenir;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const [sesizDenemeSayisi, setSesizDenemeSayisi] = useState(0);
  const [teshisAcik, setTeshisAcik] = useState(false);
  const [cevriliyor, setCevriliyor] = useState(false);
  const bosSonucSayisiRef = useRef(0);

  async function sesiMetneCevir(ses: Blob) {
    setCevriliyor(true);
    try {
      const form = new FormData();
      form.append("audio", ses, "kayit.webm");
      const res = await authFetch("/api/speech-to-text", { method: "POST", body: form });

      // Sunucu zaman aşımına uğrarsa Vercel JSON değil HTML hata sayfası
      // döndürür — doğrudan res.json() çağırmak "Unexpected token 'A'"
      // gibi anlamsız bir hataya yol açar. Önce metni alıp güvenle ayrıştır.
      const hamMetin = await res.text();
      let json: { text?: string; error?: string; details?: string[] };
      try {
        json = JSON.parse(hamMetin);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Ses işlenirken sunucu yanıt veremedi (muhtemelen zaman aşımı). " +
              "Daha kısa konuşmayı dene ya da soruyu yazarak sor.",
            error: true,
          },
        ]);
        sesliGorusmeyiAyarla(false);
        return;
      }

      if (!res.ok) {
        const detay = Array.isArray(json.details) ? "\n\n" + json.details.join("\n") : "";
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: (json.error ?? "Ses metne çevrilemedi.") + detay,
            error: true,
          },
        ]);
        sesliGorusmeyiAyarla(false);
        return;
      }

      const metin = (json.text ?? "").trim();

      // YANKI KONTROLÜ: gelen metin asistanın az önce söylediğine çok
      // benziyorsa bu kullanıcının sesi değil, hoparlörden sızan asistan
      // sesidir — yok say ve dinlemeye devam et.
      if (metin && yankiMi(metin, sonSeslendirilenRef.current)) {
        if (sesliGorusmeRef.current) dinlemeyeBasla();
        return;
      }

      if (!metin) {
        // Ses anlaşılmadı ya da halüsinasyon olarak filtrelendi.
        // Üst üste 3 kez olursa görüşmeyi durdur — aksi halde sessiz bir
        // ortamda sonsuz "dinle → boş sonuç → tekrar dinle" döngüsü olur.
        bosSonucSayisiRef.current += 1;
        if (bosSonucSayisiRef.current >= 3) {
          bosSonucSayisiRef.current = 0;
          sesliGorusmeyiAyarla(false);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content:
                "Birkaç kez ses algılayamadım, görüşmeyi durdurdum. Mikrofona biraz daha yakın " +
                "konuşmayı dene ya da soruyu yazabilirsin.",
              error: true,
            },
          ]);
          return;
        }
        if (sesliGorusmeRef.current) dinlemeyeBasla();
        return;
      }
      bosSonucSayisiRef.current = 0;
      gonder(metin);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Ses gönderilemedi: " + (e instanceof Error ? e.message : String(e)),
          error: true,
        },
      ]);
      sesliGorusmeyiAyarla(false);
    } finally {
      setCevriliyor(false);
    }
  }

  /**
   * Dinlemeyi başlatır.
   *
   * @param asistanKonusurken true ise "barge-in" modu: asistan konuşurken
   *   mikrofon açık tutulur, kullanıcı araya girdiğinde asistanın sesi
   *   kesilir. Bu modda eşik yükseltilir (2.5x) — hoparlörden sızan
   *   asistan sesi "kullanıcı konuşuyor" sanılmasın diye.
   */
  function dinlemeyeBasla(asistanKonusurken = false) {
    if (sunucuTranskripsiyon) {
      kayitBaslat(
        (ses) => {
          // BARGE-IN KAYDI ATILIR:
          // Bu kayıt, asistan konuşurken açıldığı için hoparlörden sızan
          // asistan sesini de içeriyor. Yazıya dökülürse asistan kendi
          // cümlesini "kullanıcı sordu" sanıp kendine cevap veriyor
          // (kendi kendine konuşma döngüsü). O yüzden içeriği KULLANILMAZ;
          // yalnızca "kullanıcı araya girdi" sinyali olarak iş görür.
          // Asistan sustuktan sonra TEMİZ bir kayıt başlatılır.
          if (asistanKonusurken) {
            if (sesliGorusmeRef.current) {
              setTimeout(() => {
                if (sesliGorusmeRef.current) dinlemeyeBasla(false);
              }, 250);
            }
            return;
          }

          if (!ses) {
            // Hiç konuşma algılanmadı — görüşme aktifse tekrar dinlemeye geç
            if (sesliGorusmeRef.current) {
              setTimeout(() => {
                if (sesliGorusmeRef.current) dinlemeyeBasla();
              }, 300);
            }
            return;
          }
          sesiMetneCevir(ses);
        },
        asistanKonusurken
          ? {
              // Asistan konuşurken çevre gürültüsüne karşı çok daha sıkı ol:
              // eşik 5 katı VE sesin kesintisiz 600ms sürmesi şartı. Rüzgâr,
              // araç, kapı gibi anlık sesler artık sözünü kesemiyor;
              // gerçek bir cümle ise rahatlıkla yakalanıyor.
              esikCarpani: 5,
              minSesSuresiMs: 600,
              onKonusmaBasladi: () => {
                // Asistanı sustur ve bu (kirli) kaydı sonlandır — üstteki
                // geri çağırma temiz bir kayıt başlatacak.
                ttsDurdur();
                kayitDurdur();
              },
            }
          : undefined
      );
      return;
    }
    // Yedek yol: Web Speech API (yalnızca MediaRecorder yoksa).
    // Bu yol da halüsinasyon filtresinden geçirilir — tarayıcının konuşma
    // servisi de sessizlikte uydurma metin üretebiliyor.
    sesBaslat((metin) => {
      setSesizDenemeSayisi(0);
      if (halusinasyonMu(metin)) {
        if (sesliGorusmeRef.current) dinlemeyeBasla();
        return;
      }
      gonder(metin);
    }, false);
  }

  /**
   * Asistanın cevabını seslendirir ve AYNI ANDA mikrofonu açık tutar.
   *
   * "Barge-in": kullanıcı asistan konuşurken araya girerse asistan susar
   * ve kullanıcının yeni cümlesi kaydedilir (ChatGPT sesli modundaki
   * davranış). Konuşma bitince kayıt kapatılır; kayıt akışı zaten boş
   * sonuçta normal dinlemeye geri döner.
   */
  function seslendirVeDinle(metin: string) {
    if (!sesliGorusmeRef.current || !ttsDesteklenir) return;
    sonSeslendirilenRef.current = metin;

    konus(metin, () => {
      // Seslendirme bitti: barge-in kaydını kapat. Kullanıcı bu sırada
      // konuşmadıysa kayıt boş döner ve akış normal dinlemeye geçer.
      if (sesliGorusmeRef.current) kayitDurdur();
    });

    // Seslendirmeyle eş zamanlı dinleme (yalnızca MediaRecorder yolunda;
    // Web Speech API yedeğinde tarayıcı kendi sesini dinleyeceği için
    // barge-in uygulanmaz).
    if (sunucuTranskripsiyon) dinlemeyeBasla(true);
  }

  // Web Speech API yedek yolundaki hata yönetimi (yalnızca o yol aktifse).
  useEffect(() => {
    if (sunucuTranskripsiyon) return; // MediaRecorder kullanılıyorsa geçersiz
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
              "\"Uygulamaların mikrofona erişmesine izin ver\" açık mı ve tarayıcı listede izinli mi kontrol et.",
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
    if (sesHataKodu && sesHataKodu !== "no-speech" && sesHataKodu !== "aborted") {
      sesliGorusmeyiAyarla(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesHataKodu]);

  function mikrofonTikla() {
    if (sesliGorusmeAktif) {
      // Görüşme sürüyorken tıklamak = görüşmeyi bitir
      sesliGorusmeyiAyarla(false);
      if (sunucuTranskripsiyon) kayitDurdur();
      else sesDurdur();
      ttsDurdur();
      return;
    }
    // MOBİL FIX: TTS kilidini burada, dokunma olayının İÇİNDE (senkron) aç.
    // Sonraki adımlarda getUserMedia await'i var; ondan sonrası artık
    // "kullanıcı dokunması" sayılmadığı için mobil tarayıcılar o noktadan
    // sonra çağrılan speechSynthesis.speak()'i sessizce yok sayabiliyor.
    if (ttsDesteklenir) ttsKilidiAc();

    sesliGorusmeyiAyarla(true);
    dinlemeyeBasla();
  }

  async function gonder(overrideText?: string) {
    const question = (overrideText ?? input).trim();
    if (!question || sending) return;

    // SON SAVUNMA: Halüsinasyon metni hiçbir yoldan sohbete girmesin.
    // Bir kez geçmişe girerse model onu bağlam sanıp taklit edebiliyor.
    // (Yazıyla girilen mesajlar bu kontrolden muaf — kullanıcı bilerek
    // yazmışsa engellenmemeli.)
    if (overrideText && halusinasyonMu(overrideText)) {
      if (sesliGorusmeRef.current) dinlemeyeBasla();
      return;
    }

    setInput("");

    const userMsg: DisplayMessage = { id: crypto.randomUUID(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);

    // ---- YEREL NİYET ÇÖZÜMLEMESİ (LLM'den ÖNCE) ----
    // Rasa'nın prensibi: net komutları dil modeline hiç gönderme.
    // "görevler ekranını aç" gibi bir istek için API çağrısına gerek yok —
    // anında, ücretsiz ve API kotası tükenmiş olsa bile çalışır.
    const yerel = yerelNiyetCoz(question, !!firmId);
    if (yerel) {
      // Global sayfa (firma bağlamı gerektirmez) — doğrudan git
      if (yerel.url) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: yerel.cevap },
        ]);
        router.push(yerel.url);
        if (sesliGorusmeRef.current && ttsDesteklenir) {
          seslendirVeDinle(yerel.cevap);
        }
        return;
      }

      // "ABC firmasını aç" — firma ID'si gerekiyor. Bunu da yerel çözebiliriz:
      // Supabase'den doğrudan arayarak (LLM'e gitmeye gerek yok).
      if (yerel.action?.type === "open_firm" && !yerel.action.firm_id) {
        const { data: eslesenler } = await supabase
          .from("firms")
          .select("id, name")
          .ilike("name", `%${yerel.action.firm_name}%`)
          .limit(6);

        if (eslesenler && eslesenler.length === 1) {
          yerel.action = { ...yerel.action, firm_id: eslesenler[0].id, firm_name: eslesenler[0].name };
        } else if (eslesenler && eslesenler.length > 1) {
          const liste = eslesenler.map((f) => `• ${f.name}`).join("\n");
          const mesaj = `Birden fazla firma eşleşti, hangisini kastettin?\n${liste}`;
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: mesaj },
          ]);
          if (sesliGorusmeRef.current && ttsDesteklenir) {
            seslendirVeDinle("Birden fazla firma eşleşti, hangisini kastettiğini belirtir misin?");
          }
          return;
        } else {
          const mesaj = `"${yerel.action.firm_name}" isminde bir firma bulunamadı.`;
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: mesaj, error: true },
          ]);
          if (sesliGorusmeRef.current && ttsDesteklenir) {
            seslendirVeDinle(mesaj);
          }
          return;
        }
      }

      const url = yerel.action ? actionToUrl(yerel.action, firmId) : null;
      if (url) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: yerel.cevap },
        ]);
        router.push(url);
        if (sesliGorusmeRef.current && ttsDesteklenir) {
          seslendirVeDinle(yerel.cevap);
        }
        return;
      }
    }

    setSending(true);

    // Geçmiş — sadece rol/içerik (API'ye giden format).
    // messagesRef kullanılıyor: state doğrudan okunursa sesli akıştaki
    // callback zinciri yüzünden bayat liste gider (bkz. messagesRef notu).
    const history: ChatMessage[] = [...messagesRef.current, userMsg].map((m) => ({
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
          seslendirVeDinle("Bir hata oluştu, lütfen tekrar dener misin.");
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
          seslendirVeDinle(json.answer as string);
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
        seslendirVeDinle("Bağlantı hatası oluştu.");
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
              🔊 Konuşuyor
              <span className="text-[11px] text-indigo-500">— araya girebilirsin</span>
              <button onClick={ttsDurdur} className="ml-1 text-xs underline text-indigo-500">
                Durdur
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Giriş alanı */}
      <div className="border-t p-3">
        {(dinliyor || kaydediyor) && (
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-red-500">🔴 Dinliyorum...</p>
            {kaydediyor && (
              // Canlı ses seviyesi göstergesi — mikrofonun gerçekten ses
              // aldığını görsel olarak doğrular
              <div className="flex-1 h-1.5 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-75"
                  style={{ width: `${Math.round(sesSeviyesi * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}
        {cevriliyor && <p className="text-xs text-indigo-500 mb-1">✍️ Konuşman yazıya çevriliyor...</p>}
        {sesliGorusmeAktif && !dinliyor && !kaydediyor && !konusuyor && !cevriliyor && (
          <p className="text-xs text-indigo-500 mb-1">⏳ Bir sonraki cümlen için hazırlanıyor...</p>
        )}
        {!sesliGorusmeAktif && herhangiSesDestegi && !sending && (
          <p className="text-xs text-gray-400 mb-1">
            🎤 Mikrofona bas — konuş, sustuğunda otomatik gönderilir. Cevap sesli gelir;
            araya girip sözünü kesebilirsin.
          </p>
        )}
        {!herhangiSesDestegi && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-1">
            ⚠️ Bu tarayıcı ses kaydını desteklemiyor (MediaRecorder yok). Chrome, Edge veya Firefox
            deneyebilirsin — ya da soruyu yazarak sorabilirsin.
          </p>
        )}
        {tarayiciUyarisi && !sunucuTranskripsiyon && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-1">
            ⚠️ {tarayiciUyarisi}
          </p>
        )}
        {kayitHatasi && <p className="text-xs text-amber-600 mb-1">{kayitHatasi}</p>}
        {!sunucuTranskripsiyon && sesHatasi && (
          <p className="text-xs text-amber-600 mb-1">{sesHatasi}</p>
        )}

        {/* Ses teşhis paneli — yalnızca Web Speech API yedek yolu kullanılıyorsa
            anlamlı (MediaRecorder yolunda olay günlüğü üretilmiyor) */}
        {!sunucuTranskripsiyon && sesDesteklenir && (
          <div className="mb-1">
            <button
              onClick={() => setTeshisAcik((v) => !v)}
              className="text-[10px] text-gray-400 hover:text-gray-600 underline"
            >
              {teshisAcik ? "Ses teşhisini gizle" : "🔧 Ses teşhisi"}
            </button>
            {teshisAcik && (
              <div className="mt-1 p-2 bg-gray-900 text-green-300 rounded text-[10px] font-mono max-h-40 overflow-y-auto">
                <div className="flex justify-between items-center mb-1 text-gray-400">
                  <span>Olay günlüğü ({gunluk.length})</span>
                  <button onClick={gunluguTemizle} className="underline hover:text-white">
                    temizle
                  </button>
                </div>
                {gunluk.length === 0 ? (
                  <div className="text-gray-500">Henüz olay yok — mikrofona bas.</div>
                ) : (
                  gunluk.map((satir, i) => <div key={i}>{satir}</div>)
                )}
              </div>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 border rounded-lg p-2 text-sm resize-none"
            rows={2}
            placeholder="Soru yaz... (Enter ile gönder)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {herhangiSesDestegi && (
            <button
              type="button"
              onClick={mikrofonTikla}
              title={sesliGorusmeAktif ? "Görüşmeyi bitir" : "Sesli görüşme başlat"}
              className={
                "w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition " +
                (dinliyor || kaydediyor
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
