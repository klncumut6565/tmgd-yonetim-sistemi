// Giriş sayfası alt bağlantılarının yasal metinleri.
// Metinler hazır olunca ilgili `icerik` dizisine paragraf paragraf eklenir
// (her dizi elemanı bir paragraf; "# " ile başlayan satır alt başlık olur).

export type YasalMetin = { slug: string; baslik: string; icerik: string[] };

export const YASAL_METINLER: YasalMetin[] = [
  { slug: "kullanim-sartlari", baslik: "Kullanım Şartları", icerik: [] },
  { slug: "gizlilik-politikasi", baslik: "Gizlilik Politikası", icerik: [] },
  { slug: "mesafeli-satis-sozlesmesi", baslik: "Mesafeli Satış Sözleşmesi", icerik: [] },
  { slug: "on-bilgilendirme-formu", baslik: "Ön Bilgilendirme Formu", icerik: [] },
];

export function yasalMetinBul(slug: string): YasalMetin | undefined {
  return YASAL_METINLER.find((m) => m.slug === slug);
}
