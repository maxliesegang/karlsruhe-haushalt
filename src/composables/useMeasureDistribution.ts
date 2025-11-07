/**
 * Composable for calculating and formatting measure distributions
 *
 * This composable orchestrates the distribution calculations and provides
 * reactive computed properties for chart displays.
 */

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import type { Massnahme } from '@/types/massnahme'
import type { ChartItem, ChartSection } from '@/types/chart'
import { getTeilhaushaltConfig, normalizeTeilhaushaltId } from '@/data/dezernate'
import { type SavingsMode } from '@/utils/savings'
import { formatEuro } from '@/utils/format'
import {
  buildDezernatAggregation,
  buildTeilhaushaltBudgetAggregation,
  buildDistribution,
  finalizeDistribution,
  finalizeBudgetDistribution,
  formatBudgetNote,
  teilhaushaltBudgetNote,
  normalizedAmount,
  getExcludedTeilhaushalteSet,
  type DistributionEntry,
  type BudgetDistributionEntry,
} from '@/utils/distributionCalculations'
import { DISTRIBUTION_CONFIG, UI_CONFIG } from '@/config/constants'

const { UNKNOWN_TEILHAUSHALT_KEY } = DISTRIBUTION_CONFIG

export type UseMeasureDistributionResult = {
  measures: ComputedRef<Massnahme[]>
  savingsMode: ComputedRef<SavingsMode>
  totalAmount: ComputedRef<number>
  totalAmountExcludingLargeTeilhaushalte: ComputedRef<number>
  measureCount: ComputedRef<number>
  savingsModeLabel: ComputedRef<string>
  dienststellenDistribution: ComputedRef<ChartItem[]>
  teilhaushalteDistribution: ComputedRef<ChartItem[]>
  dezernatDistribution: ComputedRef<ChartItem[]>
  unassignedTeilhaushalte: ComputedRef<string[]>
  chartSections: ComputedRef<ChartSection[]>
  budgetChartSections: ComputedRef<ChartSection[]>
  budgetChartSectionsExcludingLargeTeilhaushalte: ComputedRef<ChartSection[]>
  chartSectionsExcludingLargeTeilhaushalte: ComputedRef<ChartSection[]>
  missingBudgetTeilhaushalte: ComputedRef<string[]>
  missingBudgetTeilhaushalteExcludingLargeTeilhaushalte: ComputedRef<string[]>
  budgetCoverage: ComputedRef<{ withBudget: number; total: number }>
  budgetCoverageExcludingLargeTeilhaushalte: ComputedRef<{ withBudget: number; total: number }>
  totalBudget: ComputedRef<number>
  totalBudgetExcludingLargeTeilhaushalte: ComputedRef<number>
  hasData: ComputedRef<boolean>
  unassignedTeilhaushalteExcludingLargeTeilhaushalte: ComputedRef<string[]>
}

/**
 * Main composable for measure distribution calculations
 */
