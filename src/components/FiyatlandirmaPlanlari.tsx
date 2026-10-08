"use client";

// Giriş sayfasının altındaki "Planlar ve Fiyatlandırma" bölümü.
// Fiyatlar KDV dahil aylık; yıllık seçenekte 2 ay bedava (aylık × 10).

import { useState } from "react";

type Plan = {
  ad: string;
  alt: string;
  aylik: number;
  ozellikler: string[];
  populer?: boolean;
};

const ORTAK = [
  "Doküman yönetimi",
  "Takvim & hatırlatmalar",
  "Raporlar & firma portalı",
  "Bildirimler & harita",
];

const PLANLAR: Plan[] = [
  { ad: "TMGD Bireysel", alt: "Bireysel TMGD için", aylik: 59.99, ozellikler: ["En fazla 10 firma", ...ORTAK] },
  { ad: "TMGDK Solo", alt: "TMGD'siz TMGDK hesabı", aylik: 99.99, ozellikler: ["Sınırsız firma", ...ORTAK] },
  { ad: "TMGDK Başlangıç", alt: "Küçük ve orta ölçekli TMGDK'lar için", aylik: 249.99, populer: true, ozellikler: ["Sınırsız firma", "5 TMGD dahil", ...ORTAK] },
  { ad: "TMGDK Standart", alt: "Büyüyen TMGDK'lar için", aylik: 499.99, ozellikler: ["Sınırsız firma", "10 TMGD dahil", ...ORTAK] },
  { ad: "TMGDK Profesyonel", alt: "Büyük TMGDK'lar için", aylik: 649.99, ozellikler: ["Sınırsız firma", "15 TMGD dahil", ...ORTAK] },
  { ad: "TMGDK Kurumsal", alt: "Kurumsal TMGDK'lar için", aylik: 799.99, ozellikler: ["Sınırsız firma", "20 TMGD dahil", ...ORTAK] },
  { ad: "TMGDK Kurumsal Plus", alt: "Çok sayıda TMGD yöneten kurumlar için", aylik: 1499.99, ozellikler: ["Sınırsız firma", "50 TMGD dahil", ...ORTAK] },
];

const KARSILASTIRMA_SUTUNLARI = ["TMGD Bireysel", "TMGDK Solo", "TMGDK Başlangıç", "TMGDK Standart", "TMGDK Profesyonel", "TMGDK Kurumsal", "TMGDK Kurumsal Plus"];
const KARSILASTIRMA_SAYILAR: { ad: string; degerler: string[] }[] = [
  { ad: "Firma ekleme", degerler: ["10", "Sınırsız", "Sınırsız", "Sınırsız", "Sınırsız", "Sınırsız", "Sınırsız"] },
  { ad: "TMGD dahil", degerler: ["—", "—", "5", "10", "15", "20", "50"] },
];
const KARSILASTIRMA_OZELLIKLER = [
  "Doküman yönetimi",
  "Takvim & ziyaret planlama",
  "Raporlama & istatistik",
  "Firma portalı daveti",
  "Bildirim merkezi",
  "Harita görünümü",
  "TMFB uyarı e-postaları",
  "Firma kıyaslama",
  "PDF rapor indirme",
];

const SSS: { s: string; c: string }[] = [
  {
    s: "30 günlük deneme süresinde kredi kartı gerekiyor mu?",
    c: "Hayır, deneme süresi ücretsizdir ve kredi kartı bilgisi istenmez. 30 gün boyunca tüm özellikleri kullanabilirsiniz; deneme süresinde TMGD hesabında en fazla 10 firma, TMGDK hesabında en fazla 10 TMGD bağlanabilir. Deneme bitince otomatik ücretlendirme yapılmaz.",
  },
  {
    s: "Planı daha sonra değiştirebilir miyim?",
    c: "Evet. Aboneliğiniz sürerken farklı bir pakete geçtiğinizde, kalan sürenizin değeri yeni paketinize gün olarak eklenir; yeni paket ödemesi tamamlanınca hemen geçerli olur. Kalan sürenin değeri, mevcut paketiniz için yaptığınız son ödemenin günlük karşılığı üzerinden hesaplanır (bu paket için tamamlanmış ödeme kaydınız yoksa paketin liste fiyatı esas alınır) ve yeni paketin günlük liste fiyatına bölünerek güne çevrilir; aylık ↔ yıllık geçiş yaptıysanız esas alınan ödeme en son geçtiğiniz döneme aittir. Eklenecek gün sayısı en fazla 730 gündür ve ödeme ekranında, ödemeden önce gösterilir. Aynı paketi süre dolmadan yenilediğinizde (aylık ↔ yıllık geçiş dahil) kalan süreniz olduğu gibi korunur.",
  },
  {
    s: "Aboneliğim otomatik olarak yenilenir mi?",
    c: "Hayır. Her ödeme tek seferliktir; kartınızdan otomatik tahsilat yapılmaz. Aboneliğinizin bitmesine 7 gün ve 1 gün kala hatırlatma e-postası gönderilir. Süre dolmadan yenilerseniz kalan süreniz korunur ve yeni dönem mevcut bitiş tarihinden itibaren başlar.",
  },
  {
    s: "İptal etmek istersem ne olur?",
    c: "Abonelik otomatik yenilenmediği için iptal amacıyla ayrıca bir işlem yapmanız gerekmez; dönem sonunda yenilemediğinizde aboneliğiniz kendiliğinden sona erer. Ödediğiniz dönemin sonuna kadar tüm özellikleri kullanmaya devam edersiniz. Sorularınız için destek@tmgdasistani.app adresine yazabilirsiniz.",
  },
  { s: "Fiyatlar KDV dahil mi?", c: "Evet, gösterilen tüm fiyatlar KDV dahildir. Ek bir ücret talep edilmez." },
  { s: "Kaç firma ekleyebilirim?", c: "TMGD Bireysel planında en fazla 10 firma ekleyebilirsiniz. TMGDK planlarında firma sayısı sınırsızdır." },
  {
    s: "TMGDK planında kaç TMGD atayabilirim?",
    c: "TMGDK Solo planında TMGD ataması bulunmaz. TMGDK Başlangıç planında 5, TMGDK Standart 10, TMGDK Profesyonel 15, TMGDK Kurumsal planında 20, TMGDK Kurumsal Plus planında 50 TMGD atayabilirsiniz. Daha fazlası için bizimle iletişime geçin.",
  },
];

