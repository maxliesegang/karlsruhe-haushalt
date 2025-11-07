<script setup lang="ts">
import { computed, ref, type ComputedRef } from 'vue'
import type { Massnahme, ChartSection } from '@/types'
import type { SavingsMode } from '@/utils/savings'
import { formatEuro } from '@/utils/format'
import MeasureDistributionSection from '@/components/MeasureDistributionSection.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { useMeasureDistribution } from '@/composables/useMeasureDistribution'
import MeasureDistributionControls, {
  type MeasureDistributionTab,
} from '@/components/MeasureDistributionControls.vue'

const props = defineProps<{
  open: boolean
  measures: Massnahme[]
  savingsMode: SavingsMode
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const {
  measureCount,
  totalAmount,
  totalAmountExcludingLargeTeilhaushalte: totalAmountWithoutLargeTH,
  totalBudget,
  totalBudgetExcludingLargeTeilhaushalte: totalBudgetWithoutLargeTH,
  savingsModeLabel,
  chartSections,
  chartSectionsExcludingLargeTeilhaushalte: chartSectionsWithoutLargeTH,
  budgetChartSections,
  budgetChartSectionsExcludingLargeTeilhaushalte: budgetChartSectionsWithoutLargeTH,
  hasData,
  unassignedTeilhaushalte,
  unassignedTeilhaushalteExcludingLargeTeilhaushalte: unassignedTeilhaushalteWithoutLargeTH,
  missingBudgetTeilhaushalte,
  missingBudgetTeilhaushalteExcludingLargeTeilhaushalte: missingBudgetTeilhaushalteWithoutLargeTH,
  budgetCoverage,
  budgetCoverageExcludingLargeTeilhaushalte: budgetCoverageWithoutLargeTH,
} = useMeasureDistribution(
  () => props.measures,
  () => props.savingsMode,
)

type ImpactSectionMap = Record<
  'dienststellen' | 'dezernate' | 'teilhaushalte',
  ChartSection | undefined
>

function mapImpactSections(sections: ChartSection[]): ImpactSectionMap {
  const byId = new Map(sections.map((section) => [section.id, section]))
  return {
    dienststellen: byId.get('dienststellen'),
    dezernate: byId.get('dezernate'),
    teilhaushalte: byId.get('teilhaushalte'),
  }
}

const sections = computed(() => mapImpactSections(chartSections.value))
const sectionsWithoutLargeTH = computed(() => mapImpactSections(chartSectionsWithoutLargeTH.value))

const distributionTabs: MeasureDistributionTab[] = [
  {
    id: 'budget',
    label: 'Budget-Bezug',
    description: 'Vergleicht Einsparung und Budget der jeweiligen Einheit.',
  },
  {
    id: 'impact',
    label: 'Beitrag zur Gesamteinsparung',
    description: 'Zeigt, welche Bereiche welchen Anteil tragen.',
  },
] as const

type TabId = (typeof distributionTabs)[number]['id']

const activeTab = ref<TabId>('budget')
const excludeLargeTeilhaushalte = ref(false)

const useLargeThAwareValue = <T,>(withLarge: ComputedRef<T>, withoutLarge: ComputedRef<T>) => {
  return computed(() => (excludeLargeTeilhaushalte.value ? withoutLarge.value : withLarge.value))
}

const isImpactTab = computed(() => activeTab.value === 'impact')
const activeBudgetSections = useLargeThAwareValue(
  budgetChartSections,
  budgetChartSectionsWithoutLargeTH,
)
const activeTotalAmount = useLargeThAwareValue(totalAmount, totalAmountWithoutLargeTH)
const activeTotalBudget = useLargeThAwareValue(totalBudget, totalBudgetWithoutLargeTH)
const activeBudgetCoverage = useLargeThAwareValue(budgetCoverage, budgetCoverageWithoutLargeTH)
const activeMissingBudgetTeilhaushalte = useLargeThAwareValue(
  missingBudgetTeilhaushalte,
  missingBudgetTeilhaushalteWithoutLargeTH,
)
const activeImpactSections = useLargeThAwareValue(sections, sectionsWithoutLargeTH)
const activeUnassignedTeilhaushalte = useLargeThAwareValue(
  unassignedTeilhaushalte,
  unassignedTeilhaushalteWithoutLargeTH,
)

function close() {
  emit('close')
}
</script>

<template>
  <AppModal
    :open="open"
    aria-label="Einsparungsverteilung nach Bereichen"
    align="end"
    panel-class="max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl"
    @close="close"
  >
    <header
      class="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Einsparungsüberblick
        </p>
        <h2 class="text-2xl font-semibold text-slate-900">So verteilen sich die Einsparungen</h2>
        <p class="mt-1 text-sm text-slate-500">
          Berechnet aus {{ measureCount }} Maßnahmen · Gesamteinsparung
          {{ formatEuro(activeTotalAmount) }} · Gesamtbudget
          {{ activeTotalBudget > 0 ? formatEuro(activeTotalBudget) : 'k. A.' }} · Modus
          {{ savingsModeLabel }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
        aria-label="Modal schließen"
        @click="close"
      >
        &times;
      </button>
    </header>

    <section class="max-h-[78vh] overflow-y-auto px-6 py-6 sm:px-8">
      <p
        v-if="!hasData"
        class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
      >
        Für diese Auswahl liegen keine Einsparungen vor.
      </p>

      <div v-else class="space-y-4">
        <MeasureDistributionControls
          v-model:active-tab="activeTab"
          v-model:exclude-large-teilhaushalte="excludeLargeTeilhaushalte"
          :tabs="distributionTabs"
        />

        <div v-if="isImpactTab" class="grid gap-6 lg:auto-rows-min lg:grid-cols-2 lg:[&>*]:min-w-0">
          <MeasureDistributionSection
            v-if="activeImpactSections.dienststellen"
            :section="activeImpactSections.dienststellen"
            class="h-full lg:row-span-2"
          />

          <MeasureDistributionSection
            v-if="activeImpactSections.dezernate"
            :section="activeImpactSections.dezernate"
            class="lg:col-start-2"
          >
            <template v-if="activeUnassignedTeilhaushalte.length" #footer>
              <p
                class="mt-3 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-[11px] font-medium text-amber-800"
              >
                Ohne Dezernat (bitte zuordnen):
                <span class="font-semibold text-amber-900">
                  {{ activeUnassignedTeilhaushalte.map((code) => `TH ${code}`).join(', ') }}
                </span>
              </p>
            </template>
          </MeasureDistributionSection>

          <MeasureDistributionSection
            v-if="activeImpactSections.teilhaushalte"
            :section="activeImpactSections.teilhaushalte"
            class="lg:col-start-2"
          />
        </div>

        <div v-else class="space-y-4">
          <p class="text-xs text-slate-500">
            <template v-if="activeBudgetCoverage.total > 0">
              Für
              <span class="font-semibold text-slate-900">{{
                activeBudgetCoverage.withBudget
              }}</span>
              von insgesamt
              <span class="font-semibold text-slate-900">{{ activeBudgetCoverage.total }}</span>
              Teilhaushalten ist ein Budget hinterlegt.
            </template>
            <template v-else>
              In dieser Auswahl gibt es keine Teilhaushalte mit Einsparungen.
            </template>
          </p>

          <div class="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <MeasureDistributionSection
              v-for="section in activeBudgetSections"
              :key="section.id"
              :section="section"
              class="h-full"
            >
              <template v-if="activeMissingBudgetTeilhaushalte.length" #footer>
                <p
                  class="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800"
                >
                  Für diese Teilhaushalte fehlt noch ein Budgeteintrag:
                  <span class="font-semibold text-amber-900">
                    {{ activeMissingBudgetTeilhaushalte.join(', ') }}
                  </span>
                </p>
              </template>
            </MeasureDistributionSection>
          </div>
        </div>
      </div>
    </section>
  </AppModal>
</template>
