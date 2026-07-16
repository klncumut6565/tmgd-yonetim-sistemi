-- 012 — Ziyaretler için serbest metin rapor alanı
-- Ziyaret ekranındaki "Planlanan Faaliyet / Gerçekleşen Faaliyet" raporunun
-- düzenlenebilir tam metnini tutar. UI, yeni ziyaret formunu açarken bu
-- alanı standart TMGD ziyaret raporu şablonuyla ön doldurur; kullanıcı
-- içeriği tamamen özgürce değiştirebilir.

alter table public.visits
    add column if not exists report_content text;
