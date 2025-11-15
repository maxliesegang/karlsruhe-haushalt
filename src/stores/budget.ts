import { defineStore } from 'pinia'
import type { Massnahme } from '@/types/massnahme'
import { createDefaultFilter, type FilterState } from '@/utils/filterState'
import { filterMeasures } from '@/utils/measureFilters'
import { type SavingsMode, savingsForMode } from '@/utils/savings'
import { BUDGET_CONFIG, STORAGE_CONFIG } from '@/config/constants'

const GOAL_PER_YEAR = BUDGET_CONFIG.GOAL_PER_YEAR
const BASE_URL = import.meta.env.BASE_URL

type State = {
  baseMassnahmen: Massnahme[]
  customMassnahmen: Massnahme[]
  massnahmen: Massnahme[]
  selectedIds: string[]
  loading: boolean
  error: string | null
  filter: FilterState
  yearMode: SavingsMode
}

const STORAGE_KEY = STORAGE_CONFIG.STORAGE_KEY

type StoredPayload = {
  selectedIds?: string[]
  yearMode?: SavingsMode
  customMassnahmen?: Massnahme[]
}

function normalizeId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

function normalizeIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids = new Set<string>()
  for (const entry of value) {
    const normalized = normalizeId(entry)
    if (normalized) ids.add(normalized)
  }
  return [...ids]
}

function sanitizeStoredMassnahmen(payload: unknown): Massnahme[] {
  if (!Array.isArray(payload)) return []
  const normalized: Massnahme[] = []
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Partial<Massnahme> & { massnahmen_nummer?: unknown }
    const normalizedId = normalizeId(candidate.id ?? candidate.massnahmen_nummer)
    if (!normalizedId || typeof candidate.massnahme !== 'string') continue
    normalized.push({
      id: normalizedId,
      massnahme: candidate.massnahme,
      vorlagennummer: typeof candidate.vorlagennummer === 'string' ? candidate.vorlagennummer : '',
      teilhaushalt: typeof candidate.teilhaushalt === 'string' ? candidate.teilhaushalt : '',
      dienststelle: typeof candidate.dienststelle === 'string' ? candidate.dienststelle : '',
      summe_2026:
        typeof candidate.summe_2026 === 'number' && !Number.isNaN(candidate.summe_2026)
          ? candidate.summe_2026
          : null,
      summe_2027:
        typeof candidate.summe_2027 === 'number' && !Number.isNaN(candidate.summe_2027)
          ? candidate.summe_2027
          : null,
    })
  }
  return normalized
}

function parseIndexFiles(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
  }
  if (payload && typeof payload === 'object') {
    const files = (payload as { files?: unknown }).files
    if (Array.isArray(files)) {
      return files
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
    }
  }
  return []
}

function ensureArray(payload: unknown, label: string): Massnahme[] {
  if (!Array.isArray(payload)) {
    throw new Error(`${label} is not an array`)
  }
  return payload as Massnahme[]
}

async function fetchIndexedMassnahmen(): Promise<Massnahme[]> {
  const indexUrl = `${BASE_URL}massnahmen/index.json`
  const indexRes = await fetch(indexUrl)
  if (!indexRes.ok) throw new Error(`Failed to load massnahmen index (HTTP ${indexRes.status})`)
  const indexPayload = await indexRes.json()
  const files = parseIndexFiles(indexPayload)
  if (!files.length) throw new Error('Massnahmen index does not list any files')
  const datasets = await Promise.all(
    files.map(async (file) => {
      const res = await fetch(`${BASE_URL}massnahmen/${file}`)
      if (!res.ok) throw new Error(`Failed to load ${file} (HTTP ${res.status})`)
      const payload = await res.json()
      return ensureArray(payload, file)
    }),
  )
  const merged = datasets.flat()
  if (!merged.length) throw new Error('Combined massnahmen dataset is empty')
  return merged
}

async function fetchLegacyMassnahmen(): Promise<Massnahme[]> {
  const url = `${BASE_URL}massnahmen.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url} (HTTP ${res.status})`)
  const payload = await res.json()
  return ensureArray(payload, 'massnahmen.json')
}

