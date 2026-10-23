"use client";

// Firma detay → Notlar sekmesinin SAĞ panelinde gösterilen, YALNIZCA bu
// firmaya ait belge geçerlilik bildirimleri.
//
// Gösterge panelindeki "Yaklaşan Belge Süreleri" alanının firma bazlı
// karşılığıdır ve AYNI eşikleri kullanır:
//   - Genel pencere: BELGE_UYARI_GUN (uyariEsikleri.ts, şu an 45 gün)
//   - TMFB: 150 gün
//   - TMGD Sertifikası (S2): 120 gün
// Süresi bu eşiklerden uzak olan belgeler GÖSTERİLMEZ.
//
// Sürücü/araç view'ları (adr_expiring_*) firm_id döndürmediği için burada
// doğrudan drivers / vehicles tabloları firm_id ile sorgulanır — ek
// migration gerekmez. Belge Takip / Araç Evrakı belgeleri expiring_documents
// view'ından firm_id ile süzülür.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { BELGE_UYARI_GUN } from "@/lib/uyariEsikleri";

const GENEL_UYARI_GUN = BELGE_UYARI_GUN;
const TMFB_UYARI_GUN = 150;
const TMGD_UYARI_GUN = 120;

type Kalem = {
  id: string;
  label: string;
  docType: string;
  valid_until: string;
  days_left: number;
};

