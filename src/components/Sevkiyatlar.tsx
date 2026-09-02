"use client";

// src/components/Sevkiyatlar.tsx
//
// "Sevkiyatlar" — Taşıma & Kimyasal Yönetimi altındaki üçüncü alt sekme.
// TasimaEvraki.tsx'te kaydedilmiş (onay verilmiş/nihai) tüm taşıma
// evraklarının, taşıma TARİHİNE göre sıralı özet listesi. Salt-okunur bir
// rapor görünümüdür — düzenleme yapılmaz; bir kaydı düzenlemek için
// "Aç" ile Taşıma Evrakı sekmesine (o evrak editörde yüklenmiş halde)
// geçilir.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";
import { useUser } from "@/hooks/useUser";

type Sevkiyat = {
  id: string;
  document_no: string;
  transport_date: string | null;
  consignor: string | null;
  consignee: string | null;
  carrier: string | null;
  status: string | null;
  total_points: number | null;
  orange_plate_required: boolean | null;
  tunnel_restriction_code: string | null;
  printed_at: string | null;
  created_at: string;
};

/** consignor/consignee alanları "Ünvan\nAdres" şeklinde saklanır — listede
 *  yalnızca ilk satırı (ünvanı) gösteriyoruz. */
function ilkSatir(metin: string | null): string {
  if (!metin) return "—";
  return metin.split("\n")[0].trim() || "—";
}

