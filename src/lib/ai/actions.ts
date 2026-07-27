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

export type AssistantAction =
  | { type: "open_belge_olustur" }
  | { type: "open_karisik_yukleme"; un_numbers: string[] };

const ACTION_BLOCK_RE = /```eylem\s*([\s\S]*?)```/i;

export function extractAction(text: string): { cleanText: string; action: AssistantAction | null } {
  const match = text.match(ACTION_BLOCK_RE);
  if (!match) return { cleanText: text, action: null };

  const cleanText = text.replace(ACTION_BLOCK_RE, "").trim();

  try {
    const parsed = JSON.parse(match[1].trim());
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
  } catch {
    // Geçersiz JSON — eylem yok say, sadece metni temizle
  }

  return { cleanText, action: null };
}

/** Verilen eylem + mevcut firma bağlamına göre gidilecek URL'i üretir. */
export function actionToUrl(action: AssistantAction, firmId: string | null): string {
  switch (action.type) {
    case "open_belge_olustur":
      return firmId ? `/firms/${firmId}?tab=belge_olustur` : "/belge-olustur";
    case "open_karisik_yukleme": {
      const uns = action.un_numbers.join(",");
      return `/adr?tab=karisik${uns ? `&uns=${encodeURIComponent(uns)}` : ""}`;
    }
    default:
      return "/dashboard";
  }
}

export function actionLabel(action: AssistantAction): string {
  switch (action.type) {
    case "open_belge_olustur":
      return "📄 Belge Oluştur sayfası açılıyor...";
    case "open_karisik_yukleme":
      return `⚠️ Karışık Yükleme kontrolü açılıyor (UN ${action.un_numbers.join(", ")})...`;
    default:
      return "İşlem yapılıyor...";
  }
}
