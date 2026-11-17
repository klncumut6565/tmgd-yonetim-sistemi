# Graph Report - tmgd-yonetim-sistemi  (2026-11-17)

## Corpus Check
- 231 files · ~335,288 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1441 nodes · 3275 edges · 85 communities (74 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1cc35c65`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- createAdminClient
- ADRAssistantWidget.tsx
- GorevliListesi.tsx
- dataTools.ts
- depoYukle
- FiyatlandirmaPlanlari.tsx
- hataCevir
- SurucuListesi
- sayfaKontrol.ts
- actions.ts
- package.json
- BelgeOlusturForm.tsx
- dashboard/page.tsx
- adrMix.ts
- toolExec.ts
- aracEvraklariPdf.ts
- adrSecurityPlan.ts
- react
- TasimaEvraki.tsx
- TasimaEvraki
- next
- [id]/page.tsx
- emniyetPlaniManuelAlanlar.ts
- RotaHaritasi.tsx
- gorevliListesiPdf.ts
- useRealtimeVoice
- [id]/page.tsx
- adr/page.tsx
- belgeKatalogu.ts
- AppShell.tsx
- compilerOptions
- FirmScopedCrud.tsx
- surucuListesiPdf.ts
- authFetch
- FirmaTakvimiIcerik
- useRealtimeVoice.ts
- dependencies
- mevzuat/page.tsx
- DocumentsPage
- AracEvraklari.tsx
- FirmsPage
- adr-assistant/route.ts
- guvenlikPlaniIncelemePdf.ts
- EmniyetKapsamTaramasi.tsx
- EmniyetKapsamTaramasi
- dosyaSikistir.ts
- geminiLive.ts
- RealtimeProvider
- depoOnbellek.ts
- [slug]/page.tsx
- kaseler.ts
- dosyaSikistir
- BelgeOlusturForm
- firms/page.tsx
- getFirmMissingDocuments
- WorkflowRulesPage
- settings/page.tsx
- types.ts
- reports/page.tsx
- TasksPageInner
- AssignmentsTab
- surucuListesiExcel.ts
- kapakSayfasi.ts
- rotaKrokisi.ts
- adrYasakTasima.ts
- AudioPlaybackQueue
- speech.d.ts
- Database Migrations
- Yol Haritası — Henüz Koda Dönüşmemiş Teslimatlar
- UsersTab
- Oturum Özeti — 17.11.2026 — Supabase kota sorunu, sıkıştırma, Cloudflare R2
- getAsistanKullanicisiFromRequest
- useUser
- aws4fetch
- Sevkiyatlar.tsx
- jspdf
- scripts
- next.config.js
- permissions.ts
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `hataCevir()` - 121 edges
2. `useUser()` - 69 edges
3. `react` - 53 edges
4. `FirmDetailInner()` - 46 edges
5. `next` - 42 edges
6. `supabase` - 42 edges
7. `authFetch()` - 36 edges
8. `createAdminClient()` - 34 edges
9. `ADRAssistantWidget()` - 32 edges
10. `FirmScopedCrud()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Bilinen sınırlamalar (kaynaktan miras)` --references--> `useUser()`  [INFERRED]
  README.md → src/hooks/useUser.ts
- `Mobil Belge Tarama Entegrasyonu (tarayici_ios)` --references--> `useUser()`  [INFERRED]
  README.md → src/hooks/useUser.ts
- `Bu sürümde bulunup düzeltilen hatalar` --references--> `login()`  [INFERRED]
  README.md → src/app/login/page.tsx
- `generate()` --calls--> `belgeSablonu()`  [EXTRACTED]
  src/components/BelgeOlusturForm.tsx → src/lib/belgeSablonlari.ts
- `load()` --calls--> `authFetch()`  [EXTRACTED]
  src/components/audit/AuditLogWidget.tsx → src/lib/supabase/authFetch.ts

## Import Cycles
- None detected.

## Communities (85 total, 11 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.06
Nodes (70): RFC-3339, next, @supabase/supabase-js, dynamic, GECERLI_ROLLER, POST(), dynamic, gecerliYol() (+62 more)

### Community 1 - "ADRAssistantWidget.tsx"
Cohesion: 0.05
Nodes (61): ADRAssistantWidget(), dinlemeyeBasla(), gonder(), handleKeyDown(), mikrofonTikla(), sesiMetneCevir(), seslendirVeDinle(), sesliBaslatTikla() (+53 more)

### Community 2 - "GorevliListesi.tsx"
Cohesion: 0.09
Nodes (30): bosSatir(), bugununTarihi(), DOKUMAN_NO_SECENEKLERI, DOKUMAN_NO_SECIMLERI, ensureTrailingBlank(), etkinMetin(), GOREV_BASLIKLARI, GOREV_SECENEKLERI (+22 more)

### Community 3 - "dataTools.ts"
Cohesion: 0.08
Nodes (33): ayCoz(), sayfaHedefi(), addVisit(), AY_TR, AY_TR_GOSTER, DANISMAN_DISI_ROLLER, DANISMAN_ROLLER, danismanEslesir() (+25 more)

### Community 4 - "depoYukle"
Cohesion: 0.23
Nodes (18): uploadItemFiles(), AracEvraklari(), aracBelgeSil(), aracBelgeYukle(), belgelerHazirla(), logoDataUrl(), mobildenTara(), ortakBelgeSil() (+10 more)

### Community 5 - "FiyatlandirmaPlanlari.tsx"
Cohesion: 0.10
Nodes (21): 1) Veritabanı (Supabase), 2) Next.js projesi, Bilinen sınırlamalar (kaynaktan miras), Bu sürümde bulunup düzeltilen hatalar, Kurulum, Mobil Belge Tarama Entegrasyonu (tarayici_ios), TMGD Yönetim Sistemi, LoginPage() (+13 more)

### Community 6 - "hataCevir"
Cohesion: 0.13
Nodes (20): FirmDetailInner(), downloadItemFile(), gorevEkle(), mobildenTara(), removeAttachment(), saveFirm(), updateContractStart(), updateExpiry() (+12 more)

### Community 7 - "SurucuListesi"
Cohesion: 0.15
Nodes (23): belgeDataUrlHazirla(), bosSatir(), bugununTarihi(), ensureTrailingBlank(), kayittanSatir(), SurucuListesi(), belgeEkiHazirla(), belgeGoruntule() (+15 more)

### Community 8 - "sayfaKontrol.ts"
Cohesion: 0.15
Nodes (26): Aday, adaylariTopla(), benzerlik(), devreDisiMi(), DOLGU, ekrandaMi(), enIyiEslesme(), Eslesme (+18 more)

### Community 9 - "actions.ts"
Cohesion: 0.14
Nodes (21): dynamic, extractUnNumbers(), maxDuration, POST(), AY_ADLARI, cipakToolJsonlari(), extractAction(), FIRMA_SEKME_ESLEME (+13 more)

### Community 10 - "package.json"
Cohesion: 0.11
Nodes (24): devDependencies, autoprefixer@10.4.20, eslint@8.57.1, eslint-config-next@15.5.19, postcss@8.4.49, tailwindcss@3.4.17, @types/js-yaml@^4.0.9, @types/node@20.14.10 (+16 more)

### Community 11 - "BelgeOlusturForm.tsx"
Cohesion: 0.07
Nodes (46): altTabloCiz(), baslikTablosuCiz(), baslikYuksekligiHesapla(), BELGE_GORSELLERI, belgeGorselleriniYukle(), generate(), BelgeTarihleri, CATEGORY_ORDER (+38 more)

### Community 12 - "dashboard/page.tsx"
Cohesion: 0.15
Nodes (16): Counts, DashboardPage(), load(), DaysBadge(), daysLeft(), ExpiringItem, PRIORITY_TR, RecentTask (+8 more)

### Community 13 - "adrMix.ts"
Cohesion: 0.12
Nodes (23): CG_NOTES, CG_TABLE, checkFnA(), checkFnB(), checkFnC(), checkFnD(), checkPair(), compatGroup() (+15 more)

### Community 14 - "toolExec.ts"
Cohesion: 0.20
Nodes (16): addFirmNote(), checkMixedLoading(), getDashboardSummary(), getFirmVisits(), getNotifications(), getUnInfo(), gunKaldi(), listTmgd() (+8 more)

### Community 15 - "aracEvraklariPdf.ts"
Cohesion: 0.18
Nodes (20): aracEvraklariPdfOlustur(), AracEvraklariPdfVerisi, ekSayfaBasligiCiz(), fontuKaydet(), gorselEnBoyOraniOku(), gorselliEkSayfasiEkle(), kapakCercevesiCiz(), kapakSayfasiCiz() (+12 more)

### Community 16 - "adrSecurityPlan.ts"
Cohesion: 0.12
Nodes (21): ADR-2023, l1DenTara(), checkSecurityPlan(), CLASS14_HIGH_CONSEQUENCE, DESENS_3, DESENS_41, evaluateItemScope(), EXCLUDED_FROM_1136 (+13 more)

### Community 17 - "react"
Cohesion: 0.10
Nodes (23): react, AuditRow, VerifyResult, AtikFirmasi, ERISEBILEN_ROLLER, Rule, RunResult, FirmChemical (+15 more)

### Community 18 - "TasimaEvraki.tsx"
Cohesion: 0.10
Nodes (20): AMBALAJ_TURLERI, Arac, AtikKodu, CAT_MUL, Consignee, Envanter, EvrakOzet, k3FormuCiz() (+12 more)

### Community 19 - "TasimaEvraki"
Cohesion: 0.14
Nodes (17): evrakNoUret(), evrakPdfUret(), hesapla1136(), plakaBicimle(), TasimaEvraki(), aliciyiRehbereKaydet(), evrakSil(), kaydet() (+9 more)

### Community 20 - "next"
Cohesion: 0.13
Nodes (15): BelgeOlusturPage(), Doc, DocType, Firm, STATUS_COLORS, STATUS_TR, columnLabels, columns (+7 more)

### Community 21 - "[id]/page.tsx"
Cohesion: 0.11
Nodes (20): DriversPage(), EmployeesPage(), VehiclesPage(), VisitsPage(), FieldDef, FirmScopedCrud(), closeForm(), deleteRow() (+12 more)

### Community 22 - "emniyetPlaniManuelAlanlar.ts"
Cohesion: 0.19
Nodes (19): AnahtarDegerTablosu(), Bolum(), EmniyetPlaniManuelAlanlar(), ListeTablosu(), Props, satirSayisi(), AnahtarDeger, anahtarDegerSatirlari() (+11 more)

### Community 23 - "RotaHaritasi.tsx"
Cohesion: 0.16
Nodes (18): adresAra(), AramaSonucu, ayristir(), birlestir(), GorunumAyarla(), havadanKm(), ikon(), IKON_A (+10 more)

### Community 24 - "gorevliListesiPdf.ts"
Cohesion: 0.19
Nodes (19): baslikKutusuCiz(), fontuKaydet(), gorevliListesiPdfOlustur(), GorevliListesiPdfSatiri, GorevliListesiPdfVerisi, imzaBlokuCiz(), kapakBaslikTablosuCiz(), kapakBaslikYuksekligiHesapla() (+11 more)

### Community 25 - "useRealtimeVoice"
Cohesion: 0.17
Nodes (3): useRealtimeVoice(), GeminiLiveProvider, TranscriptEvent

### Community 26 - "[id]/page.tsx"
Cohesion: 0.11
Nodes (17): Attachment, BelgeRow, Bilgi(), display(), Firm, FirmDetailPage(), ORDER_BY, Row (+9 more)

### Community 27 - "adr/page.tsx"
Cohesion: 0.12
Nodes (15): AdrPage(), AdrPageInner(), CLASS_COLOR, SearchBox(), SearchBoxProps, statusBadge(), Tab, ADR-0001 (+7 more)

### Community 28 - "belgeKatalogu.ts"
Cohesion: 0.15
Nodes (18): AY_ADLARI, buildChecklist(), CATALOG, CatalogCategory, catalogForActivities(), CatalogItem, CATEGORY_LABELS, ChecklistItem (+10 more)

### Community 29 - "AppShell.tsx"
Cohesion: 0.09
Nodes (22): metadata, RootLayout(), AppShell(), AuthGuard(), GeriIleriButonlari(), geri(), NavApi, navApi() (+14 more)

### Community 30 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 31 - "FirmScopedCrud.tsx"
Cohesion: 0.18
Nodes (8): FieldType, Firm, Props, Row, STATUS_LABELS, HataGibi, KALIPLAR, YASAL_BAGLANTILAR

### Community 32 - "surucuListesiPdf.ts"
Cohesion: 0.16
Nodes (20): kontrolEdenKasesi(), LIBERATION_SANS_BOLD_B64, LIBERATION_SANS_REGULAR_B64, baslikKutusuCiz(), belgeEkiSayfasiEkle(), fontuKaydet(), gorselEnBoyOraniOku(), imzaBlokuCiz() (+12 more)

### Community 33 - "authFetch"
Cohesion: 0.18
Nodes (17): Aday, apiPost(), DepolamaPage(), baslat(), birDosya(), Kutu(), mb(), Ozet (+9 more)

### Community 34 - "FirmaTakvimiIcerik"
Cohesion: 0.13
Nodes (20): Atama, AY_ADLARI, ayBasiOfset(), Firm, FirmaTakvimiIcerik(), ayDegistir(), buAyaDon(), gunSec() (+12 more)

### Community 35 - "useRealtimeVoice.ts"
Cohesion: 0.18
Nodes (13): BOS_METRIK, BOS_SESSION, firmTabUrl(), RealtimeVoiceOptions, SAYFA_YOLLARI, BARGE_IN_MS, createNoiseGate(), GateStats (+5 more)

### Community 36 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, js-yaml@^5.2.2, jspdf@^4.2.1, leaflet@^1.9.4, next@15.5.19, pdf-lib@^1.17.1, react@19.2.3, react-dom@19.2.3 (+10 more)

### Community 37 - "mevzuat/page.tsx"
Cohesion: 0.22
Nodes (10): boyutYaz(), Mevzuat, MevzuatPage(), kaydet(), sil(), tarihYaz(), TUR_BILGI, TURLER (+2 more)

### Community 38 - "DocumentsPage"
Cohesion: 0.39
Nodes (8): DocumentsPage(), getDownloadUrl(), handleDelete(), handleSave(), handleStatusChange(), loadAll(), resetForm(), expiryBadge()

### Community 39 - "AracEvraklari.tsx"
Cohesion: 0.12
Nodes (18): Arac, ARAC_BELGE_SLOTLARI, AracBelgeAnahtari, BelgeDosyasi, BelgeSatiri(), DosyaSatiri, EK10_SECENEKLERI, Ek10Secenek (+10 more)

### Community 40 - "FirmsPage"
Cohesion: 0.29
Nodes (8): FirmsPage(), createFirm(), loadFirms(), loadLastVisits(), loadLogos(), loadProgress(), silmeOnayiKapat(), silmeyiOnayla()

### Community 41 - "adr-assistant/route.ts"
Cohesion: 0.17
Nodes (11): belirginIngilizceMi(), CALLERS, callWithFallback(), ChatMessage, EngineCallResult, MAX_TOKENS, modelCiktisiniTemizle(), motorHatasiTurkce() (+3 more)

### Community 42 - "guvenlikPlaniIncelemePdf.ts"
Cohesion: 0.23
Nodes (18): ADR-2025, ADR_TABLO_1_10_3_SATIRLARI, baslikKutusuCiz(), cerceveCiz(), emniyetHukumleriSayfasiCiz(), guvenlikPlaniIncelemeRaporuUret(), GuvenlikPlaniRaporVerisi, imzaTablosuCiz() (+10 more)

### Community 43 - "EmniyetKapsamTaramasi.tsx"
Cohesion: 0.22
Nodes (8): KaseCizim, Props, ADR-0001, UnRow, RotaOzeti, ItemScopeResult, SecurityPlanItem, FirmaOtomatikBilgi

### Community 44 - "EmniyetKapsamTaramasi"
Cohesion: 0.27
Nodes (10): EmniyetKapsamTaramasi(), ek1TabloBlogu(), imzaIsimleriGetir(), logoDataUrl(), manuelVeriSifirla(), raporIndir(), raporOnizle(), RotaHaritasi (+2 more)

### Community 45 - "dosyaSikistir.ts"
Cohesion: 0.22
Nodes (10): pdfjs-dist@^3.11.174, pdfjs-dist, PdfSayfaGoruntuleyici(), canvasBlob(), dosyaSikistirDetay(), eImzaliMi(), gorselSikistir(), pdfSikistir() (+2 more)

### Community 46 - "geminiLive.ts"
Cohesion: 0.20
Nodes (10): buildLiveInstruction(), GEMINI_FUNCTION_DECLARATIONS, GEMINI_LIVE_SYSTEM_INSTRUCTION, aracBildirimleri(), GEMINI_LIVE_MODELLERI, LiveModel, modelSirasi(), ToolCallHandler (+2 more)

### Community 48 - "depoOnbellek.ts"
Cohesion: 0.25
Nodes (13): depoImzaliUrller(), bellek, denenenler, depodanOku(), depoyaYaz(), dosyaBellegi, eksikKucukleriUret(), firmaLogoAdresi() (+5 more)

### Community 49 - "[slug]/page.tsx"
Cohesion: 0.26
Nodes (10): baglantila(), generateMetadata(), YasalMetinSayfasi(), YASAL_METINLER, YasalBlok, yasalBloklar(), blokIsle(), ekle() (+2 more)

### Community 50 - "kaseler.ts"
Cohesion: 0.24
Nodes (9): hazirlayanKasesi(), KASE_AYLIN_ZUMBUL_UCAR, KASE_MASALLAH_TEKINOK, KASE_MASALLAH_TEKINOK_IMZALI, KASE_UMUT_KILINC, KASE_YAKUP_ATAS, KASE_YAKUP_ATAS_IMZALI, HazirlayanKaseKodu (+1 more)

### Community 51 - "dosyaSikistir"
Cohesion: 0.25
Nodes (7): AtikFirmalariPage(), formuKapat(), kaydet(), sil(), boyutYaz(), gecerlilikRozeti(), tarihYaz()

### Community 52 - "BelgeOlusturForm"
Cohesion: 0.24
Nodes (8): BelgeOlusturForm(), changeFirm(), clearTempLogo(), fileToLogoData(), gorselEnBoyOrani(), logoDataUrl(), LOGO_MAKS_PIKSEL, logoyuKucult()

### Community 53 - "firms/page.tsx"
Cohesion: 0.27
Nodes (8): Firm, Progress, STATUS_TR, ACTIVITIES, ACTIVITY_LABELS, atananFirmaIdleri(), kapsamdisiTumunuGorur(), TMFB_KAPSAMDISI

### Community 54 - "getFirmMissingDocuments"
Cohesion: 0.26
Nodes (12): buildOperationalContext(), firmaIlerlemesi(), getFirmDocuments(), getFirmMissingDocuments(), getFirmProgress(), listFirms(), takipteSayilirMi(), tamamlananBelgeler() (+4 more)

### Community 55 - "WorkflowRulesPage"
Cohesion: 0.33
Nodes (6): WorkflowRulesPage(), deleteRule(), loadRules(), runNow(), saveRule(), toggleEnabled()

### Community 56 - "settings/page.tsx"
Cohesion: 0.10
Nodes (21): DaySlider(), ROLE_TR, SettingsPage(), changePassword(), saveNotifSettings(), saveProfile(), TabKey, TABS (+13 more)

### Community 57 - "types.ts"
Cohesion: 0.18
Nodes (5): LiveMetrics, STTProvider, TranscriptSpeaker, TTSProvider, VoiceSession

### Community 58 - "reports/page.tsx"
Cohesion: 0.16
Nodes (13): jspdf-autotable@^5.0.8, jspdf-autotable, xlsx, downloadPdf(), Firm, fmt(), PRIORITY_TR, ReportsPage() (+5 more)

### Community 59 - "TasksPageInner"
Cohesion: 0.39
Nodes (6): TasksPageInner(), createTask(), deleteTask(), loadTasks(), saveEdit(), setStatus()

### Community 60 - "AssignmentsTab"
Cohesion: 0.43
Nodes (5): AssignmentsTab(), addAssignment(), hizliAta(), load(), removeAssignment()

### Community 61 - "surucuListesiExcel.ts"
Cohesion: 0.22
Nodes (7): exceljs@^4.4.0, exceljs, BASLIK_FONT, HUCRE_FONT, INCE_KENARLIK, SurucuListesiExcelVerisi, SurucuListesiSatiri

### Community 62 - "kapakSayfasi.ts"
Cohesion: 0.25
Nodes (8): kapakIndir(), dosyaAdiIcinFirma(), ActivityKey, BelgeTarihleri, FAALIYET_SATIRLARI, kapakSayfasiOlustur(), KapakVerisi, tr()

### Community 63 - "rotaKrokisi.ts"
Cohesion: 0.29
Nodes (10): ek7Bloklari(), sureMetni(), RotaNoktasi, guzergahKrokisiUret(), projeksiyon(), KrokiYolBilgisi, latToY(), lonToX() (+2 more)

### Community 64 - "adrYasakTasima.ts"
Cohesion: 0.25
Nodes (8): KONTROL_IFADELERI, ADR-0002, YASAK_IFADELER, YASAK_PATLAYICILAR, YasakKontrolGirdi, YasakSonuc, yasakTasimaKontrol(), yasakTasimaKontrolListe()

### Community 66 - "speech.d.ts"
Cohesion: 0.22
Nodes (5): SpeechRecognitionErrorEventLike, SpeechRecognitionEventLike, SpeechRecognitionLike, SpeechRecognitionResultLike, Window

### Community 67 - "Database Migrations"
Cohesion: 0.25
Nodes (7): Baseline (`database/schema.sql`), Database Migrations, İzleme, Konvansiyon, Mevcut projeye ek migration, Nasıl Uygulanır, Yeni bir Supabase projesi

### Community 68 - "Yol Haritası — Henüz Koda Dönüşmemiş Teslimatlar"
Cohesion: 0.25
Nodes (7): ADR Bilgi Motoru & AI, Dashboard & Firma Deneyimi, Entegrasyon & Altyapı, Genel, Otomasyon & Bildirim, Raporlama & Dışa Aktarım, Yol Haritası — Henüz Koda Dönüşmemiş Teslimatlar

### Community 69 - "UsersTab"
Cohesion: 0.52
Nodes (7): UsersTab(), kullaniciEkle(), load(), removeUser(), setActive(), setApproval(), setRole()

### Community 70 - "Oturum Özeti — 17.11.2026 — Supabase kota sorunu, sıkıştırma, Cloudflare R2"
Cohesion: 0.33
Nodes (5): Açık işler / sonraki adımlar, Kararlar, Oturum Özeti — 17.11.2026 — Supabase kota sorunu, sıkıştırma, Cloudflare R2, Sorun, Tamamlanan (commit'ler)

### Community 71 - "getAsistanKullanicisiFromRequest"
Cohesion: 0.47
Nodes (5): dynamic, maxDuration, POST(), asistanVeriIstemcisi(), getAsistanKullanicisiFromRequest()

### Community 72 - "useUser"
Cohesion: 0.17
Nodes (13): AdminPage(), Assignment, Firm, Profile, AiEngineKeysPage(), load(), saveProvider(), PROVIDER_LABELS (+5 more)

### Community 75 - "Sevkiyatlar.tsx"
Cohesion: 0.43
Nodes (6): ilkSatir(), Sevkiyat, Sevkiyatlar(), sevkiyatSil(), tarihSaatYaz(), tarihYaz()

### Community 77 - "jspdf"
Cohesion: 0.25
Nodes (7): jspdf, emniyetPlaniOlustur(), BELGE_SABLONLARI, BelgeSablonu, belgeSablonu(), TemplateBlock, ADR-0001

### Community 78 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Knowledge Gaps
- **20 isolated node(s):** `RFC-3339`, `ADR-0005`, `ADR-0001`, `ADR-0007`, `ADR-2023` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 500 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `FiyatlandirmaPlanlari.tsx`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `TasimaEvraki.tsx`, `next`, `emniyetPlaniManuelAlanlar.ts`, `RotaHaritasi.tsx`, `[id]/page.tsx`, `adr/page.tsx`, `AppShell.tsx`, `FirmScopedCrud.tsx`, `authFetch`, `FirmaTakvimiIcerik`, `useRealtimeVoice.ts`, `dependencies`, `mevzuat/page.tsx`, `AracEvraklari.tsx`, `EmniyetKapsamTaramasi.tsx`, `dosyaSikistir.ts`, `[slug]/page.tsx`, `firms/page.tsx`, `settings/page.tsx`, `reports/page.tsx`, `useUser`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useUser()` (e.g. with `Bilinen sınırlamalar (kaynaktan miras)` and `Mobil Belge Tarama Entegrasyonu (tarayici_ios)`) actually correct?**
  _`useUser()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-3339`, `ADR-0005`, `ADR-0001` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05616509926854754 - nodes in this community are weakly interconnected._
- **Why does `next` connect `createAdminClient` to `ADRAssistantWidget.tsx`, `actions.ts`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `react`, `next`, `[id]/page.tsx`, `adr/page.tsx`, `AppShell.tsx`, `FirmScopedCrud.tsx`, `authFetch`, `FirmaTakvimiIcerik`, `useRealtimeVoice.ts`, `dependencies`, `EmniyetKapsamTaramasi.tsx`, `[slug]/page.tsx`, `firms/page.tsx`, `settings/page.tsx`, `reports/page.tsx`, `getAsistanKullanicisiFromRequest`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Should `ADRAssistantWidget.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Why does `useUser()` connect `useUser` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `depoYukle`, `FiyatlandirmaPlanlari.tsx`, `hataCevir`, `SurucuListesi`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `react`, `TasimaEvraki.tsx`, `TasimaEvraki`, `next`, `[id]/page.tsx`, `[id]/page.tsx`, `AppShell.tsx`, `FirmScopedCrud.tsx`, `authFetch`, `FirmaTakvimiIcerik`, `mevzuat/page.tsx`, `DocumentsPage`, `AracEvraklari.tsx`, `FirmsPage`, `dosyaSikistir`, `BelgeOlusturForm`, `firms/page.tsx`, `WorkflowRulesPage`, `settings/page.tsx`, `reports/page.tsx`, `TasksPageInner`, `UsersTab`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._