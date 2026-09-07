"use client";

// FİRMA TAKVİMİ (Gösterge Paneli bölümü)
// Gösterge Paneli sayfasında bir alt başlık olarak gösterilir. İki işi
// bir arada yapar:
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

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// Takvim başlıkları — hafta Pazartesi başlar (TR kullanımı).
const GUN_BASLIKLARI = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

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

export default function FirmaTakvimi() {
  const { canWrite } = useUser();

  const bugun = useMemo(() => new Date(), []);
  const [yil, setYil] = useState(bugun.getFullYear());
  const [ay, setAy] = useState(bugun.getMonth()); // 0-11

  const [firmalar, setFirmalar] = useState<Firm[]>([]);
  const [ziyaretler, setZiyaretler] = useState<Visit[]>([]);
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

    const [firmRes, visitRes] = await Promise.all([
      supabase.from("firms").select("id, name").order("name"),
      supabase
        .from("visits")
        .select("id, firm_id, visit_date, visit_type, summary")
        .gte("visit_date", ayBasi)
        .lte("visit_date", aySonu)
        .order("visit_date"),
    ]);

    if (firmRes.error) setHata("Firmalar yüklenemedi: " + hataCevir(firmRes.error));
    else setFirmalar((firmRes.data as Firm[]) || []);

    if (visitRes.error) setHata("Ziyaretler yüklenemedi: " + hataCevir(visitRes.error));
    else setZiyaretler((visitRes.data as Visit[]) || []);

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
    <div>
      <p className="text-sm text-gray-500 mb-4">
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
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {GUN_BASLIKLARI.map((g) => (
            <div
              key={g}
              className="px-2 py-2 text-xs font-medium text-gray-500 text-center"
            >
              {g}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {hucreler.map((gun, i) => {
            if (gun === null) {
              return <div key={`bos-${i}`} className="min-h-[92px] border-b border-r bg-gray-50/50" />;
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
                  (canWrite ? "cursor-pointer hover:bg-gray-50 " : "") +
                  (secili ? "bg-blue-50 ring-1 ring-inset ring-blue-400 " : "")
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
                  {oGun.slice(0, 3).map((z) => (
                    <div
                      key={z.id}
                      className="group flex items-center gap-1 bg-white border rounded px-1 py-0.5"
                      title={firmaAdi.get(z.firm_id) || ""}
                    >
                      <span className="text-[10px] truncate flex-1 min-w-0">
                        {firmaAdi.get(z.firm_id) || "—"}
                      </span>
                      {canWrite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            ziyaretSil(z);
                          }}
                          className="text-[10px] text-gray-300 group-hover:text-red-500 shrink-0"
                          title="Ziyaret kaydını sil"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
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
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 py-2 text-sm"
            >
              <Link
                href={`/firms/${f.id}`}
                className="truncate hover:underline"
              >
                {f.name}
              </Link>
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
                    document
                      .getElementById("firma-takvimi")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-50 shrink-0"
                >
                  Takvime ekle
                </button>
              )}
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
