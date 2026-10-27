"use client";

// src/components/PdfSayfaGoruntuleyici.tsx
//
// PDF'i <iframe> yerine pdfjs ile SAYFA SAYFA <canvas>'a çizer; her sayfa
// kapsayıcının GENİŞLİĞİNE sığdırılır (A4 sayfa ekranda tam görünür), sayfalar
// alt alta dizilir ve dikey kaydırılır.
//
// NEDEN: Mobil tarayıcılar (iOS Safari, Android Chrome) iframe içindeki PDF'i
// gerçek boyutunda büyütüp gösteriyor; sağa-sola / aşağı-yukarı kaydırarak
// içeriğin tamamı görülemiyordu. Belge Takip önizlemesinde dar ekranda bu
// bileşen kullanılır; geniş ekranda tarayıcının kendi PDF görüntüleyicisi
// (iframe) aynen kalır.
//
// pdfjs kurulumu pdfSayfaGorseli.ts / pdfMetin.ts ile AYNI desen (3.x, dinamik
// import, paket içi worker).

import { useEffect, useRef, useState } from "react";

export default function PdfSayfaGoruntuleyici({ url }: { url: string }) {
  const kapRef = useRef<HTMLDivElement>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "hata">("yukleniyor");
  const [sayfaSayisi, setSayfaSayisi] = useState(0);

  useEffect(() => {
    let iptal = false;
    const kap = kapRef.current;
    if (!kap) return;
    kap.innerHTML = "";
    setDurum("yukleniyor");

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.js",
          import.meta.url
        ).toString();
        const belge = await pdfjsLib.getDocument({ url }).promise;
        if (iptal) return;
        setSayfaSayisi(belge.numPages);

        // Kapsayıcı genişliği (kenar boşluğu düşülerek) + ekran yoğunluğu:
        // metin keskin kalsın, bellek de şişmesin (en fazla 2x).
        const genislik = Math.max(200, kap.clientWidth - 16);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let n = 1; n <= belge.numPages; n++) {
          if (iptal) return;
          const sayfa = await belge.getPage(n);
          const temel = sayfa.getViewport({ scale: 1 });
          const olcek = genislik / temel.width;
          const viewport = sayfa.getViewport({ scale: olcek * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(temel.width * olcek)}px`;
          canvas.style.height = `${Math.floor(temel.height * olcek)}px`;
          canvas.className = "block mx-auto mb-2 bg-white shadow";
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas bağlamı oluşturulamadı.");
          kap.appendChild(canvas);
          await sayfa.render({ canvasContext: ctx, viewport }).promise;
          if (n === 1 && !iptal) setDurum("hazir");
        }
        if (!iptal) setDurum("hazir");
      } catch {
        if (!iptal) setDurum("hata");
      }
    })();

    return () => {
      iptal = true;
    };
  }, [url]);

  return (
    <div className="h-full overflow-y-auto overscroll-contain p-2" style={{ WebkitOverflowScrolling: "touch" }}>
      {durum === "yukleniyor" && (
        <p className="text-sm text-gray-400 text-center py-6">PDF hazırlanıyor...</p>
      )}
      {durum === "hata" && (
        <div className="text-sm text-gray-500 text-center py-6 px-4">
          PDF bu ekranda çizilemedi.{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
            Yeni sekmede aç
          </a>
        </div>
      )}
      <div ref={kapRef} />
      {durum === "hazir" && sayfaSayisi > 1 && (
        <p className="text-[11px] text-gray-400 text-center pb-2">{sayfaSayisi} sayfa</p>
      )}
    </div>
  );
}
