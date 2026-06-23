# TMGD Yönetim Sistemi

Bu proje, `anaproje.txt` adlı sohbet dökümünde 100 "teslimat" halinde dağılmış olan
proje planının **düzenli bir proje iskeletine** dönüştürülmüş hâlidir.

İki büyük değişiklik yapıldı:

1. **Veritabanı: 9 ayrı `.sql` dosyası yerine TEK dosya.**
   `database/schema.sql` — 001_database_core.sql'den 074. teslimata kadar
   dağılmış tüm `create table` / `create policy` / `create function`
   parçaları, doğru kurulum sırasıyla birleştirildi.
2. **Frontend: her ekran kendi gerçek dosyasında.**
   Next.js'in doğası gereği her sayfa zaten ayrı bir `page.tsx` dosyası
   olmak zorunda — bunlar `src/app/...` altında gerçek proje yapısında.

---

## Kurulum

### 1) Veritabanı (Supabase)

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. `database/schema.sql` dosyasının tamamını yapıştır → **RUN**
3. Table Editor'da tabloların oluştuğunu kontrol et (70+ tablo oluşacak)
4. Geliştirme/test ortamındaysanız dosyanın en alındaki **BÖLÜM 19 (SEED)**
   örnek veriyi de ekler. **Üretimde bu bölümü çalıştırmayın.**

### 2) Next.js projesi

Bu klasördeki dosyalar bir Next.js projesinin *içeriğidir*, proje
iskeletinin (config dosyaları, tailwind kurulumu vb.) kendisi değildir.
Orijinal sohbette de önerildiği gibi, gerçek projeyi şu komutla oluşturup
bu dosyaları üzerine kopyalamanız gerekiyor:

```bash
npx create-next-app@latest tmgd-yonetim-sistemi --typescript --tailwind --app
cd tmgd-yonetim-sistemi
# Bu pakette gelen src/ klasörünü ve package.json'daki dependencies'i
# kendi projenizdekiyle birleştirin.
npm install
cp .env.local.example .env.local   # sonra gerçek Supabase URL/KEY'leri doldurun
npm run dev
```

---

## TESLİMAT → Dosya Haritası

