# Graph Report - tmgd-yonetim-sistemi  (2026-11-17)

## Corpus Check
- 225 files · ~332,305 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1400 nodes · 3089 edges · 76 communities (64 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `807ac888`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- createAdminClient
- ADRAssistantWidget.tsx
- GorevliListesi.tsx
- dataTools.ts
- FirmScopedCrud
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
- firma-takvimi/page.tsx
- TasimaEvraki.tsx
- TasimaEvraki
- next
- [id]/page.tsx
- emniyetPlaniManuelAlanlar.ts
- RotaHaritasi.tsx
- guvenlikPlaniIncelemePdf.ts
- useRealtimeVoice
- ADRAssistantWidget.tsx
- adr/page.tsx
- belgeKatalogu.ts
- compilerOptions
- react
- NotificationBell.tsx
- authFetch
- useRealtimeVoice.ts
- dependencies
- dosyaSikistir.ts
- DocumentsPage
- AracEvraklari
- adr-assistant/route.ts
- useUser.ts
- EmniyetKapsamTaramasi.tsx
- EmniyetKapsamTaramasi
- belgeGorselleri.ts
- geminiLive.ts
- RealtimeProvider
- [slug]/page.tsx
- dosyaSikistir
- BelgeOlusturForm
- FirmBelgeBildirimleri.tsx
- types.ts
- reports/page.tsx
- renderYapilandirilmisBelge
- surucuListesiExcel.ts
- kapakSayfasi.ts
- rotaKrokisi.ts
- adrYasakTasima.ts
- AudioPlaybackQueue
- speech.d.ts
- Database Migrations
- Yol Haritası — Henüz Koda Dönüşmemiş Teslimatlar
- TasksPageInner
- AssignmentsTab
- useUser
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
4. `FirmDetailInner()` - 44 edges
5. `supabase` - 41 edges
6. `next` - 40 edges
7. `ADRAssistantWidget()` - 32 edges
8. `authFetch()` - 32 edges
9. `useRealtimeVoice()` - 31 edges
10. `createAdminClient()` - 29 edges

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

## Communities (76 total, 12 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.06
Nodes (55): RFC-3339, @supabase/supabase-js, dynamic, GECERLI_ROLLER, POST(), dynamic, gecerliYol(), GET() (+47 more)

### Community 1 - "ADRAssistantWidget.tsx"
Cohesion: 0.05
Nodes (54): ADRAssistantWidget(), dinlemeyeBasla(), gonder(), handleKeyDown(), mikrofonTikla(), sesiMetneCevir(), seslendirVeDinle(), sesliBaslatTikla() (+46 more)

### Community 2 - "GorevliListesi.tsx"
Cohesion: 0.09
Nodes (30): bosSatir(), bugununTarihi(), DOKUMAN_NO_SECENEKLERI, DOKUMAN_NO_SECIMLERI, ensureTrailingBlank(), etkinMetin(), GOREV_BASLIKLARI, GOREV_SECENEKLERI (+22 more)

### Community 3 - "dataTools.ts"
Cohesion: 0.09
Nodes (31): addVisit(), AY_TR, AY_TR_GOSTER, DANISMAN_DISI_ROLLER, DANISMAN_ROLLER, danismanEslesir(), DanismanOzeti, DURUM_ESLE (+23 more)

### Community 4 - "FirmScopedCrud"
Cohesion: 0.20
Nodes (10): FirmScopedCrud(), closeForm(), deleteRow(), dosyaSil(), dosyaTuru(), loadFirms(), loadRows(), onizlemeAc() (+2 more)

### Community 5 - "FiyatlandirmaPlanlari.tsx"
Cohesion: 0.10
Nodes (21): 1) Veritabanı (Supabase), 2) Next.js projesi, Bilinen sınırlamalar (kaynaktan miras), Bu sürümde bulunup düzeltilen hatalar, Kurulum, Mobil Belge Tarama Entegrasyonu (tarayici_ios), TMGD Yönetim Sistemi, LoginPage() (+13 more)

### Community 6 - "hataCevir"
Cohesion: 0.10
Nodes (29): UsersTab(), kullaniciEkle(), load(), removeUser(), setActive(), setApproval(), setRole(), FirmDetailInner() (+21 more)

### Community 7 - "SurucuListesi"
Cohesion: 0.16
Nodes (20): bosSatir(), bugununTarihi(), ensureTrailingBlank(), kayittanSatir(), SurucuListesi(), belgeEkiHazirla(), belgeSil(), eklerHazirla() (+12 more)

### Community 8 - "sayfaKontrol.ts"
Cohesion: 0.15
Nodes (26): Aday, adaylariTopla(), benzerlik(), devreDisiMi(), DOLGU, ekrandaMi(), enIyiEslesme(), Eslesme (+18 more)

