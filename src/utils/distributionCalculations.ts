/**
 * Pure utility functions for calculating budget measure distributions
 *
 * These functions aggregate and format measure data for chart displays.
 * They are stateless and can be easily tested.
 */

import type { Massnahme } from '@/types/massnahme'
import type { ChartItem } from '@/types/chart'
import {
  dezernate,
  getDezernatForTeilhaushalt,
  getTeilhaushaltConfig,
  normalizeTeilhaushaltId,
  type TeilhaushaltConfig,
} from '@/data/dezernate'
import { savingsForMode, type SavingsMode } from '@/utils/savings'
import { formatEuro } from '@/utils/format'
import { BUDGET_CONFIG, DISTRIBUTION_CONFIG } from '@/config/constants'

const { UNKNOWN_TEILHAUSHALT_KEY, TEILHAUSHALT_CODE_PATTERN, BUDGET_MISSING_NOTE } =
  DISTRIBUTION_CONFIG
const { EXCLUDED_TEILHAUSHALT_CODES } = BUDGET_CONFIG

// Internal types for intermediate calculations
export type DistributionEntry = {
  key: string
  label: string
  amount: number
  note?: string
}

export type BudgetDistributionEntry = DistributionEntry & {
  budget: number | null
}

export type DezernatAggregationEntry = {
  label: string
  amount: number
  budget: number | null
}

type DistributionOptions = {
  keepZeros?: boolean
  labelFormatter?: (key: string) => string
  noteFormatter?: (key: string) => string | undefined
}

/**
 * Format a Teilhaushalt label with optional config
 */
export function formatTeilhaushaltLabel(key: string, config?: TeilhaushaltConfig | null): string {
  const prefix = TEILHAUSHALT_CODE_PATTERN.test(key) ? `TH ${key}` : key
  if (config?.label) return `${prefix}: ${config.label}`
  return prefix
}

/**
 * Format a budget note string
 */
export function formatBudgetNote(value: number | null): string {
  if (typeof value === 'number' && value > 0) {
    return `Budget: ${formatEuro(value)}`
  }
  return BUDGET_MISSING_NOTE
}

/**
 * Get budget note for a Teilhaushalt
 */
export function teilhaushaltBudgetNote(key: string): string {
  if (key === UNKNOWN_TEILHAUSHALT_KEY) return BUDGET_MISSING_NOTE
  const config = getTeilhaushaltConfig(key)
  const rawBudget = typeof config?.budget === 'number' ? Math.abs(config.budget) : null
  return formatBudgetNote(rawBudget)
}

/**
 * Normalize a measure amount based on savings mode
 */
export function normalizedAmount(measure: Massnahme, mode: SavingsMode): number {
  const raw = savingsForMode(measure, mode)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, raw)
}

/**
 * Aggregate measures by Dezernat
 */
export function buildDezernatAggregation(
  measures: Massnahme[],
  savingsMode: SavingsMode,
  options: { excludedTeilhaushalte?: Set<string> } = {},
) {
  const excludedTeilhaushalte = options.excludedTeilhaushalte ?? new Set<string>()
  const sums = new Map<string, DezernatAggregationEntry>(
    dezernate.map((entry) => {
      const budget =
        entry.teilhaushalte.reduce((total, config) => {
          const normalized = normalizeTeilhaushaltId(config.code)
          if (normalized && excludedTeilhaushalte.has(normalized)) return total
          if (typeof config.budget === 'number' && config.budget !== 0) {
            return total + Math.abs(config.budget)
          }
          return total
        }, 0) || null

      return [
        entry.id,
        {
          label: entry.label,
          amount: 0,
          budget,
        } satisfies DezernatAggregationEntry,
      ]
    }),
  )

  let unassignedAmount = 0
  const unassignedCodes = new Set<string>()

  for (const measure of measures) {
    const amount = normalizedAmount(measure, savingsMode)
    if (!amount) continue
    const normalized = normalizeTeilhaushaltId(measure.teilhaushalt)
    if (normalized && excludedTeilhaushalte.has(normalized)) continue
    const dezernat = getDezernatForTeilhaushalt(measure.teilhaushalt)
    if (dezernat) {
      const bucket = sums.get(dezernat.id)
      if (bucket) bucket.amount += amount
    } else {
      unassignedAmount += amount
      if (normalized) unassignedCodes.add(normalized)
    }
  }

  return { sums, unassignedAmount, unassignedCodes }
}

/**
 * Aggregate measures by Teilhaushalt with budget information
 */
