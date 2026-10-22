// src/lib/voice/sayfaKontrol.ts
//
// SESLİ ASİSTAN İÇİN SAYFA KONTROLÜ — fareyle yapılabilen işlerin bir kısmını
// sesle yapmak: sayfayı kaydırmak, görünen bir sekme / buton / bölüm başlığını
// METNİNE göre bulup tıklamak, sayfadaki tıklanabilir öğeleri listelemek.
//
// Yalnızca TARAYICIDA çalışır (Gemini Live araç çağrısı → useRealtimeVoice).
// Sunucu kodu yok; yazılı asistanın araç listesine EKLENMEZ.
//
// GÜVENLİK:
//   • Silme / kaldırma butonları ASLA tıklanmaz (asistan veri silemez kuralı).
//   • Kaydet / gönder / onayla / çıkış gibi geri alınması zor işlemler için
//     kullanıcıdan sözlü onay istenir (araç `confirm: true` ile tekrar çağrılır).
//   • Asistanın kendi arayüzü ([data-asistan-ui]) hiçbir zaman hedeflenmez.
//   • Yazı yazma / form doldurma YOK — yalnızca tıklama ve kaydırma.

const ASISTAN_UI = "[data-asistan-ui]";

const TIKLANABILIR =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="link"], [role="option"], ' +
  'summary, [aria-expanded], label, input[type="checkbox"], input[type="radio"], [onclick], [tabindex]:not([tabindex="-1"])';
const BASLIK = "h1, h2, h3, h4, legend, th";

/** ASLA tıklanmaz: veri silen / kaldıran eylemler. */
const YASAK = /\b(sil|silin|siliniz|kald[ıi]r|delete|remove|s[ıi]f[ıi]rla)\b/i;
/** Sözlü onay ister: geri alınması zor ya da veri değiştiren eylemler. */
const ONAYLI = /\b(kaydet|g[öo]nder|onayla|reddet|ar[şs]ivle|pasif|yay[ıi]nla|[öo]de|sat[ıi]n|[çc][ıi]k[ıi][şs]|oturumu kapat|iptal et|tamamla|g[üu]ncelle|y[üu]kle|imzala)\b/i;

/** Komut cümlesindeki dolgu kelimeleri ("... bölümünü aç") eşleşmeden önce atılır. */
const DOLGU = new Set([
  "bolum", "bolumu", "bolumunu", "bolume", "kisim", "kismi", "kismini", "kismina", "sekme", "sekmesi", "sekmesini",
  "sekmesine", "buton", "butonu", "butonuna", "dugme", "dugmesi", "dugmesine", "menu", "menusu", "menusunu",
  "alan", "alani", "alanini", "kart", "karti", "kartini", "ac", "tikla", "bas", "goster", "sayfa", "sayfasi",
  "sayfasini", "ekran", "ekrani", "ekranini", "lutfen", "su", "bu", "the", "tab", "button", "basligi", "baslik",
]);

export type OgeTuru = "sekme" | "buton" | "baglanti" | "acilir" | "secim" | "baslik" | "diger";

type Aday = { el: HTMLElement; etiket: string; tur: OgeTuru; gorunur: boolean };

// ------------------------------------------------------------------ yardımcılar

