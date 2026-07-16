"use client";

// RAPORLAR SAYFASI
// 3 rapor türü:
//   1) Firma Genel Raporu   → PDF (jsPDF + autoTable)
//   2) Belge Durum Raporu   → PDF veya Excel
//   3) Görev Özet Raporu    → PDF veya Excel
//
// Tüm raporlar tarayıcı tarafında oluşturulur (server gerektirmez).
// Supabase'den veri çekilir → jsPDF / xlsx ile dosya indirilir.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";

type Firm = { id: string; name: string; city: string | null; tax_number: string | null };

const STATUS_TR: Record<string, string> = {
  draft: "Taslak", active: "Aktif", review: "Kontrolde", archived: "Arşiv",
  todo: "Yapılacak", in_progress: "Devam Ediyor", completed: "Tamamlandı",
  cancelled: "İptal", pending: "Bekliyor",
};

const PRIORITY_TR: Record<string, string> = {
  low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR");
}

export default function ReportsPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmId, setFirmId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("firms")
      .select("id, name, city, tax_number")
      .order("name")
      .then(({ data }) => {
        const list = (data as Firm[]) || [];
        setFirms(list);
        if (list.length > 0) setFirmId(list[0].id);
        setLoading(false);
      });
  }, []);

  const firmName = firms.find((f) => f.id === firmId)?.name || "";

  // ─── PDF: Firma Genel Raporu ───────────────────────────────────────
  async function generateFirmPdf() {
    if (!firmId) return;
    setGenerating("firm-pdf");
    setError("");

    try {
      const [firmRes, docsRes, tasksRes, vehRes, drvRes, empRes, visRes] =
        await Promise.all([
          supabase.from("firms").select("*").eq("id", firmId).single(),
          supabase.from("documents").select("title, status, expiry_date, current_version, document_types(name)").eq("firm_id", firmId).order("status"),
          supabase.from("tasks").select("title, status, priority, due_date").eq("firm_id", firmId).order("status"),
          supabase.from("vehicles").select("plate_number, brand, adr_valid_until, status").eq("firm_id", firmId),
          supabase.from("drivers").select("first_name, last_name, adr_valid_until").eq("firm_id", firmId),
          supabase.from("employees").select("first_name, last_name, position, department").eq("firm_id", firmId),
          supabase.from("visits").select("visit_date, visit_type, summary, next_visit_date").eq("firm_id", firmId).order("visit_date", { ascending: false }).limit(5),
        ]);

      if (firmRes.error) throw new Error(hataCevir(firmRes.error));

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const W = 210, MARGIN = 15;
      let y = MARGIN;

      // Başlık
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("TMGD YÖNETİM SİSTEMİ", MARGIN, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Firma Genel Raporu", MARGIN, 20);
      doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, W - MARGIN, 20, { align: "right" });
      y = 36;

      // Firma bilgileri
      const firm = firmRes.data as Record<string, unknown>;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(String(firm.name || ""), MARGIN, y); y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      if (firm.tax_number) { doc.text(`Vergi No: ${firm.tax_number}`, MARGIN, y); y += 5; }
      if (firm.city) { doc.text(`Şehir: ${firm.city}${firm.district ? " / " + firm.district : ""}`, MARGIN, y); y += 5; }
      if (firm.phone) { doc.text(`Tel: ${firm.phone}`, MARGIN, y); y += 5; }
      y += 4;

      // Özet kutular
      const boxes = [
        { label: "Belge", count: docsRes.data?.length || 0 },
        { label: "Görev", count: tasksRes.data?.length || 0 },
        { label: "Araç", count: vehRes.data?.length || 0 },
        { label: "Sürücü", count: drvRes.data?.length || 0 },
        { label: "Personel", count: empRes.data?.length || 0 },
      ];
      const boxW = (W - MARGIN * 2 - 4 * 4) / 5;
      boxes.forEach((b, i) => {
        const x = MARGIN + i * (boxW + 4);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, y, boxW, 16, 2, 2, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(String(b.count), x + boxW / 2, y + 9, { align: "center" });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(b.label, x + boxW / 2, y + 14, { align: "center" });
      });
      y += 22;

      // Belgeler
      if (docsRes.data && docsRes.data.length > 0) {
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,0);
        doc.text("Belgeler", MARGIN, y); y += 2;
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          headStyles: { fillColor: [30, 30, 30] },
          head: [["Belge Adı", "Tür", "Durum", "Geçerlilik", "Ver."]],
          body: (docsRes.data as Record<string, unknown>[]).map((d) => [
            String(d.title || ""),
            String((d.document_types as Record<string, unknown>)?.name || "—"),
            STATUS_TR[String(d.status)] || String(d.status),
            fmt(d.expiry_date as string | null),
            `v${d.current_version}`,
          ]),
          styles: { fontSize: 8 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      }

      // Görevler
      if (tasksRes.data && tasksRes.data.length > 0) {
        if (y > 240) { doc.addPage(); y = MARGIN; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,0);
        doc.text("Görevler", MARGIN, y); y += 2;
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          headStyles: { fillColor: [30, 30, 30] },
          head: [["Görev", "Durum", "Öncelik", "Termin"]],
          body: (tasksRes.data as Record<string, unknown>[]).map((t) => [
            String(t.title || ""),
            STATUS_TR[String(t.status)] || String(t.status),
            PRIORITY_TR[String(t.priority)] || String(t.priority),
            fmt(t.due_date as string | null),
          ]),
          styles: { fontSize: 8 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      }

      // Araçlar
      if (vehRes.data && vehRes.data.length > 0) {
        if (y > 240) { doc.addPage(); y = MARGIN; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,0);
        doc.text("Araçlar", MARGIN, y); y += 2;
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          headStyles: { fillColor: [30, 30, 30] },
          head: [["Plaka", "Marka", "ADR Geçerlilik", "Durum"]],
          body: (vehRes.data as Record<string, unknown>[]).map((v) => [
            String(v.plate_number || ""),
            String(v.brand || "—"),
            fmt(v.adr_valid_until as string | null),
            STATUS_TR[String(v.status)] || String(v.status),
          ]),
          styles: { fontSize: 8 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      }

      // Sürücüler
      if (drvRes.data && drvRes.data.length > 0) {
        if (y > 240) { doc.addPage(); y = MARGIN; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,0);
        doc.text("Sürücüler", MARGIN, y); y += 2;
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          headStyles: { fillColor: [30, 30, 30] },
          head: [["Ad Soyad", "ADR Geçerlilik"]],
          body: (drvRes.data as Record<string, unknown>[]).map((d) => [
            `${d.first_name} ${d.last_name}`,
            fmt(d.adr_valid_until as string | null),
          ]),
          styles: { fontSize: 8 },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      }

      // Son ziyaretler
      if (visRes.data && visRes.data.length > 0) {
        if (y > 240) { doc.addPage(); y = MARGIN; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,0);
        doc.text("Son Ziyaretler", MARGIN, y); y += 2;
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          headStyles: { fillColor: [30, 30, 30] },
          head: [["Tarih", "Tür", "Özet", "Sonraki Ziyaret"]],
          body: (visRes.data as Record<string, unknown>[]).map((v) => [
            fmt(v.visit_date as string | null),
            String(v.visit_type || "—"),
            String(v.summary || "—"),
            fmt(v.next_visit_date as string | null),
          ]),
          styles: { fontSize: 8 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `TMGD Yönetim Sistemi — ${new Date().toLocaleDateString("tr-TR")} — Sayfa ${i}/${pageCount}`,
          W / 2, 292, { align: "center" }
        );
      }

      doc.save(`${firmName}_Genel_Rapor_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF oluşturulamadı.");
    } finally {
      setGenerating(null);
    }
  }

  // ─── Excel: Belge Durum Raporu ─────────────────────────────────────
  async function generateDocExcel() {
    if (!firmId) return;
    setGenerating("doc-excel");
    setError("");

    try {
      const { data, error: err } = await supabase
        .from("documents")
        .select("title, status, current_version, expiry_date, valid_from, description, document_types(name, code), updated_at")
        .eq("firm_id", firmId)
        .order("expiry_date", { ascending: true });

      if (err) throw new Error(hataCevir(err));

      const XLSX = await import("xlsx");
      const rows = (data as Record<string, unknown>[]).map((d) => ({
        "Belge Adı": d.title,
        "Tür Kodu": (d.document_types as Record<string,unknown>)?.code || "",
        "Tür": (d.document_types as Record<string,unknown>)?.name || "",
        "Durum": STATUS_TR[String(d.status)] || String(d.status),
        "Versiyon": `v${d.current_version}`,
        "Geçerlilik Başlangıcı": d.valid_from ? fmt(d.valid_from as string) : "",
        "Geçerlilik Bitişi": d.expiry_date ? fmt(d.expiry_date as string) : "",
        "Kalan Gün": d.expiry_date
          ? Math.round((new Date(d.expiry_date as string).getTime() - Date.now()) / 86400000)
          : "",
        "Açıklama": d.description || "",
        "Son Güncelleme": fmt(d.updated_at as string),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [30,12,30,12,8,20,20,10,40,16].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, "Belgeler");
      XLSX.writeFile(wb, `${firmName}_Belge_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel oluşturulamadı.");
    } finally {
      setGenerating(null);
    }
  }

  // ─── Excel: Görev Özet Raporu ──────────────────────────────────────
  async function generateTaskExcel() {
    if (!firmId) return;
    setGenerating("task-excel");
    setError("");

    try {
      const { data, error: err } = await supabase
        .from("tasks")
        .select("title, status, priority, due_date, description, created_at")
        .eq("firm_id", firmId)
        .order("due_date", { ascending: true });

      if (err) throw new Error(hataCevir(err));

      const XLSX = await import("xlsx");
      const rows = (data as Record<string, unknown>[]).map((t) => ({
        "Görev": t.title,
        "Durum": STATUS_TR[String(t.status)] || String(t.status),
        "Öncelik": PRIORITY_TR[String(t.priority)] || String(t.priority),
        "Termin": t.due_date ? fmt(t.due_date as string) : "—",
        "Kalan Gün": t.due_date
          ? Math.round((new Date(t.due_date as string).getTime() - Date.now()) / 86400000)
          : "",
        "Açıklama": t.description || "",
        "Oluşturulma": fmt(t.created_at as string),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [40, 14, 10, 14, 10, 40, 14].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, "Görevler");
      XLSX.writeFile(wb, `${firmName}_Gorev_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel oluşturulamadı.");
    } finally {
      setGenerating(null);
    }
  }

  // ─── Excel: Tüm firmalar ADR takvim özeti ──────────────────────────
  async function generateAdrCalendarExcel() {
    setGenerating("adr-excel");
    setError("");

    try {
      const [drvRes, vehRes] = await Promise.all([
        supabase.from("drivers").select("first_name, last_name, adr_valid_until, status, firms(name)").order("adr_valid_until"),
        supabase.from("vehicles").select("plate_number, brand, adr_valid_until, status, firms(name)").order("adr_valid_until"),
      ]);

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const drvRows = (drvRes.data as Record<string, unknown>[] || []).map((d) => ({
        "Ad Soyad": `${d.first_name} ${d.last_name}`,
        "Firma": (d.firms as Record<string,unknown>)?.name || "",
        "ADR Bitiş": fmt(d.adr_valid_until as string | null),
        "Kalan Gün": d.adr_valid_until
          ? Math.round((new Date(d.adr_valid_until as string).getTime() - Date.now()) / 86400000)
          : "",
        "Durum": STATUS_TR[String(d.status)] || String(d.status),
      }));

      const vehRows = (vehRes.data as Record<string, unknown>[] || []).map((v) => ({
        "Plaka": v.plate_number,
        "Marka": v.brand || "—",
        "Firma": (v.firms as Record<string,unknown>)?.name || "",
        "ADR Bitiş": fmt(v.adr_valid_until as string | null),
        "Kalan Gün": v.adr_valid_until
          ? Math.round((new Date(v.adr_valid_until as string).getTime() - Date.now()) / 86400000)
          : "",
        "Durum": STATUS_TR[String(v.status)] || String(v.status),
      }));

      const wsD = XLSX.utils.json_to_sheet(drvRows);
      wsD["!cols"] = [24, 30, 14, 10, 10].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsD, "Sürücüler");

      const wsV = XLSX.utils.json_to_sheet(vehRows);
      wsV["!cols"] = [14, 16, 30, 14, 10, 10].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, wsV, "Araçlar");

      XLSX.writeFile(wb, `ADR_Takvim_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Excel oluşturulamadı.");
    } finally {
      setGenerating(null);
    }
  }

  const busy = generating !== null;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Raporlar</h1>
      <p className="text-gray-500 text-sm mb-8">
        Raporlar tarayıcınızda oluşturulur ve otomatik olarak indirilir.
      </p>

      {error && (
        <p className="mb-6 p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          {error}
        </p>
      )}

      {/* Firma seçimi */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Firma seç (firma bazlı raporlar için)
        </label>
        <select
          value={firmId}
          onChange={(e) => setFirmId(e.target.value)}
          className="border p-2 rounded text-sm min-w-[280px]"
          disabled={loading}
        >
          {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Rapor kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Firma Genel Raporu */}
        <div className="border rounded-xl p-5 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📄</span>
              <h2 className="font-bold">Firma Genel Raporu</h2>
            </div>
            <p className="text-sm text-gray-500">
              Seçili firmanın belgelerini, görevlerini, araçlarını,
              sürücülerini ve son ziyaretlerini tek PDF'te özetler.
            </p>
          </div>
          <button
            onClick={generateFirmPdf}
            disabled={busy || !firmId}
            className="mt-auto px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {generating === "firm-pdf" ? "Oluşturuluyor..." : "⬇ PDF İndir"}
          </button>
        </div>

        {/* Belge Durum Raporu */}
        <div className="border rounded-xl p-5 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📊</span>
              <h2 className="font-bold">Belge Durum Raporu</h2>
            </div>
            <p className="text-sm text-gray-500">
              Firmanın tüm belgelerini geçerlilik tarihleri ve kalan
              gün sayısıyla Excel'e aktarır.
            </p>
          </div>
          <button
            onClick={generateDocExcel}
            disabled={busy || !firmId}
            className="mt-auto px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {generating === "doc-excel" ? "Oluşturuluyor..." : "⬇ Excel İndir"}
          </button>
        </div>

        {/* Görev Özet Raporu */}
        <div className="border rounded-xl p-5 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">✅</span>
              <h2 className="font-bold">Görev Özet Raporu</h2>
            </div>
            <p className="text-sm text-gray-500">
              Seçili firmadaki tüm görevleri durum, öncelik ve kalan gün
              bilgisiyle Excel'e aktarır.
            </p>
          </div>
          <button
            onClick={generateTaskExcel}
            disabled={busy || !firmId}
            className="mt-auto px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {generating === "task-excel" ? "Oluşturuluyor..." : "⬇ Excel İndir"}
          </button>
        </div>

        {/* ADR Takvim Özeti — tüm firmalar */}
        <div className="border rounded-xl p-5 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🚛</span>
              <h2 className="font-bold">ADR Takvim Özeti</h2>
            </div>
            <p className="text-sm text-gray-500">
              Tüm firmalardaki sürücü ve araç ADR belge bitiş tarihlerini
              iki ayrı sekme hâlinde Excel'e aktarır.
              Firma filtresi uygulanmaz.
            </p>
          </div>
          <button
            onClick={generateAdrCalendarExcel}
            disabled={busy}
            className="mt-auto px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {generating === "adr-excel" ? "Oluşturuluyor..." : "⬇ Excel İndir"}
          </button>
        </div>

      </div>
    </div>
  );
}
