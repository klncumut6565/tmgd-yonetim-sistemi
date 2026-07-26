// src/lib/workflow/sources.ts
// Workflow kurallarinin sorgulayabilecegi bilinen view'larin registry'si.
// Guvenlik: kurallar keyfi SQL calistirmaz, yalnizca bu listede tanimli
// view'lardan birini secebilir — bu yuzden bir admin YAML'da hata yapsa
// bile injection riski yoktur.

export type WorkflowSourceKey =
  | 'adr_expiring_drivers'
  | 'adr_expiring_vehicles'
  | 'expiring_vehicle_inspections'
  | 'expiring_driver_licenses'
  | 'expiring_documents'

export type SourceDefinition = {
  label: string
  columns: string[]
  hasFirmId: boolean
}

export const WORKFLOW_SOURCES: Record<WorkflowSourceKey, SourceDefinition> = {
  adr_expiring_drivers: {
    label: 'Sürücü ADR Belgesi (SRC-5)',
    columns: ['id', 'first_name', 'last_name', 'adr_valid_until', 'firm_name', 'days_left'],
    hasFirmId: false,
  },
  adr_expiring_vehicles: {
    label: 'Araç ADR Belgesi',
    columns: ['id', 'plate_number', 'adr_valid_until', 'firm_name', 'days_left'],
    hasFirmId: false,
  },
  expiring_vehicle_inspections: {
    label: 'Araç Muayenesi',
    columns: ['id', 'plate_number', 'inspection_valid_until', 'firm_name', 'days_left'],
    hasFirmId: false,
  },
  expiring_driver_licenses: {
    label: 'Sürücü Ehliyeti',
    columns: ['id', 'first_name', 'last_name', 'driving_license_valid_until', 'firm_name', 'days_left'],
    hasFirmId: false,
  },
  expiring_documents: {
    label: 'Genel Belge Geçerliliği',
    columns: ['id', 'title', 'expiry_date', 'firm_id', 'firm_name', 'days_left'],
    hasFirmId: true,
  },
}

export const VALID_ROLES = ['super_admin', 'admin', 'tmgd', 'assistant'] as const

export type WorkflowRuleJson = {
  source: WorkflowSourceKey
  days_threshold: number
  target_roles: string[]
  title_template: string
  message_template: string
}

/** rule_json'un beklenen sekle uyup uymadigini kontrol eder. */
export function validateRuleJson(input: unknown): { ok: true; rule: WorkflowRuleJson } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Kural bir nesne (object) olmalı.' }
  }
  const r = input as Record<string, unknown>

  if (typeof r.source !== 'string' || !(r.source in WORKFLOW_SOURCES)) {
    return {
      ok: false,
      error: `"source" şu değerlerden biri olmalı: ${Object.keys(WORKFLOW_SOURCES).join(', ')}`,
    }
  }
  if (typeof r.days_threshold !== 'number' || r.days_threshold < 0 || r.days_threshold > 365) {
    return { ok: false, error: '"days_threshold" 0-365 arasında bir sayı olmalı.' }
  }
  if (!Array.isArray(r.target_roles) || r.target_roles.length === 0) {
    return { ok: false, error: '"target_roles" en az bir rol içeren bir liste olmalı.' }
  }
  const invalidRole = r.target_roles.find((role) => !VALID_ROLES.includes(role as typeof VALID_ROLES[number]))
  if (invalidRole) {
    return { ok: false, error: `Geçersiz rol: "${invalidRole}". Geçerli roller: ${VALID_ROLES.join(', ')}` }
  }
  if (typeof r.title_template !== 'string' || r.title_template.trim() === '') {
    return { ok: false, error: '"title_template" boş olamaz.' }
  }
  if (typeof r.message_template !== 'string' || r.message_template.trim() === '') {
    return { ok: false, error: '"message_template" boş olamaz.' }
  }

  return {
    ok: true,
    rule: {
      source: r.source as WorkflowSourceKey,
      days_threshold: r.days_threshold,
      target_roles: r.target_roles as string[],
      title_template: r.title_template,
      message_template: r.message_template,
    },
  }
}

/** "{field}" placeholder'larini satirin gercek degerleriyle degistirir. */
export function renderTemplate(template: string, row: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = row[key]
    if (value === null || value === undefined) return match
    if (key.endsWith('_until') || key.endsWith('_date')) {
      // Tarih alanlarini TR formatinda goster
      const d = new Date(String(value))
      if (!isNaN(d.getTime())) return d.toLocaleDateString('tr-TR')
    }
    return String(value)
  })
}