export function normalize(metin: string): string {
  return metin
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/i̇/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function kelimeler(metin: string, dolguAt: boolean): string[] {
  const k = normalize(metin).split(" ").filter(Boolean);
  if (!dolguAt) return k;
  const s = k.filter((w) => !DOLGU.has(w));
  return s.length ? s : k;
}

/** İki kelime aynı kökten mi? ("ziyaretleri" ~ "ziyaretler", "belgeler" ~ "belge") */
function kokEsit(a: string, b: string): boolean {
  if (a === b) return true;
  const [kisa, uzun] = a.length <= b.length ? [a, b] : [b, a];
  return kisa.length >= 4 && uzun.startsWith(kisa) && uzun.length - kisa.length <= 4;
}

/** Sorgu ile öğe etiketinin benzerliği (0..100). */
export function benzerlik(sorgu: string, etiket: string): number {
  const q = kelimeler(sorgu, true);
  const e = kelimeler(etiket, false);
  if (!q.length || !e.length) return 0;
  const qs = q.join(" ");
  const es = e.join(" ");
  if (qs === es) return 100;
  let eslesen = 0;
  for (const w of q) if (e.some((x) => kokEsit(w, x))) eslesen++;
  const kapsama = eslesen / q.length; // sorgunun ne kadarı etikette var
  const fazlalik = Math.max(0, e.length - eslesen) / e.length; // etikette fazladan ne var
  if (kapsama === 1 && fazlalik === 0) return 95; // yalnızca ek farkı (ziyaretleri/ziyaretler)
  if (kapsama === 1) return 80 - Math.round(fazlalik * 25);
  if (es.includes(qs) || qs.includes(es)) return 60;
  return Math.round(kapsama * 55 - fazlalik * 10);
}

function etiketAl(el: HTMLElement): string {
  const aria = el.getAttribute("aria-label");
  const metin = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  const ham = (metin || aria || el.getAttribute("title") || (el as HTMLInputElement).value || "").trim();
  // Emoji / simge temizliği (okunacak etiket)
  return ham.replace(/[\p{Extended_Pictographic}️]/gu, "").replace(/\s+/g, " ").trim().slice(0, 90);
}

function turAl(el: HTMLElement): OgeTuru {
  const role = el.getAttribute("role");
  const tag = el.tagName;
  if (role === "tab") return "sekme";
  if (tag === "SUMMARY" || el.hasAttribute("aria-expanded")) return "acilir";
  if (tag === "A" || role === "link") return "baglanti";
  if (tag === "INPUT" || tag === "LABEL" || role === "option") return "secim";
  if (/^H[1-4]$|^LEGEND$|^TH$/.test(tag)) return "baslik";
  if (tag === "BUTTON" || role === "button") return "buton";
  return "diger";
}

function gorunurMu(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const st = window.getComputedStyle(el);
  if (st.visibility === "hidden" || st.display === "none" || Number(st.opacity) === 0) return false;
  // Gizli üst öğe (display:none) — offsetParent null olur (fixed hariç)
  if (el.offsetParent === null && st.position !== "fixed") return false;
  return true;
}

function ekrandaMi(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
}

function devreDisiMi(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled === true || el.getAttribute("aria-disabled") === "true";
}

/** Sayfadaki (asistan arayüzü hariç) görünür tıklanabilir öğeler + başlıklar. */
function adaylariTopla(basliklarDahil: boolean): Aday[] {
  const secici = basliklarDahil ? `${TIKLANABILIR}, ${BASLIK}` : TIKLANABILIR;
  const goruldu = new Set<HTMLElement>();
  const sonuc: Aday[] = [];
  document.querySelectorAll<HTMLElement>(secici).forEach((el) => {
    if (goruldu.has(el) || el.closest(ASISTAN_UI)) return;
    goruldu.add(el);
    if (!gorunurMu(el) || devreDisiMi(el)) return;
    const etiket = etiketAl(el);
    if (!etiket) return;
    sonuc.push({ el, etiket, tur: turAl(el), gorunur: ekrandaMi(el) });
  });
  // İç içe tıklanabilirlerde (button içinde span[tabindex]) dıştakini tut.
  return sonuc.filter((a) => !sonuc.some((b) => b !== a && b.el.contains(a.el) && b.etiket === a.etiket && b.tur !== "baslik"));
}

/** Başlık / düz metin eşleşmesinde tıklanabilir en yakın üst öğe (React onClick'li div dahil). */
function tiklanabilirUst(el: HTMLElement): HTMLElement | null {
  let n: HTMLElement | null = el;
  for (let i = 0; n && i < 5; i++, n = n.parentElement) {
    if (n.closest(ASISTAN_UI)) return null;
    if (n.matches(TIKLANABILIR)) return n;
    if (window.getComputedStyle(n).cursor === "pointer") return n;
  }
  return null;
}

/** Kısa görsel geri bildirim: hedefin etrafında mor çerçeve yanıp söner. */
function vurgula(el: HTMLElement) {
  const eski = { outline: el.style.outline, offset: el.style.outlineOffset, transition: el.style.transition };
  el.style.transition = "outline-color .2s";
  el.style.outline = "3px solid rgba(147,51,234,.85)";
  el.style.outlineOffset = "2px";
  setTimeout(() => {
    el.style.outline = eski.outline;
    el.style.outlineOffset = eski.offset;
    el.style.transition = eski.transition;
  }, 1400);
}

// ------------------------------------------------------------------ kaydırma

function kaydirilabilirBul(): { el: HTMLElement | null; pencere: boolean } {
  const kok = document.scrollingElement as HTMLElement | null;
  if (kok && kok.scrollHeight > window.innerHeight + 10) return { el: kok, pencere: true };
  // Sayfa kaymıyorsa: görünür en büyük kaydırılabilir iç alan (tablo, liste paneli vb.)
  let enIyi: HTMLElement | null = null;
  let enIyiAlan = 0;
  document.querySelectorAll<HTMLElement>("main *, [role=main] *, body > div *").forEach((el) => {
    if (el.scrollHeight <= el.clientHeight + 20 || el.closest(ASISTAN_UI)) return;
    const oy = window.getComputedStyle(el).overflowY;
    if (oy !== "auto" && oy !== "scroll") return;
    const r = el.getBoundingClientRect();
    const alan = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)) * r.width;
    if (alan > enIyiAlan) {
      enIyiAlan = alan;
      enIyi = el;
    }
  });
  return { el: enIyi, pencere: false };
}

