// src/lib/ai/multiEngine.ts
// Coklu-motor AI cagri motoru — Grok, Gemini, OpenRouter arasinda
// otomatik fallback. Bir saglayici basarisiz olursa (kota, hata, ag
// sorunu — HERHANGI bir sebep) sirali olarak digerine gecilir.
//
// Cok-turlu sohbet destekler: messages dizisi sistem promptu HARIC
// onceki user/assistant mesajlarini icerir, en sonda yeni user mesaji
// bulunur.
//
// SADECE server tarafinda kullanilir (API anahtarlari burada islenir).

export type ProviderKey = 'grok' | 'gemini' | 'openrouter';

export type ProviderConfig = {
  provider: ProviderKey;
  api_key: string | null;
  model: string;
  priority: number;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type EngineCallResult = {
  ok: boolean;
  text?: string;
  provider?: ProviderKey;
  errors: { provider: ProviderKey; message: string }[];
};

async function callGrok(apiKey: string, model: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Grok HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Grok: boş yanıt');
  return text;
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 400 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini: boş yanıt');
  return text;
}

async function callOpenRouter(apiKey: string, model: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter: boş yanıt');
  return text;
}

const CALLERS: Record<ProviderKey, (apiKey: string, model: string, systemPrompt: string, messages: ChatMessage[]) => Promise<string>> = {
  grok: callGrok,
  gemini: callGemini,
  openrouter: callOpenRouter,
};

/**
 * Model çıktısını kullanıcıya göstermeden önce temizler.
 *
 * NEDEN: Bazı modeller cevabın başına kendi düşünme sürecini ekliyor —
 * çoğu zaman İNGİLİZCE ("We need to follow rules. The user wants...")
 * veya güvenlik meta etiketleri ("User Safety: safe"). Bunlar kullanıcıya
 * ASLA gösterilmemeli.
 */
export function modelCiktisiniTemizle(metin: string): string {
  let t = metin;

  // 1) Açık düşünme etiketleri
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, "");
  t = t.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  t = t.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  t = t.replace(/<think(ing)?>[\s\S]*$/i, ""); // kapanmamış etiket

  // 2) Güvenlik/meta etiket sızıntıları
  t = t.replace(/^\s*(User|Response)\s+Safety\s*:\s*\w+\s*$/gim, "");

  // 3) İngilizce düşünme kalıplarıyla başlayan satırları at
  const dusunmeKaliplari = [
    /^we (need|should|must|have) to\b/i,
    /^the user (wants|is asking|asks|said)\b/i,
    /^let'?s\b/i,
    /^okay,? (so|the user)\b/i,
    /^first,? (i|we) (need|should)\b/i,
    /^i should\b/i,
    /^according to the rules\b/i,
    /^based on the (rules|policy|context)\b/i,
    /^in the context of\b/i,
    /^there'?s (no|a) rule\b/i,
  ];

  const dizi = t.split("\n");
  let bas = 0;
  while (bas < dizi.length) {
    const s = dizi[bas].trim();
    if (s === "") { bas++; continue; }
    if (dusunmeKaliplari.some((k) => k.test(s))) { bas++; continue; }
    break;
  }
  if (bas > 0) t = dizi.slice(bas).join("\n");

  return t.trim();
}


export async function callWithFallback(
  configs: ProviderConfig[],
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<EngineCallResult> {
  const errors: EngineCallResult['errors'] = [];

  const sorted = [...configs]
    .filter((c) => !!c.api_key)
    .sort((a, b) => a.priority - b.priority);

  for (const cfg of sorted) {
    try {
      const ham = await CALLERS[cfg.provider](cfg.api_key as string, cfg.model, systemPrompt, messages);
      const text = modelCiktisiniTemizle(ham);
      return { ok: true, text, provider: cfg.provider, errors };
    } catch (err) {
      errors.push({
        provider: cfg.provider,
        message: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
  }

  return { ok: false, errors };
}
