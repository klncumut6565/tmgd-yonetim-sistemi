"use client";

// FİRMA TAKVİMİ
// Gösterge Paneli'nin alt sayfası. İki işi bir arada yapar:
//   1) Seçili AYIN ziyaretlerini takvim üzerinde gösterir; bir güne tek
//      seferde BİRDEN ÇOK firma eklenebilir, tek tek silinebilir.
//   2) O ay HENÜZ ZİYARET EDİLMEMİŞ firmaları listeler. Takvime bir firma
//      eklendiği anda o firma bu listeden düşer — böylece "kim kaldı?"
//      sorusu tek bakışta yanıtlanır.
//
// Veri kaynağı: public.visits (firm_id + visit_date). Ziyaretler sayfası ve
// firma detayındaki Ziyaret Raporu maddeleri de aynı tabloyu kullandığı için
// buradan eklenen kayıtlar oralarda da görünür.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

type Firm = { id: string; name: string };

type Visit = {
  id: string;
  firm_id: string;
  visit_date: string;
  visit_type: string | null;
  summary: string | null;
};

/** Bir firmaya atanmış TMGD (roller kısmından). */
type Atama = { userId: string; ad: string };

/**
 * Takvimdeki firma etiketleri, firmanın atandığı TMGD'ye göre renklenir.
 * Umut KILINÇ'ın firmaları turkuaz zeminde siyah yazı olarak istendi;
 * diğer TMGD'lere paletten sırayla, kişi bazında sabit bir renk verilir
 * (aynı TMGD her ay aynı rengi alır).
 */
const TMGD_RENKLERI = [
  "#FDE68A", // amber
  "#BBF7D0", // yeşil
  "#DDD6FE", // mor
  "#FBCFE8", // pembe
  "#BFDBFE", // mavi
  "#FED7AA", // turuncu
];
const UMUT_RENGI = "#40E0D0"; // turkuaz

/** Ada göre Umut KILINÇ eşleşmesi (yazım/harf farklarına dayanıklı). */
function umutMu(ad: string): boolean {
  return ad
    .toLocaleUpperCase("tr")
    .replace(/[^A-ZÇĞİÖŞÜ]/g, "")
    .includes("UMUTKILIN");
}

/** Kişi kimliğinden sabit bir renk üretir — sıralamadan bağımsız. */
function tmgdRengi(atama: Atama | undefined): string | null {
  if (!atama) return null;
  if (umutMu(atama.ad)) return UMUT_RENGI;
  let toplam = 0;
  for (const ch of atama.userId) toplam = (toplam * 31 + ch.charCodeAt(0)) % 100000;
  return TMGD_RENKLERI[toplam % TMGD_RENKLERI.length];
}

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// Takvim başlıkları — hafta Pazartesi başlar (TR kullanımı).
const GUN_BASLIKLARI = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** Hafta sonu sütunları (Cmt, Paz) daha dar tutulur — hafta içi günlere
 *  daha çok yer kalsın, hafta sonu bakışta ayırt edilsin. */
const TAKVIM_SUTUNLARI = "repeat(5, 1fr) 0.62fr 0.62fr";

/** Izgaradaki sütun sırasına göre hafta sonu mu (5 = Cmt, 6 = Paz). */
function haftaSonuMu(hucreIndex: number): boolean {
  return hucreIndex % 7 >= 5;
}

/** Yerel saate göre YYYY-MM-DD. toISOString() UTC'ye kaydırdığı için
 *  gün kaymalarına yol açıyordu; bu yüzden elle biçimlendiriliyor. */
function tarihAnahtari(yil: number, ay: number, gun: number): string {
  const a = String(ay + 1).padStart(2, "0");
  const g = String(gun).padStart(2, "0");
  return `${yil}-${a}-${g}`;
}

/** Ayın 1'i haftanın kaçıncı günü (Pazartesi = 0). */
function ayBasiOfset(yil: number, ay: number): number {
  const js = new Date(yil, ay, 1).getDay(); // 0 = Pazar
  return (js + 6) % 7;
}

