// src/lib/supabase/server.ts
// Server-side Supabase istemcisi — cookie-aware.
// Route handler'lar, server component'ler ve server action'lar için.
//
// Gereksinim: @supabase/ssr paketi (npm install @supabase/ssr)

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server component'te set çağrılabilir; middleware yoksa yut.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Aynı sebep.
          }
        },
      },
    }
  )
}