export type KaydirYon = "down" | "up" | "top" | "bottom";
export type KaydirMiktar = "small" | "medium" | "large";

export function sayfayiKaydir(args: { direction?: unknown; amount?: unknown; to_text?: unknown }): Record<string, unknown> {
  if (typeof document === "undefined") return { error: "Sayfa erişilemiyor." };

  // Belirli bir bölüme kaydır ("ziyaretler kısmına in")
  if (typeof args.to_text === "string" && args.to_text.trim()) {
    const bulunan = enIyiEslesme(args.to_text, true);
    if ("error" in bulunan) return bulunan;
    bulunan.el.scrollIntoView({ behavior: "smooth", block: "start" });
    vurgula(bulunan.el);
    return { ok: true, scrolled_to: bulunan.etiket };
  }

  const yon = (["down", "up", "top", "bottom"] as const).includes(args.direction as KaydirYon) ? (args.direction as KaydirYon) : "down";
  const oran = ({ small: 0.35, medium: 0.7, large: 1 } as const)[(args.amount as KaydirMiktar) ?? "medium"] ?? 0.7;
  const { el, pencere } = kaydirilabilirBul();
  if (!el) return { ok: false, error: "Bu sayfada kaydırılacak içerik yok; sayfanın tamamı zaten ekranda." };

  const yukseklik = pencere ? window.innerHeight : el.clientHeight;
  const maks = el.scrollHeight - (pencere ? window.innerHeight : el.clientHeight);
  const once = pencere ? window.scrollY : el.scrollTop;
  let hedef = once;
  if (yon === "down") hedef = once + yukseklik * oran;
  else if (yon === "up") hedef = once - yukseklik * oran;
  else if (yon === "top") hedef = 0;
  else hedef = maks;
  hedef = Math.max(0, Math.min(maks, hedef));

  if (Math.abs(hedef - once) < 2) {
    return { ok: false, already_at: yon === "up" || yon === "top" ? "sayfanın en üstünde" : "sayfanın en altında" };
  }
  if (pencere) window.scrollTo({ top: hedef, behavior: "smooth" });
  else el.scrollTo({ top: hedef, behavior: "smooth" });
  const yuzde = maks > 0 ? Math.round((hedef / maks) * 100) : 100;
  return { ok: true, direction: yon, position_percent: yuzde, at_bottom: hedef >= maks - 2, at_top: hedef <= 2 };
}

// ------------------------------------------------------------------ eşleştirme + tıklama

type Eslesme = { el: HTMLElement; etiket: string; tur: OgeTuru };

function enIyiEslesme(sorgu: string, basliklarDahil: boolean): Eslesme | { error: string; candidates?: string[]; visible_elements?: string[] } {
  const adaylar = adaylariTopla(basliklarDahil);
  const puanli = adaylar
    .map((a) => {
      let p = benzerlik(sorgu, a.etiket);
      if (p > 0) {
        if (a.tur === "sekme" || a.tur === "acilir") p += 4;
        if (a.gorunur) p += 3;
        if (a.etiket.length > 40) p -= 8; // uzun paragraf benzeri öğeler değil, kısa etiketler tercih
      }
      return { ...a, p };
    })
    .filter((a) => a.p >= 45)
    .sort((x, y) => y.p - x.p);

  if (!puanli.length) {
    return {
      error: `"${sorgu}" ile eşleşen görünür bir öğe bulunamadı.`,
      visible_elements: listeyiOzetle(adaylar, 30),
    };
  }
  const [ilk, ikinci] = puanli;
  // Belirsizlik: farklı etiketli iki aday neredeyse eşit puanlı
  if (ikinci && ikinci.p >= ilk.p - 3 && normalize(ikinci.etiket) !== normalize(ilk.etiket)) {
    return {
      error: "Birden fazla öğe eşleşti; kullanıcıya hangisini kastettiğini sor.",
      candidates: [...new Set(puanli.slice(0, 5).map((a) => a.etiket))],
    };
  }
  let el = ilk.el;
  if (ilk.tur === "baslik" && !basliklarDahil) {
    el = tiklanabilirUst(ilk.el) ?? ilk.el;
  }
  return { el, etiket: ilk.etiket, tur: ilk.tur };
}

