-- =====================================================================
-- 024 — Firma bazlı "Onaylayan (Tesis Sorumlusu)" bilgisi
--
-- Belge Oluştur ekranındaki "Onaylayan (opsiyonel)" alanına yazılan isim,
-- her firma için ayrı olarak hatırlansın diye firms tablosuna taşınıyor.
-- Böylece ABC firması seçildiğinde en son yazılan isim, XYZ firması
-- seçildiğinde onun ismi otomatik geliyor.
--
-- NOT: Bu alan bir YETKİ alanı DEĞİLDİR. Yalnızca üretilen belgenin alt
-- tablosunda "ONAYLAYAN" kutusuna basılacak kişinin adını saklar. Firma
-- kayıtlarını düzenleyebilen herkes değiştirebilir; ayrı bir RLS kuralı
-- gerekmez, mevcut firms politikaları geçerlidir.
-- =====================================================================

alter table public.firms
    add column if not exists approver_name text;

comment on column public.firms.approver_name is
    'Belge alt tablosundaki ONAYLAYAN kutusuna yazılacak tesis sorumlusunun adı. Yetki alanı değildir.';

-- PostgREST şema önbelleğini tazele (yeni kolon hemen görünsün)
notify pgrst, 'reload schema';
