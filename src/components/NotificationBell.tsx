"use client";

// BİLDİRİM ZİLİ — tüm kullanıcılar görür
//
// super_admin → onay bekleyen kullanıcılar + belge geçerlilik uyarıları
// diğerleri   → yalnızca belge geçerlilik uyarıları (kendi firmalarından)
//
// Uyarı eşiği: kullanıcının kendi ayarladığı gün sayısı (Ayarlar → Bildirimler)
// 30 sn'de bir ve sekmeye dönüldüğünde yenilenir.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { codeLabel } from "@/lib/belgeKatalogu";

type PendingUser = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ExpiringDoc = {
  id: string;
  title: string;
  firm_name: string;
  days_left: number;
  expiry_date: string;
};

type NotifSettings = {
  doc_expiry_days: number;
  adr_expiry_days: number;
};

const DEFAULT_SETTINGS: NotifSettings = {
  doc_expiry_days: 45,
  adr_expiry_days: 45,
};

function daysLabel(d: number): string {
  if (d < 0) return `${Math.abs(d)} gün geçti`;
  if (d === 0) return "Bugün doluyor";
  return `${d} gün kaldı`;
}

function daysBadgeClass(d: number): string {
  if (d < 0) return "bg-gray-700 text-gray-100";
  if (d <= 7) return "bg-amber-100 text-amber-800";
  if (d <= 14) return "bg-yellow-50 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

export default function NotificationBell() {
  const router = useRouter();
  const { isSuperAdmin, profile } = useUser();

  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDoc[]>([]);
  const [expiringAdrs, setExpiringAdrs] = useState<ExpiringDoc[]>([]);
  const [expiringBelgeTakip, setExpiringBelgeTakip] = useState<ExpiringDoc[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!profile) return;

    // 1) Kişisel bildirim ayarları
    const { data: sData } = await supabase
      .from("user_notification_settings")
      .select("doc_expiry_days, adr_expiry_days")
      .eq("user_id", profile.id)
      .maybeSingle();

    const s: NotifSettings = sData
      ? {
          doc_expiry_days: sData.doc_expiry_days ?? 45,
          adr_expiry_days: sData.adr_expiry_days ?? 45,
        }
      : DEFAULT_SETTINGS;
    setSettings(s);

    // 2) Onay bekleyenler (yalnızca super_admin)
    if (isSuperAdmin) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("approval_status", "pending")
        .limit(10);
      setPendingUsers((data as PendingUser[]) || []);
    }

    // 3) Belge geçerlilik uyarıları (ayara göre)
    if (s.doc_expiry_days > 0) {
      const { data } = await supabase
        .from("expiring_documents")
        .select("id, title, firm_name, days_left, expiry_date")
        .lte("days_left", s.doc_expiry_days)
        .order("days_left");
      setExpiringDocs((data as ExpiringDoc[]) || []);

      // 3b) Belge Takip madde geçerlilikleri (örn. TMGD Sertifikası, TMFB,
      // U-Net Yetkilendirme) — aynı eşiği (doc_expiry_days) kullanır.
      const { data: btData } = await supabase
        .from("expiring_firm_belgeleri")
        .select("id, code, period, firm_name, days_left, expiry_date")
        .lte("days_left", s.doc_expiry_days)
        .order("days_left");

      setExpiringBelgeTakip(
        ((btData as {
          id: string;
          code: string;
          period: string;
          firm_name: string;
          days_left: number;
          expiry_date: string;
        }[]) || []).map((b) => ({
          id: b.id,
          title: codeLabel(b.code, b.period),
          firm_name: b.firm_name,
          days_left: b.days_left,
          expiry_date: b.expiry_date,
        }))
      );
    } else {
      setExpiringDocs([]);
      setExpiringBelgeTakip([]);
    }

    // 4) ADR sertifika uyarıları (sürücü + araç, ayara göre)
    if (s.adr_expiry_days > 0) {
      const [drvRes, vehRes] = await Promise.all([
        supabase
          .from("adr_expiring_drivers")
          .select("id, first_name, last_name, adr_valid_until, firm_name")
          .lte("days_left", s.adr_expiry_days)
          .order("adr_valid_until"),
        supabase
          .from("adr_expiring_vehicles")
          .select("id, plate_number, adr_valid_until, firm_name")
          .lte("days_left", s.adr_expiry_days)
          .order("adr_valid_until"),
      ]);

      const drvDocs: ExpiringDoc[] = (drvRes.data || []).map((d: Record<string, unknown>) => ({
        id: String(d.id),
        title: `${d.first_name} ${d.last_name} — ADR Sertifikası`,
        firm_name: String(d.firm_name),
        days_left: Math.round(
          (new Date(String(d.adr_valid_until)).getTime() - Date.now()) / 86400000
        ),
        expiry_date: String(d.adr_valid_until),
      }));

      const vehDocs: ExpiringDoc[] = (vehRes.data || []).map((v: Record<string, unknown>) => ({
        id: String(v.id),
        title: `${v.plate_number} — ADR Belgesi`,
        firm_name: String(v.firm_name),
        days_left: Math.round(
          (new Date(String(v.adr_valid_until)).getTime() - Date.now()) / 86400000
        ),
        expiry_date: String(v.adr_valid_until),
      }));

      setExpiringAdrs([...drvDocs, ...vehDocs].sort((a, b) => a.days_left - b.days_left));
    } else {
      setExpiringAdrs([]);
    }
  }, [profile, isSuperAdmin]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const total =
    pendingUsers.length + expiringDocs.length + expiringAdrs.length + expiringBelgeTakip.length;

  const allDocs = [...expiringDocs, ...expiringBelgeTakip, ...expiringAdrs].sort(
    (a, b) => a.days_left - b.days_left
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded hover:bg-gray-100"
        title={total > 0 ? `${total} bildirim` : "Bildirim yok"}
      >
        <span className="text-lg">🔔</span>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center leading-none">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded-xl shadow-xl z-50 overflow-hidden max-h-[80vh] flex flex-col">
          {/* Başlık */}
          <div className="p-3 border-b font-medium text-sm flex items-center justify-between">
            <span>Bildirimler {total > 0 && `(${total})`}</span>
            <button
              onClick={() => { setOpen(false); router.push("/settings?tab=bildirimler"); }}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              ⚙ Ayarlar
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {total === 0 && (
              <p className="p-4 text-sm text-gray-500 text-center">
                Tüm belgeler güncel. ✓
              </p>
            )}

            {/* Onay bekleyenler — sadece super_admin */}
            {pendingUsers.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500 border-b">
                  Onay bekleyen kullanıcılar
                </div>
                {pendingUsers.map((u) => (
                  <div key={u.id} className="px-3 py-2.5 border-b text-sm">
                    <div className="font-medium">{u.full_name || "İsimsiz"}</div>
                    <div className="text-gray-400 text-xs">{u.email}</div>
                  </div>
                ))}
                <button
                  onClick={() => { setOpen(false); router.push("/admin"); }}
                  className="w-full py-2 text-xs font-medium text-center bg-black text-white hover:bg-gray-800"
                >
                  Yönetim → Onayla
                </button>
              </div>
            )}

            {/* Belge + ADR uyarıları */}
            {allDocs.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500 border-b">
                  Süre uyarıları
                  <span className="ml-1 text-gray-400">
                    (belge: {settings.doc_expiry_days} gün · ADR: {settings.adr_expiry_days} gün)
                  </span>
                </div>
                {allDocs.map((d, i) => (
                  <div key={`${d.id}-${i}`} className="px-3 py-2.5 border-b text-sm flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.title}</div>
                      <div className="text-gray-400 text-xs">{d.firm_name}</div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded whitespace-nowrap mt-0.5 ${daysBadgeClass(d.days_left)}`}>
                      {daysLabel(d.days_left)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