function listeyiOzetle(adaylar: Aday[], maks: number): string[] {
  const s = new Set<string>();
  // Önce ekranda görünenler, sonra diğerleri
  for (const a of [...adaylar.filter((x) => x.gorunur), ...adaylar.filter((x) => !x.gorunur)]) {
    if (a.etiket.length <= 50) s.add(a.etiket);
    if (s.size >= maks) break;
  }
  return [...s];
}

/** Tıklanan öğe uygulama içi bir bağlantıysa hedef yolu döndürür (aksi hâlde null). */
function uygulamaIciHedef(el: HTMLElement): string | null {
  const a = el.closest("a[href]") as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
  try {
    const u = new URL(a.href, window.location.href);
    if (u.origin !== window.location.origin) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}

/**
 * @param gezin Uygulama içi bağlantılar için istemci tarafı yönlendirme
 *   (router.push). Verilirse bağlantılar el.click() yerine bununla açılır —
 *   düz <a> etiketleri tam sayfa yenilemesi yapıp Canlı Konuşma'yı
 *   (WebSocket, mikrofon, ses) koparmasın.
 */
export async function ogeyeTikla(
  args: { label?: unknown; confirm?: unknown },
  gezin?: (yol: string) => void
): Promise<Record<string, unknown>> {
  if (typeof document === "undefined") return { error: "Sayfa erişilemiyor." };
  const sorgu = typeof args.label === "string" ? args.label.trim() : "";
  if (!sorgu) return { error: "label (tıklanacak öğenin ekrandaki yazısı) eksik." };

  let bulunan = enIyiEslesme(sorgu, false);
  // Buton/sekme bulunamazsa: aynı metinli başlığın tıklanabilir üstünü dene (açılır bölüm başlıkları)
  if ("error" in bulunan && !("candidates" in bulunan && bulunan.candidates)) {
    const b = enIyiEslesme(sorgu, true);
    if (!("error" in b)) {
      const ust = tiklanabilirUst(b.el);
      if (ust) bulunan = { el: ust, etiket: b.etiket, tur: turAl(ust) };
    }
  }
  if ("error" in bulunan) return bulunan;

  const { el, etiket, tur } = bulunan;
  if (YASAK.test(normalize(etiket)) || YASAK.test(etiket)) {
    return { error: "Silme / kaldırma işlemleri sesli asistanla yapılamaz; kullanıcı bunu kendisi yapmalı.", label: etiket };
  }
  if ((ONAYLI.test(normalize(etiket)) || ONAYLI.test(etiket)) && args.confirm !== true) {
    return {
      needs_confirmation: true,
      label: etiket,
      note: `"${etiket}" veri değiştirebilecek bir işlem. Kullanıcıya açıkça onaylayıp onaylamadığını sor; "evet" derse aynı aracı confirm: true ile tekrar çağır.`,
    };
  }

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  vurgula(el);
  const oncekiYol = window.location.pathname + window.location.search;
  const hedefYol = gezin ? uygulamaIciHedef(el) : null;
  if (hedefYol && gezin) {
    gezin(hedefYol);
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, clicked: etiket, type: "baglanti", navigated_to: hedefYol.split("?")[0] };
  }
  el.click();
  // DOM güncellensin (sekme / açılır bölüm)
  await new Promise((r) => setTimeout(r, 200));
  const sonuc: Record<string, unknown> = { ok: true, clicked: etiket, type: tur };
  const genis = el.getAttribute("aria-expanded");
  if (genis !== null) sonuc.expanded = genis === "true";
  if (el.tagName === "SUMMARY") sonuc.expanded = (el.parentElement as HTMLDetailsElement | null)?.open ?? undefined;
  if (window.location.pathname + window.location.search !== oncekiYol) sonuc.navigated_to = window.location.pathname;
  return sonuc;
}

