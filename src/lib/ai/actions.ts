// src/lib/ai/actions.ts
// ADR Asistanı'nın tetikleyebileceği eylemlerin BEYAZ LİSTESİ.
// Silme (delete) işlemi kasıtlı olarak bu listede YOK ve asla eklenmeyecek.
//
// Asistan, kullanıcının isteği bu eylemlerden birine net şekilde
// uyuyorsa, cevabının içine şu formatta bir blok ekler:
//
//   ```eylem
//   {"type":"open_belge_olustur"}
//   ```
//
// Widget bu bloğu ayrıştırıp navigasyonu tetikler, bloğu ekrandan gizler.

// Firma detay sayfasındaki TABS dizisiyle (src/app/firms/[id]/page.tsx)
// BİREBİR aynı tutulmalı. Buradaki liste bilinçli olarak elle senkron —
// yeni bir sekme eklenirse burada da eklenmesi gerekir (beyaz liste
// felsefesi: asistan asla "her sekmeye" değil sadece burada TANIMLI
// sekmelere gidebilir).
export const VALID_FIRM_TABS = [
  "belge_takip", "tasks", "documents", "belge_olustur",
  "vehicles", "drivers", "employees", "visits",
  "adr_transport", "genel", "denetim", "notlar",
] as const;
export type FirmTabKey = (typeof VALID_FIRM_TABS)[number];

export type AssistantAction =
  | { type: "open_belge_olustur" }
  | { type: "open_karisik_yukleme"; un_numbers: string[] }
  | { type: "open_firm_tab"; tab: FirmTabKey; un_numbers?: string[]; quantity?: number }
  | { type: "open_firm"; firm_id?: string; firm_name: string; tab?: FirmTabKey; un_numbers?: string[]; quantity?: number }
  | { type: "prefill_task"; title: string };