async function fetchMassnahmenData(): Promise<Massnahme[]> {
  try {
    return await fetchIndexedMassnahmen()
  } catch (error) {
    console.warn('Falling back to legacy massnahmen.json dataset:', error)
    return fetchLegacyMassnahmen()
  }
}

export const useBudgetStore = defineStore('budget', {
  state: (): State => ({
    baseMassnahmen: [],
    customMassnahmen: [],
    massnahmen: [],
    selectedIds: [],
    loading: false,
    error: null,
    filter: createDefaultFilter(),
    yearMode: '2026',
  }),

  getters: {
    selected(state): Massnahme[] {
      const set = this.selectedIdSet
      return state.massnahmen.filter((m) => set.has(m.id))
    },
    selectedIdSet(state): Set<string> {
      return new Set(state.selectedIds)
    },
    hasSelection(state): boolean {
      return state.selectedIds.length > 0
    },
    allSelected(state): boolean {
      return state.massnahmen.length > 0 && state.selectedIds.length === state.massnahmen.length
    },
    dienststellen(state): string[] {
      return Array.from(new Set(state.massnahmen.map((m) => m.dienststelle))).sort((a, b) =>
        a.localeCompare(b, 'de', { sensitivity: 'base' }),
      )
    },

    totalSingle(): number {
      return this.selected.reduce((sum, measure) => sum + savingsForMode(measure, this.yearMode), 0)
    },
    goal(): number {
      return this.yearMode === 'both' ? GOAL_PER_YEAR * 2 : GOAL_PER_YEAR
    },
    gap(): number {
      return Math.max(0, this.goal - this.totalSingle)
    },
    over(): number {
      return Math.max(0, this.totalSingle - this.goal)
    },
    meetsGoal(): boolean {
      return this.totalSingle >= this.goal
    },
    progressPercent(): number {
      if (!this.goal) return 0
      const ratio = this.totalSingle / this.goal
      return Math.min(100, Math.max(0, Math.round(ratio * 100)))
    },
    heroStatus(): { remaining: number; remainingLabel: string } {
      return this.meetsGoal
        ? { remaining: this.over, remainingLabel: 'Puffer über Vorgabe' }
        : { remaining: this.gap, remainingLabel: 'Offener Fehlbetrag' }
    },
    filtered(state): Massnahme[] {
      return filterMeasures(state.massnahmen, state.filter, this.yearMode)
    },
    // For URL sharing like #sel=1,2,3
    shareHash(state): string {
      return state.selectedIds.length ? `sel=${state.selectedIds.join(',')}` : ''
    },
  },

  actions: {
    async load() {
      try {
        this.loading = true
        this.error = null
        const defaults = await fetchMassnahmenData()
        this.baseMassnahmen = defaults

        // hydrate selection from URL hash or localStorage
        const hash = new URLSearchParams(window.location.hash.replace('#', ''))
        const selParam = hash.get('sel')
        let initialSelection: string[] = []
        let storedMode: SavingsMode | null = null
        let storedCustom: Massnahme[] = []

        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as StoredPayload
            storedCustom = sanitizeStoredMassnahmen(parsed?.customMassnahmen)
            if (!selParam && Array.isArray(parsed?.selectedIds)) {
              initialSelection = normalizeIdArray(parsed.selectedIds)
            }
            if (
              !selParam &&
              (parsed?.yearMode === '2026' ||
                parsed?.yearMode === '2027' ||
                parsed?.yearMode === 'both')
            ) {
              storedMode = parsed.yearMode
            }
          } catch {
            // ignore invalid storage
          }
        }

        if (selParam) {
          initialSelection = selParam
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        }

        const baseIds = new Set(defaults.map((m) => m.id))
        const seenCustom = new Set<string>()
        const uniqueCustom = storedCustom.filter((m) => {
          if (baseIds.has(m.id) || seenCustom.has(m.id)) return false
          seenCustom.add(m.id)
          return true
        })
        this.customMassnahmen = uniqueCustom
        this.massnahmen = [...this.baseMassnahmen, ...this.customMassnahmen]

        const availableIds = new Set(this.massnahmen.map((m) => m.id))
        const cleanedSelection = Array.from(new Set(initialSelection)).filter((id) =>
          availableIds.has(id),
        )

        if (cleanedSelection.length) {
          this.selectedIds = cleanedSelection
        } else {
          this.selectAll()
        }

        if (storedMode) {
          this.yearMode = storedMode
        }
      } catch (error: unknown) {
        this.error = error instanceof Error ? error.message : 'Fehler beim Laden'
      } finally {
        this.loading = false
      }
    },

    toggle(id: string) {
      const i = this.selectedIds.indexOf(id)
      if (i >= 0) this.selectedIds.splice(i, 1)
      else this.selectedIds.push(id)
    },

    clear() {
      this.selectedIds = []
    },
    selectAll() {
      this.selectedIds = this.massnahmen.map((m) => m.id)
    },
    setSelection(ids: string[]) {
      const availableIds = new Set(this.massnahmen.map((m) => m.id))
      const unique = Array.from(new Set(ids.map((id) => id.trim()).filter((id) => id)))
      this.selectedIds = unique.filter((id) => availableIds.has(id))
    },
    patchFilter(patch: Partial<FilterState>) {
      this.filter = { ...this.filter, ...patch }
    },
    resetFilter() {
      this.filter = createDefaultFilter()
    },

    setYearMode(mode: SavingsMode) {
      this.yearMode = mode
    },

    addCustomMassnahmen(payloads: Massnahme[]) {
      if (!payloads.length) return
      const existingIds = new Set(this.massnahmen.map((m) => m.id))
      const newMeasures: Massnahme[] = []
      for (const payload of payloads) {
        const id = normalizeId(payload.id)
        if (!id || existingIds.has(id)) continue
        const measure: Massnahme = {
          ...payload,
          id,
          summe_2026:
            typeof payload.summe_2026 === 'number' && !Number.isNaN(payload.summe_2026)
              ? payload.summe_2026
              : 0,
          summe_2027:
            typeof payload.summe_2027 === 'number' && !Number.isNaN(payload.summe_2027)
              ? payload.summe_2027
              : 0,
        }
        existingIds.add(id)
        newMeasures.push(measure)
      }
      if (!newMeasures.length) return
      this.customMassnahmen.push(...newMeasures)
      this.massnahmen = [...this.baseMassnahmen, ...this.customMassnahmen]
      const selectedSet = this.selectedIdSet
      for (const measure of newMeasures) {
        if (!selectedSet.has(measure.id)) {
          this.selectedIds.push(measure.id)
        }
      }
    },

    updateCustomMassnahmen(payloads: Massnahme[]) {
      const baseIds = new Set(this.baseMassnahmen.map((m) => m.id))
      const seen = new Set<string>()
      const sanitized: Massnahme[] = []
      for (const payload of payloads) {
        const id = normalizeId(payload.id)
        if (!id || baseIds.has(id) || seen.has(id)) continue
        seen.add(id)
        sanitized.push({
          ...payload,
          id,
          summe_2026:
            typeof payload.summe_2026 === 'number' && !Number.isNaN(payload.summe_2026)
              ? payload.summe_2026
              : 0,
          summe_2027:
            typeof payload.summe_2027 === 'number' && !Number.isNaN(payload.summe_2027)
              ? payload.summe_2027
              : 0,
        })
      }
      this.customMassnahmen = sanitized
      this.massnahmen = [...this.baseMassnahmen, ...this.customMassnahmen]
      const availableIds = new Set(this.massnahmen.map((m) => m.id))
      this.selectedIds = this.selectedIds.filter((id) => availableIds.has(id))
      if (!this.selectedIds.length && this.massnahmen.length) {
        this.selectAll()
      }
    },

    resetCustomMassnahmen() {
      if (!this.customMassnahmen.length) return
      this.customMassnahmen = []
      this.massnahmen = [...this.baseMassnahmen]
      const availableIds = new Set(this.massnahmen.map((m) => m.id))
      this.selectedIds = this.selectedIds.filter((id) => availableIds.has(id))
      if (!this.selectedIds.length && this.massnahmen.length) {
        this.selectAll()
      }
    },
  },
})
