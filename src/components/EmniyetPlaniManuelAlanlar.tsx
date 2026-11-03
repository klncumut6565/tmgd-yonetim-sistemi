"use client";

// src/components/EmniyetPlaniManuelAlanlar.tsx
//
// Emniyet Planı'ndaki elle doldurulan tabloların ekran formu. Her hücre
// çok satırlı (textarea) girilir; liste tabloları için satır ekle/sil
// vardır. Girilen değerler "Emniyet Planını Oluştur" ile PDF'e basılır
// (bkz. lib/emniyetPlaniManuelAlanlar.ts → manuelAlanlariUygula).

import type { ReactNode } from "react";
import {
  EK2_BASLIKLAR,
  EK3_BASLIKLAR,
  EK4_BASLIKLAR,
  bosSatir,
  type AnahtarDeger,
  type EmniyetPlaniManuelVeri,
} from "@/lib/emniyetPlaniManuelAlanlar";

type Props = {
  veri: EmniyetPlaniManuelVeri;
  onChange: (v: EmniyetPlaniManuelVeri) => void;
  onSifirla: () => void;
};

const TEXTAREA =
  "w-full min-h-[34px] border border-gray-200 rounded px-2 py-1 text-xs leading-snug resize-y focus:border-blue-400 focus:outline-none bg-white";

/** İçerikteki satır sayısına göre yükseklik — en az 1, en çok 8 satır. */
function satirSayisi(s: string) {
  return Math.min(8, Math.max(1, s.split("\n").length));
}

function AnahtarDegerTablosu({
  alanlar,
  onChange,
}: {
  alanlar: AnahtarDeger[];
  onChange: (a: AnahtarDeger[]) => void;
}) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {alanlar.map((a, i) => (
          <tr key={a.etiket} className="border-t first:border-t-0 align-top">
            <td className="p-2 w-[38%] text-gray-700 font-medium">{a.etiket}</td>
            <td className="p-2">
              <textarea
                className={TEXTAREA}
                rows={satirSayisi(a.deger)}
                placeholder={a.ipucu || "Birden fazla satır için Enter'a bas"}
                value={a.deger}
                onChange={(e) => {
                  const yeni = alanlar.slice();
                  yeni[i] = { ...a, deger: e.target.value };
                  onChange(yeni);
                }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ListeTablosu({
  basliklar,
  satirlar,
  onChange,
}: {
  basliklar: string[];
  satirlar: string[][];
  onChange: (s: string[][]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 w-6 text-gray-400 font-medium">#</th>
              {basliklar.map((b) => (
                <th key={b} className="p-2 text-left font-medium text-gray-600">
                  {b}
                </th>
              ))}
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {satirlar.map((satir, ri) => (
              <tr key={ri} className="border-t align-top">
                <td className="p-2 text-center text-gray-400">{ri + 1}</td>
                {satir.map((hucre, ci) => (
                  <td key={ci} className="p-1">
                    <textarea
                      className={TEXTAREA}
                      rows={satirSayisi(hucre)}
                      value={hucre}
                      onChange={(e) => {
                        const yeni = satirlar.map((r) => r.slice());
                        yeni[ri][ci] = e.target.value;
                        onChange(yeni);
                      }}
                    />
                  </td>
                ))}
                <td className="p-1 text-center">
                  <button
                    type="button"
                    title="Satırı sil"
                    onClick={() => {
                      const yeni = satirlar.filter((_, i) => i !== ri);
                      onChange(yeni.length ? yeni : [bosSatir(basliklar.length)]);
                    }}
                    className="text-gray-400 hover:text-red-600 px-1"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => onChange([...satirlar, bosSatir(basliklar.length)])}
        className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
      >
        + Satır Ekle
      </button>
    </div>
  );
}

function Bolum({ baslik, children, acik }: { baslik: string; children: ReactNode; acik?: boolean }) {
  return (
    <details open={acik} className="border border-gray-200 rounded-lg bg-white">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-700">
        {baslik}
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  );
}

export default function EmniyetPlaniManuelAlanlar({ veri, onChange, onSifirla }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-medium text-gray-700 block">Elle Doldurulan Alanlar</span>
          <p className="text-xs text-gray-500">
            Her hücreye birden fazla satır yazabilirsin (Enter ile alt satıra geç). Girilen değerler
            Emniyet Planı PDF&apos;ine basılır; boş bırakılan alanlar belgede elle doldurulmak üzere
            boş kalır. Değerler bu tarayıcıda firma bazında otomatik saklanır.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Bu firmaya girilen tüm değerler temizlensin mi?")) onSifirla();
          }}
          className="text-xs text-gray-500 hover:text-red-600 whitespace-nowrap"
        >
          Temizle
        </button>
      </div>

      <Bolum baslik="3. İşletme ve Faaliyet Bilgileri" acik>
        <AnahtarDegerTablosu alanlar={veri.isletme} onChange={(isletme) => onChange({ ...veri, isletme })} />
      </Bolum>
      <Bolum baslik="EK-2 – Görevli Personel ve Yetki Matrisi">
        <ListeTablosu basliklar={EK2_BASLIKLAR} satirlar={veri.ek2} onChange={(ek2) => onChange({ ...veri, ek2 })} />
      </Bolum>
      <Bolum baslik="EK-3 – Acil ve Güvenlik İletişim Listesi">
        <ListeTablosu basliklar={EK3_BASLIKLAR} satirlar={veri.ek3} onChange={(ek3) => onChange({ ...veri, ek3 })} />
      </Bolum>
      <Bolum baslik="EK-4 – Eğitim Kayıtları">
        <ListeTablosu basliklar={EK4_BASLIKLAR} satirlar={veri.ek4} onChange={(ek4) => onChange({ ...veri, ek4 })} />
      </Bolum>
      <Bolum baslik="EK-6 – Güvenlik Olayı Bildirim Formu">
        <AnahtarDegerTablosu alanlar={veri.ek6} onChange={(ek6) => onChange({ ...veri, ek6 })} />
      </Bolum>
    </div>
  );
}
