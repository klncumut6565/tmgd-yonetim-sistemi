# Graph Report - tmgd-yonetim-sistemi  (2026-11-17)

## Corpus Check
- 230 files · ~334,902 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1435 nodes · 3271 edges · 83 communities (70 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0931e667`
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
- client.ts
- TasimaEvraki.tsx
- TasimaEvraki
- next
- [id]/page.tsx
- emniyetPlaniManuelAlanlar.ts
- RotaHaritasi.tsx
- guvenlikPlaniIncelemePdf.ts
- useRealtimeVoice
- [id]/page.tsx
- adr/page.tsx
- belgeKatalogu.ts
- useUser
- compilerOptions
- hataCevir.ts
- NotificationBell.tsx
- authFetch
- FirmaTakvimiIcerik
- useRealtimeVoice.ts
- dependencies
- mevzuat/page.tsx
- depoImzaliUrl
- AracEvraklari.tsx
- FirmsPage
- adr-assistant/route.ts
- useUser.ts
- EmniyetKapsamTaramasi.tsx
- EmniyetKapsamTaramasi
- belgeGorselleri.ts
- geminiLive.ts
- RealtimeProvider
- depoOnbellek.ts
- [slug]/page.tsx
- satirYuksekligi
- dosyaSikistir
- BelgeOlusturForm
- FirmNotesTab
- getFirmDocuments
- leaflet
- FirmBelgeBildirimleri.tsx
- types.ts
- reports/page.tsx
- k4FormGorselleri.ts
- renderYapilandirilmisBelge
- surucuListesiExcel.ts
- kapakSayfasi.ts
- rotaKrokisi.ts
- adrYasakTasima.ts
- AudioPlaybackQueue
- speech.d.ts
- Database Migrations
- Yol Haritası — Henüz Koda Dönüşmemiş Teslimatlar
- ai-engine-keys/page.tsx
- Sevkiyatlar.tsx
- getFirmMissingDocuments
- jspdf
- scripts
- next.config.js
- k2FormGorselleri.ts
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
- `hizliEkle()` --calls--> `hataCevir()`  [EXTRACTED]
  src/app/dashboard/firma-takvimi/page.tsx → src/lib/hataCevir.ts
- `ziyaretSil()` --calls--> `hataCevir()`  [EXTRACTED]
  src/app/dashboard/firma-takvimi/page.tsx → src/lib/hataCevir.ts

## Import Cycles
- None detected.

## Communities (83 total, 13 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.05
Nodes (74): RFC-3339, @supabase/supabase-js, dynamic, GECERLI_ROLLER, POST(), dynamic, gecerliYol(), GET() (+66 more)

### Community 1 - "ADRAssistantWidget.tsx"
Cohesion: 0.05
Nodes (60): ADRAssistantWidget(), dinlemeyeBasla(), gonder(), handleKeyDown(), mikrofonTikla(), sesiMetneCevir(), seslendirVeDinle(), sesliBaslatTikla() (+52 more)

### Community 2 - "GorevliListesi.tsx"
Cohesion: 0.09
Nodes (30): bosSatir(), bugununTarihi(), DOKUMAN_NO_SECENEKLERI, DOKUMAN_NO_SECIMLERI, ensureTrailingBlank(), etkinMetin(), GOREV_BASLIKLARI, GOREV_SECENEKLERI (+22 more)

### Community 3 - "dataTools.ts"
Cohesion: 0.09
Nodes (29): addVisit(), AY_TR, AY_TR_GOSTER, DANISMAN_DISI_ROLLER, DANISMAN_ROLLER, danismanEslesir(), DanismanOzeti, DURUM_ESLE (+21 more)

### Community 4 - "depoYukle"
Cohesion: 0.22
Nodes (15): uploadItemFiles(), aracBelgeSil(), aracBelgeYukle(), ortakBelgeSil(), ortakBelgeYukle(), dosyaSil(), dosyaYukle(), belgeSil() (+7 more)

### Community 5 - "FiyatlandirmaPlanlari.tsx"
Cohesion: 0.10
Nodes (21): 1) Veritabanı (Supabase), 2) Next.js projesi, Bilinen sınırlamalar (kaynaktan miras), Bu sürümde bulunup düzeltilen hatalar, Kurulum, Mobil Belge Tarama Entegrasyonu (tarayici_ios), TMGD Yönetim Sistemi, LoginPage() (+13 more)

### Community 6 - "hataCevir"
Cohesion: 0.09
Nodes (35): AssignmentsTab(), addAssignment(), hizliAta(), load(), removeAssignment(), UsersTab(), kullaniciEkle(), load() (+27 more)

### Community 7 - "SurucuListesi"
Cohesion: 0.15
Nodes (22): bosSatir(), bugununTarihi(), ensureTrailingBlank(), kayittanSatir(), SatirState, SRC5_SECENEKLERI, SurucuKaydi, SurucuListesi() (+14 more)

### Community 8 - "sayfaKontrol.ts"
Cohesion: 0.15
Nodes (26): Aday, adaylariTopla(), benzerlik(), devreDisiMi(), DOLGU, ekrandaMi(), enIyiEslesme(), Eslesme (+18 more)

### Community 9 - "actions.ts"
Cohesion: 0.18
Nodes (16): extractUnNumbers(), POST(), AY_ADLARI, ayCoz(), cipakToolJsonlari(), extractAction(), FIRMA_SEKME_ESLEME, GECERLI_ALT (+8 more)

### Community 10 - "package.json"
Cohesion: 0.11
Nodes (24): devDependencies, autoprefixer@10.4.20, eslint@8.57.1, eslint-config-next@15.5.19, postcss@8.4.49, tailwindcss@3.4.17, @types/js-yaml@^4.0.9, @types/node@20.14.10 (+16 more)

### Community 11 - "BelgeOlusturForm.tsx"
Cohesion: 0.13
Nodes (16): BELGE_GORSELLERI, BelgeTarihleri, CATEGORY_ORDER, dokumanNo(), Firm, FORM_KIRPMA, italikFontuKaydet(), LogoData (+8 more)

### Community 12 - "dashboard/page.tsx"
Cohesion: 0.16
Nodes (15): Counts, DashboardPage(), load(), DaysBadge(), daysLeft(), ExpiringItem, PRIORITY_TR, RecentTask (+7 more)

### Community 13 - "adrMix.ts"
Cohesion: 0.12
Nodes (23): CG_NOTES, CG_TABLE, checkFnA(), checkFnB(), checkFnC(), checkFnD(), checkPair(), compatGroup() (+15 more)

### Community 14 - "toolExec.ts"
Cohesion: 0.18
Nodes (18): addFirmNote(), checkMixedLoading(), getDashboardSummary(), getFirmTaskSummary(), getFirmVisits(), getNotifications(), getUnInfo(), gorevGecikmisMi() (+10 more)

### Community 15 - "aracEvraklariPdf.ts"
Cohesion: 0.18
Nodes (20): aracEvraklariPdfOlustur(), AracEvraklariPdfVerisi, ekSayfaBasligiCiz(), fontuKaydet(), gorselEnBoyOraniOku(), gorselliEkSayfasiEkle(), kapakCercevesiCiz(), kapakSayfasiCiz() (+12 more)

### Community 16 - "adrSecurityPlan.ts"
Cohesion: 0.11
Nodes (22): ADR-2023, l1DenTara(), checkSecurityPlan(), CLASS14_HIGH_CONSEQUENCE, DESENS_3, DESENS_41, evaluateItemScope(), EXCLUDED_FROM_1136 (+14 more)

### Community 17 - "client.ts"
Cohesion: 0.11
Nodes (19): AuditRow, VerifyResult, Atama, AY_ADLARI, Firm, GUN_BASLIKLARI, TMGD_RENKLERI, tmgdRenkHaritasi() (+11 more)

### Community 18 - "TasimaEvraki.tsx"
Cohesion: 0.10
Nodes (20): AMBALAJ_TURLERI, Arac, AtikKodu, CAT_MUL, Consignee, Envanter, EvrakOzet, k3FormuCiz() (+12 more)

### Community 19 - "TasimaEvraki"
Cohesion: 0.14
Nodes (17): evrakNoUret(), evrakPdfUret(), hesapla1136(), plakaBicimle(), TasimaEvraki(), aliciyiRehbereKaydet(), evrakSil(), kaydet() (+9 more)

### Community 20 - "next"
Cohesion: 0.13
Nodes (15): next, BelgeOlusturPage(), columnLabels, columns, Firm, isOverdue(), priorityColor, priorityLabels (+7 more)

### Community 21 - "[id]/page.tsx"
Cohesion: 0.10
Nodes (24): DriversPage(), EmployeesPage(), VehiclesPage(), VisitsPage(), FieldDef, FieldType, Firm, FirmScopedCrud() (+16 more)

### Community 22 - "emniyetPlaniManuelAlanlar.ts"
Cohesion: 0.21
Nodes (17): AnahtarDegerTablosu(), Bolum(), EmniyetPlaniManuelAlanlar(), ListeTablosu(), Props, satirSayisi(), AnahtarDeger, anahtarDegerSatirlari() (+9 more)

### Community 23 - "RotaHaritasi.tsx"
Cohesion: 0.16
Nodes (18): adresAra(), AramaSonucu, ayristir(), birlestir(), GorunumAyarla(), havadanKm(), ikon(), IKON_A (+10 more)

### Community 24 - "guvenlikPlaniIncelemePdf.ts"
Cohesion: 0.06
Nodes (66): ADR-2025, jspdf-autotable@^5.0.8, jspdf-autotable, downloadPdf(), baslikKutusuCiz(), fontuKaydet(), gorevliListesiPdfOlustur(), GorevliListesiPdfSatiri (+58 more)

### Community 25 - "useRealtimeVoice"
Cohesion: 0.17
Nodes (3): useRealtimeVoice(), GeminiLiveProvider, TranscriptEvent

### Community 26 - "[id]/page.tsx"
Cohesion: 0.10
Nodes (17): Attachment, BelgeRow, Bilgi(), display(), Firm, FirmDetailInner(), uploadLogo(), FirmDetailPage() (+9 more)

### Community 27 - "adr/page.tsx"
Cohesion: 0.11
Nodes (15): AdrPage(), AdrPageInner(), CLASS_COLOR, SearchBox(), SearchBoxProps, statusBadge(), Tab, ADR-0001 (+7 more)

### Community 28 - "belgeKatalogu.ts"
Cohesion: 0.14
Nodes (19): ACTIVITIES, AY_ADLARI, buildChecklist(), CATALOG, CatalogCategory, catalogForActivities(), CatalogItem, CATEGORY_LABELS (+11 more)

### Community 29 - "useUser"
Cohesion: 0.23
Nodes (11): AppShell(), AuthGuard(), GeriIleriButonlari(), geri(), NavApi, navApi(), menu, Sidebar() (+3 more)

### Community 30 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 31 - "hataCevir.ts"
Cohesion: 0.12
Nodes (12): AdminPage(), Assignment, Firm, Profile, Firm, PRIORITY_TR, STATUS_TR, FirmChemical (+4 more)

### Community 32 - "NotificationBell.tsx"
Cohesion: 0.14
Nodes (13): ROLE_TR, TabKey, TABS, daysBadgeClass(), daysLabel(), DEFAULT_SETTINGS, ExpiringDoc, NotificationBell() (+5 more)

### Community 33 - "authFetch"
Cohesion: 0.08
Nodes (34): Aday, apiPost(), DepolamaPage(), baslat(), birDosya(), Kutu(), mb(), Ozet (+26 more)

### Community 34 - "FirmaTakvimiIcerik"
Cohesion: 0.21
Nodes (12): ayBasiOfset(), FirmaTakvimiIcerik(), ayDegistir(), buAyaDon(), gunSec(), hizliEkle(), panelKapat(), ziyaretleriEkle() (+4 more)

### Community 35 - "useRealtimeVoice.ts"
Cohesion: 0.18
Nodes (13): BOS_METRIK, BOS_SESSION, firmTabUrl(), RealtimeVoiceOptions, SAYFA_YOLLARI, BARGE_IN_MS, createNoiseGate(), GateStats (+5 more)

### Community 36 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, aws4fetch@^1.0.20, js-yaml@^5.2.2, jspdf@^4.2.1, next@15.5.19, pdf-lib@^1.17.1, pdfjs-dist@^3.11.174, react@19.2.3 (+11 more)

### Community 37 - "mevzuat/page.tsx"
Cohesion: 0.22
Nodes (10): boyutYaz(), Mevzuat, MevzuatPage(), kaydet(), sil(), tarihYaz(), TUR_BILGI, TURLER (+2 more)

### Community 38 - "depoImzaliUrl"
Cohesion: 0.11
Nodes (22): Doc, DocType, DocumentsPage(), getDownloadUrl(), handleDelete(), handleSave(), handleStatusChange(), loadAll() (+14 more)

### Community 39 - "AracEvraklari.tsx"
Cohesion: 0.12
Nodes (23): Arac, ARAC_BELGE_SLOTLARI, AracBelgeAnahtari, AracEvraklari(), belgeDataUrlHazirla(), belgelerHazirla(), logoDataUrl(), pdfOlustur() (+15 more)

### Community 40 - "FirmsPage"
Cohesion: 0.23
Nodes (10): FirmsPage(), createFirm(), loadFirms(), loadLastVisits(), loadLogos(), loadProgress(), silmeOnayiKapat(), silmeyiOnayla() (+2 more)

### Community 41 - "adr-assistant/route.ts"
Cohesion: 0.16
Nodes (13): dynamic, maxDuration, belirginIngilizceMi(), CALLERS, callWithFallback(), ChatMessage, EngineCallResult, MAX_TOKENS (+5 more)

### Community 42 - "useUser.ts"
Cohesion: 0.20
Nodes (9): metadata, RootLayout(), UserProvider(), Profile, UserContext, UseUserResult, useUserState(), VARSAYILAN (+1 more)

### Community 43 - "EmniyetKapsamTaramasi.tsx"
Cohesion: 0.20
Nodes (9): KaseCizim, Props, ADR-0001, UnRow, RotaOzeti, ItemScopeResult, ACTIVITY_LABELS, FirmaOtomatikBilgi (+1 more)

### Community 44 - "EmniyetKapsamTaramasi"
Cohesion: 0.24
Nodes (12): EmniyetKapsamTaramasi(), ek1TabloBlogu(), imzaIsimleriGetir(), logoDataUrl(), manuelVeriSifirla(), raporIndir(), raporOnizle(), RotaHaritasi (+4 more)

### Community 45 - "belgeGorselleri.ts"
Cohesion: 0.50
Nodes (3): belgeGorselleriniYukle(), BELGE_GORSELLERI, ADR-0005

### Community 46 - "geminiLive.ts"
Cohesion: 0.15
Nodes (13): NAV_TOOL_NAMES, TOOL_DEFS, TOOL_NAMES, buildLiveInstruction(), GEMINI_FUNCTION_DECLARATIONS, GEMINI_LIVE_SYSTEM_INSTRUCTION, aracBildirimleri(), GEMINI_LIVE_MODELLERI (+5 more)

### Community 48 - "depoOnbellek.ts"
Cohesion: 0.27
Nodes (12): bellek, denenenler, depodanOku(), depoyaYaz(), dosyaBellegi, eksikKucukleriUret(), firmaLogoAdresi(), firmaLogoAdresleri() (+4 more)

### Community 49 - "[slug]/page.tsx"
Cohesion: 0.26
Nodes (10): baglantila(), generateMetadata(), YasalMetinSayfasi(), YASAL_METINLER, YasalBlok, yasalBloklar(), blokIsle(), ekle() (+2 more)

### Community 50 - "satirYuksekligi"
Cohesion: 0.31
Nodes (9): dinamikGorselYuksekligiHesapla(), gorsellerYuksekligiHesapla(), satirYuksekligi(), sayfalaraBol(), tabloCiz(), tabloHucreSatirlari(), tabloKolonGenislikleri(), tabloyuBol() (+1 more)

### Community 51 - "dosyaSikistir"
Cohesion: 0.23
Nodes (9): AtikFirmalariPage(), formuKapat(), kaydet(), sil(), AtikFirmasi, boyutYaz(), ERISEBILEN_ROLLER, gecerlilikRozeti() (+1 more)

### Community 52 - "BelgeOlusturForm"
Cohesion: 0.24
Nodes (8): BelgeOlusturForm(), changeFirm(), clearTempLogo(), fileToLogoData(), gorselEnBoyOrani(), logoDataUrl(), LOGO_MAKS_PIKSEL, logoyuKucult()

### Community 53 - "FirmNotesTab"
Cohesion: 0.43
Nodes (5): FirmNotesTab(), addNote(), deleteNote(), loadNotes(), saveEdit()

### Community 54 - "getFirmDocuments"
Cohesion: 0.53
Nodes (6): firmaIlerlemesi(), getFirmDocuments(), takipteSayilirMi(), catalogItem(), codeLabel(), codeSection()

### Community 56 - "FirmBelgeBildirimleri.tsx"
Cohesion: 0.23
Nodes (11): react, Bolum(), DaysBadge(), daysLeft(), FirmBelgeBildirimleri(), load(), Kalem, trTarih() (+3 more)

### Community 57 - "types.ts"
Cohesion: 0.18
Nodes (5): LiveMetrics, STTProvider, TranscriptSpeaker, TTSProvider, VoiceSession

### Community 58 - "reports/page.tsx"
Cohesion: 0.36
Nodes (9): xlsx@^0.18.5, xlsx, fmt(), ReportsPage(), generateAdrCalendarExcel(), generateDocExcel(), generateFirmPdf(), generateTaskExcel() (+1 more)

### Community 60 - "renderYapilandirilmisBelge"
Cohesion: 0.21
Nodes (15): altTabloCiz(), baslikTablosuCiz(), baslikYuksekligiHesapla(), generate(), cerceveCiz(), duzMetneCevir(), fontuKaydet(), gorsellerCiz() (+7 more)

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

### Community 72 - "ai-engine-keys/page.tsx"
Cohesion: 0.33
Nodes (6): AiEngineKeysPage(), load(), saveProvider(), PROVIDER_LABELS, PROVIDER_LINKS, ProviderRow

### Community 75 - "Sevkiyatlar.tsx"
Cohesion: 0.43
Nodes (6): ilkSatir(), Sevkiyat, Sevkiyatlar(), sevkiyatSil(), tarihSaatYaz(), tarihYaz()

### Community 76 - "getFirmMissingDocuments"
Cohesion: 0.32
Nodes (8): buildOperationalContext(), getFirmMissingDocuments(), getFirmProgress(), getVisitOverview(), istanbulAyi(), listFirms(), tamamlananBelgeler(), trKucuk()

### Community 77 - "jspdf"
Cohesion: 0.25
Nodes (7): jspdf, emniyetPlaniOlustur(), BELGE_SABLONLARI, BelgeSablonu, belgeSablonu(), TemplateBlock, ADR-0001

### Community 78 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Knowledge Gaps
- **20 isolated node(s):** `ADR-0001`, `ADR-0007`, `ADR-0008`, `RFC-3339`, `ADR-0001` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 495 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `createAdminClient`, `ADRAssistantWidget.tsx`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `client.ts`, `[id]/page.tsx`, `adr/page.tsx`, `useUser`, `hataCevir.ts`, `NotificationBell.tsx`, `authFetch`, `useRealtimeVoice.ts`, `dependencies`, `adr-assistant/route.ts`, `useUser.ts`, `EmniyetKapsamTaramasi.tsx`, `[slug]/page.tsx`, `dosyaSikistir`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useUser()` (e.g. with `Bilinen sınırlamalar (kaynaktan miras)` and `Mobil Belge Tarama Entegrasyonu (tarayici_ios)`) actually correct?**
  _`useUser()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0001`, `ADR-0007`, `ADR-0008` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.051893408134642355 - nodes in this community are weakly interconnected._
- **Why does `react` connect `FirmBelgeBildirimleri.tsx` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `FiyatlandirmaPlanlari.tsx`, `SurucuListesi`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `client.ts`, `TasimaEvraki.tsx`, `next`, `[id]/page.tsx`, `emniyetPlaniManuelAlanlar.ts`, `RotaHaritasi.tsx`, `[id]/page.tsx`, `adr/page.tsx`, `useUser`, `hataCevir.ts`, `NotificationBell.tsx`, `authFetch`, `useRealtimeVoice.ts`, `dependencies`, `mevzuat/page.tsx`, `depoImzaliUrl`, `AracEvraklari.tsx`, `useUser.ts`, `EmniyetKapsamTaramasi.tsx`, `[slug]/page.tsx`, `dosyaSikistir`, `ai-engine-keys/page.tsx`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Should `ADRAssistantWidget.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Why does `useUser()` connect `useUser` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `FiyatlandirmaPlanlari.tsx`, `hataCevir`, `SurucuListesi`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `client.ts`, `TasimaEvraki.tsx`, `TasimaEvraki`, `next`, `[id]/page.tsx`, `[id]/page.tsx`, `hataCevir.ts`, `NotificationBell.tsx`, `authFetch`, `FirmaTakvimiIcerik`, `mevzuat/page.tsx`, `depoImzaliUrl`, `AracEvraklari.tsx`, `FirmsPage`, `useUser.ts`, `dosyaSikistir`, `BelgeOlusturForm`, `FirmNotesTab`, `FirmBelgeBildirimleri.tsx`, `reports/page.tsx`, `ai-engine-keys/page.tsx`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._