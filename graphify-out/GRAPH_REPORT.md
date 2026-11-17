# Graph Report - tmgd-yonetim-sistemi  (2026-11-17)

## Corpus Check
- 222 files · ~330,565 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1385 nodes · 3047 edges · 86 communities (72 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `613cec88`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- createAdminClient
- ADRAssistantWidget.tsx
- GorevliListesi.tsx
- dataTools.ts
- AracEvraklari.tsx
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
- FirmScopedCrud
- emniyetPlaniManuelAlanlar.ts
- RotaHaritasi.tsx
- surucuListesiPdf.ts
- useRealtimeVoice
- guvenlikPlaniIncelemePdf.ts
- adr/page.tsx
- belgeKatalogu.ts
- gorevliListesiPdf.ts
- compilerOptions
- react
- useUser
- WorkflowRulesPage
- authFetch
- useRealtimeVoice.ts
- dependencies
- mevzuat/page.tsx
- DocumentsPage
- AracEvraklari
- SettingsPage
- adr-assistant/route.ts
- useUser.ts
- EmniyetKapsamTaramasi.tsx
- EmniyetKapsamTaramasi
- belgeGorselleri.ts
- geminiLive.ts
- RealtimeProvider
- leaflet
- [slug]/page.tsx
- [id]/page.tsx
- FirmScopedCrud.tsx
- BelgeOlusturForm
- typescript@5.7.3
- kaseler.ts
- FirmsPage
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
- UsersTab
- ai-engine-keys/page.tsx
- FirmAuditTab.tsx
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
2. `useUser()` - 67 edges
3. `react` - 52 edges
4. `FirmDetailInner()` - 44 edges
5. `supabase` - 40 edges
6. `next` - 38 edges
7. `ADRAssistantWidget()` - 32 edges
8. `useRealtimeVoice()` - 31 edges
9. `TasimaEvraki()` - 29 edges
10. `authFetch()` - 29 edges

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

## Communities (86 total, 14 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.06
Nodes (52): RFC-3339, @supabase/supabase-js@2.45.4, @supabase/supabase-js, dynamic, GECERLI_ROLLER, POST(), dynamic, maxDuration (+44 more)

### Community 1 - "ADRAssistantWidget.tsx"
Cohesion: 0.05
Nodes (61): ADRAssistantWidget(), dinlemeyeBasla(), gonder(), handleKeyDown(), mikrofonTikla(), sesiMetneCevir(), seslendirVeDinle(), sesliBaslatTikla() (+53 more)

### Community 2 - "GorevliListesi.tsx"
Cohesion: 0.09
Nodes (30): bosSatir(), bugununTarihi(), DOKUMAN_NO_SECENEKLERI, DOKUMAN_NO_SECIMLERI, ensureTrailingBlank(), etkinMetin(), GOREV_BASLIKLARI, GOREV_SECENEKLERI (+22 more)

### Community 3 - "dataTools.ts"
Cohesion: 0.09
Nodes (31): addVisit(), AY_TR, AY_TR_GOSTER, DANISMAN_DISI_ROLLER, DANISMAN_ROLLER, danismanEslesir(), DanismanOzeti, DURUM_ESLE (+23 more)

### Community 4 - "AracEvraklari.tsx"
Cohesion: 0.10
Nodes (19): pdfjs-dist, Arac, ARAC_BELGE_SLOTLARI, AracBelgeAnahtari, BelgeDosyasi, BelgeSatiri(), DosyaSatiri, EK10_SECENEKLERI (+11 more)

### Community 5 - "FiyatlandirmaPlanlari.tsx"
Cohesion: 0.10
Nodes (21): 1) Veritabanı (Supabase), 2) Next.js projesi, Bilinen sınırlamalar (kaynaktan miras), Bu sürümde bulunup düzeltilen hatalar, Kurulum, Mobil Belge Tarama Entegrasyonu (tarayici_ios), TMGD Yönetim Sistemi, LoginPage() (+13 more)

### Community 6 - "hataCevir"
Cohesion: 0.12
Nodes (20): Bilgi(), display(), FirmDetailInner(), downloadItemFile(), gorevEkle(), removeAttachment(), saveFirm(), updateContractStart() (+12 more)

### Community 7 - "SurucuListesi"
Cohesion: 0.15
Nodes (20): bosSatir(), bugununTarihi(), ensureTrailingBlank(), kayittanSatir(), SurucuListesi(), belgeEkiHazirla(), belgeSil(), belgeYukle() (+12 more)

