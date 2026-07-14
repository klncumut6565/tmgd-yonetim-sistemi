"use client";

// Giriş + Kayıt ekranı.
// - Giriş: mevcut kullanıcı mail/şifre ile girer.
// - Kayıt: yeni TMGD mail/şifre/ad ile kaydolur. Supabase e-posta
//   doğrulama maili gönderir. Doğrulama + admin onayından sonra aktif olur.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { hataCevir } from "@/lib/hataCevir";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  // E-postayı gönderilebilir hâle getir: boşlukları at, küçük harfe çevir.
  // (Telefon klavyeleri ve kopyala-yapıştır sıkça sona boşluk ekler;
  // Supabase bunu "invalid format" diye reddediyor.)
  function temizEmail(): string {
    return email.trim().toLowerCase();
  }

  function emailGecerliMi(e: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  }

  async function login() {
    setError("");
    setInfo("");

    const eposta = temizEmail();
    if (!emailGecerliMi(eposta)) {
      setError("E-posta adresi geçersiz görünüyor. Boşluk veya eksik karakter olmadığından emin ol.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: eposta,
      password,
    });

    setBusy(false);

    if (error) {
      setError(hataCevir(error));
      return;
    }

    router.push("/firms");
  }

  async function register() {
    setError("");
    setInfo("");

    const eposta = temizEmail();
    if (!emailGecerliMi(eposta)) {
      setError("E-posta adresi geçersiz görünüyor. Boşluk veya eksik karakter olmadığından emin ol.");
      return;
    }
    if (!fullName.trim()) {
      setError("Lütfen ad soyad girin.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }

    setBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: eposta,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo:
          typeof window !== "undefined"
            ? window.location.origin + "/login"
            : undefined,
      },
    });

    setBusy(false);

    if (error) {
      setError(hataCevir(error));
      return;
    }

    // E-posta doğrulaması KAPALIYSA Supabase oturumu hemen açar →
    // kullanıcıyı doğrudan içeri al (AuthGuard onay ekranını gösterir).
    if (data.session) {
      router.push("/");
      return;
    }

    // Doğrulama AÇIKSA mail bekleniyor demektir.
    setInfo(
      "Kaydın alındı. E-postana bir doğrulama bağlantısı gönderdik — " +
        "lütfen mailini kontrol et. Doğruladıktan sonra hesabın yönetici " +
        "onayına düşecek. Onaylanınca giriş yapabilirsin."
    );
    setMode("login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-[420px] bg-white border rounded-xl p-7 shadow-sm">
        <h1 className="text-2xl font-bold mb-1">TMGD Yönetim Sistemi</h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === "login" ? "Hesabına giriş yap" : "Yeni hesap oluştur"}
        </p>

        {mode === "register" && (
          <input
            className="border p-2 w-full mb-3 rounded"
            placeholder="Ad Soyad"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}

        <input
          className="border p-2 w-full mb-3 rounded"
          placeholder="E-posta"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative mb-4">
          <input
            className="border p-2 w-full rounded pr-10"
            type={showPassword ? "text" : "password"}
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            title={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            {showPassword ? (
              // göz-kapalı (eye-off) ikonu
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              // göz-açık (eye) ikonu
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">
            {info}
          </div>
        )}

        <button
          onClick={mode === "login" ? login : register}
          disabled={busy}
          className="w-full p-2.5 rounded bg-black text-white disabled:opacity-50"
        >
          {busy
            ? "Lütfen bekle..."
            : mode === "login"
            ? "Giriş Yap"
            : "Kayıt Ol"}
        </button>

        <div className="mt-5 text-center text-sm text-gray-600">
          {mode === "login" ? (
            <>
              Hesabın yok mu?{" "}
              <button
                onClick={() => {
                  setMode("register");
                  setError("");
                  setInfo("");
                }}
                className="text-blue-600 hover:underline"
              >
                Kayıt ol
              </button>
            </>
          ) : (
            <>
              Zaten hesabın var mı?{" "}
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setInfo("");
                }}
                className="text-blue-600 hover:underline"
              >
                Giriş yap
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

