const BACKUP_VERSION = 1
const BACKUP_PREFIX = 'estoque_'

export interface BackupPayload {
  version: number
  exportedAt: string
  exportedBy?: string
  data: Record<string, unknown>
}

export const BACKUP_KEYS = [
  'estoque_precos',
  'estoque_movimentacoes',
  'estoque_sessao',
  'estoque_itens_personalizados',
  'estoque_quantidades',
  'estoque_lotes',
  'estoque_despesas',
  'estoque_limites',
  'estoque_receitas',
  'estoque_usuarios',
  'estoque_theme',
  'estoque_acai',
  'estoque_sorvetes',
  'estoque_materias_primas',
  'estoque_metas',
  'estoque_config',
] as const

function safeRead(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export interface ExportResult {
  ok: boolean
  json?: string
  filename?: string
  size?: number
  keysIncluded?: number
  error?: string
}

export function exportarBackup(exportedBy?: string): ExportResult {
  try {
    const data: Record<string, unknown> = {}
    let count = 0
    for (const key of BACKUP_KEYS) {
      const v = safeRead(key)
      if (v !== null) {
        data[key] = v
        count++
      }
    }
    const payload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy,
      data,
    }
    const json = JSON.stringify(payload, null, 2)
    const filename = `lucas-sorveteria-backup-${new Date().toISOString().slice(0, 10)}.json`
    return { ok: true, json, filename, size: json.length, keysIncluded: count }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export interface ImportResult {
  ok: boolean
  keysImported?: number
  error?: string
}

export function importarBackup(json: string): ImportResult {
  try {
    const parsed = JSON.parse(json) as BackupPayload
    if (!parsed || typeof parsed !== 'object' || typeof parsed.data !== 'object') {
      return { ok: false, error: 'Arquivo inválido: estrutura incompatível.' }
    }
    if (typeof parsed.version !== 'number') {
      return { ok: false, error: 'Arquivo inválido: sem versão.' }
    }
    if (parsed.version > BACKUP_VERSION) {
      return { ok: false, error: `Backup é de versão superior (${parsed.version}). Atualize o sistema antes de restaurar.` }
    }
    let count = 0
    for (const [key, value] of Object.entries(parsed.data)) {
      if (!key.startsWith(BACKUP_PREFIX)) continue
      try {
        localStorage.setItem(key, JSON.stringify(value))
        count++
      } catch (err) {
        console.warn('Falha ao restaurar chave', key, err)
      }
    }
    return { ok: true, keysImported: count }
  } catch (err) {
    return { ok: false, error: 'Arquivo não é JSON válido: ' + (err instanceof Error ? err.message : String(err)) }
  }
}

export function downloadBackup(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
