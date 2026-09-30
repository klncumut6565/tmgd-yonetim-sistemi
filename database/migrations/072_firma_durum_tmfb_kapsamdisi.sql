-- 072: Firma durumu için "TMFB Kapsamdışı" seçeneği
-- firms.status artık: active | passive | archived | tmfb_kapsamdisi
-- "tmfb_kapsamdisi" firmalar Firmalar listesinde ayrı (renkli, kapalı) bölümde
-- ve YALNIZCA o firmaya atanmış kullanıcılara gösterilir (uygulama tarafı).
-- İdempotent.
alter table public.firms drop constraint if exists firms_status_check;
alter table public.firms add constraint firms_status_check
  check (status = any (array['active','passive','archived','tmfb_kapsamdisi']));
