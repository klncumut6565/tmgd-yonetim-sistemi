"use client";

// src/components/RotaHaritasi.tsx
//
// Emniyet Planı EK-7 (Rota Bilgileri) için Google/Yandex Haritalar benzeri
// güzergah seçici. Leaflet + OpenStreetMap kullanır (API anahtarı gerekmez).
//
//  - BAŞLANGIÇ (A, yeşil) ve VARIŞ (B, kırmızı) noktaları ayrı ayrı seçilir:
//      • kutuya adres/yer adı yazıp önerilerden seçerek (Nominatim arama), ya da
//      • "📍 Haritadan seç" ile haritaya tıklayarak.
//  - İkisi de seçiliyken haritaya tıklamak ARA DURAK ekler (mavi, numaralı).
//  - Tüm işaretçiler sürüklenerek taşınabilir; A ⇅ B yer değiştirebilir.
//  - Gerçek karayolu güzergahı OSRM ile çizilir; mesafe ve tahmini süre
//    gösterilir. Servis yanıt vermezse noktalar düz çizgiyle birleştirilir.
//
// Üst bileşene giden dizi DAİMA [başlangıç, ...ara duraklar, varış]
// sırasındadır (rotaKrokisi.ts ve EK-7 tablosu bu sıraya güvenir); her
// noktanın `tur` alanı rolünü ayrıca belirtir.

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type RotaNoktaTuru = "baslangic" | "ara" | "varis";

export type RotaNoktasi = {
  lat: number;
  lng: number;
  ad: string; // ters geocode / arama ile bulunan yer adı (bulunamazsa "Enlem, Boylam")
  adBulundu: boolean;
  tur?: RotaNoktaTuru;
};

export type RotaOzeti = { mesafeKm: number; sureDk: number; yolaGore: boolean };

type Props = {
  noktalar: RotaNoktasi[];
  onNoktalarDegisti: Dispatch<SetStateAction<RotaNoktasi[]>>;
  /** Güzergah hesaplandıkça mesafe/süre bilgisi (EK-7'ye yazılmak üzere). */
  onRotaOzeti?: (o: RotaOzeti | null) => void;
  merkezLat?: number;
  merkezLng?: number;
};

type AramaSonucu = { lat: number; lng: number; ad: string; detay: string };

// ----------------------------------------------------------------------------
// Yardımcılar
// ----------------------------------------------------------------------------

function ikon(metin: string, renk: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="background:${renk};color:#fff;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);font:700 12px system-ui,sans-serif">${metin}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}
const IKON_A = ikon("A", "#16a34a");
const IKON_B = ikon("B", "#dc2626");

function kisaAd(adr: Record<string, string> | undefined, displayName?: string): string | null {
  const a = adr || {};
  const yerel = a.road ? undefined : a.town || a.village || a.suburb || a.city_district || a.county;
  const il = a.province || a.state || a.city;
  const isim = a.amenity || a.industrial || a.building || a.shop || a.office;
  const parcalar = [isim, a.road, yerel || a.town || a.village || a.county, il].filter(Boolean) as string[];
  if (parcalar.length > 0) return Array.from(new Set(parcalar)).slice(0, 3).join(", ");
  if (displayName) return displayName.split(",").slice(0, 2).join(",").trim();
  return null;
}

async function tersGeocode(lat: number, lng: number): Promise<{ ad: string; bulundu: boolean }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=tr`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) throw new Error("geocode başarısız");
    const data = await res.json();
    const ad = kisaAd(data.address, data.display_name);
    if (ad) return { ad, bulundu: true };
    throw new Error("adres bulunamadı");
  } catch {
    return { ad: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, bulundu: false };
  }
}

async function adresAra(q: string, sinyal: AbortSignal): Promise<AramaSonucu[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=tr&q=${encodeURIComponent(q)}`,
    { headers: { Accept: "application/json" }, signal: sinyal }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { lat: string; lon: string; display_name: string; address?: Record<string, string> }[];
  return data.map((d) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    ad: kisaAd(d.address, d.display_name) || d.display_name,
    detay: d.display_name,
  }));
}