export default function FirmaTakvimiPage() {
  const { canWrite } = useUser();

  const bugun = useMemo(() => new Date(), []);
  const [yil, setYil] = useState(bugun.getFullYear());
  const [ay, setAy] = useState(bugun.getMonth()); // 0-11

  const [firmalar, setFirmalar] = useState<Firm[]>([]);
  const [ziyaretler, setZiyaretler] = useState<Visit[]>([]);
  // Firma id → atanmış TMGD. Takvimdeki renklendirme için.
  const [firmaTmgd, setFirmaTmgd] = useState<Map<string, Atama>>(new Map());
  const [loading, setLoading] = useState(true);
  const [mesaj, setMesaj] = useState("");
  const [hata, setHata] = useState("");

  // Ekleme paneli — bir güne birden çok firma seçilebilir.
  const [secilenGun, setSecilenGun] = useState<string | null>(null);
  const [secilenFirmalar, setSecilenFirmalar] = useState<string[]>([]);
  const [firmaArama, setFirmaArama] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const ayBasi = tarihAnahtari(yil, ay, 1);
  const ayGunSayisi = new Date(yil, ay + 1, 0).getDate();
  const aySonu = tarihAnahtari(yil, ay, ayGunSayisi);

  const veriYukle = useCallback(async () => {
    setLoading(true);
    setHata("");

    const [firmRes, visitRes, atamaRes] = await Promise.all([
      supabase.from("firms").select("id, name").order("name"),
      supabase
        .from("visits")
        .select("id, firm_id, visit_date, visit_type, summary")
        .gte("visit_date", ayBasi)
        .lte("visit_date", aySonu)
        .order("visit_date"),
      // Firma → atanmış TMGD (roller kısmı). Takvimdeki firma etiketleri
      // TMGD'sine göre renklendirilir.
      supabase
        .from("user_firms")
        .select("firm_id, user_id, profiles ( full_name, role )"),
    ]);

    if (firmRes.error) setHata("Firmalar yüklenemedi: " + hataCevir(firmRes.error));
    else setFirmalar((firmRes.data as Firm[]) || []);

    if (visitRes.error) setHata("Ziyaretler yüklenemedi: " + hataCevir(visitRes.error));
    else setZiyaretler((visitRes.data as Visit[]) || []);

    const eslesme = new Map<string, Atama>();
    for (const a of (atamaRes.data as Record<string, any>[]) || []) {
      const p = a.profiles;
      if (!p) continue;
      if (p.role && p.role !== "tmgd") continue;   // yalnızca TMGD atamaları
      const ad = String(p.full_name || "").trim();
      if (!ad) continue;
      if (!eslesme.has(a.firm_id)) {
        eslesme.set(a.firm_id, { userId: String(a.user_id), ad });
      }
    }
    setFirmaTmgd(eslesme);

    setLoading(false);
  }, [ayBasi, aySonu]);

  useEffect(() => {
    veriYukle();
  }, [veriYukle]);

  const firmaAdi = useMemo(() => {
    const m = new Map<string, string>();
    firmalar.forEach((f) => m.set(f.id, f.name));
    return m;
  }, [firmalar]);

  // Gün (YYYY-MM-DD) → o günün ziyaretleri
  const gunlukZiyaretler = useMemo(() => {
    const m = new Map<string, Visit[]>();
    ziyaretler.forEach((z) => {
      const anahtar = String(z.visit_date).slice(0, 10);
      const liste = m.get(anahtar) || [];
      liste.push(z);
      m.set(anahtar, liste);
    });
    return m;
  }, [ziyaretler]);

  // Bu ay ziyaret edilmiş firma id'leri
  const ziyaretEdilenFirmaIdleri = useMemo(
    () => new Set(ziyaretler.map((z) => z.firm_id)),
    [ziyaretler]
  );

  // O ay HENÜZ ziyaret edilmemiş firmalar — takvime eklenen firma
  // buradan otomatik düşer.
  const ziyaretEdilmeyenler = useMemo(
    () => firmalar.filter((f) => !ziyaretEdilenFirmaIdleri.has(f.id)),
    [firmalar, ziyaretEdilenFirmaIdleri]
  );

  // Takvimde o ay görünen firmaların TMGD'leri — renk lejantı için.
  const tmgdLejanti = useMemo(() => {
    const m = new Map<string, { userId: string; ad: string; renk: string }>();
    for (const z of ziyaretler) {
      const atama = firmaTmgd.get(z.firm_id);
      const renk = tmgdRengi(atama);
      if (!atama || !renk || m.has(atama.userId)) continue;
      m.set(atama.userId, { userId: atama.userId, ad: atama.ad, renk });
    }
    return Array.from(m.values()).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  }, [ziyaretler, firmaTmgd]);

  // Ekleme panelinde gösterilecek firmalar: o gün zaten eklenmiş olanlar
  // listede görünmez (aynı gün aynı firma iki kez eklenmesin).
  const eklenebilirFirmalar = useMemo(() => {
    if (!secilenGun) return [];
    const oGunEklenmis = new Set(
      (gunlukZiyaretler.get(secilenGun) || []).map((z) => z.firm_id)
    );
    const arama = firmaArama.trim().toLocaleLowerCase("tr");
    return firmalar.filter(
      (f) =>
        !oGunEklenmis.has(f.id) &&
        (!arama || f.name.toLocaleLowerCase("tr").includes(arama))
    );
  }, [secilenGun, gunlukZiyaretler, firmalar, firmaArama]);

  function ayDegistir(fark: number) {
    const d = new Date(yil, ay + fark, 1);
    setYil(d.getFullYear());
    setAy(d.getMonth());
    panelKapat();
  }

  function buAyaDon() {
    setYil(bugun.getFullYear());
    setAy(bugun.getMonth());
    panelKapat();
  }

  function panelKapat() {
    setSecilenGun(null);
    setSecilenFirmalar([]);
    setFirmaArama("");
  }

  function gunSec(tarih: string) {
    if (!canWrite) return;
    if (secilenGun === tarih) {
      panelKapat();
      return;
    }
    setSecilenGun(tarih);
    setSecilenFirmalar([]);
    setFirmaArama("");
    setMesaj("");
  }

  function firmaIsaretle(firmId: string) {
    setSecilenFirmalar((onceki) =>
      onceki.includes(firmId)
        ? onceki.filter((x) => x !== firmId)
        : [...onceki, firmId]
    );
  }

  async function ziyaretleriEkle() {
    if (!secilenGun || secilenFirmalar.length === 0) return;
    setKaydediliyor(true);
    setHata("");
    setMesaj("");

    const kayitlar = secilenFirmalar.map((firmId) => ({
      firm_id: firmId,
      visit_date: secilenGun,
    }));

    const { error } = await supabase.from("visits").insert(kayitlar);
    setKaydediliyor(false);

    if (error) {
      setHata("Ziyaret eklenemedi: " + hataCevir(error));
      return;
    }
    setMesaj(`✓ ${secilenFirmalar.length} firma ${secilenGun} tarihine eklendi.`);
    panelKapat();
    veriYukle();
  }

  async function ziyaretSil(z: Visit) {
    if (!canWrite) return;
    const ad = firmaAdi.get(z.firm_id) || "Firma";
    if (!confirm(`${ad} — ${z.visit_date} ziyaret kaydı silinsin mi?`)) return;

    const { error } = await supabase.from("visits").delete().eq("id", z.id);
    if (error) {
      setHata("Ziyaret silinemedi: " + hataCevir(error));
      return;
    }
    setMesaj("✓ Ziyaret kaydı silindi.");
    veriYukle();
  }

  // Takvim hücreleri: baştaki boşluklar + ayın günleri
  const ofset = ayBasiOfset(yil, ay);
  const hucreler: (number | null)[] = [
    ...Array<null>(ofset).fill(null),
    ...Array.from({ length: ayGunSayisi }, (_, i) => i + 1),
  ];
  while (hucreler.length % 7 !== 0) hucreler.push(null);

  const bugunAnahtari = tarihAnahtari(
    bugun.getFullYear(),
    bugun.getMonth(),
    bugun.getDate()
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href="/dashboard" className="hover:underline">
          Gösterge Paneli
        </Link>
        <span>/</span>
        <span className="text-gray-700">Firma Takvimi</span>
      </div>
      <h1 className="text-2xl font-bold mb-1">Firma Takvimi</h1>
      <p className="text-sm text-gray-500 mb-5">
        Seçili ayın firma ziyaretlerini takvimde görüntüle, ekle ve sil. Ay
        içinde henüz ziyaret edilmemiş firmalar aşağıda listelenir.
      </p>

      {/* Ay gezinme */}
      <div className="flex items-center justify-between border rounded-xl p-3 mb-4">
        <button
          onClick={() => ayDegistir(-1)}
          className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm"
        >
          ‹ Önceki Ay
        </button>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg">
            {AY_ADLARI[ay]} {yil}
          </span>
          <button
            onClick={buAyaDon}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50 text-gray-600"
          >
            Bu Ay
          </button>
        </div>
        <button
          onClick={() => ayDegistir(1)}
          className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm"
        >
          Sonraki Ay ›
        </button>
      </div>

      {hata && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-4">
          {hata}
        </p>
      )}
      {mesaj && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3 mb-4">
          {mesaj}
        </p>
      )}
      {loading && <p className="text-sm text-gray-500 mb-3">Yükleniyor...</p>}

      {/* TAKVİM */}
      <div className="border rounded-xl overflow-hidden mb-6">
        <div
          className="grid bg-gray-50 border-b"
          style={{ gridTemplateColumns: TAKVIM_SUTUNLARI }}
        >
          {GUN_BASLIKLARI.map((g, i) => (
            <div
              key={g}
              className={
                "px-1 py-2 text-xs font-medium text-center " +
                (haftaSonuMu(i) ? "text-red-500 bg-red-50" : "text-gray-500")
              }
            >
              {g}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: TAKVIM_SUTUNLARI }}>
          {hucreler.map((gun, i) => {
            const haftaSonu = haftaSonuMu(i);
            if (gun === null) {
              return (
                <div
                  key={`bos-${i}`}
                  className={
                    "min-h-[92px] border-b border-r " +
                    (haftaSonu ? "bg-red-50/60" : "bg-gray-50/50")
                  }
                />
              );
            }
            const tarih = tarihAnahtari(yil, ay, gun);
            const oGun = gunlukZiyaretler.get(tarih) || [];
            const secili = secilenGun === tarih;
            const bugunMu = tarih === bugunAnahtari;

            return (
              <div
                key={tarih}
                onClick={() => gunSec(tarih)}
                className={
                  "min-h-[92px] border-b border-r p-1.5 align-top " +
                  (canWrite ? "cursor-pointer " : "") +
                  // Seçili gün her zaman öne çıkar; değilse hafta sonu
                  // hücreleri hafif kırmızı zeminle işaretlenir.
                  (secili
                    ? "bg-blue-50 ring-1 ring-inset ring-blue-400 "
                    : haftaSonu
                      ? "bg-red-50/60 " + (canWrite ? "hover:bg-red-100/60 " : "")
                      : canWrite
                        ? "hover:bg-gray-50 "
                        : "")
                }
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={
                      "text-xs w-5 h-5 flex items-center justify-center rounded-full " +
                      (bugunMu ? "bg-black text-white font-semibold" : "text-gray-500")
                    }
                  >
                    {gun}
                  </span>
                  {oGun.length > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full">
                      {oGun.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {oGun.slice(0, 3).map((z) => {
                    // Firma etiketi, atandığı TMGD'nin rengiyle basılır.
                    // Ataması olmayan firma beyaz zeminde kalır.
                    const atama = firmaTmgd.get(z.firm_id);
                    const renk = tmgdRengi(atama);
                    return (
                      <div
                        key={z.id}
                        className={
                          "group flex items-center gap-1 border rounded px-1 py-0.5 " +
                          (renk ? "" : "bg-white")
                        }
                        style={renk ? { backgroundColor: renk } : undefined}
                        title={
                          (firmaAdi.get(z.firm_id) || "") +
                          (atama ? ` — TMGD: ${atama.ad}` : "")
                        }
                      >
                        <span
                          className={
                            "text-[10px] truncate flex-1 min-w-0 " +
                            (renk ? "text-black" : "")
                          }
                        >
                          {firmaAdi.get(z.firm_id) || "—"}
                        </span>
                        {canWrite && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              ziyaretSil(z);
                            }}
                            className={
                              "text-[10px] shrink-0 group-hover:text-red-600 " +
                              (renk ? "text-black/40" : "text-gray-300")
                            }
                            title="Ziyaret kaydını sil"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {oGun.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">
                      +{oGun.length - 3} firma daha
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RENK LEJANTI — takvimde görünen TMGD'ler */}
      {tmgdLejanti.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6 text-xs text-gray-600">
          <span className="text-gray-400">Firma renkleri (TMGD):</span>
          {tmgdLejanti.map((t) => (
            <span key={t.userId} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3.5 h-3.5 rounded border"
                style={{ backgroundColor: t.renk }}
              />
              {t.ad}
            </span>
          ))}
        </div>
      )}

      {/* SEÇİLİ GÜN — çoklu firma ekleme paneli */}
      {secilenGun && canWrite && (
        <div className="border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              {secilenGun} — Firma Ekle
              {secilenFirmalar.length > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {secilenFirmalar.length} seçili
                </span>
              )}
            </h3>
            <button
              onClick={panelKapat}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              Kapat ✕
            </button>
          </div>

          <input
            value={firmaArama}
            onChange={(e) => setFirmaArama(e.target.value)}
            placeholder="Firma ara..."
            className="w-full border rounded px-3 py-2 text-sm mb-3"
          />

          <div className="max-h-64 overflow-y-auto border rounded divide-y mb-3">
            {eklenebilirFirmalar.length === 0 && (
              <p className="text-sm text-gray-500 p-3">
                Eklenebilecek firma yok.
              </p>
            )}
            {eklenebilirFirmalar.map((f) => {
              const ziyaretEdildi = ziyaretEdilenFirmaIdleri.has(f.id);
              return (
                <label
                  key={f.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={secilenFirmalar.includes(f.id)}
                    onChange={() => firmaIsaretle(f.id)}
                    className="w-4 h-4"
                  />
                  <span className="flex-1 min-w-0 truncate">{f.name}</span>
                  {ziyaretEdildi && (
                    <span className="text-[10px] text-gray-400 shrink-0">
                      bu ay ziyaret edildi
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <button
            onClick={ziyaretleriEkle}
            disabled={secilenFirmalar.length === 0 || kaydediliyor}
            className="px-4 py-2 rounded bg-black text-white text-sm disabled:bg-gray-300"
          >
            {kaydediliyor
              ? "Ekleniyor..."
              : `Takvime Ekle${secilenFirmalar.length > 0 ? ` (${secilenFirmalar.length})` : ""}`}
          </button>
        </div>
      )}

      {/* ZİYARET EDİLMEYEN FİRMALAR */}
      <div className="border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700">
            {AY_ADLARI[ay]} {yil} — Ziyaret Edilmeyen Firmalar
          </h3>
          <span
            className={
              "text-xs font-semibold px-2 py-0.5 rounded " +
              (ziyaretEdilmeyenler.length === 0
                ? "bg-green-100 text-green-700"
                : "bg-amber-50 text-amber-700")
            }
          >
            {ziyaretEdilmeyenler.length} / {firmalar.length}
          </span>
        </div>

        {!loading && ziyaretEdilmeyenler.length === 0 && (
          <p className="text-sm text-gray-500">
            Bu ay tüm firmalar ziyaret edilmiş. ✓
          </p>
        )}

        <ul className="divide-y">
          {ziyaretEdilmeyenler.map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-2 text-sm">
              {/* "Takvime ekle" firma adından ÖNCE gelir. */}
              {canWrite && (
                <button
                  onClick={() => {
                    // Varsayılan olarak bugünün tarihi (seçili ay dışındaysa
                    // ayın 1'i) açılır ve firma önceden işaretlenir.
                    const varsayilan =
                      yil === bugun.getFullYear() && ay === bugun.getMonth()
                        ? bugunAnahtari
                        : ayBasi;
                    setSecilenGun(varsayilan);
                    setSecilenFirmalar([f.id]);
                    setFirmaArama("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-50 shrink-0"
                >
                  Takvime ekle
                </button>
              )}
              <Link
                href={`/firms/${f.id}`}
                className="truncate hover:underline min-w-0"
              >
                {f.name}
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-gray-400 mt-3">
          Bir firma takvime eklendiği anda bu listeden düşer. Kayıtlar
          Ziyaretler sayfasıyla aynı veriyi kullanır.
        </p>
      </div>
    </div>
  );
}
