"use client";

// AYARLAR — sekmeli yapı
// Sekme 1: Profil (ad, telefon) + şifre değiştir
// Sekme 2: Bildirim ayarları (kullanıcı tamamen kendisi belirler)

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

const ROLE_TR: Record<string, string> = {
  super_admin: "Süper Yönetici",
  admin: "Yönetici",
  tmgd: "TMGD",
  assistant: "Asistan",
  viewer: "İzleyici",
  company: "Firma Kullanıcısı",
};

const TABS = [
  { key: "profil", label: "Profil" },
  { key: "bildirimler", label: "Bildirimler" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Slider bileşeni: 0 = kapalı, 1-365 = gün sayısı
function DaySlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{label}</span>
        <span className="text-sm font-bold">
          {value === 0 ? (
            <span className="text-gray-400">Kapalı</span>
          ) : (
            <span>{value} gün önce</span>
          )}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-3">{hint}</p>
      <input
        type="range"
        min={0}
        max={90}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-black"
      />
      <div className="flex justify-between text-[11px] text-gray-400 mt-1">
        <span>Kapalı</span>
        <span>15 gün</span>
        <span>30 gün</span>
        <span>45 gün</span>
        <span>60 gün</span>
        <span>90 gün</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { profile } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get("tab") as TabKey) || "profil";
  const [tab, setTab] = useState<TabKey>(initialTab);

  // ---------- Profil ----------
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // ---------- Şifre ----------
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passSaving, setPassSaving] = useState(false);

  // ---------- Bildirim ayarları ----------
  const [docDays, setDocDays] = useState(45);
  const [adrDays, setAdrDays] = useState(45);
  const [taskDays, setTaskDays] = useState(7);
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifMsg, setNotifMsg] = useState("");
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      // Profil
      const { data: pData } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (pData) {
        setFullName(pData.full_name || "");
        setPhone(pData.phone || "");
      }

      // Bildirim ayarları
      const { data: nData } = await supabase
        .from("user_notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (nData) {
        setDocDays(nData.doc_expiry_days ?? 45);
        setAdrDays(nData.adr_expiry_days ?? 45);
        setTaskDays(nData.task_due_days ?? 7);
        setNotifInApp(nData.notify_in_app ?? true);
        setNotifEmail(nData.notify_email ?? false);
      }
    }
    load();
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg("");
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) { setProfileMsg("Oturum bulunamadı."); setProfileSaving(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", user.id);

    setProfileSaving(false);
    setProfileMsg(error ? hataCevir(error) : "✓ Profil güncellendi");
  }

  async function changePassword() {
    setPassMsg("");
    if (password.length < 6) { setPassMsg("Şifre en az 6 karakter olmalı."); return; }
    if (password !== password2) { setPassMsg("Şifreler aynı değil."); return; }

    setPassSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPassSaving(false);
    if (error) { setPassMsg(hataCevir(error)); } else {
      setPassMsg("✓ Şifre değiştirildi");
      setPassword(""); setPassword2("");
    }
  }

  async function saveNotifSettings() {
    setNotifSaving(true);
    setNotifMsg("");
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) { setNotifMsg("Oturum bulunamadı."); setNotifSaving(false); return; }

    const payload = {
      user_id: user.id,
      doc_expiry_days: docDays,
      adr_expiry_days: adrDays,
      task_due_days: taskDays,
      notify_in_app: notifInApp,
      notify_email: notifEmail,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_notification_settings")
      .upsert(payload, { onConflict: "user_id" });

    setNotifSaving(false);
    setNotifMsg(error ? hataCevir(error) : "✓ Bildirim ayarları kaydedildi");
  }

  function switchTab(k: TabKey) {
    setTab(k);
    router.replace(`/settings?tab=${k}`, { scroll: false });
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-1">Ayarlar</h1>

      {/* Hesap bilgileri özeti */}
      <div className="border rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500 block text-xs mb-0.5">E-posta</span>
          <span className="font-medium">{profile?.email || "—"}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs mb-0.5">Rol</span>
          <span className="font-medium">{ROLE_TR[profile?.role || ""] || profile?.role || "—"}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-xs mb-0.5">Hesap Durumu</span>
          <span className="font-medium">
            {profile?.approval_status === "approved" ? "✓ Onaylı" :
             profile?.approval_status === "pending"  ? "⏳ Onay Bekliyor" : "Reddedildi"}
          </span>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={
              "px-4 py-2 rounded-t text-sm " +
              (tab === t.key ? "bg-black text-white" : "hover:bg-gray-100 text-gray-600")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFİL ── */}
      {tab === "profil" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded-xl p-5">
            <h2 className="font-bold mb-4">Profil Bilgileri</h2>
            <label className="block mb-3">
              <span className="text-sm text-gray-600">Ad Soyad</span>
              <input className="border p-2 w-full rounded mt-1" value={fullName}
                onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="block mb-4">
              <span className="text-sm text-gray-600">Telefon</span>
              <input className="border p-2 w-full rounded mt-1" value={phone}
                onChange={(e) => setPhone(e.target.value)} />
            </label>
            <div className="flex items-center gap-3">
              <button onClick={saveProfile} disabled={profileSaving}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
                {profileSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              {profileMsg && <span className="text-sm text-gray-600">{profileMsg}</span>}
            </div>
          </div>

          <div className="border rounded-xl p-5">
            <h2 className="font-bold mb-4">Şifre Değiştir</h2>
            <label className="block mb-3">
              <span className="text-sm text-gray-600">Yeni Şifre</span>
              <input type="password" className="border p-2 w-full rounded mt-1"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="block mb-4">
              <span className="text-sm text-gray-600">Yeni Şifre (tekrar)</span>
              <input type="password" className="border p-2 w-full rounded mt-1"
                value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </label>
            <div className="flex items-center gap-3">
              <button onClick={changePassword} disabled={passSaving}
                className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
                {passSaving ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
              </button>
              {passMsg && <span className="text-sm text-gray-600">{passMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── BİLDİRİMLER ── */}
      {tab === "bildirimler" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Kaydırıcıyı <strong>0</strong>'a getirirsen o uyarı türü tamamen kapanır.
            Bildirim zili sadece bu ayarlarda belirlediğin eşiği aşan belgeleri gösterir.
          </p>

          <DaySlider
            label="Belge geçerlilik uyarısı"
            hint="MSDS, faaliyet raporu gibi belgeler için kaç gün öncesinden uyarı alsın?"
            value={docDays}
            onChange={setDocDays}
          />

          <DaySlider
            label="ADR sertifika / araç belgesi uyarısı"
            hint="Sürücü ADR sertifikaları ve araç ADR belgeleri için uyarı eşiği"
            value={adrDays}
            onChange={setAdrDays}
          />

          <DaySlider
            label="Görev termin uyarısı"
            hint="Yaklaşan görev terminleri için kaç gün öncesinden hatırlatma gösterilsin?"
            value={taskDays}
            onChange={setTaskDays}
          />

          {/* Kanal tercihleri */}
          <div className="border rounded-xl p-4">
            <h3 className="font-medium mb-3 text-sm">Bildirim kanalları</h3>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input type="checkbox" checked={notifInApp}
                onChange={(e) => setNotifInApp(e.target.checked)}
                className="w-4 h-4 accent-black" />
              <span className="text-sm">
                <span className="font-medium">Uygulama içi</span>
                <span className="text-gray-400 ml-1">— bildirim zili</span>
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notifEmail}
                onChange={(e) => setNotifEmail(e.target.checked)}
                className="w-4 h-4 accent-black" />
              <span className="text-sm">
                <span className="font-medium">E-posta</span>
                <span className="text-gray-400 ml-1">— yakında aktif edilecek</span>
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={saveNotifSettings} disabled={notifSaving}
              className="px-5 py-2 rounded bg-black text-white disabled:opacity-50">
              {notifSaving ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </button>
            {notifMsg && <span className="text-sm text-gray-600">{notifMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
