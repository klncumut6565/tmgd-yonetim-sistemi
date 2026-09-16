// src/lib/rotaKrokisi.ts
//
// Kullanıcının haritada seçtiği durak noktalarından, Emniyet Planı EK-7'ye
// gömülecek ŞEMATİK bir "güzergah krokisi" üretir. Gerçek harita/uydu
// görüntüsü DEĞİLDİR — resmi dokümanlarda kullanılan kroki geleneğine
// uygun olarak yalnızca durak noktaları, aralarındaki bağlantı çizgisi,
// kuzey oku ve toplam mesafe bilgisini içeren sade bir çizimdir. Canvas
// üzerinde (tarayıcıda) çizilir, PNG data URL olarak döner.

import type { RotaNoktasi } from "@/components/RotaHaritasi";

const CANVAS_W = 1600;
const CANVAS_H = 1000;
const KENAR_BOSLUK = 120;

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

export async function guzergahKrokisiUret(
  noktalar: RotaNoktasi[]
): Promise<{ dataUrl: string; enBoyOrani: number } | null> {
  if (noktalar.length < 2) return null;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // ---- Zemin ----
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, CANVAS_W - 12, CANVAS_H - 12);

  // ---- Başlık ----
  ctx.fillStyle = "#000000";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GÜZERGAH KROKİSİ", CANVAS_W / 2, 70);

  // ---- Koordinatları çizim alanına projeksiyon ----
  // Boylam, ortalama enleme göre cos ile ölçeklenir — kroki'nin gerçek
  // coğrafi orana daha yakın (bozulmamış) görünmesi için.
  const ortLat = noktalar.reduce((s, n) => s + n.lat, 0) / noktalar.length;
  const kOlcek = Math.cos((ortLat * Math.PI) / 180);

  const cizimUst = 110;
  const cizimAlt = CANVAS_H - 160;
  const cizimSol = KENAR_BOSLUK;
  const cizimSag = CANVAS_W - KENAR_BOSLUK;

  const lats = noktalar.map((n) => n.lat);
  const lngsScaled = noktalar.map((n) => n.lng * kOlcek);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lngMin = Math.min(...lngsScaled), lngMax = Math.max(...lngsScaled);
  const latSpan = Math.max(latMax - latMin, 0.0001);
  const lngSpan = Math.max(lngMax - lngMin, 0.0001);

  // En/boy oranını koru: her iki eksende de aynı ölçek kullanılır, dar
  // olan eksen ortalanır (harita gibi bozulmasın diye).
  const alanG = cizimSag - cizimSol;
  const alanY = cizimAlt - cizimUst;
  const olcek = Math.min(alanG / lngSpan, alanY / latSpan);
  const kullanilanG = lngSpan * olcek;
  const kullanilanY = latSpan * olcek;
  const ofsetX = cizimSol + (alanG - kullanilanG) / 2;
  const ofsetY = cizimUst + (alanY - kullanilanY) / 2;

  function projeksiyon(n: RotaNoktasi): [number, number] {
    const x = ofsetX + (n.lng * kOlcek - lngMin) * olcek;
    // Enlem arttıkça YUKARI çıkmalı (canvas Y aşağı arttığı için ters çevriliyor).
    const y = ofsetY + kullanilanY - (n.lat - latMin) * olcek;
    return [x, y];
  }

  const noktaKoordlari = noktalar.map(projeksiyon);

  // ---- Bağlantı çizgisi (güzergah) ----
  ctx.strokeStyle = "#1e40af";
  ctx.lineWidth = 5;
  ctx.setLineDash([]);
  ctx.beginPath();
  noktaKoordlari.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Yön okları (her bacağın orta noktasında, ilerleme yönünü gösteren küçük ok)
  ctx.fillStyle = "#1e40af";
  for (let i = 0; i < noktaKoordlari.length - 1; i++) {
    const [x1, y1] = noktaKoordlari[i];
    const [x2, y2] = noktaKoordlari[i + 1];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const aci = Math.atan2(y2 - y1, x2 - x1);
    const okBoy = 16;
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

  // ---- Durak noktaları ----
  noktalar.forEach((n, i) => {
    const [x, y] = noktaKoordlari[i];
    const ilkMi = i === 0;
    const sonMi = i === noktalar.length - 1;
    const renk = ilkMi ? "#15803d" : sonMi ? "#b91c1c" : "#1e40af";

    ctx.beginPath();
    ctx.arc(x, y, ilkMi || sonMi ? 14 : 10, 0, Math.PI * 2);
    ctx.fillStyle = renk;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Etiket: nokta numarası + yer adı. Metin taşmasın diye üst/alt
    // dönüşümlü yerleştirilir.
    const etiket = `${i + 1}. ${n.ad}`;
    ctx.font = ilkMi || sonMi ? "bold 24px Arial" : "22px Arial";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    const yukaridaMi = i % 2 === 0;
    const etiketY = yukaridaMi ? y - 26 : y + 40;
    ctx.fillText(etiket, x, etiketY, 320);
  });

  // ---- Kuzey oku (sağ üst köşe) ----
  const kX = CANVAS_W - 90, kY = 150;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(kX, kY + 45);
  ctx.lineTo(kX, kY - 25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(kX, kY - 40);
  ctx.lineTo(kX - 14, kY - 12);
  ctx.lineTo(kX + 14, kY - 12);
  ctx.closePath();
  ctx.fillStyle = "#000000";
  ctx.fill();
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";
  ctx.fillText("K", kX, kY + 70);

  // ---- Toplam mesafe (alt bilgi) ----
  let toplamMesafe = 0;
  for (let i = 0; i < noktalar.length - 1; i++) {
    toplamMesafe += mesafeKm(noktalar[i], noktalar[i + 1]);
  }
  ctx.font = "24px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "#000000";
  ctx.fillText(
    `Toplam güzergah (kuş uçuşu, yaklaşık): ${toplamMesafe.toFixed(0)} km`,
    KENAR_BOSLUK,
    CANVAS_H - 90
  );
  ctx.font = "18px Arial";
  ctx.fillStyle = "#6b7280";
  ctx.fillText(
    "Not: Bu kroki şematiktir; ölçekli bir harita değildir. Gerçek sürüş mesafesi ve güzergah, yol ağına göre farklılık gösterebilir.",
    KENAR_BOSLUK,
    CANVAS_H - 55
  );

  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, enBoyOrani: CANVAS_W / CANVAS_H };
}