export function buildTeilhaushaltBudgetAggregation(
  measures: Massnahme[],
  savingsMode: SavingsMode,
  options: { excludedTeilhaushalte?: Set<string> } = {},
) {
  const excludedTeilhaushalte = options.excludedTeilhaushalte ?? new Set<string>()
  const sums = new Map<string, number>()
  for (const measure of measures) {
    const amount = normalizedAmount(measure, savingsMode)
    if (!amount) continue
    const code = normalizeTeilhaushaltId(measure.teilhaushalt)
    if (!code || excludedTeilhaushalte.has(code)) continue
    sums.set(code, (sums.get(code) ?? 0) + amount)
  }

  const entries: BudgetDistributionEntry[] = []
  const missing: string[] = []
  let covered = 0
  let budgetSum = 0

  for (const [code, amount] of sums.entries()) {
    const config = getTeilhaushaltConfig(code)
    const rawBudget = config?.budget ?? null
    const budget = rawBudget !== null ? Math.abs(rawBudget) : null
    if (budget && budget > 0) {
      covered += 1
      budgetSum += budget
    } else {
      missing.push(formatTeilhaushaltLabel(code, config))
    }

    entries.push({
      key: code,
      label: formatTeilhaushaltLabel(code, config),
      amount,
      note: budget ? `Budget: ${formatEuro(budget)}` : BUDGET_MISSING_NOTE,
      budget,
    })
  }

  missing.sort((a, b) => a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' }))

  return {
    entries,
    missing,
    covered,
    total: sums.size,
    budgetSum,
  }
}

/**
 * Build a generic distribution from measures
 */
export function buildDistribution({
  measures,
  total,
  savingsMode,
  keySelector,
  labelFormatter,
  noteFormatter,
}: {
  measures: Massnahme[]
  total: number
  savingsMode: SavingsMode
  keySelector: (measure: Massnahme) => string
  labelFormatter?: DistributionOptions['labelFormatter']
  noteFormatter?: DistributionOptions['noteFormatter']
}): ChartItem[] {
  const sums = new Map<string, number>()
  for (const measure of measures) {
    const amount = normalizedAmount(measure, savingsMode)
    if (!amount) continue
    const key = keySelector(measure)
    sums.set(key, (sums.get(key) ?? 0) + amount)
  }

  const entries: DistributionEntry[] = Array.from(sums.entries()).map(([key, amount]) => ({
    key,
    label: labelFormatter ? labelFormatter(key) : key,
    amount,
    note: noteFormatter ? noteFormatter(key) : undefined,
  }))

  return finalizeDistribution(entries, total)
}

/**
 * Finalize distribution entries into chart items
 */
export function finalizeDistribution(
  entries: DistributionEntry[],
  total: number,
  options: DistributionOptions = {},
): ChartItem[] {
  const filtered = options.keepZeros ? entries : entries.filter((entry) => entry.amount > 0)
  if (!filtered.length) return []
  const maxAmount = Math.max(...filtered.map((entry) => entry.amount))

  return filtered
    .sort((a, b) => {
      if (b.amount === a.amount) {
        return a.label.localeCompare(b.label, 'de', { sensitivity: 'base' })
      }
      return b.amount - a.amount
    })
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      amount: entry.amount,
      note: entry.note,
      percentOfTotal: total > 0 ? (entry.amount / total) * 100 : 0,
      barShare: maxAmount > 0 ? entry.amount / maxAmount : 0,
    }))
}

/**
 * Finalize budget distribution entries into chart items
 * Sorts by amount/budget ratio instead of absolute amount
 */
export function finalizeBudgetDistribution(entries: BudgetDistributionEntry[]): ChartItem[] {
  const usable = entries.filter((entry) => entry.budget !== null && entry.budget > 0)
  if (!usable.length) return []
  const maxRatio = Math.max(
    ...usable.map((entry) => (entry.budget ? entry.amount / entry.budget : 0)),
  )

  return usable
    .sort((a, b) => {
      const ratioA = a.budget ? a.amount / a.budget : 0
      const ratioB = b.budget ? b.amount / b.budget : 0
      if (ratioB === ratioA) {
        return a.label.localeCompare(b.label, 'de', { sensitivity: 'base' })
      }
      return ratioB - ratioA
    })
    .map((entry) => {
      const ratio = entry.budget ? entry.amount / entry.budget : 0
      return {
        key: entry.key,
        label: entry.label,
        amount: entry.amount,
        note: entry.note,
        percentOfTotal: ratio * 100,
        barShare: maxRatio > 0 ? ratio / maxRatio : 0,
      }
    })
}

/**
 * Create excluded Teilhaushalte set from config
 */
export function getExcludedTeilhaushalteSet(): Set<string> {
  return new Set(EXCLUDED_TEILHAUSHALT_CODES)
}
