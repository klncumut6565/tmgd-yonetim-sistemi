"use client";

// AYARLAR — Profil bilgileri + şifre değiştirme
// Sol kolon: profil (ad soyad, telefon) — profiles tablosuna yazar
// Sağ kolon: şifre değiştirme — supabase.auth.updateUser
// Hesap bilgileri (e-posta, rol, onay durumu) salt okunur gösterilir.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

const ROLE_TR: Record<string, string> = {
  super_admin: "Süper Yönetici",
  admin: "Yönetici",
  tmgd: "TMGD",
  assistant: "Asistan",
  viewer: "İzleyici",
  company: "Firma Kullanıcısı",
};

export default function SettingsPage() {
  const { profile } = useUser();

  // Profil formu
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Şifre formu
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passSaving, setPassSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
      }
    }
    load();
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMsg("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      setProfileMsg("Oturum bulunamadı.");
      setProfileSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", user.id);

    setProfileSaving(false);
    setProfileMsg(error ? "Kaydedilemedi: " + error.message : "✓ Profil güncellendi");
  }

  async function changePassword() {
    setPassMsg("");

    if (password.length < 6) {
      setPassMsg("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== password2) {
      setPassMsg("Şifreler aynı değil.");
      return;
    }

    setPassSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPassSaving(false);

    if (error) {
      setPassMsg("Değiştirilemedi: " + error.message);
    } else {
      setPassMsg("✓ Şifre değiştirildi");
      setPassword("");
      setPassword2("");
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Ayarlar</h1>

      {/* Hesap bilgileri */}
      <div className="border rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500 block">E-posta</span>
          <span className="font-medium">{profile?.email || "—"}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Rol</span>
          <span className="font-medium">{ROLE_TR[profile?.role || ""] || profile?.role || "—"}</span>
        </div>
        <div>
          <span className="text-gray-500 block">Hesap Durumu</span>
          <span className="font-medium">
            {profile?.approval_status === "approved" ? "Onaylı" : profile?.approval_status === "pending" ? "Onay Bekliyor" : "Reddedildi"}
          </span>
        </div>
      </div>

      {/* Yan yana iki panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-xl p-5">
          <h2 className="font-bold mb-4">Profil Bilgileri</h2>

          <label className="block mb-3">
            <span className="text-sm text-gray-600">Ad Soyad</span>
            <input
              className="border p-2 w-full rounded mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-gray-600">Telefon</span>
            <input
              className="border p-2 w-full rounded mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={profileSaving}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {profileSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {profileMsg && <span className="text-sm text-gray-600">{profileMsg}</span>}
          </div>
        </div>

        <div className="border rounded-xl p-5">
          <h2 className="font-bold mb-4">Şifre Değiştir</h2>

          <label className="block mb-3">
            <span className="text-sm text-gray-600">Yeni Şifre</span>
            <input
              type="password"
              className="border p-2 w-full rounded mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-gray-600">Yeni Şifre (tekrar)</span>
            <input
              type="password"
              className="border p-2 w-full rounded mt-1"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={changePassword}
              disabled={passSaving}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {passSaving ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
            </button>
            {passMsg && <span className="text-sm text-gray-600">{passMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