### Community 8 - "sayfaKontrol.ts"
Cohesion: 0.15
Nodes (26): Aday, adaylariTopla(), benzerlik(), devreDisiMi(), DOLGU, ekrandaMi(), enIyiEslesme(), Eslesme (+18 more)

### Community 9 - "actions.ts"
Cohesion: 0.18
Nodes (16): extractUnNumbers(), POST(), AY_ADLARI, ayCoz(), cipakToolJsonlari(), extractAction(), FIRMA_SEKME_ESLEME, GECERLI_ALT (+8 more)

### Community 10 - "package.json"
Cohesion: 0.12
Nodes (22): devDependencies, autoprefixer@10.4.20, eslint@8.57.1, eslint-config-next@15.5.19, postcss@8.4.49, tailwindcss@3.4.17, @types/js-yaml@^4.0.9, @types/node@20.14.10 (+14 more)

### Community 11 - "BelgeOlusturForm.tsx"
Cohesion: 0.11
Nodes (25): BELGE_GORSELLERI, BelgeTarihleri, CATEGORY_ORDER, dinamikGorselYuksekligiHesapla(), dokumanNo(), Firm, FORM_KIRPMA, gorsellerYuksekligiHesapla() (+17 more)

### Community 12 - "dashboard/page.tsx"
Cohesion: 0.17
Nodes (13): Counts, DashboardPage(), load(), DaysBadge(), daysLeft(), ExpiringItem, PRIORITY_TR, RecentTask (+5 more)

### Community 13 - "adrMix.ts"
Cohesion: 0.12
Nodes (23): CG_NOTES, CG_TABLE, checkFnA(), checkFnB(), checkFnC(), checkFnD(), checkPair(), compatGroup() (+15 more)

### Community 14 - "toolExec.ts"
Cohesion: 0.18
Nodes (18): addFirmNote(), checkMixedLoading(), getDashboardSummary(), getFirmTaskSummary(), getFirmVisits(), getNotifications(), getUnInfo(), gorevGecikmisMi() (+10 more)

### Community 15 - "aracEvraklariPdf.ts"
Cohesion: 0.17
Nodes (21): AracEvrakBelgesi, aracEvraklariPdfOlustur(), AracEvraklariPdfVerisi, ekSayfaBasligiCiz(), fontuKaydet(), gorselEnBoyOraniOku(), gorselliEkSayfasiEkle(), kapakCercevesiCiz() (+13 more)

### Community 16 - "adrSecurityPlan.ts"
Cohesion: 0.11
Nodes (22): ADR-2023, checkSecurityPlan(), CLASS14_HIGH_CONSEQUENCE, DESENS_3, DESENS_41, evaluateItemScope(), EXCLUDED_FROM_1136, getTableKey() (+14 more)

### Community 17 - "firma-takvimi/page.tsx"
Cohesion: 0.13
Nodes (20): Atama, AY_ADLARI, ayBasiOfset(), Firm, FirmaTakvimiIcerik(), ayDegistir(), buAyaDon(), gunSec() (+12 more)

### Community 18 - "TasimaEvraki.tsx"
Cohesion: 0.10
Nodes (20): AMBALAJ_TURLERI, Arac, AtikKodu, CAT_MUL, Consignee, Envanter, EvrakOzet, k3FormuCiz() (+12 more)

### Community 19 - "TasimaEvraki"
Cohesion: 0.14
Nodes (17): evrakNoUret(), evrakPdfUret(), hesapla1136(), plakaBicimle(), TasimaEvraki(), aliciyiRehbereKaydet(), evrakSil(), kaydet() (+9 more)

### Community 20 - "next"
Cohesion: 0.13
Nodes (16): next, BelgeOlusturPage(), Doc, DocType, Firm, STATUS_COLORS, STATUS_TR, columnLabels (+8 more)

### Community 21 - "FirmScopedCrud"
Cohesion: 0.11
Nodes (21): DriversPage(), EmployeesPage(), VehiclesPage(), VisitsPage(), FieldDef, FirmScopedCrud(), closeForm(), deleteRow() (+13 more)

