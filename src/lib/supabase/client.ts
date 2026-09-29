import { createClient } from "@supabase/supabase-js";

// Ortam değişkenleri yoksa (ör. Vercel dışı bir ortamda `npm run build`)
// createClient "supabaseUrl is required" hatası fırlatıp build'i
// durduruyordu. Bu durumda geçici bir yer tutucu adresle istemci kurulur:
// build tamamlanır, ama uygulama gerçek veritabanına bağlanamaz — konsola
// uyarı basılır. Vercel'de değişkenler tanımlı olduğu için etkisi yoktur.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil — veritabanı bağlantısı çalışmayacak."
  );
}

export const supabase = createClient(url, anonKey);
