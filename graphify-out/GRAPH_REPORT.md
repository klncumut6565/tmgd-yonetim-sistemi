# Graph Report - tmgd-yonetim-sistemi  (2026-11-16)

## Corpus Check
- 221 files · ~329,736 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1376 nodes · 3003 edges · 88 communities (77 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `131576ad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- next
- ADRAssistantWidget.tsx
- GorevliListesi.tsx
- dataTools.ts
- AracEvraklari.tsx
- login/page.tsx
- hataCevir
- SurucuListesi.tsx
- sayfaKontrol.ts
- adr-assistant/route.ts
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
- react
- FirmScopedCrud.tsx
- emniyetPlaniManuelAlanlar.ts
- RotaHaritasi.tsx
- surucuListesiPdf.ts
- useRealtimeVoice
- guvenlikPlaniIncelemePdf.ts
- adr/page.tsx
- belgeKatalogu.ts
- gorevliListesiPdf.ts
- compilerOptions
- client.ts
- useUser
- authFetch
- [id]/page.tsx
- useRealtimeVoice.ts
- dependencies
- mevzuat/page.tsx
- DateInput
- renderYapilandirilmisBelge
- FirmScopedCrud
- multiEngine.ts
- useUser.ts
- EmniyetKapsamTaramasi.tsx
- EmniyetKapsamTaramasi
- localIntent.ts
- geminiLive.ts
- RealtimeProvider
- hataCevir.ts
- [slug]/page.tsx
- depoOnbellek.ts
- atik-firmalari/page.tsx
- BelgeOlusturForm
- NotificationBell.tsx
- kaseler.ts
- FirmsPage
- FirmNotesTab.tsx
- types.ts
- xlsx
- firms/page.tsx
- generate
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
- FirmNotesTab
- Sevkiyatlar.tsx
- getFirmDocuments
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
4. `FirmDetailInner()` - 43 edges
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

## Communities (88 total, 11 thin omitted)

### Community 0 - "next"
Cohesion: 0.06
Nodes (52): RFC-3339, next, @supabase/supabase-js, dynamic, GECERLI_ROLLER, POST(), dynamic, maxDuration (+44 more)

### Community 1 - "ADRAssistantWidget.tsx"
Cohesion: 0.07
Nodes (49): ADRAssistantWidget(), dinlemeyeBasla(), gonder(), handleKeyDown(), mikrofonTikla(), sesiMetneCevir(), seslendirVeDinle(), sesliBaslatTikla() (+41 more)

### Community 2 - "GorevliListesi.tsx"
Cohesion: 0.09
Nodes (30): bosSatir(), bugununTarihi(), DOKUMAN_NO_SECENEKLERI, DOKUMAN_NO_SECIMLERI, ensureTrailingBlank(), etkinMetin(), GOREV_BASLIKLARI, GOREV_SECENEKLERI (+22 more)

### Community 3 - "dataTools.ts"
Cohesion: 0.08
Nodes (30): addVisit(), AY_TR, AY_TR_GOSTER, DANISMAN_DISI_ROLLER, DANISMAN_ROLLER, danismanEslesir(), DanismanOzeti, DURUM_ESLE (+22 more)

### Community 4 - "AracEvraklari.tsx"
Cohesion: 0.10
Nodes (25): Arac, ARAC_BELGE_SLOTLARI, AracBelgeAnahtari, AracEvraklari(), aracBelgeSil(), aracBelgeYukle(), belgeDataUrlHazirla(), belgelerHazirla() (+17 more)

### Community 5 - "login/page.tsx"
Cohesion: 0.09
Nodes (22): 1) Veritabanı (Supabase), 2) Next.js projesi, Bilinen sınırlamalar (kaynaktan miras), Bu sürümde bulunup düzeltilen hatalar, Kurulum, Mobil Belge Tarama Entegrasyonu (tarayici_ios), TMGD Yönetim Sistemi, LoginPage() (+14 more)

### Community 6 - "hataCevir"
Cohesion: 0.12
Nodes (21): FirmDetailInner(), downloadItemFile(), gorevEkle(), removeAttachment(), saveFirm(), updateContractStart(), updateExpiry(), updateVisitDate() (+13 more)

### Community 7 - "SurucuListesi.tsx"
Cohesion: 0.13
Nodes (25): bosSatir(), bugununTarihi(), ensureTrailingBlank(), kayittanSatir(), SatirState, SRC5_SECENEKLERI, SurucuKaydi, SurucuListesi() (+17 more)

### Community 8 - "sayfaKontrol.ts"
Cohesion: 0.15
Nodes (26): Aday, adaylariTopla(), benzerlik(), devreDisiMi(), DOLGU, ekrandaMi(), enIyiEslesme(), Eslesme (+18 more)

### Community 9 - "adr-assistant/route.ts"
Cohesion: 0.13
Nodes (23): dynamic, extractUnNumbers(), maxDuration, POST(), AY_ADLARI, ayCoz(), cipakToolJsonlari(), extractAction() (+15 more)

### Community 10 - "package.json"
Cohesion: 0.11
Nodes (24): devDependencies, autoprefixer@10.4.20, eslint@8.57.1, eslint-config-next@15.5.19, postcss@8.4.49, tailwindcss@3.4.17, @types/js-yaml@^4.0.9, @types/node@20.14.10 (+16 more)

### Community 11 - "BelgeOlusturForm.tsx"
Cohesion: 0.11
Nodes (21): altTabloCiz(), baslikTablosuCiz(), BELGE_GORSELLERI, BelgeTarihleri, CATEGORY_ORDER, cerceveCiz(), dokumanNo(), Firm (+13 more)

### Community 12 - "dashboard/page.tsx"
Cohesion: 0.11
Nodes (20): Counts, DashboardPage(), load(), DaysBadge(), daysLeft(), ExpiringItem, PRIORITY_TR, RecentTask (+12 more)

### Community 13 - "adrMix.ts"
Cohesion: 0.12
Nodes (23): CG_NOTES, CG_TABLE, checkFnA(), checkFnB(), checkFnC(), checkFnD(), checkPair(), compatGroup() (+15 more)

### Community 14 - "toolExec.ts"
Cohesion: 0.16
Nodes (22): addFirmNote(), buildOperationalContext(), checkMixedLoading(), getDashboardSummary(), getFirmMissingDocuments(), getFirmProgress(), getFirmVisits(), getNotifications() (+14 more)

### Community 15 - "aracEvraklariPdf.ts"
Cohesion: 0.17
Nodes (21): aracEvraklariPdfOlustur(), AracEvraklariPdfVerisi, ekSayfaBasligiCiz(), fontuKaydet(), gorselEnBoyOraniOku(), gorselliEkSayfasiEkle(), kapakCercevesiCiz(), kapakSayfasiCiz() (+13 more)

### Community 16 - "adrSecurityPlan.ts"
Cohesion: 0.12
Nodes (21): ADR-2023, checkSecurityPlan(), CLASS14_HIGH_CONSEQUENCE, DESENS_3, DESENS_41, evaluateItemScope(), EXCLUDED_FROM_1136, getTableKey() (+13 more)

### Community 17 - "firma-takvimi/page.tsx"
Cohesion: 0.13
Nodes (20): Atama, AY_ADLARI, ayBasiOfset(), Firm, FirmaTakvimiIcerik(), ayDegistir(), buAyaDon(), gunSec() (+12 more)

### Community 18 - "TasimaEvraki.tsx"
Cohesion: 0.10
Nodes (20): AMBALAJ_TURLERI, Arac, AtikKodu, CAT_MUL, Consignee, Envanter, EvrakOzet, k3FormuCiz() (+12 more)

### Community 19 - "TasimaEvraki"
Cohesion: 0.14
Nodes (17): evrakNoUret(), evrakPdfUret(), hesapla1136(), plakaBicimle(), TasimaEvraki(), aliciyiRehbereKaydet(), evrakSil(), kaydet() (+9 more)

### Community 20 - "react"
Cohesion: 0.13
Nodes (16): react, BelgeOlusturPage(), Doc, DocType, Firm, STATUS_COLORS, STATUS_TR, columnLabels (+8 more)

### Community 21 - "FirmScopedCrud.tsx"
Cohesion: 0.14
Nodes (15): DriversPage(), EmployeesPage(), VehiclesPage(), VisitsPage(), FieldDef, FieldType, Firm, Props (+7 more)

### Community 22 - "emniyetPlaniManuelAlanlar.ts"
Cohesion: 0.19
Nodes (19): AnahtarDegerTablosu(), Bolum(), EmniyetPlaniManuelAlanlar(), ListeTablosu(), Props, satirSayisi(), AnahtarDeger, anahtarDegerSatirlari() (+11 more)

### Community 23 - "RotaHaritasi.tsx"
Cohesion: 0.16
Nodes (18): adresAra(), AramaSonucu, ayristir(), birlestir(), GorunumAyarla(), havadanKm(), ikon(), IKON_A (+10 more)

### Community 24 - "surucuListesiPdf.ts"
Cohesion: 0.18
Nodes (19): SIAM_LOGO_B64, SIAM_LOGO_EN_BOY, SIAM_QR_B64, kontrolEdenKasesi(), baslikKutusuCiz(), belgeEkiSayfasiEkle(), fontuKaydet(), gorselEnBoyOraniOku() (+11 more)

### Community 25 - "useRealtimeVoice"
Cohesion: 0.17
Nodes (3): useRealtimeVoice(), GeminiLiveProvider, TranscriptEvent

### Community 26 - "guvenlikPlaniIncelemePdf.ts"
Cohesion: 0.23
Nodes (18): ADR-2025, ADR_TABLO_1_10_3_SATIRLARI, baslikKutusuCiz(), cerceveCiz(), emniyetHukumleriSayfasiCiz(), guvenlikPlaniIncelemeRaporuUret(), GuvenlikPlaniRaporVerisi, imzaTablosuCiz() (+10 more)

### Community 27 - "adr/page.tsx"
Cohesion: 0.12
Nodes (15): AdrPage(), AdrPageInner(), CLASS_COLOR, SearchBox(), SearchBoxProps, statusBadge(), Tab, ADR-0001 (+7 more)

### Community 28 - "belgeKatalogu.ts"
Cohesion: 0.15
Nodes (18): AY_ADLARI, buildChecklist(), CATALOG, CatalogCategory, catalogForActivities(), CatalogItem, CATEGORY_LABELS, ChecklistItem (+10 more)

### Community 29 - "gorevliListesiPdf.ts"
Cohesion: 0.21
Nodes (17): baslikKutusuCiz(), fontuKaydet(), gorevliListesiPdfOlustur(), GorevliListesiPdfSatiri, GorevliListesiPdfVerisi, imzaBlokuCiz(), kapakBaslikTablosuCiz(), kapakBaslikYuksekligiHesapla() (+9 more)

### Community 30 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 31 - "client.ts"
Cohesion: 0.17
Nodes (10): Assignment, Firm, Profile, AuditRow, VerifyResult, Rule, RunResult, Bekleyen (+2 more)

### Community 32 - "useUser"
Cohesion: 0.21
Nodes (12): AdminPage(), AppShell(), AuthGuard(), GeriIleriButonlari(), geri(), NavApi, navApi(), menu (+4 more)

### Community 33 - "authFetch"
Cohesion: 0.17
Nodes (13): AuditLogPage(), exportCsv(), runVerify(), mobildenTara(), WorkflowRulesPage(), deleteRule(), loadRules(), runNow() (+5 more)

### Community 34 - "[id]/page.tsx"
Cohesion: 0.12
Nodes (14): Attachment, BelgeRow, Bilgi(), display(), Firm, FirmDetailPage(), ORDER_BY, Row (+6 more)

### Community 35 - "useRealtimeVoice.ts"
Cohesion: 0.18
Nodes (13): BOS_METRIK, BOS_SESSION, firmTabUrl(), RealtimeVoiceOptions, SAYFA_YOLLARI, BARGE_IN_MS, createNoiseGate(), GateStats (+5 more)

### Community 36 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, js-yaml@^5.2.2, leaflet@^1.9.4, next@15.5.19, pdf-lib@^1.17.1, react@19.2.3, react-dom@19.2.3, react-leaflet@^5.0.0 (+8 more)

### Community 37 - "mevzuat/page.tsx"
Cohesion: 0.18
Nodes (12): pdfjs-dist@^3.11.174, pdfjs-dist, boyutYaz(), Mevzuat, MevzuatPage(), kaydet(), sil(), tarihYaz() (+4 more)

### Community 38 - "DateInput"
Cohesion: 0.20
Nodes (12): DocumentsPage(), handleDelete(), handleSave(), handleStatusChange(), loadAll(), resetForm(), expiryBadge(), DateInput() (+4 more)

### Community 39 - "renderYapilandirilmisBelge"
Cohesion: 0.20
Nodes (14): dinamikGorselYuksekligiHesapla(), duzMetneCevir(), gorsellerCiz(), gorsellerYuksekligiHesapla(), posterGorseliGetir(), renderYapilandirilmisBelge(), satirYuksekligi(), sayfalaraBol() (+6 more)

### Community 40 - "FirmScopedCrud"
Cohesion: 0.18
Nodes (11): FirmScopedCrud(), closeForm(), deleteRow(), dosyaSil(), dosyaTuru(), dosyaYukle(), loadFirms(), loadRows() (+3 more)

### Community 41 - "multiEngine.ts"
Cohesion: 0.17
Nodes (11): belirginIngilizceMi(), CALLERS, callWithFallback(), ChatMessage, EngineCallResult, MAX_TOKENS, modelCiktisiniTemizle(), motorHatasiTurkce() (+3 more)

### Community 42 - "useUser.ts"
Cohesion: 0.20
Nodes (9): metadata, RootLayout(), UserProvider(), Profile, UserContext, UseUserResult, useUserState(), VARSAYILAN (+1 more)

### Community 43 - "EmniyetKapsamTaramasi.tsx"
Cohesion: 0.15
Nodes (12): KaseCizim, Props, ADR-0001, UnRow, RotaOzeti, ScopeSummary, BELGE_SABLONLARI, BelgeSablonu (+4 more)

### Community 44 - "EmniyetKapsamTaramasi"
Cohesion: 0.24
Nodes (13): EmniyetKapsamTaramasi(), ek1TabloBlogu(), ek7Bloklari(), emniyetPlaniOlustur(), imzaIsimleriGetir(), logoDataUrl(), manuelVeriSifirla(), raporIndir() (+5 more)

### Community 45 - "localIntent.ts"
Cohesion: 0.20
Nodes (13): AssistantAction, FirmTabKey, ACMA_FIILLERI, acmaNiyetiVarMi(), EKRAN_KELIMELERI, GLOBAL_SAYFALAR, gurultuTemizle(), LocalIntentSonuc (+5 more)

### Community 46 - "geminiLive.ts"
Cohesion: 0.20
Nodes (10): buildLiveInstruction(), GEMINI_FUNCTION_DECLARATIONS, GEMINI_LIVE_SYSTEM_INSTRUCTION, aracBildirimleri(), GEMINI_LIVE_MODELLERI, LiveModel, modelSirasi(), ToolCallHandler (+2 more)

### Community 48 - "hataCevir.ts"
Cohesion: 0.18
Nodes (7): Firm, PRIORITY_TR, STATUS_TR, FirmChemical, UnRow, HataGibi, KALIPLAR

### Community 49 - "[slug]/page.tsx"
Cohesion: 0.26
Nodes (10): baglantila(), generateMetadata(), YasalMetinSayfasi(), YASAL_METINLER, YasalBlok, yasalBloklar(), blokIsle(), ekle() (+2 more)

### Community 50 - "depoOnbellek.ts"
Cohesion: 0.27
Nodes (12): bellek, denenenler, depodanOku(), depoyaYaz(), dosyaBellegi, eksikKucukleriUret(), firmaLogoAdresi(), firmaLogoAdresleri() (+4 more)

### Community 51 - "atik-firmalari/page.tsx"
Cohesion: 0.23
Nodes (9): AtikFirmalariPage(), formuKapat(), kaydet(), sil(), AtikFirmasi, boyutYaz(), ERISEBILEN_ROLLER, gecerlilikRozeti() (+1 more)

### Community 52 - "BelgeOlusturForm"
Cohesion: 0.24
Nodes (8): BelgeOlusturForm(), changeFirm(), clearTempLogo(), fileToLogoData(), gorselEnBoyOrani(), logoDataUrl(), LOGO_MAKS_PIKSEL, logoyuKucult()

### Community 53 - "NotificationBell.tsx"
Cohesion: 0.21
Nodes (9): daysBadgeClass(), daysLabel(), DEFAULT_SETTINGS, ExpiringDoc, NotificationBell(), kaldirmayiKapat(), kaldirmayiOnayla(), NotifSettings (+1 more)

### Community 54 - "kaseler.ts"
Cohesion: 0.21
Nodes (10): GomuluKase, hazirlayanKasesi(), KASE_AYLIN_ZUMBUL_UCAR, KASE_MASALLAH_TEKINOK, KASE_MASALLAH_TEKINOK_IMZALI, KASE_UMUT_KILINC, KASE_YAKUP_ATAS, KASE_YAKUP_ATAS_IMZALI (+2 more)

### Community 55 - "FirmsPage"
Cohesion: 0.29
Nodes (8): FirmsPage(), createFirm(), loadFirms(), loadLastVisits(), loadLogos(), loadProgress(), silmeOnayiKapat(), silmeyiOnayla()

### Community 56 - "FirmNotesTab.tsx"
Cohesion: 0.27
Nodes (9): Bolum(), DaysBadge(), daysLeft(), FirmBelgeBildirimleri(), load(), Kalem, trTarih(), AuthorMap (+1 more)

### Community 57 - "types.ts"
Cohesion: 0.18
Nodes (5): LiveMetrics, STTProvider, TranscriptSpeaker, TTSProvider, VoiceSession

### Community 58 - "xlsx"
Cohesion: 0.31
Nodes (10): xlsx@^0.18.5, xlsx, fmt(), ReportsPage(), generateAdrCalendarExcel(), generateDocExcel(), generateFirmPdf(), generateTaskExcel() (+2 more)

### Community 59 - "firms/page.tsx"
Cohesion: 0.27
Nodes (8): Firm, Progress, STATUS_TR, ACTIVITIES, ACTIVITY_LABELS, atananFirmaIdleri(), kapsamdisiTumunuGorur(), TMFB_KAPSAMDISI

### Community 60 - "generate"
Cohesion: 0.20
Nodes (9): baslikYuksekligiHesapla(), belgeGorselleriniYukle(), generate(), fontuKaydet(), isoTarihiTr(), sayfaYonunuAyarla(), yayinTarihiUygula(), BELGE_GORSELLERI (+1 more)

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

### Community 74 - "FirmNotesTab"
Cohesion: 0.43
Nodes (5): FirmNotesTab(), addNote(), deleteNote(), loadNotes(), saveEdit()

### Community 75 - "Sevkiyatlar.tsx"
Cohesion: 0.43
Nodes (6): ilkSatir(), Sevkiyat, Sevkiyatlar(), sevkiyatSil(), tarihSaatYaz(), tarihYaz()

### Community 76 - "getFirmDocuments"
Cohesion: 0.53
Nodes (6): firmaIlerlemesi(), getFirmDocuments(), takipteSayilirMi(), catalogItem(), codeLabel(), codeSection()

### Community 77 - "jspdf"
Cohesion: 0.40
Nodes (5): jspdf@^4.2.1, jspdf-autotable@^5.0.8, jspdf, jspdf-autotable, downloadPdf()

### Community 78 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Knowledge Gaps
- **20 isolated node(s):** `ADR-0001`, `ADR-0007`, `ADR-0008`, `RFC-3339`, `ADR-0001` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 487 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `AracEvraklari.tsx`, `login/page.tsx`, `SurucuListesi.tsx`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `firma-takvimi/page.tsx`, `TasimaEvraki.tsx`, `FirmScopedCrud.tsx`, `emniyetPlaniManuelAlanlar.ts`, `RotaHaritasi.tsx`, `adr/page.tsx`, `client.ts`, `useUser`, `[id]/page.tsx`, `useRealtimeVoice.ts`, `dependencies`, `mevzuat/page.tsx`, `useUser.ts`, `EmniyetKapsamTaramasi.tsx`, `hataCevir.ts`, `[slug]/page.tsx`, `atik-firmalari/page.tsx`, `NotificationBell.tsx`, `FirmNotesTab.tsx`, `firms/page.tsx`, `ai-engine-keys/page.tsx`, `FirmAuditTab.tsx`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useUser()` (e.g. with `Bilinen sınırlamalar (kaynaktan miras)` and `Mobil Belge Tarama Entegrasyonu (tarayici_ios)`) actually correct?**
  _`useUser()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0001`, `ADR-0007`, `ADR-0008` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.06286748077792854 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `ADRAssistantWidget.tsx`, `login/page.tsx`, `adr-assistant/route.ts`, `package.json`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `firma-takvimi/page.tsx`, `react`, `adr/page.tsx`, `client.ts`, `useUser`, `[id]/page.tsx`, `useRealtimeVoice.ts`, `dependencies`, `useUser.ts`, `EmniyetKapsamTaramasi.tsx`, `hataCevir.ts`, `[slug]/page.tsx`, `atik-firmalari/page.tsx`, `NotificationBell.tsx`, `firms/page.tsx`, `FirmAuditTab.tsx`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Should `ADRAssistantWidget.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06696428571428571 - nodes in this community are weakly interconnected._
- **Why does `useUser()` connect `useUser` to `ADRAssistantWidget.tsx`, `GorevliListesi.tsx`, `AracEvraklari.tsx`, `login/page.tsx`, `hataCevir`, `SurucuListesi.tsx`, `BelgeOlusturForm.tsx`, `dashboard/page.tsx`, `firma-takvimi/page.tsx`, `TasimaEvraki.tsx`, `TasimaEvraki`, `react`, `FirmScopedCrud.tsx`, `client.ts`, `authFetch`, `[id]/page.tsx`, `mevzuat/page.tsx`, `DateInput`, `FirmScopedCrud`, `useUser.ts`, `hataCevir.ts`, `atik-firmalari/page.tsx`, `BelgeOlusturForm`, `NotificationBell.tsx`, `FirmsPage`, `FirmNotesTab.tsx`, `xlsx`, `firms/page.tsx`, `TasksPageInner`, `UsersTab`, `ai-engine-keys/page.tsx`, `FirmNotesTab`, `Sevkiyatlar.tsx`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._