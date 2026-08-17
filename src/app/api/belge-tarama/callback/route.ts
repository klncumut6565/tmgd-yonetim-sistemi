// src/app/api/belge-tarama/callback/route.ts
//
// tarayici_ios PWA'sının tarama bitince otomatik POST ettiği uç.
//
// ÖNEMLİ: Bu route HERKESE AÇIKTIR — çağıran taraf (tarayıcı PWA'sı) ayrı
// bir origin'de çalışır ve normal Supabase Bearer token TAŞIMAZ, sadece
// /baslat ucunun ürettiği URL'e gömülü token'ı form alanı olarak geri
// yansıtır (bkz. tarayici_ios/lib/scannerModule.ts → deliverDocument).
// Güvenlik modeli migration 040'ta açıklanmıştır: tahmin edilemez +
// kısa ömürlü + tek kullanımlık token.
//
// HEDEF TİPİNE GÖRE DALLANMA (migration 047): oturum.hedef_tipi, taranan
// dosyanın hangi tabloya/alana yazılacağını belirler. Her dal, ilgili
// manuel yükleme akışıyla (AracEvraklari.tsx / SurucuListesi.tsx /
// firms/[id]/page.tsx handleFileSelect) AYNI storage yolu desenini ve
// AYNI DB alanlarını kullanır — böylece tarama sonucu, manuel yüklemeden
// ayırt edilemez biçimde görünür.
//
// CORS: tarayici_ios ayrı bir origin'den (kendi Vercel adresi) tarayıcı
// içinden doğrudan fetch() ile POST attığı için bu uca CORS başlıkları
// eklenmesi ZORUNLU — yoksa istek sunucuya ulaşıp dosya kaydedilse bile
// tarayıcı, JS tarafının cevabı okumasını engelliyor ve istemci tarafında
// "Load failed" / "Failed to fetch" gibi bir hata görünüyor (isteğin
// kendisi değil, CEVABIN okunması engelleniyor). Kimlik doğrulama burada
// çerez/oturuma değil, tek kullanımlık token'a dayandığı için `*` ile
// açmak güvenlik açığı oluşturmuyor (credentials modu zaten kullanılmıyor).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function corsJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders })
}

// Bazı tarayıcılar (özellikle iOS Safari/WKWebView, form alanlarına bağlı
// olarak) multipart/form-data POST öncesi bir OPTIONS ön-uçuşu (preflight)
// gönderebilir. Bu olmadan preflight 404/405 alır ve asıl POST hiç
// denenmez.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

