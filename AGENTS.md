# AGENTS.md — tmgd-yonetim-sistemi

Claude Code, Codex ve diğer kod ajanları için proje kuralları. ECC (affaan-m/ECC, MIT) çalışma disiplininden uyarlandı.
**EN ÖNEMLİ KURAL: ÇALIŞAN SİSTEMİ VE FİRMA VERİLERİNİ BOZMA.** Bu, gerçek müşterilere (~55 firma) hizmet veren canlı bir sistemdir.

## Proje özeti
- SİAM TMGDK için çok kiracılı (multi-tenant) ADR / tehlikeli madde yönetim platformu. Next.js + TypeScript + Supabase + Vercel.
- Kiracı anahtarı: `firm_id`. Kullanıcı–firma ataması: `user_firms`. Roller: `super_admin / admin / tmgd / assistant / viewer / company` (`src/lib/auth/permissions.ts`).
- Dosyalar: Supabase Storage (`firm-files`, `mevzuat`, `atik-firmalari-tmfb`) → Cloudflare R2'ye (`tmgd-dosyalar`) AYNI YOLLARLA taşınıyor (`src/lib/r2.ts`, `src/lib/depo.ts`, `/api/depo`).
- Şema kurulumu ve klasör sırası: `README.md`. Önceki oturumlar: `docs/oturum-ozetleri/`. Kod haritası: `graphify-out/GRAPH_REPORT.md` (önce buna bak).

## Çalışma akışı (her değişiklikte)
1. **Araştır:** graphify → ilgili dosyalar → son oturum özeti. ADR verisi değişecekse kaynak (ADR 2025 Tablo A / özel hükümler) kullanıcıdan teyit edilir.
2. **Kanıtla:** Hata için konsol/Vercel/Supabase logu veya SQL sonucu. Varsayımla düzeltme yapma.
3. **Planla:** Değişecek ve DEĞİŞMEYECEK dosyalar, hangi rollerin ve firmaların etkileneceği, migration gerekip gerekmediği.
4. **Onay:** Migration, RLS/policy, rol/yetki, depolama (sıkıştırma, R2 aktarımı, bucket), silme işlemleri, belge numaralandırma ve PDF şablonu düzen değişikliklerinde push'tan ÖNCE kullanıcı onayı.
5. **İzole uygula:** En küçük diff. İlgisiz refactor yok.
6. **Doğrula:** `npx tsc --noEmit`, `npm run lint`, `npm run build`. Kırmızıysa DUR.
7. **Bağımsız incele:** Diff'i "başkası yazdı" gözüyle oku. Değişiklik tüm yollara uygulandı mı: bağımsız sayfa ve firma detayındaki gömülü sekme (`firmScopedFields` / `FirmScopedCrud`), tüm roller, Supabase ve R2 dosya yolu? SELECT kolonu, tip ve kullanım yeri uyumlu mu?
8. **Regresyon listesi:** aşağıdaki ilgili maddeler.
9. **Raporla:** tsc/lint/build sonucu + "canlıda doğrulandı / doğrulanmadı" ayrı. Migration varsa "Supabase SQL Editor'de çalıştırılacak: NNN_..." açıkça yazılır.

