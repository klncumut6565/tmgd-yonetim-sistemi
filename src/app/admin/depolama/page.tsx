"use client";

// YÖNETİM → DEPOLAMA (yalnızca super_admin)
//
// Sistemdeki mevcut dosyaları sıkıştırır. Her dosya için:
//   1) Tarayıcıya indirilir, dosyaSikistir ile küçültülür (yükleme sırasındaki
//      kuralların AYNISI: e-imzalı PDF'e dokunulmaz, taranmış PDF ~150 DPI).
//   2) En az %10 küçüldüyse: sunucu orijinali firm-files-yedek'e kopyalar,
//      sıkıştırılmış hali AYNI YOLA yazılır → DB kayıtları/bağlantılar bozulmaz.
//   3) Sonuç kaydedilir; sayfa kapanırsa kaldığı yerden devam eder.
// HİÇBİR DOSYA SİLİNMEZ.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/supabase/authFetch";
import { useUser } from "@/hooks/useUser";
import { dosyaSikistirDetay } from "@/lib/dosyaSikistir";

type Aday = { yol: string; boyut: number; mime: string };
type Ozet = {
  firm_files_bayt: number;
  yedek_bayt: number;
  toplam_bayt: number;
  sikistirilan: number;
  degismeyen: number;
  hatali: number;
  kazanc_bayt: number;
};
type Satir = { yol: string; eski: number; yeni: number; durum: string };

const API = "/api/admin/depolama-sikistir";
const mb = (b: number) => (b / 1048576).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " MB";

