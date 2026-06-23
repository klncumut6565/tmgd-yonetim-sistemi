"use client";

// ⚠️ DÜZELTME: Kaynaktaki (TESLİMAT 014) login() fonksiyonu ne hata
// gösteriyordu ne de başarılı girişte bir yere yönlendiriyordu — kullanıcı
// "Giriş Yap"a basınca (başarılı da olsa, hatalı da olsa) ekranda hiçbir
// şey değişmiyordu. Burada hata mesajı ve dashboard'a yönlendirme eklendi.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function login() {
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-[400px] border rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-6">
          TMGD Yönetim Sistemi
        </h1>

        {error && (
          <p className="text-red-600 text-sm mb-3">{error}</p>
        )}

        <input
          className="border p-2 w-full mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-3"
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full p-2 rounded bg-black text-white"
        >
          Giriş Yap
        </button>
      </div>
    </div>
  );
}