export function useMeasureDistribution(
  measuresSource: MaybeRefOrGetter<Massnahme[]>,
  savingsModeSource: MaybeRefOrGetter<SavingsMode>,
): UseMeasureDistributionResult {
  const measures = computed<Massnahme[]>(() => toValue(measuresSource) ?? [])
  const savingsMode = computed<SavingsMode>(() => toValue(savingsModeSource))

  const EXCLUDED_CODES = getExcludedTeilhaushalteSet()

  // Filter measures excluding large Teilhaushalte
  const measuresWithoutLargeTeilhaushalte = computed(() =>
    measures.value.filter((measure) => {
      const code = normalizeTeilhaushaltId(measure.teilhaushalt)
      if (!code) return true
      return !EXCLUDED_CODES.has(code)
    }),
  )

  // Total amounts
  const totalAmount = computed(() =>
    measures.value.reduce((sum, measure) => sum + normalizedAmount(measure, savingsMode.value), 0),
  )

  const totalAmountExcludingLargeTeilhaushalte = computed(() =>
    measuresWithoutLargeTeilhaushalte.value.reduce(
      (sum, measure) => sum + normalizedAmount(measure, savingsMode.value),
      0,
    ),
  )

  const measureCount = computed(() => measures.value.length)

  // Dienststellen distribution
  const dienststellenDistribution = computed(() =>
    buildDistribution({
      measures: measures.value,
      total: totalAmount.value,
      savingsMode: savingsMode.value,
      keySelector: (measure) => measure.dienststelle?.trim() || 'Unbekannte Dienststelle',
    }),
  )

  const dienststellenDistributionExcludingLargeTeilhaushalte = computed(() =>
    buildDistribution({
      measures: measuresWithoutLargeTeilhaushalte.value,
      total: totalAmountExcludingLargeTeilhaushalte.value,
      savingsMode: savingsMode.value,
      keySelector: (measure) => measure.dienststelle?.trim() || 'Unbekannte Dienststelle',
    }),
  )

  // Teilhaushalte distribution
  const teilhaushalteDistribution = computed(() =>
    buildDistribution({
      measures: measures.value,
      total: totalAmount.value,
      savingsMode: savingsMode.value,
      keySelector: (measure) =>
        normalizeTeilhaushaltId(measure.teilhaushalt) ?? UNKNOWN_TEILHAUSHALT_KEY,
      labelFormatter: (key) => {
        if (key === UNKNOWN_TEILHAUSHALT_KEY) return 'Unbekannter Teilhaushalt'
        const config = getTeilhaushaltConfig(key)
        const prefix = /^\d+$/.test(key) ? `TH ${key}` : key
        if (config?.label) return `${prefix}: ${config.label}`
        return prefix
      },
      noteFormatter: (key) => teilhaushaltBudgetNote(key),
    }),
  )

  const teilhaushalteDistributionExcludingLargeTeilhaushalte = computed(() =>
    buildDistribution({
      measures: measuresWithoutLargeTeilhaushalte.value,
      total: totalAmountExcludingLargeTeilhaushalte.value,
      savingsMode: savingsMode.value,
      keySelector: (measure) =>
        normalizeTeilhaushaltId(measure.teilhaushalt) ?? UNKNOWN_TEILHAUSHALT_KEY,
      labelFormatter: (key) => {
        if (key === UNKNOWN_TEILHAUSHALT_KEY) return 'Unbekannter Teilhaushalt'
        const config = getTeilhaushaltConfig(key)
        const prefix = /^\d+$/.test(key) ? `TH ${key}` : key
        if (config?.label) return `${prefix}: ${config.label}`
        return prefix
      },
      noteFormatter: (key) => teilhaushaltBudgetNote(key),
    }),
  )

  // Dezernat aggregations
  const dezernatAggregation = computed(() =>
    buildDezernatAggregation(measures.value, savingsMode.value),
  )

  const dezernatAggregationExcludingLargeTeilhaushalte = computed(() =>
    buildDezernatAggregation(measures.value, savingsMode.value, {
      excludedTeilhaushalte: EXCLUDED_CODES,
    }),
  )

  // Unassigned Teilhaushalte
  const unassignedTeilhaushalte = computed(() =>
    Array.from(dezernatAggregation.value.unassignedCodes).sort((a, b) =>
      a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' }),
    ),
  )

  const unassignedTeilhaushalteExcludingLargeTeilhaushalte = computed(() =>
    Array.from(dezernatAggregationExcludingLargeTeilhaushalte.value.unassignedCodes).sort((a, b) =>
      a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' }),
    ),
  )

  // Dezernat distribution
  const dezernatDistribution = computed(() => {
    const { sums, unassignedAmount } = dezernatAggregation.value

    const entries: DistributionEntry[] = Array.from(sums.entries()).map(([key, info]) => ({
      key,
      label: info.label,
      amount: info.amount,
      note: formatBudgetNote(info.budget),
    }))

    if (unassignedAmount > 0) {
      entries.push({
        key: 'unassigned',
        label: 'Keinem Dezernat zugeordnet',
        amount: unassignedAmount,
        note:
          unassignedTeilhaushalte.value.length > 0
            ? unassignedTeilhaushalte.value.map((code) => `TH ${code}`).join(', ')
            : 'Teilhaushalte ohne Zuordnung',
      })
    }

    return finalizeDistribution(entries, totalAmount.value, { keepZeros: true })
  })

  const dezernatDistributionExcludingLargeTeilhaushalte = computed(() => {
    const { sums, unassignedAmount } = dezernatAggregationExcludingLargeTeilhaushalte.value

    const entries: DistributionEntry[] = Array.from(sums.entries()).map(([key, info]) => ({
      key,
      label: info.label,
      amount: info.amount,
      note: formatBudgetNote(info.budget),
    }))

    if (unassignedAmount > 0) {
      entries.push({
        key: 'unassigned',
        label: 'Keinem Dezernat zugeordnet',
        amount: unassignedAmount,
        note:
          unassignedTeilhaushalteExcludingLargeTeilhaushalte.value.length > 0
            ? unassignedTeilhaushalteExcludingLargeTeilhaushalte.value
                .map((code) => `TH ${code}`)
                .join(', ')
            : 'Teilhaushalte ohne Zuordnung',
      })
    }

    return finalizeDistribution(entries, totalAmountExcludingLargeTeilhaushalte.value, {
      keepZeros: true,
    })
  })

  // Budget aggregations
  const teilhaushaltBudgetAggregation = computed(() =>
    buildTeilhaushaltBudgetAggregation(measures.value, savingsMode.value),
  )

  const teilhaushaltBudgetAggregationExcludingLargeTeilhaushalte = computed(() =>
    buildTeilhaushaltBudgetAggregation(measures.value, savingsMode.value, {
      excludedTeilhaushalte: EXCLUDED_CODES,
    }),
  )

  // Budget distributions
  const teilhaushaltBudgetDistribution = computed(() =>
    finalizeBudgetDistribution(teilhaushaltBudgetAggregation.value.entries),
  )

  const teilhaushaltBudgetDistributionExcludingLargeTeilhaushalte = computed(() =>
    finalizeBudgetDistribution(
      teilhaushaltBudgetAggregationExcludingLargeTeilhaushalte.value.entries,
    ),
  )

  const dezernatBudgetDistribution = computed(() => {
    const { sums } = dezernatAggregation.value
    const entries: BudgetDistributionEntry[] = Array.from(sums.entries()).map(([key, info]) => ({
      key,
      label: info.label,
      amount: info.amount,
      budget: info.budget,
      note: info.budget ? `Budget: ${formatEuro(info.budget)}` : 'Budget noch nicht hinterlegt',
    }))
    return finalizeBudgetDistribution(entries)
  })

  const dezernatBudgetDistributionExcludingLargeTeilhaushalte = computed(() => {
    const { sums } = dezernatAggregationExcludingLargeTeilhaushalte.value
    const entries: BudgetDistributionEntry[] = Array.from(sums.entries()).map(([key, info]) => ({
      key,
      label: info.label,
      amount: info.amount,
      budget: info.budget,
      note: info.budget ? `Budget: ${formatEuro(info.budget)}` : 'Budget noch nicht hinterlegt',
    }))
    return finalizeBudgetDistribution(entries)
  })

  // Chart sections
  const budgetChartSections = computed<ChartSection[]>(() => [
    {
      id: 'teilhaushalte-budget',
      title: 'Teilhaushalte: Anteil am Budget',
      subtitle: 'Wie groß ist die Einsparung im Verhältnis zum Budget des Teilhaushalts?',
      items: teilhaushaltBudgetDistribution.value,
      emptyLabel:
        'Es sind noch keine Budgets für Teilhaushalte hinterlegt. Ergänze sie in src/data/dezernate.ts.',
    },
    {
      id: 'dezernate-budget',
      title: 'Dezernate: Anteil am Budget',
      subtitle: 'Vergleicht die Einsparung mit der Summe der Teilhaushaltsbudgets pro Dezernat.',
      items: dezernatBudgetDistribution.value,
      emptyLabel:
        'Für die Dezernate fehlen Budgetangaben. Pflege die Teilhaushaltsbudgets in src/data/dezernate.ts.',
    },
  ])

  const budgetChartSectionsExcludingLargeTeilhaushalte = computed<ChartSection[]>(() => [
    {
      id: 'teilhaushalte-budget-excluding-large',
      title: 'Teilhaushalte: Anteil am Budget (ohne TH 2000/5000)',
      subtitle:
        'Vergleicht die Einsparung mit dem Budget – dabei bleiben TH 2000 und TH 5000 außen vor.',
      items: teilhaushaltBudgetDistributionExcludingLargeTeilhaushalte.value,
      emptyLabel:
        'Es sind noch keine Budgets für Teilhaushalte (ohne TH 2000/5000) hinterlegt. Ergänze sie in src/data/dezernate.ts.',
    },
    {
      id: 'dezernate-budget-excluding-large',
      title: 'Dezernate: Anteil am Budget (ohne TH 2000/5000)',
      subtitle:
        'Vergleicht die Einsparung mit den Budgets – Beiträge der TH 2000 und 5000 sind ausgeschlossen.',
      items: dezernatBudgetDistributionExcludingLargeTeilhaushalte.value,
      emptyLabel:
        'Für die Dezernate fehlen Budgetangaben (nach Ausschluss von TH 2000/5000). Pflege die Teilhaushaltsbudgets in src/data/dezernate.ts.',
    },
  ])

  const missingBudgetTeilhaushalte = computed(() => teilhaushaltBudgetAggregation.value.missing)

  const missingBudgetTeilhaushalteExcludingLargeTeilhaushalte = computed(
    () => teilhaushaltBudgetAggregationExcludingLargeTeilhaushalte.value.missing,
  )

  const totalBudget = computed(() => teilhaushaltBudgetAggregation.value.budgetSum)

  const totalBudgetExcludingLargeTeilhaushalte = computed(
    () => teilhaushaltBudgetAggregationExcludingLargeTeilhaushalte.value.budgetSum,
  )

  const budgetCoverage = computed(() => ({
    withBudget: teilhaushaltBudgetAggregation.value.covered,
    total: teilhaushaltBudgetAggregation.value.total,
  }))

  const budgetCoverageExcludingLargeTeilhaushalte = computed(() => ({
    withBudget: teilhaushaltBudgetAggregationExcludingLargeTeilhaushalte.value.covered,
    total: teilhaushaltBudgetAggregationExcludingLargeTeilhaushalte.value.total,
  }))

  const chartSections = computed<ChartSection[]>(() => [
    {
      id: 'dienststellen',
      title: 'Verantwortliche Dienststellen',
      subtitle: 'Welche Dienststelle trägt welchen Anteil der Einsparung?',
      items: dienststellenDistribution.value,
      emptyLabel: 'Für keine Dienststelle wurden Einsparungen erfasst.',
    },
    {
      id: 'teilhaushalte',
      title: 'Teilhaushalte (TH)',
      subtitle: 'Vergleich der Einsparsumme pro Teilhaushalt.',
      items: teilhaushalteDistribution.value,
      emptyLabel: 'Keine Teilhaushalte mit Einsparungen in dieser Auswahl.',
    },
    {
      id: 'dezernate',
      title: 'Dezernate und zugehörige Teilhaushalte',
      subtitle: 'Gruppiert nach Dezernat inklusive der zugeordneten Teilhaushalte.',
      items: dezernatDistribution.value,
      emptyLabel: 'Einsparungen konnten keinem Dezernat zugeordnet werden.',
    },
  ])

  const chartSectionsExcludingLargeTeilhaushalte = computed<ChartSection[]>(() => [
    {
      id: 'dienststellen',
      title: 'Verantwortliche Dienststellen (ohne TH 2000/5000)',
      subtitle: 'Anteile der Einsparung ohne die Teilhaushalte 2000 und 5000.',
      items: dienststellenDistributionExcludingLargeTeilhaushalte.value,
      emptyLabel: 'Für keine Dienststelle wurden Einsparungen erfasst (nach Ausschluss).',
    },
    {
      id: 'teilhaushalte',
      title: 'Teilhaushalte (ohne TH 2000/5000)',
      subtitle: 'Vergleich der Einsparsumme ohne die Teilhaushalte 2000 und 5000.',
      items: teilhaushalteDistributionExcludingLargeTeilhaushalte.value,
      emptyLabel: 'Keine Teilhaushalte mit Einsparungen nach dem Ausschluss.',
    },
    {
      id: 'dezernate',
      title: 'Dezernate (ohne TH 2000/5000)',
      subtitle: 'Gruppiert nach Dezernat ohne Beiträge der Teilhaushalte 2000 und 5000.',
      items: dezernatDistributionExcludingLargeTeilhaushalte.value,
      emptyLabel: 'Einsparungen konnten keinem Dezernat zugeordnet werden.',
    },
  ])

  const hasData = computed(() => totalAmount.value > 0 && measures.value.length > 0)

  const savingsModeLabel = computed(() => {
    return UI_CONFIG.YEAR_MODE_LABELS[savingsMode.value]
  })

  return {
    measures,
    savingsMode,
    totalAmount,
    totalAmountExcludingLargeTeilhaushalte,
    measureCount,
    savingsModeLabel,
    dienststellenDistribution,
    teilhaushalteDistribution,
    dezernatDistribution,
    unassignedTeilhaushalte,
    chartSections,
    budgetChartSections,
    budgetChartSectionsExcludingLargeTeilhaushalte,
    chartSectionsExcludingLargeTeilhaushalte,
    missingBudgetTeilhaushalte,
    missingBudgetTeilhaushalteExcludingLargeTeilhaushalte,
    budgetCoverage,
    budgetCoverageExcludingLargeTeilhaushalte,
    totalBudget,
    totalBudgetExcludingLargeTeilhaushalte,
    hasData,
    unassignedTeilhaushalteExcludingLargeTeilhaushalte,
  }
}
