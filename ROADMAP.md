# Yol Haritası — Henüz Koda Dönüşmemiş Teslimatlar

Bu dosyadaki teslimatlar `anaproje.txt` içinde **kavramsal liste, örnek
veya isim** olarak verilmişti; çalışan kod/komponent içermiyordu. Burada
hayalî kod üretilmedi — sadece neyin planlandığı ve (varsa) hangi
veritabanı tablosunun zaten hazır olduğu not edildi.

## Dashboard & Firma Deneyimi

- **T-025 — Dashboard V2**: Ek kart fikirleri (Aktif/Pasif Firma, Tamamlanan
  Görev, Yaklaşan Süreler). Mevcut `dashboard/page.tsx`'e eklenebilir.
- **T-026 — Yaklaşan Süreler Widget'ı**: Sorgu mantığı zaten
  `database/schema.sql` içinde `adr_expiring_drivers` / `adr_expiring_vehicles`
  view'ları olarak hazır; sadece bunları çağıran bir widget yazılmalı.
- **T-027 — Firma Ana Sayfası**: Sekmeli yapı (Genel / Belgeler / Görevler /
  Araçlar / Personeller / Dosyalar) — `firms/[id]/page.tsx` genişletilebilir.
- **T-028 — Dosya Yöneticisi**: Klasör ağacı UI + Supabase Storage
  `firm-files` bucket kurulumu. Tablolar (`folders`, `files`,
  `file_versions`) hazır.
- **T-079/080 — Dashboard KPI kartları & grafikler**: "Yaklaşan ADR
  Süreleri" kartı, Aylık Ziyaretler/Görevler, Belge Durumu, ADR Süre
  Takibi grafikleri. `dashboard_kpis` / `dashboard_charts` tabloları hazır.
- **T-081 — Firma Oluşturma Sihirbazı**: 5 adımlı wizard (Firma Bilgileri →
  Yetkililer → Belgeler → Araçlar → Tamamla).
- **T-082 — Firma Sağlık Skoru**: Kaynakta SQL'i tamamlanmamıştı. Verilen
  puanlama formülü:
  - Belge Durumu: %30
  - Görevler: %20
  - ADR Eğitimleri: %20
  - Denetimler: %15
  - Araç Belgeleri: %15
- **T-089 — Global Arama**: Firma/Belge/Görev/Araç/Sürücü'yü tek kutudan arama.
- **T-090 — Activity Timeline**: `activity_logs` tablosu hazır, firma
  ekranında kronolojik görünüm UI'ı eksik.
- **T-091 — Firma Portalı V3**: Kalan Görevler, Yaklaşan Süreler, Yeni
  Belgeler, TMGD Notları, Son Ziyaretler widget'ları.

## Otomasyon & Bildirim

- **T-083 — Süre Takip Motoru**: ADR Sertifikaları, SRC Belgeleri, Araç
  Uygunluk Belgeleri, Faaliyet Raporları, Eğitim Belgeleri, MSDS
  Revizyonları için merkezi kontrol.
- **T-084 — Otomatik Bildirim Motoru**: Supabase Cron ile her gün 08:00'de
  çalışıp 30/15/7/1 gün kala uyarı üretme.
- **T-085 — Email Gönderici**: Resend veya SMTP entegrasyonu.
  `email_queue` tablosu hazır.
- **T-086 — WhatsApp Servisi**: Meta WhatsApp Cloud API entegrasyonu.
  `whatsapp_queue` tablosu hazır.
- **T-093 — Push Notification**: Firebase entegrasyonu (Yeni Görev, Yeni
  Belge, Süre Uyarısı).

## Raporlama & Dışa Aktarım

- **T-087 — PDF Merkezi**: Ziyaret Raporu, Faaliyet Raporu, Denetim Formu,
  DÖF Formu, Risk Analizi, Taşıma Evrakı PDF üretimi.
- **T-088 — Excel Merkezi**: Firmalar/Görevler/Belgeler/Araçlar/Sürücüler
  için dışa aktarım.

## ADR Bilgi Motoru & AI

- **T-095 — ADR Bilgi Motoru**: `adr_un_numbers` tablo yapısı hazır; gerçek
  ADR 2025 / UN Listesi / Özel Hükümler / Tünel Kodları / LQ / EQ verisi
  henüz import edilmedi.
- **T-094 — AI TMGD Asistanı**: `ai_conversations` tablosu hazır; soru-cevap
  mantığı (örn. "UN1203 nedir?", muafiyet hesabı) yazılmadı.
- **T-096 — AI Risk Analizi**: Örnek senaryo (Benzin Dolumu → Yangın riski →
  Topraklama kontrolü önerisi) verildi, gerçek mantık yok.
- **T-097 — AI Denetim Yardımcısı**: Eksik bulgu → otomatik DÖF açma önerisi.

## Entegrasyon & Altyapı

- **T-040/067/091 — Mobil/Firma Portalı menüleri**: Sadece menü öğesi
  listeleri verildi.
- **T-092 — Mobil API**: `/api/mobile/login`, `/api/mobile/dashboard`,
  `/api/mobile/tasks`, `/api/mobile/documents` endpoint'leri tanımlanmadı.
- **T-098 — ADR Transport Pro Cloud Senkronizasyonu**: `sync_jobs` /
  `sync_queue` tabloları hazır; Desktop → API → Supabase → Portal
  senkronizasyon servisinin kendisi yazılmadı.
- **T-099 — Çoklu Dil (TR/EN/DE)**: Yapılmadı.

## Genel

- **T-020/060/075/100**: Bunlar yeni modül içermiyor, sadece o ana kadar
  yapılanların özeti / bir sonraki fazın duyurusu niteliğindeydi.
