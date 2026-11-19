# Oturum Özeti — Güvenlik Denetimi — 19.11.2026

## Tamamlanan işler
- AGENTS.md + CLAUDE.md ajan kuralları — `b717c2e`
- 080 profil yetki koruması (kendini admin yapma açığı) — `cddd5dd` — CANLIDA ÇALIŞTIRILDI, tetikleyici doğrulandı
- 081 güvenlik sertleştirme + `/api/depo` firma klasörü kontrolü — `2e737cb` — CANLIDA ÇALIŞTIRILDI, politikalar doğrulandı

## Alınan kararlar
- profiles yetki kolonlarını (role, approval_status, is_active vb.) yalnız onaylı admin değiştirir, kendi satırında değil; super_admin ataması yalnız super_admin.
- Yazma yetkili kullanıcı yalnız atandığı firmanın klasörüne yükler (Storage + R2).
- user_firms ataması yalnız admin.

## Açık işler
- [ ] Supabase → Authentication → Leaked password protection AÇILACAK (panelden).
- [ ] Canlı test: TMGD hesabıyla atandığı firmaya dosya yükleme; yönetim panelinden rol değiştirme.
- [ ] Kalan Supabase uyarıları (is_admin, yazabilir vb. SECURITY DEFINER yardımcıları anon'a açık) RLS içinde kullanıldığı için bilerek bırakıldı; ileride `private` şemaya taşınabilir.
- [ ] R2 aktarımı ve dosya sıkıştırma (17.11 özetinden devam).

## Dokunulmaması gerekenler
- `trg_profil_yetki_korumasi` tetikleyicisi kaldırılmaz.

## Öğrenilen dersler
- UPDATE politikasında `id = auth.uid()` tek başına yetersiz: kolon bazlı koruma (tetikleyici) şart.

## Yeni oturum için başlangıç komutu
"tmgd-yonetim-sistemi reposunda docs/oturum-ozetleri/2026-11-19-guvenlik-denetimi.md dosyasını oku ve Açık işler'den devam et."
