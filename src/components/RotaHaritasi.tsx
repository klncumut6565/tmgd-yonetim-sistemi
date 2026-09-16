"use client";

// src/components/RotaHaritasi.tsx
//
// Emniyet Planı EK-7 (Rota Bilgileri) için harita üzerinde tıklanarak
// güzergah (durak noktaları) seçilmesini sağlayan bileşen. Leaflet +
// OpenStreetMap kullanır (API anahtarı gerekmez). Seçilen her nokta,
// OpenStreetMap Nominatim servisi ile TERS GEOCODE edilerek bir yer adı
// bulunur (kroki'de ve EK-7 tablosunda gösterilmek üzere) — bulunamazsa
// yalnızca enlem/boylam gösterilir.
//
// Bu bileşen yalnızca durak NOKTALARINI toplar; gerçek "kroki" (şematik
// güzergah çizimi) PDF'e gömülürken rotaKrokisi.ts tarafından bu
// noktalardan üretilir — burada üretilmez.

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet'in varsayılan marker ikonu Next.js/webpack ile doğru
// yüklenmediğinden (bilinen bir sorun) ikonlar elle tanımlanır.
const ICON = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type RotaNoktasi = {
  lat: number;
  lng: number;
  ad: string; // ters geocode ile bulunan yer adı (bulunamazsa "Enlem, Boylam")
  adBulundu: boolean;
};

type Props = {
  noktalar: RotaNoktasi[];
  onNoktalarDegisti: Dispatch<SetStateAction<RotaNoktasi[]>>;
  // Harita başlangıç merkezi (opsiyonel) — verilmezse Türkiye geneli gösterilir.
  merkezLat?: number;
  merkezLng?: number;
};

async function tersGeocode(lat: number, lng: number): Promise<{ ad: string; bulundu: boolean }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=tr`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error("geocode başarısız");
    const data = await res.json();
    const adr = data.address || {};
    // Öncelik: ilçe/kasaba/köy + il — kroki'de okunur, kısa bir isim olsun diye.
    const yerel = adr.town || adr.village || adr.suburb || adr.city_district || adr.county;
    const il = adr.province || adr.state || adr.city;
    const parcalar = [yerel, il].filter(Boolean);
    if (parcalar.length > 0) {
      return { ad: Array.from(new Set(parcalar)).join(", "), bulundu: true };
    }
    if (data.display_name) {
      return { ad: data.display_name.split(",").slice(0, 2).join(",").trim(), bulundu: true };
    }
    throw new Error("adres bulunamadı");
  } catch {
    return { ad: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, bulundu: false };
  }
}

function TiklamaDinleyici({ onTikla }: { onTikla: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onTikla(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function RotaHaritasi({
  noktalar,
  onNoktalarDegisti,
  merkezLat = 39.0,
  merkezLng = 35.0,
}: Props) {
  const [yukleniyorIndex, setYukleniyorIndex] = useState<number | null>(null);

  const noktaEkle = useCallback(
    async (lat: number, lng: number) => {
      let eklenenIndex = -1;
      onNoktalarDegisti((mevcut) => {
        eklenenIndex = mevcut.length;
        return [...mevcut, { lat, lng, ad: "Adres aranıyor…", adBulundu: false }];
      });
      setYukleniyorIndex(eklenenIndex);

      const { ad, bulundu } = await tersGeocode(lat, lng);

      onNoktalarDegisti((mevcut) => {
        const kopya = [...mevcut];
        if (kopya[eklenenIndex]) {
          kopya[eklenenIndex] = { ...kopya[eklenenIndex], ad, adBulundu: bulundu };
        }
        return kopya;
      });
      setYukleniyorIndex(null);
    },
    [onNoktalarDegisti]
  );

  const sonNoktayiSil = () => {
    onNoktalarDegisti(noktalar.slice(0, -1));
  };
  const temizle = () => {
    onNoktalarDegisti([]);
  };

  const cizgiNoktalari: [number, number][] = noktalar.map((n) => [n.lat, n.lng]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-gray-600">
          Haritaya tıklayarak durak ekleyin (ilk nokta başlangıç, son nokta varış olur).{" "}
          <strong>{noktalar.length}</strong> nokta seçildi.
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={sonNoktayiSil}
            disabled={noktalar.length === 0}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40"
          >
            Son Noktayı Sil
          </button>
          <button
            type="button"
            onClick={temizle}
            disabled={noktalar.length === 0}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-40"
          >
            Temizle
          </button>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border" style={{ height: 420 }}>
        <MapContainer
          center={[merkezLat, merkezLng]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <TiklamaDinleyici onTikla={noktaEkle} />
          {noktalar.map((n, i) => (
            <Marker key={i} position={[n.lat, n.lng]} icon={ICON} />
          ))}
          {cizgiNoktalari.length >= 2 && (
            <Polyline positions={cizgiNoktalari} pathOptions={{ color: "#1e40af", weight: 3 }} />
          )}
        </MapContainer>
      </div>

      {noktalar.length > 0 && (
        <ol className="mt-2 text-xs text-gray-700 space-y-0.5 list-decimal list-inside">
          {noktalar.map((n, i) => (
            <li key={i}>
              {i === 0 ? "Başlangıç: " : i === noktalar.length - 1 ? "Varış: " : "Ara durak: "}
              {yukleniyorIndex === i ? "Adres aranıyor…" : n.ad}
              {!n.adBulundu && yukleniyorIndex !== i && (
                <span className="text-amber-600"> (adres bulunamadı, koordinat gösteriliyor)</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