### Community 9 - "actions.ts"
Cohesion: 0.13
Nodes (24): dynamic, extractUnNumbers(), maxDuration, POST(), actionToUrl(), AY_ADLARI, ayCoz(), cipakToolJsonlari() (+16 more)

### Community 10 - "package.json"
Cohesion: 0.11
Nodes (24): devDependencies, autoprefixer@10.4.20, eslint@8.57.1, eslint-config-next@15.5.19, postcss@8.4.49, tailwindcss@3.4.17, @types/js-yaml@^4.0.9, @types/node@20.14.10 (+16 more)

### Community 11 - "BelgeOlusturForm.tsx"
Cohesion: 0.11
Nodes (25): BELGE_GORSELLERI, BelgeTarihleri, CATEGORY_ORDER, dinamikGorselYuksekligiHesapla(), dokumanNo(), Firm, FORM_KIRPMA, gorsellerYuksekligiHesapla() (+17 more)

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
Cohesion: 0.08
Nodes (38): Arac, ARAC_BELGE_SLOTLARI, AracBelgeAnahtari, BelgeDosyasi, BelgeSatiri(), DosyaSatiri, EK10_SECENEKLERI, Ek10Secenek (+30 more)

### Community 16 - "adrSecurityPlan.ts"
Cohesion: 0.13
Nodes (20): ADR-2023, checkSecurityPlan(), CLASS14_HIGH_CONSEQUENCE, DESENS_3, DESENS_41, evaluateItemScope(), EXCLUDED_FROM_1136, getTableKey() (+12 more)

### Community 17 - "firma-takvimi/page.tsx"
Cohesion: 0.06
Nodes (48): Atama, AY_ADLARI, ayBasiOfset(), Firm, FirmaTakvimiIcerik(), ayDegistir(), buAyaDon(), gunSec() (+40 more)

### Community 18 - "TasimaEvraki.tsx"
Cohesion: 0.10
Nodes (20): AMBALAJ_TURLERI, Arac, AtikKodu, CAT_MUL, Consignee, Envanter, EvrakOzet, k3FormuCiz() (+12 more)

### Community 19 - "TasimaEvraki"
Cohesion: 0.14
Nodes (17): evrakNoUret(), evrakPdfUret(), hesapla1136(), plakaBicimle(), TasimaEvraki(), aliciyiRehbereKaydet(), evrakSil(), kaydet() (+9 more)

### Community 20 - "next"
Cohesion: 0.12
Nodes (16): BelgeOlusturPage(), Doc, DocType, expiryBadge(), Firm, STATUS_COLORS, STATUS_TR, columnLabels (+8 more)

### Community 21 - "[id]/page.tsx"
Cohesion: 0.08
Nodes (29): DriversPage(), EmployeesPage(), Attachment, BelgeRow, Bilgi(), display(), Firm, FirmDetailPage() (+21 more)

### Community 22 - "emniyetPlaniManuelAlanlar.ts"
Cohesion: 0.19
Nodes (19): AnahtarDegerTablosu(), Bolum(), EmniyetPlaniManuelAlanlar(), ListeTablosu(), Props, satirSayisi(), AnahtarDeger, anahtarDegerSatirlari() (+11 more)

### Community 23 - "RotaHaritasi.tsx"
Cohesion: 0.16
Nodes (18): adresAra(), AramaSonucu, ayristir(), birlestir(), GorunumAyarla(), havadanKm(), ikon(), IKON_A (+10 more)

### Community 24 - "guvenlikPlaniIncelemePdf.ts"
Cohesion: 0.05
Nodes (72): ADR-2025, jspdf-autotable@^5.0.8, jspdf-autotable, downloadPdf(), Firm, PRIORITY_TR, STATUS_TR, baslikKutusuCiz() (+64 more)

### Community 25 - "useRealtimeVoice"
Cohesion: 0.17
Nodes (3): useRealtimeVoice(), GeminiLiveProvider, TranscriptEvent

### Community 26 - "ADRAssistantWidget.tsx"
Cohesion: 0.47
Nodes (3): DisplayMessage, useAudioRecorder(), KLASIK_SES_AKTIF

### Community 27 - "adr/page.tsx"
Cohesion: 0.12
Nodes (15): AdrPage(), AdrPageInner(), CLASS_COLOR, SearchBox(), SearchBoxProps, statusBadge(), Tab, ADR-0001 (+7 more)

### Community 28 - "belgeKatalogu.ts"
Cohesion: 0.13
Nodes (20): ACTIVITIES, ACTIVITY_LABELS, AY_ADLARI, buildChecklist(), CATALOG, CatalogCategory, catalogForActivities(), CatalogItem (+12 more)

