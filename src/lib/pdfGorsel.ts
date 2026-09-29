// PDF'e gömülecek firma logolarını makul çözünürlüğe indirir.
//
// Logo belgede en fazla ~3-4 cm basılıyor; kullanıcıların yüklediği logolar
// ise binlerce piksel (1-2 MB) olabiliyor. jsPDF resmi olduğu gibi gömdüğü
// için her PDF gereksiz büyüyordu. Uzun kenar LOGO_MAKS_PIKSEL'e indirilir:
// 4 cm genişlikte bile ~500 dpi eder — baskıda fark görünmez.
//
// PNG → PNG (şeffaflık korunur), JPEG → yüksek kaliteli JPEG (0.92).
// Zaten küçük olan logolara dokunulmaz.

export const LOGO_MAKS_PIKSEL = 800;

export async function logoyuKucult(
  dataUrl: string,
  fmt: "PNG" | "JPEG",
  maksPiksel = LOGO_MAKS_PIKSEL
): Promise<{ data: string; fmt: "PNG" | "JPEG" }> {
  if (typeof document === "undefined") return { data: dataUrl, fmt };
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h || Math.max(w, h) <= maksPiksel) return { data: dataUrl, fmt };

    const oran = maksPiksel / Math.max(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * oran);
    canvas.height = Math.round(h * oran);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { data: dataUrl, fmt };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (fmt === "JPEG") {
      // JPEG'de şeffaflık yok — beyaz zemin
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const yeni =
      fmt === "PNG" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
    return { data: yeni, fmt };
  } catch {
    return { data: dataUrl, fmt };
  }
}
