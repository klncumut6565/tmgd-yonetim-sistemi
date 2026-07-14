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

        <input
          className="border p-2 w-full mb-4 rounded"
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

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