// Kapanışlı blok: ```eylem {...} ```
const ACTION_BLOCK_RE = /```eylem\s*([\s\S]*?)```/i;
// Kapanışsız blok: model kapanış işaretini yazmayı unutabiliyor ya da
// çıktı token sınırında kesilebiliyor. Bu durumda blok ham haliyle
// kullanıcıya görünüyordu — o yüzden bunu da yakalıyoruz.
const ACTION_BLOCK_ACIK_RE = /```eylem\s*([\s\S]*)$/i;

export function extractAction(text: string): { cleanText: string; action: AssistantAction | null } {
  let match = text.match(ACTION_BLOCK_RE);
  let kullanilanRegex = ACTION_BLOCK_RE;

  // Kapanışlı blok bulunamadıysa kapanışsız olanı dene
  if (!match) {
    match = text.match(ACTION_BLOCK_ACIK_RE);
    kullanilanRegex = ACTION_BLOCK_ACIK_RE;
  }

  if (!match) return { cleanText: text, action: null };

  const cleanText = text.replace(kullanilanRegex, "").trim();

  // JSON gövdesini ayıkla — kapanışsız blokta sonda artık karakterler
  // kalmış olabilir, ilk { ... } çiftini alıyoruz.
  let govde = match[1].trim();
  const ilkSusluAcilis = govde.indexOf("{");
  const sonSusluKapanis = govde.lastIndexOf("}");
  if (ilkSusluAcilis !== -1 && sonSusluKapanis > ilkSusluAcilis) {
    govde = govde.slice(ilkSusluAcilis, sonSusluKapanis + 1);
  }

  try {
    const parsed = JSON.parse(govde);

    if (parsed?.type === "open_belge_olustur") {
      return { cleanText, action: { type: "open_belge_olustur" } };
    }

    if (
      parsed?.type === "open_karisik_yukleme" &&
      Array.isArray(parsed.un_numbers) &&
      parsed.un_numbers.every((u: unknown) => typeof u === "string")
    ) {
      return {
        cleanText,
        action: { type: "open_karisik_yukleme", un_numbers: parsed.un_numbers.slice(0, 10) },
      };
    }

    if (
      parsed?.type === "open_firm_tab" &&
      typeof parsed.tab === "string" &&
      (VALID_FIRM_TABS as readonly string[]).includes(parsed.tab)
    ) {
      const unNumbers =
        Array.isArray(parsed.un_numbers) && parsed.un_numbers.every((u: unknown) => typeof u === "string")
          ? (parsed.un_numbers as string[]).slice(0, 10)
          : undefined;
      return {
        cleanText,
        action: { type: "open_firm_tab", tab: parsed.tab as FirmTabKey, un_numbers: unNumbers },
      };
    }

    if (parsed?.type === "prefill_task" && typeof parsed.title === "string" && parsed.title.trim()) {
      return {
        cleanText,
        action: { type: "prefill_task", title: parsed.title.trim().slice(0, 200) },
      };
    }

    if (parsed?.type === "open_firm" && typeof parsed.firm_name === "string" && parsed.firm_name.trim()) {
      const tab =
        typeof parsed.tab === "string" && (VALID_FIRM_TABS as readonly string[]).includes(parsed.tab)
          ? (parsed.tab as FirmTabKey)
          : undefined;
      const unNumbers =
        Array.isArray(parsed.un_numbers) && parsed.un_numbers.every((u: unknown) => typeof u === "string")
          ? (parsed.un_numbers as string[]).slice(0, 10)
          : undefined;
      // Not: firm_id burada YOK — model firma ID'sini bilmiyor/bilemez.
      // Sunucu tarafı (route.ts) gerçek veritabanı aramasıyla dolduracak.
      return {
        cleanText,
        action: { type: "open_firm", firm_name: parsed.firm_name.trim(), tab, un_numbers: unNumbers },
      };
    }
  } catch {
    // Geçersiz JSON — eylem yok say, sadece metni temizle
  }

  return { cleanText, action: null };
}

/**
 * Verilen eylem + mevcut firma bağlamına göre gidilecek URL'i üretir.
 * `open_firm_tab` firma bağlamı GEREKTİRİR — firmId yoksa null döner,
 * çağıran taraf (widget) bunu "önce bir firma sayfasına git" mesajıyla
 * karşılamalı.
 */
export function actionToUrl(action: AssistantAction, firmId: string | null): string | null {
  switch (action.type) {
    case "open_belge_olustur":
      return firmId ? `/firms/${firmId}?tab=belge_olustur` : "/belge-olustur";
    case "open_karisik_yukleme": {
      const uns = action.un_numbers.join(",");
      return `/adr?tab=karisik${uns ? `&uns=${encodeURIComponent(uns)}` : ""}`;
    }
    case "open_firm_tab": {
      if (!firmId) return null;
      const params = new URLSearchParams({ tab: action.tab });
      if (action.un_numbers && action.un_numbers.length > 0) {
        params.set("evrak_un", action.un_numbers.join(","));
      }
      if (action.quantity) params.set("evrak_miktar", String(action.quantity));
      return `/firms/${firmId}?${params.toString()}`;
    }
    case "prefill_task": {
      // Görev EKLEMİYORUZ, sadece formu hazırlıyoruz: başlık dolu gelir,
      // firma seçimi ve "Ekle" onayı kullanıcıda kalır. Veri yazma
      // işlemini asistanın tek başına yapmaması bilinçli bir tercih.
      const params = new URLSearchParams({ baslik: action.title });
      if (firmId) params.set("firma", firmId);
      return `/tasks?${params.toString()}`;
    }
    case "open_firm": {
      // Sunucu tarafı firm_id'yi zaten gerçek DB aramasıyla doldurmuş
      // olmalı (bkz. route.ts). Doldurulmamışsa (beklenmedik durum)
      // güvenli tarafta kal, navigasyon yapma.
      if (!action.firm_id) return null;
      const params = new URLSearchParams();
      if (action.tab) params.set("tab", action.tab);
      if (action.un_numbers && action.un_numbers.length > 0) {
        params.set("evrak_un", action.un_numbers.join(","));
      }
      if (action.quantity) params.set("evrak_miktar", String(action.quantity));
      const qs = params.toString();
      return `/firms/${action.firm_id}${qs ? `?${qs}` : ""}`;
    }
    default:
      return "/dashboard";
  }
}