### Community 22 - "emniyetPlaniManuelAlanlar.ts"
Cohesion: 0.19
Nodes (19): AnahtarDegerTablosu(), Bolum(), EmniyetPlaniManuelAlanlar(), ListeTablosu(), Props, satirSayisi(), AnahtarDeger, anahtarDegerSatirlari() (+11 more)

### Community 23 - "RotaHaritasi.tsx"
Cohesion: 0.16
Nodes (18): adresAra(), AramaSonucu, ayristir(), birlestir(), GorunumAyarla(), havadanKm(), ikon(), IKON_A (+10 more)

### Community 24 - "surucuListesiPdf.ts"
Cohesion: 0.16
Nodes (20): kontrolEdenKasesi(), LIBERATION_SANS_BOLD_B64, LIBERATION_SANS_REGULAR_B64, baslikKutusuCiz(), belgeEkiSayfasiEkle(), fontuKaydet(), gorselEnBoyOraniOku(), imzaBlokuCiz() (+12 more)

### Community 25 - "useRealtimeVoice"
Cohesion: 0.17
Nodes (3): useRealtimeVoice(), GeminiLiveProvider, TranscriptEvent

### Community 26 - "guvenlikPlaniIncelemePdf.ts"
Cohesion: 0.27
Nodes (16): ADR-2025, ADR_TABLO_1_10_3_SATIRLARI, baslikKutusuCiz(), cerceveCiz(), emniyetHukumleriSayfasiCiz(), guvenlikPlaniIncelemeRaporuUret(), imzaTablosuCiz(), JsPDFType (+8 more)

### Community 27 - "adr/page.tsx"
Cohesion: 0.12
Nodes (15): AdrPage(), AdrPageInner(), CLASS_COLOR, SearchBox(), SearchBoxProps, statusBadge(), Tab, ADR-0001 (+7 more)

### Community 28 - "belgeKatalogu.ts"
Cohesion: 0.14
Nodes (19): ACTIVITY_LABELS, AY_ADLARI, buildChecklist(), CATALOG, CatalogCategory, catalogForActivities(), CatalogItem, CATEGORY_LABELS (+11 more)

### Community 29 - "gorevliListesiPdf.ts"
Cohesion: 0.20
Nodes (18): baslikKutusuCiz(), fontuKaydet(), gorevliListesiPdfOlustur(), GorevliListesiPdfSatiri, GorevliListesiPdfVerisi, imzaBlokuCiz(), kapakBaslikTablosuCiz(), kapakBaslikYuksekligiHesapla() (+10 more)

### Community 30 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 31 - "react"
Cohesion: 0.10
Nodes (22): react, AdminPage(), Assignment, Firm, Profile, AuditRow, VerifyResult, Rule (+14 more)

### Community 32 - "useUser"
Cohesion: 0.12
Nodes (20): AppShell(), AuthGuard(), GeriIleriButonlari(), geri(), NavApi, navApi(), menu, Sidebar() (+12 more)

### Community 33 - "WorkflowRulesPage"
Cohesion: 0.33
Nodes (6): WorkflowRulesPage(), deleteRule(), loadRules(), runNow(), saveRule(), toggleEnabled()

### Community 34 - "authFetch"
Cohesion: 0.20
Nodes (12): AuditLogPage(), exportCsv(), runVerify(), mobildenTara(), ACTION_COLOR, ACTION_TR, AuditLogWidget(), load() (+4 more)

### Community 35 - "useRealtimeVoice.ts"
Cohesion: 0.18
Nodes (13): BOS_METRIK, BOS_SESSION, firmTabUrl(), RealtimeVoiceOptions, SAYFA_YOLLARI, BARGE_IN_MS, createNoiseGate(), GateStats (+5 more)

### Community 36 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, js-yaml@^5.2.2, jspdf@^4.2.1, next@15.5.19, pdf-lib@^1.17.1, pdfjs-dist@^3.11.174, react@19.2.3, react-dom@19.2.3 (+7 more)

### Community 37 - "mevzuat/page.tsx"
Cohesion: 0.22
Nodes (10): boyutYaz(), Mevzuat, MevzuatPage(), kaydet(), sil(), tarihYaz(), TUR_BILGI, TURLER (+2 more)

### Community 38 - "DocumentsPage"
Cohesion: 0.39
Nodes (7): DocumentsPage(), handleDelete(), handleSave(), handleStatusChange(), loadAll(), resetForm(), expiryBadge()