| Teslimat | İçerik | Bu projede |
|---|---|---|
| 001-009 | Tüm veritabanı şeması, RLS, fonksiyonlar, seed | `database/schema.sql` (tek dosya) |
| 010 | package.json, klasör yapısı | `package.json` |
| 012 | Supabase client | `src/lib/supabase/client.ts` |
| 013 | Ortam değişkenleri | `.env.local.example` |
| 014 | Login sayfası | `src/app/login/page.tsx` |
| 015 + 018 | Dashboard (statik + gerçek sayım sorguları) | `src/app/dashboard/page.tsx` |
| 016 | Firmalar CRUD | `src/app/firms/page.tsx` |
| 017 | Firma detay | `src/app/firms/[id]/page.tsx` |
| 019 + 078 | Sidebar menüsü | `src/components/layout/Sidebar.tsx` |
| 021 + 022 | Görevler + Kanban kolonları | `src/app/tasks/page.tsx` |
| 023 | Belgeler listesi (kaynakta yarım kalmıştı, aynı desenle tamamlandı) | `src/app/documents/page.tsx` |
| 029-074 (SQL parçaları) | Takvim, Eğitim, Olay/Uygunsuzluk/DÖF, Risk, ADR veri motoru, Denetim, AI/Sistem altyapısı, RBAC, Dashboard KPI, ADR Transport Pro entegrasyonu | `database/schema.sql` içinde ilgili bölümler |
| 076 | Yetki kodları | `src/lib/auth/permissions.ts` |
| 077 | usePermission hook | `src/hooks/usePermission.ts` |
| — | `useUser` (077'de referans verilmiş ama hiçbir teslimatta tanımlanmamıştı) | `src/hooks/useUser.ts` *(taslak — bu dosya benim eklemem, kaynakta yok)* |
| 078 | AppLayout (Sidebar+Header+Content) | `src/app/layout.tsx` |

**Henüz koda dönüşmemiş teslimatlar** (020, 024-028, 040, 060, 067, 075,
079-100 — çoğunlukla kavramsal liste/örnek, gerçek kod verilmemişti):
bkz. **`ROADMAP.md`**.

---

## Bu sürümde bulunup düzeltilen hatalar

Dosyaları oluşturduktan sonra hem `database/schema.sql`'i gerçek bir
Postgres ayrıştırıcısıyla (pglast), hem `src/` altındaki tüm kodu gerçek
`tsc` + Next.js ESLint kurallarıyla taradım. Bulunan ve düzeltilen
sorunlar:

1. **🔴 Kritik — Görev oluşturma her zaman hata verirdi.**
   `tasks/page.tsx`, kaynak metindeki haliyle `firm_id` göndermiyordu;
   ama `tasks.firm_id` veritabanında `not null`. Düzeltme: forma firma
   seçim kutusu eklendi, insert artık gerçek bir `firm_id` gönderiyor.
2. **🔴 Kritik — RLS açılınca "Yeni Firma" / "Görev Oluştur" çalışmazdı.**
   Kaynaktaki `007_rls.sql` sadece SELECT politikalarıyla geliyordu
   (kendisi de bunu "henüz eksik" diye işaretlemişti). Ama üretilen UI
   gerçekten INSERT çağırıyor. `firms` ve `tasks` için INSERT/UPDATE/DELETE
   politikaları eklendi (diğer tablolar için hâlâ eksik, bkz. ROADMAP.md).
3. **🟠 Orta — Seed verisi tekrar çalıştırılınca çiftlenirdi.**
   `firms` için `id` her seferinde `gen_random_uuid()` ile yeniden
   üretiliyordu, `on conflict do nothing` bu yüzden hiçbir zaman devreye
   girmiyordu. `document_categories`'te ise `name` alanında hiç unique
   constraint yoktu. Düzeltme: firmalara sabit (deterministik) UUID
   verildi, `document_categories.name` ve `folder_templates.name`'e
   `unique` eklendi, tüm `on conflict` hedefleri gerçek constraint'lere
   bağlandı.
4. **🟡 Düşük — Firma oluşunca otomatik klasör açma sessizce çalışmıyordu.**
   `create_default_folders()` trigger'ı `folder_templates` tablosundan
   okuyor ama bu tabloya hiçbir veri eklenmemişti (kaynakta da yoktu).
   Düzeltme: TESLİMAT 063'te örnek olarak verilen klasör adları
   (ADR, MSDS, Eğitim, Araç Belgeleri, Sürücü Belgeleri, Faaliyet
   Raporları, Denetimler) seed verisine eklendi.
5. **🟡 Düşük — Login formu hiçbir şey yapmıyordu.** Kaynaktaki
   `login()` ne hata gösteriyordu ne de başarılı girişte bir yere
   yönlendiriyordu. Hata mesajı + `/dashboard`'a yönlendirme eklendi.
6. **Kozmetik** — `documents/page.tsx`'te seçilip hiç kullanılmayan
   `document_types` embed'i kaldırıldı.

**Doğrulama yöntemi:** `database/schema.sql` → `pglast` (gerçek Postgres
SQL ayrıştırıcısı) ile parse edildi + programatik FK sıralama/idempotency
kontrolü yapıldı → hatasız. `src/**/*.{ts,tsx}` → `tsc --noEmit` (strict
mode) → 0 hata. `eslint` (`next/core-web-vitals`) → 0 hata, 1 zararsız
uyarı (`useEffect` exhaustive-deps).

---

## Bilinen sınırlamalar (kaynaktan miras)

- **Sidebar'daki bazı linkler henüz sayfasız.** `Sidebar.tsx`,
  `/vehicles`, `/drivers`, `/employees`, `/visits`, `/reports`,
  `/settings`'e link veriyor ama bu sayfalar henüz yazılmadı (kaynakta da
  kodu yoktu) — tıklayınca Next.js'in standart 404'ünü göreceksiniz.
  Tabloların hepsi `database/schema.sql`'de hazır, sadece UI eksik.
- **RLS sadece `firms` + `tasks` için tam (SELECT+INSERT+UPDATE+DELETE).**
  Diğer tablolarda (documents, files, vehicles, drivers, employees,
  visits, notifications) hâlâ sadece SELECT var. Bu tablolara yazan bir
  ekran eklerseniz önce yazma politikalarını da eklemeniz gerekir.
- **Supabase tipleri üretilmedi.** `supabase.from("tasks").insert(...)`
  gibi çağrılar şu an tip kontrolünden geçmiyor çünkü generic/`any`
  tipli. `npx supabase gen types typescript` ile gerçek tipleri üretip
  `createClient<Database>(...)` şeklinde bağlarsanız, "zorunlu bir
  sütunu unutma" türü hatalar (madde 1'deki gibi) ileride derleme
  zamanında otomatik yakalanır.
- **`adr_substances` (T-041) ve `adr_un_numbers` (T-043) iki ayrı tablo**
  olarak kaldı; sohbette ikincisi "gerçek/üretim" tablo olarak tanımlanmış,
  birincisi muhtemelen ilk taslaktı. İkisini birleştirip birleştirmemek
  size kalıyor.
- **`useUser` hook'u kaynakta hiç tanımlanmamıştı**, sadece import
  ediliyordu. Üzerine gerçek auth/profil mantığınızı yazmanız gerekecek
  (taslak `src/hooks/useUser.ts` içinde, `role_permissions` tablosuna
  bağlanacak şekilde hazırlandı).
- ADR madde veritabanı (T-043/044/095) için tablo yapısı hazır ama
  gerçek "3000+ UN numarası" verisi import edilmedi.
