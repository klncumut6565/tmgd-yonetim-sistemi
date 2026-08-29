"use client";

// Giriş + Kayıt ekranı.
// - Giriş: mevcut kullanıcı mail/şifre ile girer.
// - Kayıt: yeni TMGD mail/şifre/ad ile kaydolur. Supabase e-posta
//   doğrulama maili gönderir. Doğrulama + admin onayından sonra aktif olur.
//
// Görsel: masaüstünde form sabit kalır (giriş solda, kayıt sağda), kayan
// koyu panel modlar arası geçişte üstüne kayar (yaygın "sliding overlay"
// deseni). Mobilde overlay gizlenir, geçiş metin linkiyle yapılır.

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

  function gecisYap() {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
    setInfo("");
  }

  const eyeButton = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      tabIndex={-1}
      title={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
    >
      {showPassword ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );

  const feedback = (
    <>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      {info && (
        <div className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">{info}</div>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="relative w-full max-w-[880px] md:h-[560px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* ---- GİRİŞ — masaüstünde sol yarıda sabit ---- */}
        <div
          className={
            "md:absolute md:top-0 md:left-0 md:h-full md:w-1/2 items-center justify-center px-8 py-10 transition-opacity duration-500 " +
            (mode === "register" ? "hidden md:flex md:opacity-0 md:pointer-events-none" : "flex opacity-100")
          }
        >
          <div className="w-full max-w-xs">
            <h1 className="text-2xl font-bold text-slate-900">Giriş Yap</h1>
            <div className="w-10 h-1 bg-orange-500 rounded-full mt-2 mb-6" />

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
              {eyeButton}
            </div>

            {feedback}

            <button
              onClick={login}
              disabled={busy}
              className="w-full p-2.5 rounded bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? "Lütfen bekle..." : "Giriş Yap"}
            </button>

            <div className="mt-5 text-center text-sm text-gray-600 md:hidden">
              Hesabın yok mu?{" "}
              <button onClick={gecisYap} className="text-orange-600 font-medium hover:underline">
                Kayıt ol
              </button>
            </div>
          </div>
        </div>

        {/* ---- KAYIT — masaüstünde sağ yarıda sabit ---- */}
        <div
          className={
            "md:absolute md:top-0 md:left-1/2 md:h-full md:w-1/2 items-center justify-center px-8 py-10 transition-opacity duration-500 " +
            (mode === "register" ? "flex opacity-100" : "hidden md:flex md:opacity-0 md:pointer-events-none")
          }
        >
          <div className="w-full max-w-xs">
            <h1 className="text-2xl font-bold text-slate-900">Kayıt Ol</h1>
            <div className="w-10 h-1 bg-orange-500 rounded-full mt-2 mb-6" />

            <input
              className="border p-2 w-full mb-3 rounded"
              placeholder="Ad Soyad"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
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
              {eyeButton}
            </div>

            {feedback}

            <button
              onClick={register}
              disabled={busy}
              className="w-full p-2.5 rounded bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? "Lütfen bekle..." : "Kayıt Ol"}
            </button>

            <div className="mt-5 text-center text-sm text-gray-600 md:hidden">
              Zaten hesabın var mı?{" "}
              <button onClick={gecisYap} className="text-orange-600 font-medium hover:underline">
                Giriş yap
              </button>
            </div>
          </div>
        </div>

        {/* ---- KAYAN KARŞILAMA PANELİ — yalnızca masaüstü ----
             Formlar yerinde sabit durur; bu panel modlar arasında
             sağdan sola / soldan sağa kayarak aktif olmayan formu örter. */}
        <div
          className={
            "hidden md:flex absolute top-0 h-full w-1/2 flex-col items-center justify-center text-center px-10 " +
            "bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white overflow-hidden z-30 " +
            "transition-[left] duration-700 ease-in-out " +
            (mode === "login" ? "left-1/2" : "left-0")
          }
        >
          {/* ADR tehlike etiketinden ilham alan dekoratif elmaslar */}
          <div className="pointer-events-none absolute w-44 h-44 border-2 border-orange-400/25 rotate-45 -top-14 -right-14" />
          <div className="pointer-events-none absolute w-24 h-24 border-2 border-orange-400/15 rotate-45 bottom-10 left-8" />

          {mode === "login" ? (
            <>
              <p className="text-xs tracking-[0.2em] text-orange-300 font-semibold uppercase mb-3">
                TMGD Yönetim Sistemi
              </p>
              <h2 className="text-2xl font-bold mb-3">Aramıza Katıl</h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-7 max-w-[240px]">
                Firmalarını, belgelerini ve ADR süreçlerini tek yerden yönet.
                Kaydın yönetici onayından sonra aktifleşir.
              </p>
              <button
                onClick={gecisYap}
                className="border border-white/70 rounded-full px-7 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Kayıt Ol
              </button>
            </>
          ) : (
            <>
              <p className="text-xs tracking-[0.2em] text-orange-300 font-semibold uppercase mb-3">
                TMGD Yönetim Sistemi
              </p>
              <h2 className="text-2xl font-bold mb-3">Tekrar Hoş Geldin</h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-7 max-w-[240px]">
                Hesabın zaten var mı? Giriş yapıp kaldığın yerden devam et.
              </p>
              <button
                onClick={gecisYap}
                className="border border-white/70 rounded-full px-7 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Giriş Yap
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
