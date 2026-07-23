"use client";

// =========================================================================
// KİMYASAL ENVANTER (ADR Transport — Aşama 2)
//
// Her firmanın kendi kimyasal envanteri. UN numarası veya madde adıyla
// Tablo A'da (adr_un_numbers, 2.939 satır) arama yapılır; seçilen kaydın
// ADR alanları (PSN, sınıf, PG, tünel, taşıma kategorisi...) OTOMATİK
// doldurulur — kullanıcı yalnızca firmaya özgü alanları (ticari ad,
// ambalaj, miktar) girer. Bu "şablona bağlı ekleme"dir: UN No Tablo A'da
// yoksa veritabanı tetikleyicisi kaydı reddeder (migration 027).
//
// Yetkiler: TMGD ekibi tam yönetim; 'company' rolü yalnızca ekleme +
// görme (düzenleme/silme butonları canWrite olmadan hiç çizilmez, RLS de
// ayrıca engeller).
// =========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import { useUser } from "@/hooks/useUser";

type UnRow = {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  class: string | null;
  classification_code: string | null;
  packing_group: string | null;
  tunnel_code: string | null;
  labels: string | null;
  transport_category: string | null;
  limited_quantity: string | null;
  excepted_quantity: string | null;
};

type FirmChemical = {
  id: string;
  un_number: string;
  proper_shipping_name: string;
  adr_class: string | null;
  packing_group: string | null;
  tunnel_code: string | null;
  transport_category: string | null;
  trade_name: string | null;
  packaging_info: string | null;
  annual_amount: string | null;
  notes: string | null;
};