function tarihYaz(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function tarihSaatYaz(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Sevkiyatlar({
  firmId,
  onAc,
}: {
  firmId: string;
  /** "Aç" tıklanınca çağrılır — üst sayfa bu ID'yi Taşıma Evrakı
   *  sekmesine (preselectEvrakId olarak) iletip sekmeyi değiştirir. */
  onAc: (evrakId: string) => void;
}) {
  const [sevkiyatlar, setSevkiyatlar] = useState<Sevkiyat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [arama, setArama] = useState("");
  // Silme akışı: önce onay istenir (yanlışlıkla silmeyi önlemek için),
  // onaylanınca kalemler + evrak birlikte silinir.
  const [silinecek, setSilinecek] = useState<Sevkiyat | null>(null);
  const [siliniyor, setSiliniyor] = useState(false);

  const { canWrite: canWriteGenel, profile } = useUser();
  // TasimaEvraki.tsx ile aynı yetki mantığı: firma kullanıcıları da kendi
  // evraklarını yönetebilir.
  const canWrite = canWriteGenel || profile?.role === "company";


  const yukle = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase
      .from("transport_documents")
      .select(
        "id, document_no, transport_date, consignor, consignee, carrier, status, total_points, orange_plate_required, tunnel_restriction_code, printed_at, created_at"
      )
      .eq("firm_id", firmId)
      // Sevkiyat = fiilen YAZDIRILMIŞ evrak. Sadece kaydedilmiş ama hiç
      // yazdırılmamış taslaklar bu listede görünmez — bkz. TasimaEvraki.
      // tsx → pdfYazdir() (migration 053).
      .not("printed_at", "is", null)
      // Taşıma TARİHİNE göre sıralı (en yeni sevkiyat en üstte); tarih
      // boş bırakılmış (nadir) kayıtlar en sona düşer.
      .order("transport_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (err) {
      setError(hataCevir(err));
      setSevkiyatlar([]);
    } else {
      setSevkiyatlar((data as Sevkiyat[]) || []);
    }
    setLoading(false);
  }, [firmId]);

  async function sevkiyatSil() {
    if (!silinecek || !canWrite) return;
    setSiliniyor(true);
    setError("");
    // Önce kalemler (transport_document_items), sonra evrakın kendisi —
    // FK kısıtı ON DELETE CASCADE olsa bile açıkça silmek güvenli.
    const { error: kalemErr } = await supabase
      .from("transport_document_items")
      .delete()
      .eq("document_id", silinecek.id);
    if (kalemErr) {
      setError("Sevkiyat kalemleri silinemedi: " + hataCevir(kalemErr));
      setSiliniyor(false);
      return;
    }
    const { error: evrakErr } = await supabase
      .from("transport_documents")
      .delete()
      .eq("id", silinecek.id);
    setSiliniyor(false);
    if (evrakErr) {
      setError("Sevkiyat silinemedi: " + hataCevir(evrakErr));
      return;
    }
    setSilinecek(null);
    yukle();
  }

  useEffect(() => {
    yukle();
  }, [yukle]);

  const gosterilen = sevkiyatlar.filter((s) => {
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    if (!q) return true;
    return (
      s.document_no?.toLocaleLowerCase("tr-TR").includes(q) ||
      ilkSatir(s.consignor).toLocaleLowerCase("tr-TR").includes(q) ||
      ilkSatir(s.consignee).toLocaleLowerCase("tr-TR").includes(q) ||
      (s.carrier || "").toLocaleLowerCase("tr-TR").includes(q)
    );
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-3">
        <h3 className="font-semibold text-sm">Sevkiyatlar</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Fiilen yazdırılmış (sevk edilmeye hazırlanmış) taşıma evrakları — taşıma tarihine göre sıralı.
          Kaydedilip henüz yazdırılmamış taslak evraklar burada listelenmez.
        </p>
      </div>

      <input
        className="border p-2 rounded-lg text-sm w-full mb-3"
        placeholder="🔍 Evrak no, gönderen, alıcı veya taşıyıcı ara..."
        value={arama}
        onChange={(e) => setArama(e.target.value)}
      />

      {loading && <p className="text-sm text-gray-400">Yükleniyor...</p>}
      {error && (
        <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">{error}</p>
      )}

      {!loading && !error && gosterilen.length === 0 && (
        <div className="border rounded-xl p-8 text-center text-gray-400 text-sm">
          {sevkiyatlar.length === 0
            ? "Henüz yazdırılmış sevkiyat yok — Taşıma Evrakı sekmesinden 🖨️ Yazdır ile bir evrak yazdırdıkça burada listelenir."
            : "Aramanla eşleşen sevkiyat yok."}
        </div>
      )}

      {gosterilen.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="p-2.5 font-medium">Tarih</th>
                <th className="p-2.5 font-medium">Evrak No</th>
                <th className="p-2.5 font-medium">Gönderen</th>
                <th className="p-2.5 font-medium">Alıcı</th>
                <th className="p-2.5 font-medium">Taşıyıcı</th>
                <th className="p-2.5 font-medium text-center">1.1.3.6</th>
                <th className="p-2.5 font-medium text-center">Turuncu Plaka</th>
                <th className="p-2.5 font-medium whitespace-nowrap">Yazdırıldı</th>
                <th className="p-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {gosterilen.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-2.5 whitespace-nowrap">{tarihYaz(s.transport_date)}</td>
                  <td className="p-2.5 font-semibold whitespace-nowrap">{s.document_no}</td>
                  <td className="p-2.5">{ilkSatir(s.consignor)}</td>
                  <td className="p-2.5">{ilkSatir(s.consignee)}</td>
                  <td className="p-2.5">{s.carrier || "—"}</td>
                  <td className="p-2.5 text-center">
                    {s.total_points != null ? `${Number(s.total_points).toFixed(0)}p` : "muaf"}
                    {s.tunnel_restriction_code ? ` · ${s.tunnel_restriction_code}` : ""}
                  </td>
                  <td className="p-2.5 text-center">
                    {s.orange_plate_required ? (
                      <span className="text-red-600">🔶 Gerekli</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-2.5 whitespace-nowrap text-gray-500">{tarihSaatYaz(s.printed_at)}</td>
                  <td className="p-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => onAc(s.id)}
                      className="text-blue-600 hover:underline"
                    >
                      Aç →
                    </button>
                    {canWrite && (
                      <button
                        onClick={() => setSilinecek(s)}
                        title="Bu sevkiyatı sil"
                        className="ml-3 text-red-600 hover:underline"
                      >
                        Sil
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Silme onayı — yanlışlıkla kalıcı veri kaybını önlemek için */}
      {silinecek && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
            <h4 className="font-semibold text-sm mb-2">Sevkiyatı sil?</h4>
            <p className="text-xs text-gray-600 mb-1">
              <strong>{silinecek.document_no}</strong> numaralı, {tarihYaz(silinecek.transport_date)} tarihli
              sevkiyat ve ona bağlı tüm ürün kalemleri kalıcı olarak silinecek.
            </p>
            <p className="text-xs text-red-600 mb-4">Bu işlem geri alınamaz.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSilinecek(null)}
                disabled={siliniyor}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                onClick={sevkiyatSil}
                disabled={siliniyor}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {siliniyor ? "Siliniyor..." : "Evet, sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