### Community 39 - "AracEvraklari"
Cohesion: 0.21
Nodes (13): AracEvraklari(), aracBelgeSil(), aracBelgeYukle(), belgeDataUrlHazirla(), belgelerHazirla(), logoDataUrl(), mobildenTara(), ortakBelgeSil() (+5 more)

### Community 40 - "SettingsPage"
Cohesion: 0.29
Nodes (5): DaySlider(), SettingsPage(), changePassword(), saveNotifSettings(), saveProfile()

### Community 41 - "adr-assistant/route.ts"
Cohesion: 0.13
Nodes (16): dynamic, maxDuration, belirginIngilizceMi(), CALLERS, callWithFallback(), ChatMessage, EngineCallResult, MAX_TOKENS (+8 more)

### Community 42 - "useUser.ts"
Cohesion: 0.20
Nodes (9): metadata, RootLayout(), UserProvider(), Profile, UserContext, UseUserResult, useUserState(), VARSAYILAN (+1 more)

### Community 43 - "EmniyetKapsamTaramasi.tsx"
Cohesion: 0.14
Nodes (13): KaseCizim, Props, ADR-0001, UnRow, RotaOzeti, LogoData, BELGE_SABLONLARI, BelgeSablonu (+5 more)

### Community 44 - "EmniyetKapsamTaramasi"
Cohesion: 0.24
Nodes (13): EmniyetKapsamTaramasi(), ek1TabloBlogu(), ek7Bloklari(), emniyetPlaniOlustur(), imzaIsimleriGetir(), logoDataUrl(), manuelVeriSifirla(), raporIndir() (+5 more)

### Community 46 - "geminiLive.ts"
Cohesion: 0.20
Nodes (10): buildLiveInstruction(), GEMINI_FUNCTION_DECLARATIONS, GEMINI_LIVE_SYSTEM_INSTRUCTION, aracBildirimleri(), GEMINI_LIVE_MODELLERI, LiveModel, modelSirasi(), ToolCallHandler (+2 more)

### Community 49 - "[slug]/page.tsx"
Cohesion: 0.26
Nodes (10): baglantila(), generateMetadata(), YasalMetinSayfasi(), YASAL_METINLER, YasalBlok, yasalBloklar(), blokIsle(), ekle() (+2 more)

### Community 50 - "[id]/page.tsx"
Cohesion: 0.10
Nodes (28): Attachment, BelgeRow, Firm, ORDER_BY, Row, TAB_COLUMNS, TabKey, TABS (+20 more)

### Community 51 - "FirmScopedCrud.tsx"
Cohesion: 0.12
Nodes (22): AtikFirmalariPage(), formuKapat(), kaydet(), sil(), AtikFirmasi, boyutYaz(), ERISEBILEN_ROLLER, gecerlilikRozeti() (+14 more)

### Community 52 - "BelgeOlusturForm"
Cohesion: 0.23
Nodes (9): BelgeOlusturForm(), changeFirm(), clearTempLogo(), fileToLogoData(), gorselEnBoyOrani(), logoDataUrl(), depoDosyasiGetir(), LOGO_MAKS_PIKSEL (+1 more)

### Community 54 - "kaseler.ts"
Cohesion: 0.21
Nodes (10): GomuluKase, hazirlayanKasesi(), KASE_AYLIN_ZUMBUL_UCAR, KASE_MASALLAH_TEKINOK, KASE_MASALLAH_TEKINOK_IMZALI, KASE_UMUT_KILINC, KASE_YAKUP_ATAS, KASE_YAKUP_ATAS_IMZALI (+2 more)

### Community 55 - "FirmsPage"
Cohesion: 0.29
Nodes (8): FirmsPage(), createFirm(), loadFirms(), loadLastVisits(), loadLogos(), loadProgress(), silmeOnayiKapat(), silmeyiOnayla()

### Community 56 - "FirmBelgeBildirimleri.tsx"
Cohesion: 0.20
Nodes (12): Bolum(), DaysBadge(), daysLeft(), FirmBelgeBildirimleri(), load(), Kalem, trTarih(), FirmNotesTab() (+4 more)

### Community 57 - "types.ts"
Cohesion: 0.18
Nodes (5): LiveMetrics, STTProvider, TranscriptSpeaker, TTSProvider, VoiceSession

