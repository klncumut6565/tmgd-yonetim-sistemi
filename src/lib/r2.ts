// src/lib/r2.ts — Cloudflare R2 (S3 uyumlu) istemcisi. YALNIZCA SUNUCU TARAFI.
//
// Vercel ortam değişkenleri: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// Anahtarlar asla istemciye gönderilmez; tarayıcı yalnızca kısa ömürlü imzalı adres alır.
//
// Nesne anahtarları Supabase "firm-files" bucket'ındaki yollarla BİREBİR AYNIDIR
// (örn. "<firm_id>/belge-takip/G2_genel/123_x.pdf") → veritabanındaki file_path değerleri değişmez.

import { AwsClient } from 'aws4fetch'

let istemci: AwsClient | null = null

export function r2Etkin(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET
  )
}

function aws(): AwsClient {
  if (!istemci) {
    istemci = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      service: 's3',
      region: 'auto',
    })
  }
  return istemci
}

function nesneUrl(yol: string): URL {
  const kodlu = yol.split('/').map(encodeURIComponent).join('/')
  return new URL(
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${kodlu}`
  )
}

/** Nesne varsa boyutunu, yoksa null döner. */
export async function r2Boyut(yol: string): Promise<number | null> {
  const r = await aws().fetch(nesneUrl(yol).toString(), { method: 'HEAD' })
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`R2 HEAD ${r.status}`)
  return Number(r.headers.get('content-length') ?? 0)
}

/** Tarayıcının doğrudan indirebileceği imzalı GET adresi. */
export async function r2ImzaliGet(yol: string, saniye: number): Promise<string> {
  const u = nesneUrl(yol)
  u.searchParams.set('X-Amz-Expires', String(Math.min(Math.max(saniye, 60), 7 * 24 * 3600)))
  const imzali = await aws().sign(new Request(u.toString(), { method: 'GET' }), {
    aws: { signQuery: true },
  })
  return imzali.url
}

/** Tarayıcının doğrudan yükleyebileceği imzalı PUT adresi. */
export async function r2ImzaliPut(yol: string, saniye = 900): Promise<string> {
  const u = nesneUrl(yol)
  u.searchParams.set('X-Amz-Expires', String(saniye))
  const imzali = await aws().sign(new Request(u.toString(), { method: 'PUT' }), {
    aws: { signQuery: true },
  })
  return imzali.url
}

/** Sunucudan doğrudan yükleme (mobil tarama callback'i, taşıma aracı). */
export async function r2Yaz(yol: string, govde: Blob | ArrayBuffer | Uint8Array, contentType?: string) {
  const r = await aws().fetch(nesneUrl(yol).toString(), {
    method: 'PUT',
    body: govde as BodyInit,
    headers: contentType ? { 'Content-Type': contentType } : undefined,
  })
  if (!r.ok) throw new Error(`R2 PUT ${r.status}: ${(await r.text()).slice(0, 200)}`)
}

export async function r2Sil(yol: string) {
  const r = await aws().fetch(nesneUrl(yol).toString(), { method: 'DELETE' })
  if (!r.ok && r.status !== 404) throw new Error(`R2 DELETE ${r.status}`)
}
