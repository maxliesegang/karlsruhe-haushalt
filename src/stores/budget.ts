import { defineStore } from 'pinia'
import type { Massnahme } from '@/types/massnahme'
import { createDefaultFilter, type FilterState } from '@/utils/filterState'
import { filterMeasures } from '@/utils/measureFilters'
import { type SavingsMode, savingsForMode } from '@/utils/savings'
import { BUDGET_CONFIG, STORAGE_CONFIG } from '@/config/constants'

const GOAL_PER_YEAR = BUDGET_CONFIG.GOAL_PER_YEAR

type State = {
  baseMassnahmen: Massnahme[]
  customMassnahmen: Massnahme[]
  massnahmen: Massnahme[]
  selectedIds: number[]
  loading: boolean
  error: string | null
  filter: FilterState
  yearMode: SavingsMode
}

const STORAGE_KEY = STORAGE_CONFIG.STORAGE_KEY

type StoredPayload = {
  selectedIds?: number[]
  yearMode?: SavingsMode
  customMassnahmen?: Massnahme[]
}

function sanitizeStoredMassnahmen(payload: unknown): Massnahme[] {
  if (!Array.isArray(payload)) return []
  const normalized: Massnahme[] = []
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Partial<Massnahme>
    if (typeof candidate.id !== 'number' || Number.isNaN(candidate.id)) continue
    if (typeof candidate.massnahme !== 'string') continue
    normalized.push({
      id: candidate.id,
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
    selectedIdSet(state): Set<number> {
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
        const res = await fetch(`${import.meta.env.BASE_URL}massnahmen.json`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const defaults: Massnahme[] = await res.json()
        this.baseMassnahmen = defaults

        // hydrate selection from URL hash or localStorage
        const hash = new URLSearchParams(window.location.hash.replace('#', ''))
        const selParam = hash.get('sel')
        let initialSelection: number[] = []
        let storedMode: SavingsMode | null = null
        let storedCustom: Massnahme[] = []

        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as StoredPayload
            storedCustom = sanitizeStoredMassnahmen(parsed?.customMassnahmen)
            if (!selParam && Array.isArray(parsed?.selectedIds)) {
              initialSelection = parsed.selectedIds
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
            .map((s) => Number(s))
            .filter((n) => !Number.isNaN(n))
        }

        const baseIds = new Set(defaults.map((m) => m.id))
        const seenCustom = new Set<number>()
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

    toggle(id: number) {
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
    setSelection(ids: number[]) {
      const availableIds = new Set(this.massnahmen.map((m) => m.id))
      const unique = Array.from(new Set(ids))
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

    addCustomMassnahmen(payloads: Omit<Massnahme, 'id'>[]) {
      if (!payloads.length) return
      const minExistingId = this.massnahmen.reduce(
        (min, measure) => Math.min(min, measure.id),
        Number.POSITIVE_INFINITY,
      )
      let nextId = Number.isFinite(minExistingId)
        ? minExistingId <= 0
          ? minExistingId - 1
          : -1
        : -1

      const newMeasures: Massnahme[] = payloads.map((payload) => {
        const measure = { id: nextId, ...payload }
        nextId -= 1
        return measure
      })

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
      this.customMassnahmen = payloads
      this.massnahmen = [...this.baseMassnahmen, ...this.customMassnahmen]
      const availableIds = new Set(this.massnahmen.map((m) => m.id))
      this.selectedIds = this.selectedIds.filter((id) => availableIds.has(id))
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