### Community 58 - "reports/page.tsx"
Cohesion: 0.17
Nodes (12): xlsx@^0.18.5, xlsx, Firm, fmt(), PRIORITY_TR, ReportsPage(), generateAdrCalendarExcel(), generateDocExcel() (+4 more)

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
Cohesion: 0.39
Nodes (8): RotaNoktasi, guzergahKrokisiUret(), projeksiyon(), KrokiYolBilgisi, latToY(), lonToX(), mesafeKm(), tileYukle()

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

### Community 71 - "UsersTab"
Cohesion: 0.52
Nodes (7): UsersTab(), kullaniciEkle(), load(), removeUser(), setActive(), setApproval(), setRole()

### Community 72 - "ai-engine-keys/page.tsx"
Cohesion: 0.33
Nodes (6): AiEngineKeysPage(), load(), saveProvider(), PROVIDER_LABELS, PROVIDER_LINKS, ProviderRow

### Community 73 - "FirmAuditTab.tsx"
Cohesion: 0.29
Nodes (5): ACTION_COLOR, ACTION_TR, AuditRow, FirmAuditTab(), TABLE_TR

### Community 75 - "Sevkiyatlar.tsx"
Cohesion: 0.43
Nodes (6): ilkSatir(), Sevkiyat, Sevkiyatlar(), sevkiyatSil(), tarihSaatYaz(), tarihYaz()

### Community 76 - "getFirmMissingDocuments"
Cohesion: 0.26
Nodes (12): buildOperationalContext(), firmaIlerlemesi(), getFirmDocuments(), getFirmMissingDocuments(), getFirmProgress(), listFirms(), takipteSayilirMi(), tamamlananBelgeler() (+4 more)

### Community 77 - "jspdf"
Cohesion: 0.40
Nodes (6): jspdf-autotable@^5.0.8, jspdf, jspdf-autotable, downloadPdf(), generateFirmPdf(), newDoc()

### Community 78 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Knowledge Gaps
- **20 isolated node(s):** `ADR-0001`, `ADR-0007`, `ADR-0008`, `RFC-3339`, `ADR-0001` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 487 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `AracEvraklari.tsx`, `FiyatlandirmaPlanlari.tsx`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `firma-takvimi/page.tsx`, `TasimaEvraki.tsx`, `next`, `emniyetPlaniManuelAlanlar.ts`, `RotaHaritasi.tsx`, `adr/page.tsx`, `useUser`, `authFetch`, `useRealtimeVoice.ts`, `dependencies`, `mevzuat/page.tsx`, `useUser.ts`, `EmniyetKapsamTaramasi.tsx`, `[slug]/page.tsx`, `[id]/page.tsx`, `FirmScopedCrud.tsx`, `FirmBelgeBildirimleri.tsx`, `reports/page.tsx`, `ai-engine-keys/page.tsx`, `FirmAuditTab.tsx`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useUser()` (e.g. with `Bilinen sınırlamalar (kaynaktan miras)` and `Mobil Belge Tarama Entegrasyonu (tarayici_ios)`) actually correct?**
  _`useUser()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0001`, `ADR-0007`, `ADR-0008` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05924920850293985 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `createAdminClient`, `ADRAssistantWidget.tsx`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `firma-takvimi/page.tsx`, `adr/page.tsx`, `react`, `useUser`, `authFetch`, `useRealtimeVoice.ts`, `dependencies`, `adr-assistant/route.ts`, `useUser.ts`, `EmniyetKapsamTaramasi.tsx`, `[slug]/page.tsx`, `[id]/page.tsx`, `FirmScopedCrud.tsx`, `reports/page.tsx`, `FirmAuditTab.tsx`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Should `ADRAssistantWidget.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Why does `useUser()` connect `useUser` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `AracEvraklari.tsx`, `FiyatlandirmaPlanlari.tsx`, `hataCevir`, `SurucuListesi`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `firma-takvimi/page.tsx`, `TasimaEvraki.tsx`, `TasimaEvraki`, `next`, `FirmScopedCrud`, `react`, `WorkflowRulesPage`, `authFetch`, `mevzuat/page.tsx`, `DocumentsPage`, `AracEvraklari`, `SettingsPage`, `useUser.ts`, `[id]/page.tsx`, `FirmScopedCrud.tsx`, `BelgeOlusturForm`, `FirmsPage`, `FirmBelgeBildirimleri.tsx`, `reports/page.tsx`, `TasksPageInner`, `UsersTab`, `ai-engine-keys/page.tsx`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._