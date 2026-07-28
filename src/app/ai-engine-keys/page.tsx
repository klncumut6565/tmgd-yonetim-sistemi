"use client";

// Yönetim → AI Motor Anahtarları
// Grok / Gemini / OpenRouter API anahtarlarını yapılandırma sayfası.
// ADR Asistanı bu anahtarları priority sırasına göre dener (fallback).

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

type ProviderRow = {
  provider: "grok" | "groq" | "gemini" | "openrouter";
  api_key: string | null;
  model: string;
  priority: number;
  updated_at: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq — Whisper (SESLİ KOMUT)",
  grok: "Grok (xAI) — Sohbet",
  gemini: "Gemini (Google) — Sohbet",
  openrouter: "OpenRouter — Sohbet",
};

const PROVIDER_LINKS: Record<string, { anahtar: string; anahtarLabel: string; modeller: string; modellerLabel: string; bakiye?: string; bakiyeLabel?: string }> = {
  groq: {
    anahtar: "https://console.groq.com/keys",
    anahtarLabel: "🔑 ÜCRETSİZ Anahtar Al (console.groq.com)",
    modeller: "https://console.groq.com/docs/speech-to-text",
    modellerLabel: "📋 Ses Modelleri Dokümanı",
  },
  grok: {
    anahtar: "https://console.x.ai",
    anahtarLabel: "🔑 API Anahtarı Al (console.x.ai)",
    modeller: "https://docs.x.ai/docs/models",
    modellerLabel: "📋 Güncel Model Listesi",
  },
  gemini: {
    anahtar: "https://aistudio.google.com/apikey",
    anahtarLabel: "🔑 API Anahtarı Al (Google AI Studio)",
    modeller: "https://ai.google.dev/gemini-api/docs/models",
    modellerLabel: "📋 Güncel Model Listesi",
    bakiye: "https://aistudio.google.com/usage",
    bakiyeLabel: "💳 Kota / Kullanım Durumu",
  },
  openrouter: {
    anahtar: "https://openrouter.ai/settings/keys",
    anahtarLabel: "🔑 API Anahtarı Al (OpenRouter)",
    modeller: "https://openrouter.ai/models",
    modellerLabel: "📋 Güncel Model Listesi",
    bakiye: "https://openrouter.ai/settings/credits",
    bakiyeLabel: "💳 Bakiye Yükle",
  },
};

