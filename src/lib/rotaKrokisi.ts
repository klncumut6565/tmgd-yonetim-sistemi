// src/lib/rotaKrokisi.ts
//
// Kullanıcının haritada seçtiği durak noktalarından, Emniyet Planı EK-7'ye
// gömülecek bir "güzergah krokisi" üretir. Arka planda GERÇEK OpenStreetMap
// harita karoları (tile) kullanılır — yalnızca noktalar/çizgiler değil,
// coğrafi bağlamı (yol ağı, yerleşim, kıyı çizgisi) da gösterir. Karolar
// standart Web Mercator projeksiyonuyla (Leaflet'in kendisinin kullandığı
// yöntem) canvas üzerine yerleştirilir; nokta/çizgi/etiketler de AYNI
// projeksiyonla çizildiği için harita ile birebir hizalı çıkar.
//
// tile.openstreetmap.org, karo yanıtlarında Access-Control-Allow-Origin: *
// gönderir (bkz. OSM chef/apache yapılandırması) — bu yüzden canvas
// "kirlenmeden" (tainted olmadan) toDataURL() ile PNG'ye çevrilebilir.
// Kullanım OSM Tile Usage Policy'e uygun ölçekte (belge başına birkaç
// karo, ~belge sayısı kadar istek) kalır; atıf metni krokinin altına
// yazılır.

import type { RotaNoktasi } from "@/components/RotaHaritasi";

const CANVAS_W = 1600;
const CANVAS_H = 1000;
const KENAR_BOSLUK = 60;
const TILE = 256;

/** İki koordinat arası kuş uçuşu mesafeyi km olarak hesaplar (haversine). */
function mesafeKm(a: RotaNoktasi, b: RotaNoktasi): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---- Standart Web Mercator (slippy-map) projeksiyonu ----------------
// Leaflet, Google/Bing/OSM'nin tümünün kullandığı aynı yöntem: lat/lng,
// belirli bir zoom seviyesinde dünya genelini (2^z * 256) piksele yayar.
function lonToX(lng: number, z: number): number {
  return ((lng + 180) / 360) * TILE * 2 ** z;
}
function latToY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * TILE * 2 ** z
  );
}

