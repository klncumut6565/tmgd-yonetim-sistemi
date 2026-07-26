"use client";

// Yönetim → Workflow Kuralları
// Bildirim kurallarını YAML olarak düzenleme arayüzü.
// Kurallar veritabanında JSONB olarak saklanır; bu sayfa js-yaml ile
// YAML ↔ JSON dönüşümünü istemci tarafında yapar.

import { useEffect, useState } from "react";
import * as yaml from "js-yaml";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { WORKFLOW_SOURCES } from "@/lib/workflow/sources";

type Rule = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rule_json: Record<string, unknown>;
  repeat_interval_days: number;
  created_at: string;
};

type RunResult = {
  ok: boolean;
  ran_at: string;
  rules: Array<{
    rule: string;
    source: string;
    matched: number;
    notified: number;
    skipped_repeat: number;
    error?: string;
  }>;
};

const EXAMPLE_YAML = `source: adr_expiring_drivers
days_threshold: 30
target_roles:
  - super_admin
  - admin
  - tmgd
title_template: "SRC-5 Belge Süresi Yaklaşıyor"
message_template: "{first_name} {last_name} ({firm_name}) sürücüsünün SRC-5 belgesi {adr_valid_until} tarihinde doluyor."
`;

export default function WorkflowRulesPage() {
  const { isSuperAdmin, loading: userLoading } = useUser();

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [yamlText, setYamlText] = useState("");
  const [nameText, setNameText] = useState("");
  const [descText, setDescText] = useState("");
  const [repeatDays, setRepeatDays] = useState(7);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState("");

  async function loadRules() {
    setLoading(true);
    const { data, error } = await supabase
      .from("workflow_rules")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setRules((data as Rule[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRules();
  }, []);

  function startNew() {
    setEditingId("new");
    setNameText("");
    setDescText("");
    setRepeatDays(7);
    setYamlText(EXAMPLE_YAML);
    setSaveError("");
  }

  function startEdit(rule: Rule) {
    setEditingId(rule.id);
    setNameText(rule.name);
    setDescText(rule.description ?? "");
    setRepeatDays(rule.repeat_interval_days);
    setYamlText(yaml.dump(rule.rule_json));
    setSaveError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setSaveError("");
  }

  async function saveRule() {
    setSaveError("");

    if (!nameText.trim()) {
      setSaveError("Kural adı boş olamaz.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = yaml.load(yamlText);
    } catch (e) {
      setSaveError("YAML çözümlenemedi: " + (e instanceof Error ? e.message : String(e)));
      return;
    }

    setSaving(true);

    const payload = {
      name: nameText.trim(),
      description: descText.trim() || null,
      rule_json: parsed,
      repeat_interval_days: repeatDays,
    };

    const { error } =
      editingId === "new"
        ? await supabase.from("workflow_rules").insert(payload)
        : await supabase.from("workflow_rules").update(payload).eq("id", editingId);

    setSaving(false);

    if (error) {
      setSaveError("Kaydedilemedi: " + error.message);
      return;
    }

    setEditingId(null);
    loadRules();
  }

  async function toggleEnabled(rule: Rule) {
    await supabase
      .from("workflow_rules")
      .update({ enabled: !rule.enabled })
      .eq("id", rule.id);
    loadRules();
  }

  async function deleteRule(rule: Rule) {
    const ok = window.confirm(`"${rule.name}" kuralını silmek istediğine emin misin?`);
    if (!ok) return;
    await supabase.from("workflow_rules").delete().eq("id", rule.id);
    loadRules();
  }

  async function runNow() {
    setRunning(true);
    setRunResult(null);
    setRunError("");
    try {
      const res = await fetch("/api/workflow/run");
      const json = await res.json();
      if (!res.ok) {
        setRunError(json.error ?? "Bilinmeyen hata");
      } else {
        setRunResult(json as RunResult);
        loadRules();
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Workflow Kuralları</h1>
          <p className="text-sm text-gray-500 mt-1">
            Belge/süre uyarılarını YAML kurallarla yapılandır. Her gün 08:00&apos;de otomatik çalışır.
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
        >
          {running ? "Çalışıyor..." : "▶ Şimdi Çalıştır"}
        </button>
      </div>

      {runError && (
        <div className="mt-3 p-3 rounded bg-red-50 border border-red-200 text-red-800 text-sm">
          {runError}
        </div>
      )}

      {runResult && (
        <div className="mt-3 p-3 rounded bg-green-50 border border-green-200 text-sm">
          <p className="font-medium text-green-900 mb-1">
            ✅ Çalıştırıldı — {new Date(runResult.ran_at).toLocaleString("tr-TR")}
          </p>
          <ul className="space-y-0.5 text-green-800">
            {runResult.rules.map((r, i) => (
              <li key={i}>
                <strong>{r.rule}</strong>: {r.matched} kayıt eşleşti, {r.notified} bildirim gönderildi
                {r.skipped_repeat > 0 && `, ${r.skipped_repeat} tekrar olduğu için atlandı`}
                {r.error && <span className="text-red-700"> — hata: {r.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 mb-4">
        {editingId === null && (
          <button
            onClick={startNew}
            className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
          >
            + Yeni Kural
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="border rounded-xl p-4 mb-6 bg-gray-50">
          <h2 className="font-semibold mb-3">
            {editingId === "new" ? "Yeni Kural" : "Kuralı Düzenle"}
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="text-sm text-gray-600">Kural Adı *</span>
              <input
                className="border p-2 w-full rounded mt-1 text-sm"
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Tekrar Aralığı (gün)</span>
              <input
                type="number"
                min={1}
                max={90}
                className="border p-2 w-full rounded mt-1 text-sm"
                value={repeatDays}
                onChange={(e) => setRepeatDays(Number(e.target.value))}
              />
            </label>
          </div>

          <label className="block mb-3">
            <span className="text-sm text-gray-600">Açıklama</span>
            <input
              className="border p-2 w-full rounded mt-1 text-sm"
              value={descText}
              onChange={(e) => setDescText(e.target.value)}
            />
          </label>

          <label className="block mb-3">
            <span className="text-sm text-gray-600">
              Kural (YAML) — kaynaklar:{" "}
              {Object.entries(WORKFLOW_SOURCES).map(([key, def]) => (
                <code key={key} title={def.label} className="mr-1 bg-gray-200 px-1 rounded text-xs">
                  {key}
                </code>
              ))}
            </span>
            <textarea
              className="border p-3 w-full rounded mt-1 font-mono text-xs"
              rows={10}
              value={yamlText}
              onChange={(e) => setYamlText(e.target.value)}
            />
          </label>

          {saveError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">
              {saveError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={saveRule}
              disabled={saving}
              className="px-4 py-2 bg-black text-white rounded disabled:opacity-50 text-sm"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button onClick={cancelEdit} className="px-4 py-2 border rounded text-sm">
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-gray-500">Yükleniyor...</p>}
        {!loading && rules.length === 0 && (
          <p className="text-gray-400">Henüz kural yok.</p>
        )}
        {rules.map((rule) => (
          <div key={rule.id} className="border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{rule.name}</h3>
                  <span
                    className={
                      "text-xs px-2 py-0.5 rounded " +
                      (rule.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")
                    }
                  >
                    {rule.enabled ? "Aktif" : "Pasif"}
                  </span>
                </div>
                {rule.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Kaynak: {String(rule.rule_json.source)} · Eşik: {String(rule.rule_json.days_threshold)} gün ·
                  Tekrar: {rule.repeat_interval_days} gün
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleEnabled(rule)}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                >
                  {rule.enabled ? "Devre Dışı Bırak" : "Etkinleştir"}
                </button>
                <button
                  onClick={() => startEdit(rule)}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => deleteRule(rule)}
                  className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