### Community 30 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 31 - "react"
Cohesion: 0.10
Nodes (20): react, AuditRow, VerifyResult, AtikFirmasi, ERISEBILEN_ROLLER, Rule, RunResult, ACTION_COLOR (+12 more)

### Community 32 - "NotificationBell.tsx"
Cohesion: 0.14
Nodes (13): ROLE_TR, TabKey, TABS, daysBadgeClass(), daysLabel(), DEFAULT_SETTINGS, ExpiringDoc, NotificationBell() (+5 more)

### Community 33 - "authFetch"
Cohesion: 0.13
Nodes (19): Aday, apiPost(), DepolamaPage(), baslat(), birDosya(), Kutu(), mb(), Ozet (+11 more)

### Community 35 - "useRealtimeVoice.ts"
Cohesion: 0.15
Nodes (15): BOS_METRIK, BOS_SESSION, firmTabUrl(), RealtimeVoiceOptions, SAYFA_YOLLARI, BARGE_IN_MS, createNoiseGate(), GateStats (+7 more)

### Community 36 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, js-yaml@^5.2.2, jspdf@^4.2.1, leaflet@^1.9.4, next@15.5.19, pdf-lib@^1.17.1, react@19.2.3, react-dom@19.2.3 (+9 more)

### Community 37 - "dosyaSikistir.ts"
Cohesion: 0.11
Nodes (20): pdfjs-dist@^3.11.174, pdfjs-dist, boyutYaz(), Mevzuat, MevzuatPage(), kaydet(), sil(), tarihYaz() (+12 more)

### Community 38 - "DocumentsPage"
Cohesion: 0.48
Nodes (6): DocumentsPage(), handleDelete(), handleSave(), handleStatusChange(), loadAll(), resetForm()

### Community 39 - "AracEvraklari"
Cohesion: 0.24
Nodes (12): AracEvraklari(), aracBelgeSil(), belgeDataUrlHazirla(), belgelerHazirla(), logoDataUrl(), mobildenTara(), ortakBelgeSil(), pdfOlustur() (+4 more)

### Community 41 - "adr-assistant/route.ts"
Cohesion: 0.17
Nodes (11): belirginIngilizceMi(), CALLERS, callWithFallback(), ChatMessage, EngineCallResult, MAX_TOKENS, modelCiktisiniTemizle(), motorHatasiTurkce() (+3 more)

### Community 42 - "useUser.ts"
Cohesion: 0.13
Nodes (18): next, metadata, RootLayout(), AppShell(), AuthGuard(), GeriIleriButonlari(), geri(), NavApi (+10 more)

### Community 43 - "EmniyetKapsamTaramasi.tsx"
Cohesion: 0.22
Nodes (8): KaseCizim, Props, ADR-0001, UnRow, RotaOzeti, ItemScopeResult, SecurityPlanItem, FirmaOtomatikBilgi

### Community 44 - "EmniyetKapsamTaramasi"
Cohesion: 0.27
Nodes (10): EmniyetKapsamTaramasi(), ek1TabloBlogu(), imzaIsimleriGetir(), logoDataUrl(), manuelVeriSifirla(), raporIndir(), raporOnizle(), RotaHaritasi (+2 more)

### Community 46 - "geminiLive.ts"
Cohesion: 0.20
Nodes (10): buildLiveInstruction(), GEMINI_FUNCTION_DECLARATIONS, GEMINI_LIVE_SYSTEM_INSTRUCTION, aracBildirimleri(), GEMINI_LIVE_MODELLERI, LiveModel, modelSirasi(), ToolCallHandler (+2 more)

### Community 49 - "[slug]/page.tsx"
Cohesion: 0.26
Nodes (10): baglantila(), generateMetadata(), YasalMetinSayfasi(), YASAL_METINLER, YasalBlok, yasalBloklar(), blokIsle(), ekle() (+2 more)

### Community 51 - "dosyaSikistir"
Cohesion: 0.16
Nodes (12): AtikFirmalariPage(), formuKapat(), kaydet(), sil(), boyutYaz(), gecerlilikRozeti(), tarihYaz(), aracBelgeYukle() (+4 more)

### Community 52 - "BelgeOlusturForm"
Cohesion: 0.24
Nodes (8): BelgeOlusturForm(), changeFirm(), clearTempLogo(), fileToLogoData(), gorselEnBoyOrani(), logoDataUrl(), LOGO_MAKS_PIKSEL, logoyuKucult()

### Community 56 - "FirmBelgeBildirimleri.tsx"
Cohesion: 0.16
Nodes (15): Bolum(), DaysBadge(), daysLeft(), FirmBelgeBildirimleri(), load(), Kalem, trTarih(), AuthorMap (+7 more)

### Community 57 - "types.ts"
Cohesion: 0.18
Nodes (5): LiveMetrics, STTProvider, TranscriptSpeaker, TTSProvider, VoiceSession

