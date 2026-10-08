import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { YASAL_METINLER, yasalMetinBul } from "@/lib/yasalMetinler";

export function generateStaticParams() {
  return YASAL_METINLER.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = yasalMetinBul(slug);
  return { title: m ? `${m.baslik} | TMGD Yönetim Sistemi` : "TMGD Yönetim Sistemi" };
}

export default async function YasalMetinSayfasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = yasalMetinBul(slug);
  if (!m) notFound();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-4 py-12">
      <article className="max-w-3xl mx-auto">
        <a href="/login" className="text-xs text-blue-300/80 hover:text-blue-200">← Giriş sayfasına dön</a>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-4 mb-6">{m.baslik}</h1>
        {m.icerik.length === 0 ? (
          <p className="text-sm text-slate-400">Bu metin yakında yayınlanacaktır.</p>
        ) : (
          <div className="space-y-4 text-sm leading-relaxed">
            {m.icerik.map((satir, i) =>
              satir.startsWith("# ") ? (
                <h2 key={i} className="text-lg font-semibold text-white pt-3">{satir.slice(2)}</h2>
              ) : (
                <p key={i}>{satir}</p>
              )
            )}
          </div>
        )}
      </article>
    </div>
  );
}