async function tileYukle(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // karo yoksa (deniz/kapsama dışı vb.) boş bırakılır
    const altdomain = "abc"[(x + y) % 3];
    img.src = `https://${altdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  });
}

/** Haritada hesaplanan karayolu güzergahı (varsa) — kroki düz çizgi yerine bunu çizer. */
export type KrokiYolBilgisi = {
  cizgi: [number, number][]; // [lat, lng] dizisi (OSRM geometrisi)
  mesafeKm: number;
  sureDk?: number;
};

export async function guzergahKrokisiUret(
  noktalar: RotaNoktasi[],
  yol?: KrokiYolBilgisi | null
): Promise<{ dataUrl: string; enBoyOrani: number } | null> {
  if (noktalar.length < 2) return null;
  // Karayolu geometrisi varsa çizgi onu izler; yoksa duraklar düz bağlanır.
  const yolVar = !!yol && yol.cizgi.length >= 2;
  const cizgiNoktalari: { lat: number; lng: number }[] = yolVar
    ? yol!.cizgi.map(([lat, lng]) => ({ lat, lng }))
    : noktalar;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ---- Başlık ----
  ctx.fillStyle = "#000000";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GÜZERGAH KROKİSİ", CANVAS_W / 2, 46);

  const haritaUst = 66;
  const haritaAlt = CANVAS_H - 110;
  const haritaSol = KENAR_BOSLUK;
  const haritaSag = CANVAS_W - KENAR_BOSLUK;
  const haritaG = haritaSag - haritaSol;
  const haritaY = haritaAlt - haritaUst;

  // ---- Uygun zoom seviyesini bul: durakların (kenar payıyla) haritaya
  // sığdığı EN BÜYÜK zoom (en detaylı görünüm). ----
  const PAY_ORANI = 0.18; // her yöne %18 boşluk — noktalar kenara yapışmasın
  let zoom = 14;
  let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  for (; zoom >= 2; zoom--) {
    // Görünüm hem durakları hem (varsa) yol çizgisinin tamamını kapsar.
    const kapsam = [...noktalar, ...cizgiNoktalari];
    const xs = kapsam.map((n) => lonToX(n.lng, zoom));
    const ys = kapsam.map((n) => latToY(n.lat, zoom));
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const genW = Math.max(maxX - minX, 1);
    const genH = Math.max(maxY - minY, 1);
    const payX = genW * PAY_ORANI, payY = genH * PAY_ORANI;
    x0 = minX - payX; x1 = maxX + payX;
    y0 = minY - payY; y1 = maxY + payY;
    if (x1 - x0 <= haritaG && y1 - y0 <= haritaY) break;
  }

  // Harita alanının ortasına gelecek şekilde ofset (en/boy oranını bozmadan
  // ortalanır — dar yönde boşluk kalır).
  const olcek = Math.min(haritaG / (x1 - x0), haritaY / (y1 - y0));
  const gosterilenG = (x1 - x0) * olcek;
  const gosterilenY = (y1 - y0) * olcek;
  const ofsetPX = haritaSol + (haritaG - gosterilenG) / 2 - x0 * olcek;
  const ofsetPY = haritaUst + (haritaY - gosterilenY) / 2 - y0 * olcek;

  function projeksiyon(n: { lat: number; lng: number }): [number, number] {
    return [lonToX(n.lng, zoom) * olcek + ofsetPX, latToY(n.lat, zoom) * olcek + ofsetPY];
  }

  // ---- Kırpma alanı: harita karoları yalnızca çerçeve içine çizilsin ----
  ctx.save();
  ctx.beginPath();
  ctx.rect(haritaSol, haritaUst, haritaG, haritaY);
  ctx.clip();

  // ---- Karoları indir ve yerleştir ----
  const tileXMin = Math.floor(x0 / TILE) - 1;
  const tileXMax = Math.floor(x1 / TILE) + 1;
  const tileYMin = Math.floor(y0 / TILE) - 1;
  const tileYMax = Math.floor(y1 / TILE) + 1;
  const maxKaro = 2 ** zoom;

  const istekler: Promise<void>[] = [];
  for (let tx = tileXMin; tx <= tileXMax; tx++) {
    for (let ty = tileYMin; ty <= tileYMax; ty++) {
      if (ty < 0 || ty >= maxKaro) continue;
      const txMod = ((tx % maxKaro) + maxKaro) % maxKaro; // dünya çevresinde sarma
      istekler.push(
        tileYukle(zoom, txMod, ty).then((img) => {
          if (!img) return;
          const px = tx * TILE * olcek + ofsetPX;
          const py = ty * TILE * olcek + ofsetPY;
          ctx.drawImage(img, px, py, TILE * olcek, TILE * olcek);
        })
      );
    }
  }
  await Promise.all(istekler);

  // Harita üzerinde hafif beyaz saydamlık — çizgi/etiketler daha okunur olsun.
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(haritaSol, haritaUst, haritaG, haritaY);

  // ---- Bağlantı çizgisi (güzergah) ----
  const noktaKoordlari = noktalar.map(projeksiyon);
  const cizgiKoordlari = cizgiNoktalari.map(projeksiyon);
  const yolCiz = () => {
    ctx.beginPath();
    cizgiKoordlari.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Beyaz alt kontur + kırmızı çizgi — harita üzerinde net seçilsin.
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 10;
  yolCiz();
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 5;
  yolCiz();

  // Yön okları: çizgi uzunluğu boyunca eşit aralıklı (yol eğrisini izler).
  const parcaBoylari: number[] = [];
  let toplamPiksel = 0;
  for (let i = 0; i < cizgiKoordlari.length - 1; i++) {
    const [ax, ay] = cizgiKoordlari[i];
    const [bx, by] = cizgiKoordlari[i + 1];
    const d = Math.hypot(bx - ax, by - ay);
    parcaBoylari.push(d);
    toplamPiksel += d;
  }
  const okKonumlari: { mx: number; my: number; aci: number }[] = [];
  const okSayisi = yolVar ? Math.max(2, Math.min(6, Math.round(toplamPiksel / 260))) : 0;
  if (yolVar) {
    for (let k = 1; k <= okSayisi; k++) {
      let hedef = (toplamPiksel * k) / (okSayisi + 1);
      for (let i = 0; i < parcaBoylari.length; i++) {
        if (hedef <= parcaBoylari[i] || i === parcaBoylari.length - 1) {
          const [ax, ay] = cizgiKoordlari[i];
          const [bx, by] = cizgiKoordlari[i + 1];
          const t = parcaBoylari[i] ? Math.min(1, hedef / parcaBoylari[i]) : 0;
          okKonumlari.push({ mx: ax + (bx - ax) * t, my: ay + (by - ay) * t, aci: Math.atan2(by - ay, bx - ax) });
          break;
        }
        hedef -= parcaBoylari[i];
      }
    }
  } else {
    // Düz bağlantıda her bacağın orta noktası
    for (let i = 0; i < noktaKoordlari.length - 1; i++) {
      const [x1p, y1p] = noktaKoordlari[i];
      const [x2p, y2p] = noktaKoordlari[i + 1];
      okKonumlari.push({ mx: (x1p + x2p) / 2, my: (y1p + y2p) / 2, aci: Math.atan2(y2p - y1p, x2p - x1p) });
    }
  }
  ctx.fillStyle = "#dc2626";
  for (const { mx, my, aci } of okKonumlari) {
    const okBoy = 14;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(aci);
    ctx.beginPath();
    ctx.moveTo(okBoy, 0);
    ctx.lineTo(-okBoy * 0.6, -okBoy * 0.6);
    ctx.lineTo(-okBoy * 0.6, okBoy * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---- Durak noktaları + etiketler ----
  noktalar.forEach((n, i) => {
    const [x, y] = noktaKoordlari[i];
    const ilkMi = i === 0;
    const sonMi = i === noktalar.length - 1;
    const renk = ilkMi ? "#15803d" : sonMi ? "#b91c1c" : "#1e40af";

    ctx.beginPath();
    ctx.arc(x, y, ilkMi || sonMi ? 13 : 9, 0, Math.PI * 2);
    ctx.fillStyle = renk;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    const etiket = `${i + 1}. ${n.ad}`;
    ctx.font = ilkMi || sonMi ? "bold 22px Arial" : "20px Arial";
    ctx.textAlign = "center";
    const yukaridaMi = i % 2 === 0;
    const etiketY = yukaridaMi ? y - 22 : y + 34;
    // Beyaz kontur (halo) — harita üzerinde her zemin renginde okunsun diye.
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeText(etiket, x, etiketY, 320);
    ctx.fillStyle = "#000000";
    ctx.fillText(etiket, x, etiketY, 320);
  });

  ctx.restore(); // kırpmayı kaldır

  // ---- Harita çerçevesi ----
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(haritaSol, haritaUst, haritaG, haritaY);

  // ---- Kuzey oku (harita içi, sağ üst köşe) ----
  const kX = haritaSag - 40, kY = haritaUst + 55;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(kX, kY + 30);
  ctx.lineTo(kX, kY - 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(kX, kY - 30);
  ctx.lineTo(kX - 10, kY - 10);
  ctx.lineTo(kX + 10, kY - 10);
  ctx.closePath();
  ctx.fillStyle = "#000000";
  ctx.fill();
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("K", kX, kY + 48);

  // ---- Alt bilgi: mesafe + OSM atfı ----
  let altSatir: string;
  if (yolVar) {
    const sure = yol!.sureDk && yol!.sureDk > 0
      ? ` · Tahmini sürüş süresi: ${Math.floor(yol!.sureDk / 60) > 0 ? `${Math.floor(yol!.sureDk / 60)} sa ` : ""}${Math.round(yol!.sureDk % 60)} dk`
      : "";
    altSatir = `Karayolu güzergah mesafesi: ${yol!.mesafeKm.toFixed(1)} km${sure}`;
  } else {
    let toplamMesafe = 0;
    for (let i = 0; i < noktalar.length - 1; i++) {
      toplamMesafe += mesafeKm(noktalar[i], noktalar[i + 1]);
    }
    altSatir = `Toplam güzergah (kuş uçuşu, yaklaşık): ${toplamMesafe.toFixed(0)} km`;
  }
  ctx.font = "22px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "#000000";
  ctx.fillText(altSatir, KENAR_BOSLUK, CANVAS_H - 66);
  ctx.font = "16px Arial";
  ctx.fillStyle = "#6b7280";
  ctx.fillText(
    yolVar
      ? "Harita: © OpenStreetMap katkıda bulunanları · Güzergah: OSRM. Süre tahminidir; trafik, araç tipi ve yol koşullarına göre değişebilir."
      : "Harita: © OpenStreetMap katkıda bulunanları. Kroki şematiktir; gerçek sürüş güzergahı yol ağına göre farklılık gösterebilir.",
    KENAR_BOSLUK,
    CANVAS_H - 40
  );

  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, enBoyOrani: CANVAS_W / CANVAS_H };
}