## DOKUNULMAZLAR
- Yüklenmiş firma dosyaları ASLA silinmez (kota dolsa bile). Çözüm: sıkıştırma (orijinal önce `firm-files-yedek`'e) veya R2'ye aynı yolla taşıma. E-imzalı ve şifreli PDF'lere dokunulmaz.
- Silme/temizleme işlemi (DB satırı, bucket, dosya) kullanıcı açıkça istemeden yazılmaz.
- `SUPABASE_SERVICE_ROLE_KEY` ve R2 anahtarları yalnız sunucuda (`src/lib/supabase/admin.ts`, API route'ları). `NEXT_PUBLIC_` olarak ASLA.
- Belge kuralları: `TMGDK-` öneki, SİAM TMGDK logo/QR kapak, çerçeve yalnız kapakta, Liberation Sans (Türkçe karakter), GG.AA.YYYY tarih, Türkçe arayüz.
- Belge şablon kütüphanesi (P, T, K, L, SA kodları) ve K1–K9 kontrol formlarının mevcut düzeni.
- `ai_cache_lib` git submodule'üdür; bu repodan değiştirilmez.

## Güvenlik ve tenant izolasyonu
- İstemcideki firma filtresi (ör. `firmaGorunurluk.ts`) GÜVENLİK DEĞİLDİR; asıl sınır RLS'tir. Her yeni firmaya bağlı tabloda `firm_id` + RLS + `user_firms`/rol tabanlı policy aynı migration'da.
- UPDATE policy'lerinde `WITH CHECK` zorunlu. Kullanıcı kendi rolünü veya yetki alanlarını (ör. `firms.tmgd_assigned`) değiştirememeli. Bu yoldan yetki yükseltme açığı daha önce bulundu ve düzeltildi; tekrarlanmasın.
- API route / server action: oturum → rol → kaydın firması kullanıcıya atanmış mı. İstemciden gelen `firm_id`/`role` değerine güvenme.
- service_role kullanan kod RLS'i atlar; yetki denetimi orada elle yapılır.
- Depolama yolları firma klasörüyle sınırlı; `/api/depo` başka firmanın dosyasını vermemeli.
- Test: Firma A kullanıcısıyla Firma B'nin kayıt/dosya ID'si istenince boş/403 dönmeli.
- Ayrıntılı denetim için `supabase-guvenlik-maliyet-denetimi` skill'i.

## Migration kuralları
- Yer: `database/migrations/NNN_kisa_aciklama.sql` — üç haneli, sıralı, boşluksuz (son numara + 1). `database/` kökündeki eski 002–027 dosyalarıyla karıştırma.
- Up-only; hata yeni migration ile telafi edilir. Bir migration bir iş.
- SECURITY DEFINER fonksiyonlarda `SET search_path = public, auth`.
- Sonuna `INSERT INTO public._migrations (id) VALUES ('NNN_...');`
- Migration'ı kullanıcı Supabase SQL Editor'de ELLE çalıştırır; ajan canlı veritabanına doğrudan yazmaz.
- Supabase 30.10.2026 sonrası yeni `public` tablolarına Data API erişimini otomatik vermiyor: yeni tabloda RLS + gereken rollere `GRANT` aynı migration'da.

## Maliyet (Supabase Pro yalnız TMGD için, Vercel)
- `select('*')` yerine gereken kolonlar; listelerde sayfalama; döngüde sorgu yok.
- Dosyalar her açılışta yeniden indirilmesin (signed URL, önbellek: `depoOnbellek.ts`). Yeni yükleme yolları `dosyaSikistir.ts` üzerinden geçer.
- Egress'i artıracak (toplu indirme, büyük önizleme, realtime) değişikliklerde etkiyi raporda belirt.

## Regresyon kontrol listesi
- [ ] Tüm rollerle giriş ve menü/yetki görünürlüğü doğru; `company` rolü yalnız kendi firmasını görür.
- [ ] TMFB Kapsamdışı firmalar yalnız atanan kullanıcılara + super_admin/admin'e görünür.
- [ ] Belge takip, araç evrakları (çoklu dosya), sürücü listesi, logolar, PDF ekleri, mobil tarama (`tarayici_ios`) dosyaları açılıyor (Supabase VE R2 yolu).
- [ ] Taşıma Evrakı PDF: alan düzeni, filigran logo, zorunlu alanlar kırmızı, "Kaydet ve Yazdır", Sevkiyatlar kaydı.
- [ ] Görevli/Sürücü listesi PDF ve Excel, kapak sayfası.
- [ ] ADR Bilgi Motoru, 1.1.3.6 muafiyet hesabı, sürücü/araç süre uyarıları.
- [ ] Denetim günlüğü (audit log) tetikleyicileri çalışıyor.
- [ ] Sesli asistan bozulmadı.

## Push ve rapor
- Push sonrası yalnız commit hash ve kısa özet. İndirme/ZIP linki paylaşılmaz.
- Büyük iş bitince veya bağlam dolmadan `docs/oturum-ozetleri/YYYY-AA-GG-konu.md` yazılır: tamamlananlar (commit), kararlar, açık işler, canlıda doğrulanacaklar, çalıştırılacak migration'lar.
- Aynı hata iki kez tekrarlandıysa kalıcı kuralı bu dosyaya ekle.