function daysLeft(dateStr: string): number {
  const target = new Date(dateStr.slice(0, 10) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function trTarih(d: string): string {
  const [y, m, g] = d.slice(0, 10).split("-");
  return `${g}.${m}.${y}`;
}

function DaysBadge({ d }: { d: number }) {
  const label = d < 0 ? `${Math.abs(d)} gün geçti` : d === 0 ? "Bugün" : `${d} gün kaldı`;
  const cls =
    d < 0
      ? "bg-gray-800 text-white"
      : d <= 7
        ? "bg-amber-100 text-amber-800"
        : "bg-gray-100 text-gray-700";
  return <span className={"px-2 py-0.5 rounded text-xs whitespace-nowrap " + cls}>{label}</span>;
}

function Bolum({ baslik, kalemler, bosMetin }: { baslik: string; kalemler: Kalem[]; bosMetin: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
        {baslik} {kalemler.length > 0 && <span className="text-gray-400">({kalemler.length})</span>}
      </h4>
      {kalemler.length === 0 ? (
        <p className="text-xs text-gray-400">{bosMetin}</p>
      ) : (
        <ul className="space-y-1.5">
          {kalemler.map((k) => (
            <li key={k.id} className="flex items-start justify-between gap-2 text-sm border-b last:border-0 pb-1.5">
              <div className="min-w-0">
                <div className="font-medium truncate">{k.label}</div>
                <div className="text-xs text-gray-500">
                  {k.docType} · {trTarih(k.valid_until)}
                </div>
              </div>
              <DaysBadge d={k.days_left} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FirmBelgeBildirimleri({ firmId }: { firmId: string }) {
  const [suruculer, setSuruculer] = useState<Kalem[]>([]);
  const [araclar, setAraclar] = useState<Kalem[]>([]);
  const [belgeler, setBelgeler] = useState<Kalem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let iptal = false;
    async function load() {
      setLoading(true);
      setError("");

      const [drvRes, vehRes, docRes, s2Res] = await Promise.all([
        supabase
          .from("drivers")
          .select("id, first_name, last_name, adr_valid_until, driving_license_valid_until")
          .eq("firm_id", firmId)
          .eq("status", "active"),
        supabase
          .from("vehicles")
          .select("id, plate_number, adr_valid_until, inspection_valid_until")
          .eq("firm_id", firmId)
          .eq("status", "active"),
        // Genel pencere ile TMFB (150) birlikte çekilir, istemcide süzülür.
        supabase
          .from("expiring_documents")
          .select("id, title, expiry_date, days_left")
          .eq("firm_id", firmId)
          .lte("days_left", Math.max(GENEL_UYARI_GUN, TMFB_UYARI_GUN))
          .order("days_left"),
        supabase
          .from("firm_belgeleri")
          .select("id, valid_until")
          .eq("firm_id", firmId)
          .eq("code", "S2")
          .not("valid_until", "is", null),
      ]);
      if (iptal) return;

      const hata = [drvRes, vehRes, docRes, s2Res].find((r) => r.error)?.error;
      if (hata) setError("Bildirimler kısmen yüklenemedi: " + hata.message);

      // ---- Sürücüler: SRC-5 (ADR) + Ehliyet --------------------------------
      const drv: Kalem[] = [];
      for (const d of (drvRes.data as Record<string, any>[]) || []) {
        const ad = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "(isimsiz)";
        if (d.adr_valid_until) {
          const g = daysLeft(String(d.adr_valid_until));
          if (g <= GENEL_UYARI_GUN)
            drv.push({ id: `drv-adr-${d.id}`, label: ad, docType: "SRC-5", valid_until: String(d.adr_valid_until), days_left: g });
        }
        if (d.driving_license_valid_until) {
          const g = daysLeft(String(d.driving_license_valid_until));
          if (g <= GENEL_UYARI_GUN)
            drv.push({ id: `drv-lic-${d.id}`, label: ad, docType: "Ehliyet", valid_until: String(d.driving_license_valid_until), days_left: g });
        }
      }

      // ---- Araçlar: ADR Belgesi + Muayene ------------------------------------
      const veh: Kalem[] = [];
      for (const v of (vehRes.data as Record<string, any>[]) || []) {
        const plaka = String(v.plate_number ?? "");
        if (v.adr_valid_until) {
          const g = daysLeft(String(v.adr_valid_until));
          if (g <= GENEL_UYARI_GUN)
            veh.push({ id: `veh-adr-${v.id}`, label: plaka, docType: "ADR Belgesi", valid_until: String(v.adr_valid_until), days_left: g });
        }
        if (v.inspection_valid_until) {
          const g = daysLeft(String(v.inspection_valid_until));
          if (g <= GENEL_UYARI_GUN)
            veh.push({ id: `veh-insp-${v.id}`, label: plaka, docType: "Muayene", valid_until: String(v.inspection_valid_until), days_left: g });
        }
      }

      // ---- Belge Takip / Araç Evrakı (dashboard ile aynı ayrıştırma) ---------
      const blg: Kalem[] = [];
      const muayeneMi = (t: string) => /muayene/i.test(t);
      for (const b of (docRes.data as Record<string, any>[]) || []) {
        const ham = String(b.title ?? "");
        if (/TMGD Sertifika/i.test(ham)) continue; // aşağıda S2'den gelir
        const g = Number(b.days_left);
        const esik = /TMFB/i.test(ham) ? TMFB_UYARI_GUN : GENEL_UYARI_GUN;
        if (g > esik) continue;
        const baslik = ham.replace(/^(Belge Takip|Araç Evrakı):\s*/, "");
        const plakali = /^Araç Evrakı:/.test(ham) ? /^(.*?)\s+—\s+(.+)$/.exec(baslik) : null;
        if (plakali) {
          const k: Kalem = { id: `arac-evrak-${b.id}`, label: plakali[2], docType: plakali[1], valid_until: String(b.expiry_date), days_left: g };
          if (muayeneMi(k.docType)) {
            const i = veh.findIndex((v) => v.label === k.label && muayeneMi(v.docType));
            if (i >= 0) {
              if (new Date(k.valid_until) > new Date(veh[i].valid_until)) veh[i] = k;
              continue;
            }
          }
          veh.push(k);
          continue;
        }
        blg.push({ id: `doc-${b.id}`, label: baslik, docType: "Belge", valid_until: String(b.expiry_date), days_left: g });
      }

      // ---- TMGD Sertifikası (S2) — 120 gün -----------------------------------
      for (const s of (s2Res.data as Record<string, any>[]) || []) {
        const g = daysLeft(String(s.valid_until));
        if (g > TMGD_UYARI_GUN) continue;
        blg.push({ id: `s2-${s.id}`, label: "TMGD Sertifikası", docType: "S2", valid_until: String(s.valid_until), days_left: g });
      }

      const sirala = (a: Kalem, b: Kalem) => a.days_left - b.days_left;
      setSuruculer(drv.sort(sirala));
      setAraclar(veh.sort(sirala));
      setBelgeler(blg.sort(sirala));
      setLoading(false);
    }
    load();
    return () => {
      iptal = true;
    };
  }, [firmId]);

  const toplam = suruculer.length + araclar.length + belgeler.length;
  const gecmis = [...suruculer, ...araclar, ...belgeler].filter((k) => k.days_left < 0).length;

  return (
    <aside className="border rounded-xl p-4 bg-white lg:sticky lg:top-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold">🔔 Belge Bildirimleri</h3>
        {!loading && toplam > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{toplam}</span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Yalnızca bu firmaya ait, süresi yaklaşan belgeler. Eşikler gösterge paneliyle aynı:{" "}
        {GENEL_UYARI_GUN} gün · TMFB {TMFB_UYARI_GUN} gün · TMGD sertifikası {TMGD_UYARI_GUN} gün.
      </p>

      {error && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <div className="space-y-4">
          {gecmis > 0 && (
            <p className="text-xs bg-gray-800 text-white rounded px-2 py-1">⚠️ {gecmis} belgenin süresi GEÇMİŞ.</p>
          )}
          <Bolum baslik="Sürücü Belgeleri" kalemler={suruculer} bosMetin={`${GENEL_UYARI_GUN} gün içinde süresi dolan sürücü belgesi yok. ✓`} />
          <Bolum baslik="Araç Belgeleri" kalemler={araclar} bosMetin={`${GENEL_UYARI_GUN} gün içinde süresi dolan araç belgesi yok. ✓`} />
          <Bolum baslik="Firma Belgeleri" kalemler={belgeler} bosMetin="Yaklaşan firma belgesi yok. ✓" />
        </div>
      )}
    </aside>
  );
}
