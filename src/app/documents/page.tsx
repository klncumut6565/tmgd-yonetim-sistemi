"use client";

// NOT: Kaynak metinde (TESLİMAT 023) bu sayfa için sadece Supabase sorgusu
// ve gösterilecek alan listesi (Belge Adı, Versiyon, Durum, Firma,
// Son Güncelleme) verilmişti; tam komponent kodu yoktu. Burada, projedeki
// diğer sayfalarla (Firmalar, Görevler) aynı desen izlenerek tamamlandı.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type DocumentRow = {
  id: string;
  title: string;
  current_version: number;
  status: string;
  updated_at: string;
  firms: { name: string } | null;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDocuments() {
    const { data } = await supabase
      .from("documents")
      .select(
        `
        id,
        title,
        current_version,
        status,
        updated_at,
        firms ( name )
      `
      )
      .order("updated_at", { ascending: false });

    setDocuments((data as unknown as DocumentRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Belgeler</h1>

      <div className="border rounded-xl">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left p-3">Belge Adı</th>
              <th className="text-left p-3">Versiyon</th>
              <th className="text-left p-3">Durum</th>
              <th className="text-left p-3">Firma</th>
              <th className="text-left p-3">Son Güncelleme</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-3">
                  Yükleniyor...
                </td>
              </tr>
            )}

            {documents.map((doc) => (
              <tr key={doc.id}>
                <td className="p-3">{doc.title}</td>
                <td className="p-3">v{doc.current_version}</td>
                <td className="p-3">{doc.status}</td>
                <td className="p-3">{doc.firms?.name}</td>
                <td className="p-3">
                  {new Date(doc.updated_at).toLocaleDateString("tr-TR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