function tl(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FiyatlandirmaPlanlari({ onBasla }: { onBasla: () => void }) {
  const [yillik, setYillik] = useState(false);

  return (
    <section className="bg-slate-950 text-white px-4 py-14">
      <div className="max-w-[1100px] mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold">Planlar ve Fiyatlandırma</h2>
        <p className="text-center text-sm text-blue-300/80 mt-3 max-w-xl mx-auto leading-relaxed">
          İhtiyacınıza uygun planı seçin. Planlar hesap türüne (TMGD/TMGDK), firma sınırına ve dahil TMGD sayısına göre
          farklılaşır; diğer tüm özellikler her planda aynıdır.
        </p>

        <div className="flex justify-center mt-7">
          <div className="inline-flex rounded-lg bg-slate-800/70 p-1 border border-slate-700" role="tablist" aria-label="Faturalama dönemi">
            {[
              { k: false, ad: "Aylık" },
              { k: true, ad: "Yıllık" },
            ].map((s) => (
              <button
                key={s.ad}
                role="tab"
                aria-selected={yillik === s.k}
                onClick={() => setYillik(s.k)}
                className={
                  "px-4 py-1.5 text-xs font-medium rounded-md transition-colors " +
                  (yillik === s.k ? "bg-slate-950 text-white border border-slate-600" : "text-slate-400 hover:text-white")
                }
              >
                {s.ad}
              </button>
            ))}
          </div>
        </div>
        {yillik && <p className="text-center text-xs text-amber-300 mt-3">Yıllık ödemede 2 ay bedava</p>}

        <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-4">
          {PLANLAR.map((p) => {
            const fiyat = yillik ? p.aylik * 10 : p.aylik;
            return (
              <div
                key={p.ad}
                className={
                  "relative rounded-xl p-5 flex flex-col border " +
                  (p.populer ? "border-amber-400/80 bg-slate-900 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]" : "border-slate-800 bg-slate-900/60")
                }
              >
                {p.populer && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-950 border border-amber-400/80 text-amber-300 text-[11px] font-semibold px-3 py-0.5 rounded-full whitespace-nowrap">
                    ♛ En Popüler
                  </span>
                )}
                <h3 className="font-bold text-sm">{p.ad}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 min-h-[28px]">{p.alt}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold">{tl(fiyat)} ₺</span>
                  <span className="text-xs text-slate-400">/{yillik ? "yıl" : "ay"}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">KDV dahil</p>

                <button
                  onClick={onBasla}
                  className={
                    "mt-4 w-full rounded-md py-2 text-xs font-semibold transition-colors " +
                    (p.populer
                      ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
                      : "border border-slate-600 text-white hover:bg-white/10")
                  }
                >
                  Ücretsiz Başla →
                </button>

                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  {p.ozellikler.map((o) => (
                    <li key={o} className="flex items-start gap-2">
                      <span className="text-emerald-400 leading-4">✓</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* ---- Özellik Karşılaştırması ---- */}
        <h2 className="text-center text-xl md:text-2xl font-bold mt-16">Özellik Karşılaştırması</h2>
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left font-semibold px-4 py-3 w-[22%]">Özellik</th>
                {KARSILASTIRMA_SUTUNLARI.map((k) => (
                  <th key={k} className={"px-2 py-3 font-semibold text-center " + (k === "TMGDK Başlangıç" ? "text-amber-300" : "")}>
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KARSILASTIRMA_SAYILAR.map((r) => (
                <tr key={r.ad} className="border-b border-slate-800/70">
                  <td className="px-4 py-3 font-semibold">{r.ad}</td>
                  {r.degerler.map((d, i) => (
                    <td key={i} className="px-2 py-3 text-center font-semibold">{d}</td>
                  ))}
                </tr>
              ))}
              {KARSILASTIRMA_OZELLIKLER.map((o) => (
                <tr key={o} className="border-b border-slate-800/70 last:border-0">
                  <td className="px-4 py-3 font-semibold">{o}</td>
                  {KARSILASTIRMA_SUTUNLARI.map((k) => (
                    <td key={k} className="px-2 py-3 text-center text-emerald-400">✓</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- Sıkça Sorulan Sorular ---- */}
        <h2 className="text-center text-xl md:text-2xl font-bold mt-16">Sıkça Sorulan Sorular</h2>
        <div className="mt-6 max-w-3xl mx-auto rounded-xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800">
          {SSS.map((x) => (
            <details key={x.s} className="group px-5 py-4">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-sm font-semibold">
                <span>{x.s}</span>
                <span className="text-slate-500 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-slate-300">{x.c}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