type HedefTipi = 'belge_takip' | 'arac_ortak' | 'arac_ozel' | 'surucu_belge'

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) {
    return corsJson({ error: 'Geçersiz istek gövdesi.' }, 400)
  }

  const dosya = form.get('file')
  const token = form.get('token')

  // NOT: tarayici_ios, kullanıcının tarama ekranında seçtiği "Belge Türü"
  // (SDS/ADR/Fatura/...) bilgisini `docType` form alanı olarak da gönderir.
  // Burada BİLİNÇLİ OLARAK okunmuyor: bu entegrasyon yolunda hedef belge
  // türü (code/period veya hedef_veri) zaten oturum oluşturulurken (/baslat
  // ucunda, kullanıcı ilgili spesifik alana tıkladığında) sunucu tarafında
  // sabitleniyor — tarayıcı tarafındaki genel "Belge Türü" seçimi bu akış
  // için anlamlı bir yönlendirme sağlamıyor, sadece bilgi amaçlı geliyor.

  if (!dosya || !(dosya instanceof Blob) || typeof token !== 'string' || !token) {
    return corsJson({ error: 'Eksik alan: file veya token.' }, 400)
  }

  const supabase = createAdminClient()

  // ---- Token doğrulama: tahmin edilemez + süresi dolmamış + kullanılmamış ----
  const { data: oturum, error: oturumHata } = await supabase
    .from('belge_tarama_oturumlari')
    .select('id, firm_id, code, period, used_at, expires_at, hedef_tipi, hedef_veri')
    .eq('id', token)
    .single()

  if (oturumHata || !oturum) {
    return corsJson({ error: 'Geçersiz tarama oturumu.' }, 403)
  }
  if (oturum.used_at) {
    return corsJson({ error: 'Bu tarama oturumu zaten kullanılmış.' }, 403)
  }
  if (new Date(oturum.expires_at).getTime() < Date.now()) {
    return corsJson({ error: 'Tarama oturumunun süresi dolmuş.' }, 403)
  }

  const hedefTipi = (oturum.hedef_tipi ?? 'belge_takip') as HedefTipi
  const hedefVeri = (oturum.hedef_veri ?? {}) as Record<string, unknown>

  const orijinalAd = (form.get('title') as string | null) || 'tarama'
  const guvenliAd = orijinalAd.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.pdf'

  // ---- Hedef tipine göre storage yolu + DB yazımı ----
  let yol: string

  try {
    if (hedefTipi === 'arac_ortak') {
      // AracEvraklari.tsx → ortakBelgeYukle ile AYNI yol deseni ve AYNI
      // tablo (firm_arac_evrak_dosyalari, migration 050 — çoklu dosya
      // desteği). INSERT edilir, ÜZERİNE YAZILMAZ — mobilden taranan
      // belge de mevcut dosyaların yanına eklenir.
      const tur = String(hedefVeri.tur)
      if (tur !== 'tmfb' && tur !== 'k1') {
        return corsJson({ error: 'Geçersiz hedef: tur.' }, 400)
      }
      yol = `${oturum.firm_id}/firma-ortak-belgeler/${tur}_${Date.now()}.pdf`

      const { error: yuklemeHata } = await supabase.storage
        .from('firm-files')
        .upload(yol, dosya, { upsert: false, contentType: 'application/pdf' })
      if (yuklemeHata) {
        return corsJson({ error: 'Dosya kaydedilemedi: ' + yuklemeHata.message }, 500)
      }

      const { error: dbHata } = await supabase.from('firm_arac_evrak_dosyalari').insert({
        firm_id: oturum.firm_id,
        vehicle_id: null,
        belge_turu: tur,
        file_path: yol,
        file_name: guvenliAd,
      })
      if (dbHata) {
        await supabase.storage.from('firm-files').remove([yol])
        return corsJson({ error: 'Belge kaydı oluşturulamadı: ' + dbHata.message }, 500)
      }
    } else if (hedefTipi === 'arac_ozel') {
      // AracEvraklari.tsx → aracBelgeYukle ile AYNI yol deseni ve AYNI
      // tablo (firm_arac_evrak_dosyalari, migration 050). INSERT edilir,
      // ÜZERİNE YAZILMAZ.
      const vehicleId = String(hedefVeri.vehicleId ?? '')
      const anahtar = String(hedefVeri.anahtar ?? '')
      if (!vehicleId || !anahtar) {
        return corsJson({ error: 'Geçersiz hedef: vehicleId/anahtar.' }, 400)
      }
      yol = `${oturum.firm_id}/firm_arac_evraklari/${vehicleId}/${anahtar}_${Date.now()}.pdf`

      const { error: yuklemeHata } = await supabase.storage
        .from('firm-files')
        .upload(yol, dosya, { upsert: false, contentType: 'application/pdf' })
      if (yuklemeHata) {
        return corsJson({ error: 'Dosya kaydedilemedi: ' + yuklemeHata.message }, 500)
      }

      const { error: dbHata } = await supabase.from('firm_arac_evrak_dosyalari').insert({
        firm_id: oturum.firm_id,
        vehicle_id: vehicleId,
        belge_turu: anahtar,
        file_path: yol,
        file_name: guvenliAd,
      })

      if (dbHata) {
        await supabase.storage.from('firm-files').remove([yol])
        return corsJson({ error: 'Belge kaydı oluşturulamadı: ' + dbHata.message }, 500)
      }
    } else if (hedefTipi === 'surucu_belge') {
      // SurucuListesi.tsx → belgeYukle ile AYNI yol deseni.
      const satirId = String(hedefVeri.satirId ?? '')
      const tur = String(hedefVeri.tur ?? '')
      if (!satirId || (tur !== 'src5' && tur !== 'ehliyet')) {
        return corsJson({ error: 'Geçersiz hedef: satirId/tur.' }, 400)
      }
      yol = `${oturum.firm_id}/firm_surucu_listesi/${satirId}/${tur}_${Date.now()}.pdf`

      const { error: yuklemeHata } = await supabase.storage
        .from('firm-files')
        .upload(yol, dosya, { upsert: false, contentType: 'application/pdf' })
      if (yuklemeHata) {
        return corsJson({ error: 'Dosya kaydedilemedi: ' + yuklemeHata.message }, 500)
      }

      const alan =
        tur === 'src5'
          ? { yol: 'src5_dosya_yolu', ad: 'src5_dosya_adi' }
          : { yol: 'ehliyet_dosya_yolu', ad: 'ehliyet_dosya_adi' }
      const { error: dbHata } = await supabase
        .from('firm_surucu_listesi')
        .update({ [alan.yol]: yol, [alan.ad]: guvenliAd })
        .eq('id', satirId)
      if (dbHata) {
        await supabase.storage.from('firm-files').remove([yol])
        return corsJson({ error: 'Belge kaydı oluşturulamadı: ' + dbHata.message }, 500)
      }
    } else {
      // ---- 'belge_takip' (varsayılan, orijinal davranış) ----
      const donem = oturum.period || 'genel'
      yol = `${oturum.firm_id}/belge-takip/${oturum.code}_${donem}/${Date.now()}_${guvenliAd}`

      const { error: yuklemeHata } = await supabase.storage
        .from('firm-files')
        .upload(yol, dosya, { upsert: true, contentType: 'application/pdf' })
      if (yuklemeHata) {
        return corsJson({ error: 'Dosya kaydedilemedi: ' + yuklemeHata.message }, 500)
      }

      const { error: dbHata } = await supabase.from('firm_belge_dosyalari').insert({
        firm_id: oturum.firm_id,
        code: oturum.code,
        period: oturum.period,
        file_path: yol,
        file_name: guvenliAd,
      })
      if (dbHata) {
        await supabase.storage.from('firm-files').remove([yol])
        return corsJson({ error: 'Belge kaydı oluşturulamadı: ' + dbHata.message }, 500)
      }

      // Mevcut manuel akışla aynı: en az bir dosya varsa madde tamamlandı sayılır
      await supabase.from('firm_belgeleri').upsert(
        { firm_id: oturum.firm_id, code: oturum.code, period: oturum.period, done: true },
        { onConflict: 'firm_id,code,period' }
      )
    }
  } catch (e) {
    return corsJson({ error: 'Beklenmeyen hata: ' + (e instanceof Error ? e.message : String(e)) }, 500)
  }

  // Token'ı tek kullanımlık olarak işaretle
  await supabase
    .from('belge_tarama_oturumlari')
    .update({ used_at: new Date().toISOString(), file_name: guvenliAd })
    .eq('id', token)

  return corsJson({ ok: true })
}