export default function KimyasalEnvanter({ firmId }: { firmId: string }) {
  const { canWrite, profile } = useUser();
  // 'company' rolü ekleme yapabilir ama düzenleyemez/silemez.
  const ekleyebilir = canWrite || profile?.role === "company";

  const [liste, setListe] = useState<FirmChemical[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [mesaj, setMesaj] = useState("");

  // Arama
  const [sorgu, setSorgu] = useState("");
  const [sonuclar, setSonuclar] = useState<UnRow[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [acik, setAcik] = useState(false);
  const [secili, setSecili] = useState<UnRow | null>(null);
  const kutuRef = useRef<HTMLDivElement>(null);

  // Firmaya özgü alanlar
  const [ticariAd, setTicariAd] = useState("");
  const [ambalaj, setAmbalaj] = useState("");
  const [miktar, setMiktar] = useState("");

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const { data, error } = await supabase
      .from("firm_chemicals")
      .select(
        "id, un_number, proper_shipping_name, adr_class, packing_group, tunnel_code, transport_category, trade_name, packaging_info, annual_amount, notes"
      )
      .eq("firm_id", firmId)
      .order("un_number");
    if (error) {
      setListe([]);
      if (/does not exist|not find the table/i.test(error.message || "")) {
        setHata(
          "Kimyasal envanter için veritabanı güncellemesi henüz çalıştırılmamış. " +
            "Supabase → SQL Editor'de database/027_adr_transport_envanter.sql dosyasını çalıştır."
        );
      } else {
        setHata("Envanter yüklenemedi: " + hataCevir(error));
      }
    } else {
      setHata("");
      setListe((data as FirmChemical[]) || []);
    }
    setYukleniyor(false);
  }, [firmId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Tablo A araması (ADR sayfasındaki çalışan desenle aynı: 280ms debounce)
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = sorgu.trim();
      if (q.length < 2) {
        setSonuclar([]);
        return;
      }
      setAraniyor(true);
      const sayi = /^\d+$/.test(q);
      let qb = supabase.from("adr_un_numbers").select("*").limit(15);
      qb = sayi
        ? qb.ilike("un_number", `${q}%`)
        : qb.ilike("proper_shipping_name", `%${q}%`);
      const { data } = await qb.order("un_number");
      setSonuclar((data as UnRow[]) || []);
      setAraniyor(false);
    }, 280);
    return () => clearTimeout(t);
  }, [sorgu]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node))
        setAcik(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const zatenVar = useMemo(
    () =>
      secili
        ? liste.some(
            (l) =>
              l.un_number === secili.un_number &&
              l.proper_shipping_name === secili.proper_shipping_name
          )
        : false,
    [secili, liste]
  );

  async function ekle() {
    if (!secili) return;
    setMesaj("");
    const { error } = await supabase.from("firm_chemicals").insert({
      firm_id: firmId,
      adr_un_id: secili.id,
      un_number: secili.un_number,
      proper_shipping_name: secili.proper_shipping_name,
      adr_class: secili.class,
      classification_code: secili.classification_code,
      packing_group: secili.packing_group,
      tunnel_code: secili.tunnel_code,
      transport_category: secili.transport_category,
      labels: secili.labels,
      limited_quantity: secili.limited_quantity,
      excepted_quantity: secili.excepted_quantity,
      trade_name: ticariAd.trim() || null,
      packaging_info: ambalaj.trim() || null,
      annual_amount: miktar.trim() || null,
    });
    if (error) {
      setMesaj("Eklenemedi: " + hataCevir(error));
      return;
    }
    setMesaj(`✓ UN ${secili.un_number} envantere eklendi.`);
    setSecili(null);
    setSorgu("");
    setTicariAd("");
    setAmbalaj("");
    setMiktar("");
    yukle();
  }

  async function sil(k: FirmChemical) {
    if (!confirm(`UN ${k.un_number} — ${k.proper_shipping_name} envanterden silinsin mi?`))
      return;
    const { error } = await supabase
      .from("firm_chemicals")
      .delete()
      .eq("id", k.id);
    if (error) {
      setMesaj("Silinemedi: " + hataCevir(error));
      return;
    }
    yukle();
  }

  return (
    <div>
      {hata && (
        <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-3 mb-4">
          {hata}
        </p>
      )}

      {/* EKLEME — şablona bağlı: yalnızca Tablo A'dan seçim */}
      {ekleyebilir && !hata && (
        <div className="border rounded-xl p-4 mb-6 bg-gray-50">
          <h4 className="font-semibold mb-1">Envantere Kimyasal Ekle</h4>
          <p className="text-xs text-gray-500 mb-3">
            UN numarası veya madde adıyla ADR Tablo A&apos;da ara; ADR
            bilgileri otomatik doldurulur. Tablo A dışından madde eklenemez.
          </p>

          <div className="relative" ref={kutuRef}>
            <input
              className="border p-2 w-full rounded"
              placeholder="UN No veya madde adı (örn. 1203 veya BENZİN)"
              value={sorgu}
              onChange={(e) => {
                setSorgu(e.target.value);
                setSecili(null);
                setAcik(true);
              }}
              onFocus={() => setAcik(true)}
            />
            {acik && (sonuclar.length > 0 || araniyor) && (
              <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-72 overflow-auto">
                {araniyor && (
                  <p className="text-xs text-gray-400 p-2">Aranıyor...</p>
                )}
                {sonuclar.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSecili(r);
                      setSorgu(
                        `UN ${r.un_number} — ${r.proper_shipping_name.slice(0, 60)}`
                      );
                      setAcik(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0"
                  >
                    <span className="font-semibold">UN {r.un_number}</span>{" "}
                    {r.proper_shipping_name}
                    <span className="text-xs text-gray-400 ml-2">
                      Sınıf {r.class || "—"} · PG {r.packing_group || "—"} ·
                      Tünel {r.tunnel_code || "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {secili && (
            <div className="mt-3">
              {/* Tablo A'dan gelen (değiştirilemez) şablon alanları */}
              <div className="text-xs bg-white border rounded p-2 mb-3 grid grid-cols-2 md:grid-cols-4 gap-1">
                <span>Sınıf: <b>{secili.class || "—"}</b></span>
                <span>PG: <b>{secili.packing_group || "—"}</b></span>
                <span>Tünel: <b>{secili.tunnel_code || "—"}</b></span>
                <span>Taşıma Kat.: <b>{secili.transport_category || "—"}</b></span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input
                  className="border p-2 rounded text-sm"
                  placeholder="Ticari ad (opsiyonel)"
                  value={ticariAd}
                  onChange={(e) => setTicariAd(e.target.value)}
                />
                <input
                  className="border p-2 rounded text-sm"
                  placeholder="Ambalaj bilgisi (opsiyonel)"
                  value={ambalaj}
                  onChange={(e) => setAmbalaj(e.target.value)}
                />
                <input
                  className="border p-2 rounded text-sm"
                  placeholder="Yıllık miktar (opsiyonel)"
                  value={miktar}
                  onChange={(e) => setMiktar(e.target.value)}
                />
              </div>
              {zatenVar && (
                <p className="text-xs text-amber-600 mb-2">
                  Bu madde envanterde zaten var — yine de ekleyebilirsin
                  (farklı ambalaj/ticari ad için).
                </p>
              )}
              <button
                onClick={ekle}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Envantere Ekle
              </button>
            </div>
          )}

          {mesaj && <p className="text-sm mt-2">{mesaj}</p>}
        </div>
      )}

      {/* LİSTE */}
      {yukleniyor ? (
        <p className="text-sm text-gray-400">Envanter yükleniyor...</p>
      ) : liste.length === 0 && !hata ? (
        <p className="text-sm text-gray-400">
          Bu firmanın envanterinde henüz kimyasal yok.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-2">UN No</th>
                <th className="p-2">Resmi Taşıma Adı</th>
                <th className="p-2">Ticari Ad</th>
                <th className="p-2 text-center">Sınıf</th>
                <th className="p-2 text-center">PG</th>
                <th className="p-2 text-center">Tünel</th>
                <th className="p-2 text-center">Taş. Kat.</th>
                {canWrite && <th className="p-2"></th>}
              </tr>
            </thead>
            <tbody>
              {liste.map((k) => (
                <tr key={k.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-semibold whitespace-nowrap">
                    UN {k.un_number}
                  </td>
                  <td className="p-2">{k.proper_shipping_name}</td>
                  <td className="p-2 text-gray-500">{k.trade_name || "—"}</td>
                  <td className="p-2 text-center">{k.adr_class || "—"}</td>
                  <td className="p-2 text-center">{k.packing_group || "—"}</td>
                  <td className="p-2 text-center">{k.tunnel_code || "—"}</td>
                  <td className="p-2 text-center">
                    {k.transport_category || "—"}
                  </td>
                  {canWrite && (
                    <td className="p-2 text-right">
                      <button
                        onClick={() => sil(k)}
                        className="text-gray-400 hover:text-red-500"
                        title="Sil"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">
            {liste.length} kimyasal · ADR alanları Tablo A&apos;dan otomatik
            doldurulur.
          </p>
        </div>
      )}
    </div>
  );
}