/** OSRM (açık kaynak yönlendirme) ile karayolu güzergahı. */
async function yolGuzergahi(
  noktalar: RotaNoktasi[],
  sinyal: AbortSignal
): Promise<{ cizgi: [number, number][]; mesafeKm: number; sureDk: number } | null> {
  const koord = noktalar.map((n) => `${n.lng.toFixed(6)},${n.lat.toFixed(6)}`).join(";");
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${koord}?overview=full&geometries=geojson`,
    { signal: sinyal }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const r = data?.routes?.[0];
  if (!r?.geometry?.coordinates) return null;
  return {
    cizgi: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
    mesafeKm: r.distance / 1000,
    sureDk: r.duration / 60,
  };
}

function havadanKm(a: RotaNoktasi, b: RotaNoktasi): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function sureMetni(dk: number): string {
  const s = Math.floor(dk / 60);
  const d = Math.round(dk % 60);
  return s > 0 ? `${s} sa ${d} dk` : `${d} dk`;
}

/** Diziyi rollerine ayırır (eski kayıtlarda `tur` yoksa sıraya göre). */
function ayristir(noktalar: RotaNoktasi[]) {
  const etiketli = noktalar.some((n) => n.tur);
  if (!etiketli) {
    return {
      bas: noktalar[0],
      varis: noktalar.length > 1 ? noktalar[noktalar.length - 1] : undefined,
      aralar: noktalar.slice(1, -1),
    };
  }
  return {
    bas: noktalar.find((n) => n.tur === "baslangic"),
    varis: noktalar.find((n) => n.tur === "varis"),
    aralar: noktalar.filter((n) => n.tur === "ara"),
  };
}

function birlestir(bas?: RotaNoktasi, aralar: RotaNoktasi[] = [], varis?: RotaNoktasi): RotaNoktasi[] {
  return [
    ...(bas ? [{ ...bas, tur: "baslangic" as const }] : []),
    ...aralar.map((n) => ({ ...n, tur: "ara" as const })),
    ...(varis ? [{ ...varis, tur: "varis" as const }] : []),
  ];
}

// ----------------------------------------------------------------------------
// Harita alt bileşenleri
// ----------------------------------------------------------------------------

function TiklamaDinleyici({ onTikla }: { onTikla: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onTikla(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Yeni nokta seçildiğinde / güzergah çizildiğinde haritayı uygun görünüme getirir. */
function GorunumAyarla({ hedef }: { hedef: { anahtar: string; noktalar: [number, number][] } }) {
  const map = useMap();
  useEffect(() => {
    if (hedef.noktalar.length === 1) {
      map.setView(hedef.noktalar[0], Math.max(map.getZoom(), 12));
    } else if (hedef.noktalar.length > 1) {
      map.fitBounds(L.latLngBounds(hedef.noktalar), { padding: [40, 40] });
    }
    // Yalnızca anahtar değişince çalışır (her render'da harita zıplamasın).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedef.anahtar]);
  return null;
}

// ----------------------------------------------------------------------------
// Adres arama kutusu (başlangıç / varış)
// ----------------------------------------------------------------------------

function NoktaKutusu({
  harf,
  renk,
  etiket,
  nokta,
  secimModu,
  onSecimModu,
  onSec,
  onTemizle,
}: {
  harf: string;
  renk: string;
  etiket: string;
  nokta?: RotaNoktasi;
  secimModu: boolean;
  onSecimModu: () => void;
  onSec: (s: AramaSonucu) => void;
  onTemizle: () => void;
}) {
  const [metin, setMetin] = useState("");
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [sonuclar, setSonuclar] = useState<AramaSonucu[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const iptal = useRef<AbortController | null>(null);

  // Nominatim kullanım kuralı: saniyede en fazla 1 istek → 700 ms gecikme.
  useEffect(() => {
    if (!duzenleniyor) return;
    const q = metin.trim();
    if (q.length < 3) {
      setSonuclar([]);
      return;
    }
    const t = setTimeout(async () => {
      iptal.current?.abort();
      const ac = new AbortController();
      iptal.current = ac;
      setAraniyor(true);
      try {
        setSonuclar(await adresAra(q, ac.signal));
      } catch {
        /* iptal edildi / ağ hatası */
      } finally {
        if (iptal.current === ac) setAraniyor(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [metin, duzenleniyor]);

  const gosterilen = duzenleniyor ? metin : nokta?.ad ?? "";

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 shrink-0 rounded-full text-white text-xs font-bold flex items-center justify-center"
          style={{ background: renk }}
        >
          {harf}
        </span>
        <input
          type="text"
          value={gosterilen}
          placeholder={`${etiket} — adres, firma veya yer adı yazın`}
          onFocus={() => {
            setDuzenleniyor(true);
            setMetin(nokta?.ad ?? "");
          }}
          onBlur={() => setTimeout(() => setDuzenleniyor(false), 200)}
          onChange={(e) => setMetin(e.target.value)}
          className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSecimModu}
          title="Haritaya tıklayarak seç"
          className={`px-2 py-1.5 text-xs rounded-lg border whitespace-nowrap ${
            secimModu ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"
          }`}
        >
          📍 Haritadan seç
        </button>
        {nokta && (
          <button
            type="button"
            onClick={onTemizle}
            title={`${etiket} noktasını kaldır`}
            className="px-2 py-1.5 text-xs text-gray-400 hover:text-red-600"
          >
            ✕
          </button>
        )}
      </div>
      {duzenleniyor && (araniyor || sonuclar.length > 0) && (
        <ul className="absolute z-[1000] left-8 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto text-sm">
          {araniyor && sonuclar.length === 0 && <li className="px-3 py-2 text-gray-400">Aranıyor…</li>}
          {sonuclar.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSec(s);
                  setDuzenleniyor(false);
                  setSonuclar([]);
                }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50"
              >
                <span className="block font-medium text-gray-800">{s.ad}</span>
                <span className="block text-[11px] text-gray-400 truncate">{s.detay}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Ana bileşen
// ----------------------------------------------------------------------------

export default function RotaHaritasi({
  noktalar,
  onNoktalarDegisti,
  onRotaOzeti,
  merkezLat = 39.0,
  merkezLng = 35.0,
}: Props) {
  const { bas, varis, aralar } = useMemo(() => ayristir(noktalar), [noktalar]);
  const [secimModu, setSecimModu] = useState<"baslangic" | "varis" | null>(null);
  const [gorunum, setGorunum] = useState<{ anahtar: string; noktalar: [number, number][] }>({
    anahtar: "",
    noktalar: [],
  });
  const [guzergah, setGuzergah] = useState<{ cizgi: [number, number][]; mesafeKm: number; sureDk: number } | null>(null);
  const [rotaHesaplaniyor, setRotaHesaplaniyor] = useState(false);
  const [rotaHatasi, setRotaHatasi] = useState(false);

  // Sıralı ve etiketli diziyi üst bileşene yazar.
  const yaz = useCallback(
    (b?: RotaNoktasi, a: RotaNoktasi[] = [], v?: RotaNoktasi) => onNoktalarDegisti(birlestir(b, a, v)),
    [onNoktalarDegisti]
  );

  /** Bir noktanın adını ters geocode ile sonradan doldurur (koordinata göre eşleştirir). */
  const adiDoldur = useCallback(
    async (lat: number, lng: number) => {
      const { ad, bulundu } = await tersGeocode(lat, lng);
      onNoktalarDegisti((mevcut) =>
        mevcut.map((n) => (n.lat === lat && n.lng === lng ? { ...n, ad, adBulundu: bulundu } : n))
      );
    },
    [onNoktalarDegisti]
  );

  const noktaYerlestir = useCallback(
    (tur: RotaNoktaTuru, lat: number, lng: number, hazirAd?: string) => {
      const yeni: RotaNoktasi = {
        lat,
        lng,
        ad: hazirAd ?? "Adres aranıyor…",
        adBulundu: !!hazirAd,
        tur,
      };
      if (tur === "baslangic") yaz(yeni, aralar, varis);
      else if (tur === "varis") yaz(bas, aralar, yeni);
      else yaz(bas, [...aralar, yeni], varis);
      if (!hazirAd) adiDoldur(lat, lng);
      setGorunum({ anahtar: `${tur}-${lat}-${lng}`, noktalar: [[lat, lng]] });
    },
    [aralar, bas, varis, yaz, adiDoldur]
  );

  function haritaTiklandi(lat: number, lng: number) {
    // Google/Yandex mantığı: önce başlangıç, sonra varış; ikisi de varsa ara durak.
    const tur: RotaNoktaTuru = secimModu ?? (!bas ? "baslangic" : !varis ? "varis" : "ara");
    setSecimModu(null);
    noktaYerlestir(tur, lat, lng);
  }

  function suruklendi(tur: RotaNoktaTuru, araIndex: number, lat: number, lng: number) {
    const yeni = (n: RotaNoktasi): RotaNoktasi => ({ ...n, lat, lng, ad: "Adres aranıyor…", adBulundu: false });
    if (tur === "baslangic" && bas) yaz(yeni(bas), aralar, varis);
    else if (tur === "varis" && varis) yaz(bas, aralar, yeni(varis));
    else if (tur === "ara") yaz(bas, aralar.map((n, i) => (i === araIndex ? yeni(n) : n)), varis);
    adiDoldur(lat, lng);
  }

  // Sıralı nokta listesi değiştikçe karayolu güzergahını yeniden hesapla.
  const sirali = useMemo(() => birlestir(bas, aralar, varis), [bas, aralar, varis]);
  const koordAnahtari = sirali.map((n) => `${n.lat.toFixed(5)},${n.lng.toFixed(5)}`).join("|");
  useEffect(() => {
    if (sirali.length < 2) {
      setGuzergah(null);
      setRotaHatasi(false);
      onRotaOzeti?.(null);
      return;
    }
    const ac = new AbortController();
    setRotaHesaplaniyor(true);
    setRotaHatasi(false);
    yolGuzergahi(sirali, ac.signal)
      .then((g) => {
        if (ac.signal.aborted) return;
        if (g) {
          setGuzergah(g);
          onRotaOzeti?.({ mesafeKm: g.mesafeKm, sureDk: g.sureDk, yolaGore: true });
          setGorunum({ anahtar: `rota-${koordAnahtari}`, noktalar: g.cizgi });
        } else {
          throw new Error("rota yok");
        }
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setGuzergah(null);
        setRotaHatasi(true);
        let km = 0;
        for (let i = 0; i < sirali.length - 1; i++) km += havadanKm(sirali[i], sirali[i + 1]);
        onRotaOzeti?.({ mesafeKm: km, sureDk: 0, yolaGore: false });
        setGorunum({ anahtar: `duz-${koordAnahtari}`, noktalar: sirali.map((n) => [n.lat, n.lng]) });
      })
      .finally(() => {
        if (!ac.signal.aborted) setRotaHesaplaniyor(false);
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [koordAnahtari]);

  const duzCizgi: [number, number][] = sirali.map((n) => [n.lat, n.lng]);

  return (
    <div className="space-y-2">
      {/* BAŞLANGIÇ / VARIŞ KUTULARI */}
      <div className="flex gap-2 items-stretch">
        <div className="flex-1 space-y-2">
          <NoktaKutusu
            harf="A"
            renk="#16a34a"
            etiket="Başlangıç noktası"
            nokta={bas}
            secimModu={secimModu === "baslangic"}
            onSecimModu={() => setSecimModu(secimModu === "baslangic" ? null : "baslangic")}
            onSec={(s) => noktaYerlestir("baslangic", s.lat, s.lng, s.ad)}
            onTemizle={() => yaz(undefined, aralar, varis)}
          />
          <NoktaKutusu
            harf="B"
            renk="#dc2626"
            etiket="Varış noktası"
            nokta={varis}
            secimModu={secimModu === "varis"}
            onSecimModu={() => setSecimModu(secimModu === "varis" ? null : "varis")}
            onSec={(s) => noktaYerlestir("varis", s.lat, s.lng, s.ad)}
            onTemizle={() => yaz(bas, aralar, undefined)}
          />
        </div>
        <button
          type="button"
          title="Başlangıç ile varışı yer değiştir"
          onClick={() => yaz(varis, aralar.slice().reverse(), bas)}
          disabled={!bas && !varis}
          className="px-2 text-lg border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
        >
          ⇅
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={secimModu ? "text-blue-700 font-medium" : "text-gray-500"}>
          {secimModu === "baslangic"
            ? "Haritada BAŞLANGIÇ noktasına tıklayın…"
            : secimModu === "varis"
            ? "Haritada VARIŞ noktasına tıklayın…"
            : !bas
            ? "Haritaya tıklayın: ilk tıklama başlangıç (A) olur."
            : !varis
            ? "Haritaya tıklayın: bu tıklama varış (B) olur."
            : "Haritaya tıklamak ara durak ekler. İşaretçileri sürükleyerek taşıyabilirsiniz."}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => yaz(bas, aralar.slice(0, -1), varis)}
            disabled={aralar.length === 0}
            className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
          >
            Son Ara Durağı Sil
          </button>
          <button
            type="button"
            onClick={() => {
              onNoktalarDegisti([]);
              setSecimModu(null);
            }}
            disabled={noktalar.length === 0}
            className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
          >
            Tümünü Temizle
          </button>
        </div>
      </div>

      {/* HARİTA */}
      <div
        className={`rounded-lg overflow-hidden border ${secimModu ? "ring-2 ring-blue-500" : ""}`}
        style={{ height: 420, cursor: secimModu ? "crosshair" : undefined }}
      >
        <MapContainer center={[merkezLat, merkezLng]} zoom={6} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar · Güzergah: OSRM'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <TiklamaDinleyici onTikla={haritaTiklandi} />
          <GorunumAyarla hedef={gorunum} />

          {guzergah ? (
            <>
              <Polyline positions={guzergah.cizgi} pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9 }} />
              <Polyline positions={guzergah.cizgi} pathOptions={{ color: "#2563eb", weight: 5 }} />
            </>
          ) : (
            duzCizgi.length >= 2 && (
              <Polyline positions={duzCizgi} pathOptions={{ color: "#1e40af", weight: 3, dashArray: "6 6" }} />
            )
          )}

          {bas && (
            <Marker
              position={[bas.lat, bas.lng]}
              icon={IKON_A}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  suruklendi("baslangic", -1, p.lat, p.lng);
                },
              }}
            />
          )}
          {aralar.map((n, i) => (
            <Marker
              key={`ara-${i}`}
              position={[n.lat, n.lng]}
              icon={ikon(String(i + 1), "#2563eb")}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  suruklendi("ara", i, p.lat, p.lng);
                },
              }}
            />
          ))}
          {varis && (
            <Marker
              position={[varis.lat, varis.lng]}
              icon={IKON_B}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = (e.target as L.Marker).getLatLng();
                  suruklendi("varis", -1, p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* GÜZERGAH ÖZETİ */}
      {sirali.length >= 2 && (
        <div className="text-xs rounded-lg bg-white border px-3 py-2">
          {rotaHesaplaniyor ? (
            <span className="text-gray-400">Güzergah hesaplanıyor…</span>
          ) : guzergah ? (
            <span className="text-gray-700">
              🚚 Karayolu mesafesi: <strong>{guzergah.mesafeKm.toFixed(1)} km</strong> · Tahmini süre:{" "}
              <strong>{sureMetni(guzergah.sureDk)}</strong>
            </span>
          ) : rotaHatasi ? (
            <span className="text-amber-700">
              Karayolu güzergahı alınamadı — noktalar düz çizgiyle birleştirildi.
            </span>
          ) : null}
        </div>
      )}

      {sirali.length > 0 && (
        <ol className="text-xs text-gray-700 space-y-0.5">
          {sirali.map((n, i) => (
            <li key={i}>
              <strong>
                {n.tur === "baslangic" ? "A · Başlangıç: " : n.tur === "varis" ? "B · Varış: " : `${sirali.slice(0, i).filter((x) => x.tur === "ara").length + 1} · Ara durak: `}
              </strong>
              {n.ad}
              {!n.adBulundu && n.ad !== "Adres aranıyor…" && (
                <span className="text-amber-600"> (adres bulunamadı, koordinat gösteriliyor)</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