export function sayfaOgeleriniListele(args: { filter?: unknown }): Record<string, unknown> {
  if (typeof document === "undefined") return { error: "Sayfa erişilemiyor." };
  const adaylar = adaylariTopla(true);
  const filtre = typeof args.filter === "string" && args.filter.trim() ? args.filter : null;
  const secili = filtre ? adaylar.filter((a) => benzerlik(filtre, a.etiket) >= 40) : adaylar;
  const kaydir = kaydirilabilirBul();
  const grup = (tur: OgeTuru[]) => listeyiOzetle(secili.filter((a) => tur.includes(a.tur)), 25);
  return {
    page: document.title || window.location.pathname,
    path: window.location.pathname,
    tabs: grup(["sekme"]),
    expandable: grup(["acilir"]),
    buttons: grup(["buton", "diger", "secim"]),
    links: grup(["baglanti"]),
    headings: grup(["baslik"]),
    can_scroll: !!kaydir.el,
  };
}

/** Bu araçların adları (useRealtimeVoice tarayıcıda yürütür). */
export const SAYFA_ARAC_ADLARI = ["scroll_page", "click_on_page", "list_page_elements", "set_chat_window"] as const;

/** Gemini Live araç tanımları — YALNIZCA sesli asistana eklenir. */
export const SAYFA_ARAC_TANIMLARI = [
  {
    name: "set_chat_window",
    description:
      "Asistanın SOHBET PENCERESİNİ (yan paneli) gizler veya gösterir. Konuşma BİTMEZ — sesli sohbet arka planda (yarı saydam küre ile) devam eder. " +
      "'Pencereyi gizle / kapat / küçült', 'paneli kapat', 'ekrandan çekil', 'sayfayı göreyim' → visible: false. " +
      "'Pencereyi aç / göster', 'sohbeti göster', 'yazıları göster' → visible: true. " +
      "Kullanıcı açıkça SOHBETİ / KONUŞMAYI bitirmek istemedikçe end_conversation DEĞİL bu araç kullanılır.",
    parameters: {
      type: "object",
      properties: {
        visible: { type: "boolean", description: "true = pencereyi göster, false = gizle" },
      },
      required: ["visible"],
    },
  },
  {
    name: "scroll_page",
    description:
      "Kullanıcının baktığı sayfayı kaydırır ('aşağı kaydır', 'biraz yukarı çık', 'en alta in', 'en başa dön'). " +
      "Belirli bir bölüme inmek için ('ziyaretler kısmına in') to_text ver. Sonuçta at_bottom/at_top dönerse kullanıcıya sayfanın sonuna/başına gelindiğini söyle.",
    parameters: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["down", "up", "top", "bottom"], description: "Yön: down=aşağı, up=yukarı, top=en üst, bottom=en alt" },
        amount: { type: "string", enum: ["small", "medium", "large"], description: "Miktar: small='biraz', medium=normal (varsayılan), large='çok / bir sayfa'" },
        to_text: { type: "string", description: "Opsiyonel: bu yazının geçtiği bölüm / başlığa kaydır" },
      },
    },
  },
  {
    name: "click_on_page",
    description:
      "Kullanıcının baktığı sayfada, ekranda YAZISI görünen bir sekmeyi, butonu, bağlantıyı veya açılır bölüm başlığını tıklar " +
      "('ziyaretler bölümünü aç', 'araçlar sekmesine tıkla', 'detay butonuna bas'). label olarak ekrandaki yazıyı ver (ör. 'Ziyaretler'). " +
      "Bulunamazsa sonuçtaki visible_elements listesinden en uygun yazıyla TEKRAR dene ya da kullanıcıya sor; candidates dönerse kullanıcıya hangisi olduğunu sor. " +
      "needs_confirmation dönerse kullanıcıdan açık onay al, sonra confirm: true ile tekrar çağır. Silme butonlarını ASLA tıklayamazsın.",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string", description: "Tıklanacak öğenin ekranda görünen yazısı" },
        confirm: { type: "boolean", description: "Yalnızca kullanıcı onay verdikten sonra true" },
      },
      required: ["label"],
    },
  },
  {
    name: "list_page_elements",
    description:
      "Kullanıcının baktığı sayfadaki görünür sekmeleri, butonları, bağlantıları ve başlıkları listeler. " +
      "'Bu sayfada neler var', 'hangi sekmeler var' sorularında veya click_on_page hangi yazıyı arayacağını bilmediğinde kullan.",
    parameters: {
      type: "object",
      properties: {
        filter: { type: "string", description: "Opsiyonel: yalnızca bu yazıya benzeyen öğeler" },
      },
    },
  },
];
