import type { Massnahme } from '@/types/massnahme'
import type { FilterState } from '@/utils/filterState'
import { savingsForMode, type SavingsMode } from '@/utils/savings'

export type MeasureFilterOptions = {
  excludeIds?: Iterable<number>
}

type NormalizedRange = { min: number; max: number }

function normalizeRange(minAmount: number | null, maxAmount: number | null): NormalizedRange {
  const rawMin = minAmount ?? -Infinity
  const rawMax = maxAmount ?? Infinity
  return {
    min: Math.min(rawMin, rawMax),
    max: Math.max(rawMin, rawMax),
  }
}

function matchesSearchTerm(measure: Massnahme, q: string): boolean {
  const haystack = [measure.massnahme, measure.vorlagennummer, measure.dienststelle]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function filterMeasures(
  measures: Massnahme[],
  filter: FilterState,
  savingsMode: SavingsMode,
  options: MeasureFilterOptions = {},
): Massnahme[] {
  const query = filter.q.trim().toLowerCase()
  const range = normalizeRange(filter.minAmount, filter.maxAmount)
  const dienststelle = filter.dienststelle?.trim() || null
  const excludeSet = options.excludeIds ? new Set(options.excludeIds) : null

  return measures
    .filter((measure) => {
      if (excludeSet?.has(measure.id)) return false

      const amount = savingsForMode(measure, savingsMode)
      if (amount < range.min || amount > range.max) return false
      if (dienststelle && measure.dienststelle !== dienststelle) return false
      if (query && !matchesSearchTerm(measure, query)) return false
      return true
    })
    .sort((a, b) => savingsForMode(b, savingsMode) - savingsForMode(a, savingsMode))
}