async function apiPost(govde: Record<string, unknown>) {
  const r = await authFetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

export default function DepolamaPage() {
  const { loading: userLoading, isSuperAdmin } = useUser();
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [adaylar, setAdaylar] = useState<Aday[]>([]);
  const [hata, setHata] = useState("");
  const [calisiyor, setCalisiyor] = useState(false);
  const [islenen, setIslenen] = useState(0);
  const [oturumKazanc, setOturumKazanc] = useState(0);
  const [son, setSon] = useState<Satir[]>([]);
  const durdur = useRef(false);

  const yukle = useCallback(async () => {
    setHata("");
    const r = await authFetch(API);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setHata(j.error || "Liste alınamadı.");
      return;
    }
    setOzet(j.ozet);
    setAdaylar(j.adaylar);
  }, []);

  useEffect(() => {
    if (isSuperAdmin) yukle();
  }, [isSuperAdmin, yukle]);

  async function birDosya(a: Aday): Promise<Satir> {
    try {
      const { data: blob, error } = await supabase.storage.from("firm-files").download(a.yol);
      if (error || !blob) throw new Error("İndirilemedi: " + (error?.message || ""));
      const ad = a.yol.slice(a.yol.lastIndexOf("/") + 1);
      const dosya = new File([blob], ad, { type: a.mime });
      const s = await dosyaSikistirDetay(dosya);

      if (s.dosya === dosya || s.yeniBoyut >= s.eskiBoyut * 0.9) {
        await apiPost({ islem: "tamamla", yol: a.yol, durum: "degismedi", eskiBoyut: s.eskiBoyut, yeniBoyut: s.eskiBoyut });
        return { yol: a.yol, eski: s.eskiBoyut, yeni: s.eskiBoyut, durum: "değişmedi" };
      }

      // Geçici ağ kopmalarına ("Failed to fetch") karşı 3 deneme. Orijinal yedekte
      // durduğu ve yükleme tek parça yapıldığı için yarım kalan deneme dosyayı bozmaz.
      let sonHata = "";
      for (let deneme = 1; deneme <= 3; deneme++) {
        try {
          const { token } = await apiPost({ islem: "hazirla", yol: a.yol }); // yedek + imzalı adres
          const { error: upErr } = await supabase.storage
            .from("firm-files")
            .uploadToSignedUrl(a.yol, token, s.dosya, { contentType: a.mime, upsert: true });
          if (!upErr) { sonHata = ""; break; }
          sonHata = upErr.message;
        } catch (e) {
          sonHata = (e as Error).message;
        }
        await new Promise((r) => setTimeout(r, 2000 * deneme));
      }
      if (sonHata) throw new Error("Yüklenemedi: " + sonHata);

      await apiPost({ islem: "tamamla", yol: a.yol, durum: "sikistirildi", eskiBoyut: s.eskiBoyut, yeniBoyut: s.yeniBoyut });
      return { yol: a.yol, eski: s.eskiBoyut, yeni: s.yeniBoyut, durum: "sıkıştırıldı" };
    } catch (e) {
      const mesaj = (e as Error).message || String(e);
      await apiPost({ islem: "tamamla", yol: a.yol, durum: "hata", eskiBoyut: a.boyut, yeniBoyut: a.boyut, hata: mesaj }).catch(() => {});
      return { yol: a.yol, eski: a.boyut, yeni: a.boyut, durum: "hata: " + mesaj };
    }
  }

  async function baslat() {
    durdur.current = false;
    setCalisiyor(true);
    setIslenen(0);
    setOturumKazanc(0);
    setSon([]);
    const kuyruk = [...adaylar];
    const isci = async () => {
      while (!durdur.current) {
        const a = kuyruk.shift();
        if (!a) return;
        const sonuc = await birDosya(a);
        setIslenen((n) => n + 1);
        setOturumKazanc((k) => k + (sonuc.eski - sonuc.yeni));
        setSon((l) => [sonuc, ...l].slice(0, 30));
      }
    };
    await Promise.all([isci(), isci()]); // aynı anda 2 dosya
    setCalisiyor(false);
    await yukle();
  }

  if (userLoading) return <div className="p-6 text-gray-500">Yükleniyor...</div>;
  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="max-w-md p-4 rounded bg-amber-50 text-amber-800">Bu sayfa yalnızca süper yönetici içindir.</div>
      </div>
    );
  }

  const toplamAday = adaylar.reduce((t, a) => t + a.boyut, 0);
  const yuzde = adaylar.length ? Math.round((islenen / adaylar.length) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Depolama Sıkıştırma</h1>
        <Link href="/admin" className="text-sm text-gray-600 hover:underline">← Yönetim</Link>
      </div>

      <div className="mb-4 p-4 rounded bg-blue-50 text-blue-900 text-sm space-y-1">
        <p>Mevcut PDF ve görseller küçültülür. <b>HİÇBİR DOSYA SİLİNMEZ</b>: her dosyanın orijinali önce <code>firm-files-yedek</code> alanına kopyalanır.</p>
        <p>E-imzalı PDF&apos;lere dokunulmaz. Dosya yolları değişmez, kayıtlar ve bağlantılar aynen çalışır.</p>
        <p>İşlem sürerken bu sekmeyi <b>açık tutun</b>. Kapanırsa tekrar başlatın, kaldığı yerden devam eder.</p>
      </div>

      {hata && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{hata}</div>}

      {ozet && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kutu baslik="Firma dosyaları" deger={mb(ozet.firm_files_bayt)} />
          <Kutu baslik="Yedek alanı" deger={mb(ozet.yedek_bayt)} />
          <Kutu baslik="Toplam kazanç" deger={mb(ozet.kazanc_bayt)} />
          <Kutu baslik="İşlenen" deger={`${ozet.sikistirilan} sıkıştırıldı · ${ozet.degismeyen} aynı · ${ozet.hatali} hata`} />
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        {!calisiyor ? (
          <button
            onClick={baslat}
            disabled={!adaylar.length}
            className="px-4 py-2 rounded bg-gray-900 text-white disabled:opacity-40"
          >
            {adaylar.length ? `Sıkıştırmayı Başlat (${adaylar.length} dosya, ${mb(toplamAday)})` : "İşlenecek dosya yok"}
          </button>
        ) : (
          <button onClick={() => (durdur.current = true)} className="px-4 py-2 rounded bg-red-600 text-white">
            Durdur
          </button>
        )}
        {!calisiyor && <button onClick={yukle} className="px-3 py-2 rounded border text-sm">Yenile</button>}
      </div>

      {(calisiyor || islenen > 0) && (
        <div className="mb-4">
          <div className="h-3 rounded bg-gray-200 overflow-hidden">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${yuzde}%` }} />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {islenen} / {adaylar.length} dosya · bu oturumda kazanç: {mb(oturumKazanc)}
          </p>
        </div>
      )}

      {son.length > 0 && (
        <table className="w-full text-xs border">
          <thead className="bg-gray-50">
            <tr><th className="p-1 text-left">Dosya</th><th className="p-1">Önce</th><th className="p-1">Sonra</th><th className="p-1 text-left">Durum</th></tr>
          </thead>
          <tbody>
            {son.map((s) => (
              <tr key={s.yol} className="border-t">
                <td className="p-1 truncate max-w-xs" title={s.yol}>{s.yol.slice(s.yol.lastIndexOf("/") + 1)}</td>
                <td className="p-1 text-right">{mb(s.eski)}</td>
                <td className="p-1 text-right">{mb(s.yeni)}</td>
                <td className={`p-1 ${s.durum.startsWith("hata") ? "text-red-600" : ""}`}>{s.durum}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <R2Aktarim />
    </div>
  );
}

function Kutu({ baslik, deger }: { baslik: string; deger: string }) {
  return (
    <div className="p-3 rounded border bg-white">
      <div className="text-xs text-gray-500">{baslik}</div>
      <div className="font-semibold">{deger}</div>
    </div>
  );
}

// ============================================================ R2'YE TAŞIMA
type R2Durum = { durum: string; mesaj?: string };
type R2Ozet = { toplam_dosya: number; toplam_bayt: number; tasinan: number; tasinan_bayt: number; hatali: number };

function R2Aktarim() {
  const [r2, setR2] = useState<R2Durum | null>(null);
  const [ozet, setOzet] = useState<R2Ozet | null>(null);
  const [adaylar, setAdaylar] = useState<Aday[]>([]);
  const [hata, setHata] = useState("");
  const [calisiyor, setCalisiyor] = useState(false);
  const [islenen, setIslenen] = useState(0);
  const [hatalar, setHatalar] = useState<string[]>([]);
  const durdur = useRef(false);

  const yukle = useCallback(async () => {
    setHata("");
    const r = await authFetch("/api/admin/r2-aktar");
    const j = await r.json().catch(() => ({}));
    setR2(j.r2 ?? null);
    if (!r.ok) setHata(j.error || "Bilgi alınamadı.");
    setOzet(j.ozet ?? null);
    setAdaylar(j.adaylar ?? []);
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  async function baslat() {
    durdur.current = false;
    setCalisiyor(true);
    setIslenen(0);
    setHatalar([]);
    const kuyruk = [...adaylar];
    const isci = async () => {
      while (!durdur.current) {
        const a = kuyruk.shift();
        if (!a) return;
        const r = await authFetch("/api/admin/r2-aktar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yol: a.yol }),
        }).catch(() => null);
        if (!r || !r.ok) {
          const j = r ? await r.json().catch(() => ({})) : {};
          setHatalar((l) => [`${a.yol.slice(a.yol.lastIndexOf("/") + 1)}: ${j.error || "bağlantı hatası"}`, ...l].slice(0, 20));
        }
        setIslenen((n) => n + 1);
      }
    };
    await Promise.all([isci(), isci(), isci()]);
    setCalisiyor(false);
    await yukle();
  }

  const yuzde = adaylar.length ? Math.round((islenen / adaylar.length) * 100) : 0;

  return (
    <div className="mt-10 pt-6 border-t">
      <h2 className="text-2xl font-bold mb-3">Cloudflare R2&apos;ye Taşı</h2>
      <div className="mb-4 p-4 rounded bg-blue-50 text-blue-900 text-sm space-y-1">
        <p>Dosyalar R2&apos;ye <b>aynı yollarla</b> kopyalanır, veritabanı kayıtları değişmez. <b>Supabase&apos;deki dosyalar SİLİNMEZ.</b></p>
        <p>Taşıma sürerken sistem çalışmaya devam eder: dosya R2&apos;de varsa oradan, yoksa Supabase&apos;den açılır.</p>
      </div>

      {r2 && (
        <div className={`mb-4 p-3 rounded text-sm ${r2.durum === "tamam" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {r2.durum === "tamam" ? "✓ R2 bağlantısı çalışıyor (yazma/okuma/silme testi başarılı)." : `R2 bağlantısı: ${r2.mesaj}`}
        </div>
      )}
      {hata && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{hata}</div>}

      {ozet && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Kutu baslik="Supabase'deki dosyalar" deger={`${ozet.toplam_dosya} · ${mb(ozet.toplam_bayt)}`} />
          <Kutu baslik="R2'ye taşınan" deger={`${ozet.tasinan} · ${mb(ozet.tasinan_bayt)}`} />
          <Kutu baslik="Hatalı" deger={String(ozet.hatali)} />
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        {!calisiyor ? (
          <button
            onClick={baslat}
            disabled={!adaylar.length || r2?.durum !== "tamam"}
            className="px-4 py-2 rounded bg-orange-600 text-white disabled:opacity-40"
          >
            {adaylar.length ? `R2'ye Taşımayı Başlat (${adaylar.length} dosya)` : "Taşınacak dosya yok"}
          </button>
        ) : (
          <button onClick={() => (durdur.current = true)} className="px-4 py-2 rounded bg-red-600 text-white">Durdur</button>
        )}
        {!calisiyor && <button onClick={yukle} className="px-3 py-2 rounded border text-sm">Yenile</button>}
      </div>

      {(calisiyor || islenen > 0) && (
        <div className="mb-4">
          <div className="h-3 rounded bg-gray-200 overflow-hidden">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${yuzde}%` }} />
          </div>
          <p className="text-sm text-gray-600 mt-1">{islenen} / {adaylar.length} dosya</p>
        </div>
      )}
      {hatalar.length > 0 && (
        <ul className="text-xs text-red-600 space-y-1">{hatalar.map((h, i) => <li key={i}>{h}</li>)}</ul>
      )}
    </div>
  );
}
