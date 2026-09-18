-- ============================================================================
-- Migration 070: Bildirim zilinde "Kaldır" (dismiss) özelliği
-- ----------------------------------------------------------------------------
-- AMAÇ: NotificationBell'deki uyarılar (expiring_documents view + TMGD
-- Sertifikası özel sorgusu) her açılışta CANLI olarak yeniden hesaplanıyor
-- — kalıcı bir "bildirim" satırı yok, dolayısıyla "sil"mek için bir yer de
-- yok. Kullanıcı belirli bir uyarıyı zilden kaldırabilsin (asıl belge/
-- tarih değişmeden, sadece o kullanıcı için gizlensin) diye bu tablo
-- eklenir. dismissed_notifications, notification_key'i (NotificationBell'in
-- zaten ürettiği "doc-<id>" / "tmgd-<id>" gibi benzersiz anahtar) o
-- kullanıcı için hatırlar; bir sonraki hesaplamada bu anahtarlar listeden
-- elenir.
--
-- ÖNEMLİ: Kaldırma, konuyu ÇÖZMEZ — belge hâlâ süresi geçmiş/yaklaşıyor
-- olabilir. Bu yüzden ön yüzde (NotificationBell.tsx), firma silmede
-- kullanılan "4 adet sıfır" onay deseniyle korunur — yönetici yanlışlıkla
-- tamamlanmamış bir işi kapatmasın diye.
--
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → RUN. Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dismissed_notifications (
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_key  text NOT NULL,
  dismissed_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_key)
);

COMMENT ON TABLE public.dismissed_notifications IS
  'Bir kullanıcının bildirim zilinden kaldırdığı (dismiss ettiği) uyarılar. notification_key, NotificationBell''in ürettiği benzersiz anahtardır (örn. "doc-<id>", "tmgd-<id>"). Uyarı canlı hesaplandığı için altta yatan belge/tarih değişmeden bir sonraki hesaplamada tekrar üretilir; bu tablo o anahtarı o kullanıcı için eler.';

ALTER TABLE public.dismissed_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dismissed_notifications_own" ON public.dismissed_notifications;
CREATE POLICY "dismissed_notifications_own"
  ON public.dismissed_notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_dismissed_notifications_user
  ON public.dismissed_notifications (user_id);
