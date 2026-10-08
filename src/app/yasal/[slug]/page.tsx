import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { YASAL_METINLER, yasalMetinBul, yasalBloklar } from "@/lib/yasalMetinler";

export function generateStaticParams() {
  return YASAL_METINLER.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = yasalMetinBul(slug);
  return { title: m ? `${m.baslik} | TMGD Yönetim Sistemi` : "TMGD Yönetim Sistemi" };
}

const LINK = "text-blue-300 underline hover:text-blue-200";

/** E-posta, web adresi ve SİAM telefonunu tıklanabilir yapar. */
function baglantila(metin: string): ReactNode[] {
  const re = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|www\.[\w-]+(?:\.[\w-]+)+|\+90 543 271 63 77)/g;
  const out: ReactNode[] = [];
  let son = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(metin))) {
    out.push(metin.slice(son, m.index));
    const t = m[0];
    const href = t.includes("@") ? `mailto:${t}` : t.startsWith("www.") ? `https://${t}` : "tel:+905432716377";
    out.push(
      <a key={i++} href={href} className={LINK} {...(href.startsWith("https") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {t}
      </a>
    );
    son = m.index + t.length;
  }
  out.push(metin.slice(son));
  return out;
}

export default async function YasalMetinSayfasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = yasalMetinBul(slug);
  if (!m) notFound();
  const bloklar = yasalBloklar(m.ham);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-4 py-12">
      <article className="max-w-3xl mx-auto">
        <a href="/login" className="text-xs text-blue-300/80 hover:text-blue-200">← Giriş sayfasına dön</a>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-4 mb-2">{m.baslik}</h1>
        <div className="space-y-3 text-sm leading-relaxed">
          {bloklar.map((b, i) => {
            switch (b.tur) {
              case "meta":
                return <p key={i} className="text-xs text-slate-400 mb-4">{b.metin}</p>;
              case "h2":
                return <h2 key={i} className="text-lg font-semibold text-white pt-5">{b.metin}</h2>;
              case "h3":
                return <h3 key={i} className="text-sm font-semibold text-blue-200 pt-3">{b.metin}</h3>;
              case "kv":
                return (
                  <p key={i}>
                    <strong className="text-white">{b.anahtar}:</strong> {baglantila(b.deger)}
                  </p>
                );
              case "liste":
                return (
                  <ul key={i} className="list-disc pl-5 space-y-1.5 marker:text-slate-500">
                    {b.maddeler.map((x, j) => (
                      <li key={j}>{baglantila(x)}</li>
                    ))}
                  </ul>
                );
              case "tablo":
                return (
                  <div key={i} className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-xs min-w-[560px]">
                      <thead>
                        <tr className="bg-slate-900 text-left">
                          {b.satirlar[0].map((h, j) => (
                            <th key={j} className="px-3 py-2 font-semibold text-white">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {b.satirlar.slice(1).map((r, j) => (
                          <tr key={j} className="border-t border-slate-800">
                            {r.map((h, k) => (
                              <td key={k} className="px-3 py-2">{h}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              default:
                return <p key={i}>{baglantila(b.metin)}</p>;
            }
          })}
        </div>
      </article>
    </div>
  );
}