export default function AiEngineKeysPage() {
  const { isSuperAdmin, loading: userLoading } = useUser();
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, { apiKey: string; model: string; priority: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("ai_provider_keys")
      .select("*")
      .order("priority", { ascending: true });

    const list = (data as ProviderRow[]) ?? [];
    setRows(list);

    const initial: Record<string, { apiKey: string; model: string; priority: number }> = {};
    list.forEach((r) => {
      initial[r.provider] = { apiKey: "", model: r.model, priority: r.priority };
    });
    setEdits(initial);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProvider(provider: string) {
    const edit = edits[provider];
    if (!edit) return;
    setSaving(provider);
    setMessage("");

    const payload: Record<string, unknown> = {
      model: edit.model,
      priority: edit.priority,
    };
    // Yalnızca yeni bir anahtar yazıldıysa güncelle — boş bırakılırsa
    // mevcut anahtar korunur (yanlışlıkla silinmesin diye).
    if (edit.apiKey.trim()) {
      payload.api_key = edit.apiKey.trim();
    }

    const { error } = await supabase
      .from("ai_provider_keys")
      .update(payload)
      .eq("provider", provider);

    setSaving(null);

    if (error) {
      setMessage(`${PROVIDER_LABELS[provider]} kaydedilemedi: ${error.message}`);
      return;
    }

    setMessage(`✓ ${PROVIDER_LABELS[provider]} güncellendi.`);
    load();
  }

  if (userLoading) {
    return <div className="p-6 text-gray-500">Yükleniyor...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">AI Motor Anahtarları</h1>
      <p className="text-sm text-gray-500 mb-6">
        ADR Asistanı bu sağlayıcıları öncelik sırasına göre dener. Bir sağlayıcının kotası
        dolarsa veya hata verirse otomatik olarak sıradakine geçer. Bir anahtar girildikten
        sonra sen yenisini girene kadar sistemde kalır.
      </p>

      {message && (
        <p className="text-sm bg-blue-50 border border-blue-200 rounded p-3 mb-4">{message}</p>
      )}

      {loading && <p className="text-gray-500">Yükleniyor...</p>}

      <div className="space-y-4">
        {rows.map((row) => {
          const edit = edits[row.provider] ?? { apiKey: "", model: row.model, priority: row.priority };
          const hasKey = !!row.api_key;
          return (
            <div key={row.provider} className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">{PROVIDER_LABELS[row.provider]}</h2>
                <span
                  className={
                    "text-xs px-2 py-0.5 rounded " +
                    (hasKey ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")
                  }
                >
                  {hasKey ? "Anahtar girilmiş ✓" : "Anahtar yok"}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs">
                <a
                  href={PROVIDER_LINKS[row.provider].anahtar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {PROVIDER_LINKS[row.provider].anahtarLabel}
                </a>
                <a
                  href={PROVIDER_LINKS[row.provider].modeller}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {PROVIDER_LINKS[row.provider].modellerLabel}
                </a>
                {PROVIDER_LINKS[row.provider].bakiye && (
                  <a
                    href={PROVIDER_LINKS[row.provider].bakiye}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:underline font-medium"
                  >
                    {PROVIDER_LINKS[row.provider].bakiyeLabel}
                  </a>
                )}
              </div>

              {row.provider === "groq" && (
                <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                  🎤 <strong>Bu anahtar SESLİ KOMUT içindir</strong> — mikrofona konuştuğunda sesi
                  yazıya çevirir. Ücretsiz katman kredi kartı istemez, günde 2.000 kayıt hakkı verir
                  ve çok hızlıdır.
                  <div className="mt-1.5 pt-1.5 border-t border-blue-200">
                    ⚠️ <strong>Karıştırma:</strong> <code>Groq</code> (bu, ses için) ile{" "}
                    <code>Grok</code> (xAI, sohbet için) farklı şirketler — ayrı anahtarlar gerekir.
                  </div>
                </div>
              )}

              {row.provider === "openrouter" && (
                <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs flex items-center justify-between gap-2">
                  <span className="text-green-800">
                    🎁 OpenRouter&apos;da <strong>tamamen ücretsiz</strong> modeller var (kredi kartı gerekmez,
                    günde 50 istek). Bakiye tükenme sorununu tamamen ortadan kaldırır.
                  </span>
                  <button
                    onClick={() =>
                      setEdits((s) => ({ ...s, openrouter: { ...edit, model: "openrouter/free" } }))
                    }
                    className="shrink-0 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 whitespace-nowrap"
                  >
                    Ücretsiz Model Kullan
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block md:col-span-2">
                  <span className="text-xs text-gray-500">
                    API Anahtarı {hasKey && "(değiştirmek için yenisini yaz, boş bırak = değişmez)"}
                  </span>
                  <input
                    type="password"
                    className="border p-2 w-full rounded mt-1 text-sm"
                    placeholder={hasKey ? "••••••••••••" : "API anahtarını yapıştır"}
                    value={edit.apiKey}
                    onChange={(e) =>
                      setEdits((s) => ({ ...s, [row.provider]: { ...edit, apiKey: e.target.value } }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-gray-500">Öncelik (1 = önce denenir)</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="border p-2 w-full rounded mt-1 text-sm"
                    value={edit.priority}
                    onChange={(e) =>
                      setEdits((s) => ({ ...s, [row.provider]: { ...edit, priority: Number(e.target.value) } }))
                    }
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-xs text-gray-500">Model</span>
                  <input
                    className="border p-2 w-full rounded mt-1 text-sm font-mono"
                    value={edit.model}
                    onChange={(e) =>
                      setEdits((s) => ({ ...s, [row.provider]: { ...edit, model: e.target.value } }))
                    }
                  />
                </label>

                <div className="flex items-end">
                  <button
                    onClick={() => saveProvider(row.provider)}
                    disabled={saving === row.provider}
                    className="px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50 w-full"
                  >
                    {saving === row.provider ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
