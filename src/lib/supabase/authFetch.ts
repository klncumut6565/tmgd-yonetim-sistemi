"use client";

// Bu uygulama oturumu cookie'de degil, tarayici localStorage'inda tutuyor
// (@supabase/ssr kullanilmiyor, duz supabase-js). Bu yuzden sunucu
// tarafindaki API route'lari kullanicinin oturumunu cookie'den GOREMEZ.
//
// Cozum: kimlik dogrulama gereken API cagrilarinda access token'i acikca
// Authorization header'i olarak gonderiyoruz. Sunucu tarafi bu token'i
// dogrulayip kullaniciyi bulur (bkz. src/lib/supabase/verifySuperAdmin.ts).

import { supabase } from "./client";

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(url, { ...init, headers });
}
