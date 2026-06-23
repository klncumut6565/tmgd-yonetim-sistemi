import { supabase } from "@/lib/supabase/client";

// NOT: package.json'da Next.js 15 kullanıldığı için (orijinal teslimattan
// farklı olarak) App Router'da `params` artık bir Promise olarak gelir.
// Bu yüzden burada `await params` kullanıldı; Next.js 14 ve altı kullanıyorsanız
// `params` direkt obje olarak da kullanılabilir.

export default async function FirmDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: firm } = await supabase
    .from("firms")
    .select("*")
    .eq("id", id)
    .single();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">{firm?.name}</h1>

      <div className="mt-6">
        <p>Şehir: {firm?.city}</p>
        <p>İlçe: {firm?.district}</p>
        <p>Telefon: {firm?.phone}</p>
        <p>Email: {firm?.email}</p>
      </div>
    </div>
  );
}