### Community 58 - "reports/page.tsx"
Cohesion: 0.31
Nodes (10): xlsx@^0.18.5, xlsx, fmt(), ReportsPage(), generateAdrCalendarExcel(), generateDocExcel(), generateFirmPdf(), generateTaskExcel() (+2 more)

### Community 60 - "renderYapilandirilmisBelge"
Cohesion: 0.17
Nodes (17): altTabloCiz(), baslikTablosuCiz(), baslikYuksekligiHesapla(), belgeGorselleriniYukle(), generate(), cerceveCiz(), duzMetneCevir(), fontuKaydet() (+9 more)

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

### Community 69 - "TasksPageInner"
Cohesion: 0.39
Nodes (6): TasksPageInner(), createTask(), deleteTask(), loadTasks(), saveEdit(), setStatus()

### Community 70 - "AssignmentsTab"
Cohesion: 0.43
Nodes (5): AssignmentsTab(), addAssignment(), hizliAta(), load(), removeAssignment()

### Community 72 - "useUser"
Cohesion: 0.17
Nodes (13): AdminPage(), Assignment, Firm, Profile, AiEngineKeysPage(), load(), saveProvider(), PROVIDER_LABELS (+5 more)

### Community 75 - "Sevkiyatlar.tsx"
Cohesion: 0.43
Nodes (6): ilkSatir(), Sevkiyat, Sevkiyatlar(), sevkiyatSil(), tarihSaatYaz(), tarihYaz()

### Community 76 - "getFirmMissingDocuments"
Cohesion: 0.26
Nodes (12): buildOperationalContext(), firmaIlerlemesi(), getFirmDocuments(), getFirmMissingDocuments(), getFirmProgress(), listFirms(), takipteSayilirMi(), tamamlananBelgeler() (+4 more)

### Community 77 - "jspdf"
Cohesion: 0.25
Nodes (7): jspdf, emniyetPlaniOlustur(), BELGE_SABLONLARI, BelgeSablonu, belgeSablonu(), TemplateBlock, ADR-0001

### Community 78 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Knowledge Gaps
- **20 isolated node(s):** `RFC-3339`, `ADR-0001`, `ADR-0007`, `ADR-2023`, `ADR-0001` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 491 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `FiyatlandirmaPlanlari.tsx`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `aracEvraklariPdf.ts`, `firma-takvimi/page.tsx`, `TasimaEvraki.tsx`, `next`, `[id]/page.tsx`, `emniyetPlaniManuelAlanlar.ts`, `RotaHaritasi.tsx`, `guvenlikPlaniIncelemePdf.ts`, `ADRAssistantWidget.tsx`, `adr/page.tsx`, `NotificationBell.tsx`, `authFetch`, `useRealtimeVoice.ts`, `dependencies`, `dosyaSikistir.ts`, `useUser.ts`, `EmniyetKapsamTaramasi.tsx`, `[slug]/page.tsx`, `FirmBelgeBildirimleri.tsx`, `useUser`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useUser()` (e.g. with `Bilinen sınırlamalar (kaynaktan miras)` and `Mobil Belge Tarama Entegrasyonu (tarayici_ios)`) actually correct?**
  _`useUser()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-3339`, `ADR-0001`, `ADR-0007` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05754527162977867 - nodes in this community are weakly interconnected._
- **Why does `useUser()` connect `useUser` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `FirmScopedCrud`, `FiyatlandirmaPlanlari.tsx`, `hataCevir`, `SurucuListesi`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `aracEvraklariPdf.ts`, `firma-takvimi/page.tsx`, `TasimaEvraki.tsx`, `TasimaEvraki`, `next`, `[id]/page.tsx`, `guvenlikPlaniIncelemePdf.ts`, `ADRAssistantWidget.tsx`, `react`, `NotificationBell.tsx`, `authFetch`, `dosyaSikistir.ts`, `DocumentsPage`, `AracEvraklari`, `useUser.ts`, `dosyaSikistir`, `BelgeOlusturForm`, `FirmBelgeBildirimleri.tsx`, `reports/page.tsx`, `TasksPageInner`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Should `ADRAssistantWidget.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05384615384615385 - nodes in this community are weakly interconnected._
- **Why does `next` connect `useUser.ts` to `createAdminClient`, `authFetch`, `NotificationBell.tsx`, `useRealtimeVoice.ts`, `dependencies`, `actions.ts`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `EmniyetKapsamTaramasi.tsx`, `firma-takvimi/page.tsx`, `[slug]/page.tsx`, `next`, `[id]/page.tsx`, `guvenlikPlaniIncelemePdf.ts`, `ADRAssistantWidget.tsx`, `adr/page.tsx`, `react`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._