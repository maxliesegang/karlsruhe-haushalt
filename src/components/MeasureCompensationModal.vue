<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Massnahme } from '@/types/massnahme'
import type { CompensationEntry } from '@/types/compensation'
import { formatEuro } from '@/utils/format'
import { filterMeasures } from '@/utils/measureFilters'
import { createDefaultFilter, type FilterState } from '@/utils/filterState'
import { savingsForMode, type SavingsMode } from '@/utils/savings'
import MeasureFiltersCard from '@/components/MeasureFiltersCard.vue'
import MeasureList from '@/components/MeasureList.vue'
import CompensationSummaryCard from '@/components/CompensationSummaryCard.vue'
import AppModal from '@/components/ui/AppModal.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    measure: Massnahme | null
    measures: Massnahme[]
    savingsMode: SavingsMode
    existingPlan?: CompensationEntry[]
  }>(),
  {
    existingPlan: () => [],
  },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { measureId: number; entries: CompensationEntry[] }): void
}>()

type Entry = { sourceId: number; amount: number | null }
type EntryWithMeasure = Entry & { measure: Massnahme }

const filterState = ref<FilterState>(createDefaultFilter())
const entries = ref<Entry[]>([])

const requiredAmount = computed(() => {
  if (!props.measure) return 0
  const amount = savingsForMode(props.measure, props.savingsMode)
  return Number.isFinite(amount) ? Math.max(0, amount) : 0
})

const filteredMeasures = computed(() =>
  filterMeasures(props.measures, filterState.value, props.savingsMode, {
    excludeIds: props.measure ? [props.measure.id] : undefined,
  }),
)

const dienststellenOptions = computed(() => {
  const unique = new Set<string>()
  for (const measure of props.measures) {
    const normalized = typeof measure.dienststelle === 'string' ? measure.dienststelle.trim() : ''
    if (normalized) unique.add(normalized)
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }))
})

const selectedSourceIds = computed(() => entries.value.map((entry) => entry.sourceId))

const coveredAmount = computed(() =>
  entries.value.reduce((sum, entry) => sum + Math.max(0, entry.amount ?? 0), 0),
)
const missingAmount = computed(() => Math.max(0, requiredAmount.value - coveredAmount.value))
const hasOverCoverage = computed(() => coveredAmount.value > requiredAmount.value)
const coveragePercent = computed(() => {
  if (requiredAmount.value <= 0) return 0
  return Math.min(100, Math.round((coveredAmount.value / requiredAmount.value) * 100))
})
const deltaAmount = computed(() =>
  missingAmount.value > 0 ? missingAmount.value : coveredAmount.value - requiredAmount.value,
)
const hasAmountInput = computed(() =>
  entries.value.some((entry) => entry.amount !== null && entry.amount > 0),
)

const measureLookup = computed(
  () => new Map(props.measures.map((measure) => [measure.id, measure])),
)

const selectedEntriesWithDetails = computed<EntryWithMeasure[]>(() => {
  const lookup = measureLookup.value
  return entries.value
    .map((entry) => {
      const measure = lookup.get(entry.sourceId)
      return measure ? { ...entry, measure } : null
    })
    .filter((entry): entry is EntryWithMeasure => entry !== null)
})

function defaultAmountForSource(sourceId: number): number | null {
  const measure = measureLookup.value.get(sourceId)
  if (!measure) return null
  const amount = savingsForMode(measure, props.savingsMode)
  if (!Number.isFinite(amount)) return null
  const normalized = Math.max(0, amount)
  return normalized > 0 ? normalized : null
}

function syncFromPlan() {
  if (!props.measure) {
    entries.value = []
    return
  }
  const plan = props.existingPlan ?? []
  entries.value = plan.map((item) => ({ sourceId: item.sourceId, amount: item.amount }))
  filterState.value = createDefaultFilter()
}

watch(
  () => ({ isOpen: props.open, id: props.measure?.id }),
  (current, previous) => {
    if (!current.isOpen) return
    const openedNow = !previous?.isOpen && current.isOpen
    const measureChanged = previous && current.id !== previous.id
    if (openedNow || measureChanged || !previous) {
      syncFromPlan()
    }
  },
  { immediate: true },
)

function patchFilter(patch: Partial<FilterState>) {
  filterState.value = { ...filterState.value, ...patch }
}

function resetFilter() {
  filterState.value = createDefaultFilter()
}

function toggleSource(id: number) {
  const idx = entries.value.findIndex((entry) => entry.sourceId === id)
  if (idx >= 0) {
    entries.value.splice(idx, 1)
  } else {
    entries.value.push({ sourceId: id, amount: defaultAmountForSource(id) })
  }
}

function updateAmount(id: number, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  const entry = entries.value.find((item) => item.sourceId === id)
  if (!entry) return
  entry.amount = Number.isFinite(value) && value >= 0 ? value : null
}

function close() {
  emit('close')
}

function handleSave() {
  if (!props.measure) return
  const validEntries = entries.value
    .filter((entry) => entry.amount !== null && entry.amount > 0)
    .map((entry) => ({ sourceId: entry.sourceId, amount: entry.amount as number }))

  if (!validEntries.length || missingAmount.value > 0) return

  emit('save', { measureId: props.measure.id, entries: validEntries })
  emit('close')
}
</script>

<template>
  <AppModal
    :open="open && !!measure"
    aria-label="Ausgleich für geänderte Maßnahme"
    align="end"
    panel-class="max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
    @close="close"
  >
    <header class="space-y-5 border-b border-slate-100 px-6 py-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Maßnahme anpassen
          </p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ measure?.massnahme }}</p>
        </div>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
          @click="close"
          aria-label="Modal schließen"
        >
          &times;
        </button>
      </div>

      <CompensationSummaryCard
        :required-amount="requiredAmount"
        :covered-amount="coveredAmount"
        :missing-amount="missingAmount"
        :delta-amount="deltaAmount"
        :coverage-percent="coveragePercent"
        :has-over-coverage="hasOverCoverage"
        :selected-count="selectedEntriesWithDetails.length"
      />
    </header>

    <form @submit.prevent="handleSave" class="max-h-[72vh] overflow-y-auto px-6 py-5 sm:px-8">
      <div class="space-y-6">
        <section class="space-y-6">
          <div
            class="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-inner shadow-slate-200/60"
          >
            <div class="rounded-2xl border border-slate-100 bg-white p-3">
              <MeasureFiltersCard
                :filter="filterState"
                :dienststellen-options="dienststellenOptions"
                title="Ersatzmaßnahmen suchen"
                description="Filter anwenden und Maßnahmen mit einem Klick auswählen."
                @update-filter="patchFilter"
                @reset="resetFilter"
              />
            </div>
            <div class="min-h-[200px] flex-1 overflow-hidden rounded-2xl border border-slate-100">
              <div class="h-full overflow-y-auto pr-2">
                <MeasureList
                  :loading="false"
                  :error="null"
                  :measures="filteredMeasures"
                  :selected-ids="selectedSourceIds"
                  :savings-mode="props.savingsMode"
                  :show-compensation-button="false"
                  :compensated-ids="[]"
                  @toggle="toggleSource"
                />
              </div>
            </div>
          </div>

          <div
            class="rounded-3xl border border-slate-200 bg-white/95 px-5 py-4 shadow-sm shadow-slate-200/70"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-semibold uppercase tracking-[0.25em] text-slate-600">
                Ausgewählte Ersatzmaßnahmen
              </h3>
              <p class="text-xs font-semibold text-slate-500">
                {{ selectedEntriesWithDetails.length }} aktiv
              </p>
            </div>

            <p
              v-if="selectedEntriesWithDetails.length === 0"
              class="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"
            >
              Wähle eine Maßnahme aus der Liste aus, um Beträge zu erfassen.
            </p>

            <ul v-else class="mt-4 space-y-3">
              <li
                v-for="entry in selectedEntriesWithDetails"
                :key="entry.sourceId"
                class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm font-semibold text-slate-900"
                      :title="entry.measure.massnahme"
                    >
                      {{ entry.measure.massnahme }}
                    </p>
                    <p class="text-xs text-slate-500">
                      Vorlage {{ entry.measure.vorlagennummer }} ·
                      {{ formatEuro(savingsForMode(entry.measure, props.savingsMode)) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-3">
                    <label class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Betrag
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        class="mt-1 w-32 rounded-xl border border-slate-300 bg-white px-3 py-2 text-right text-sm font-semibold text-slate-900 focus:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                        :value="entry.amount ?? ''"
                        @input="updateAmount(entry.sourceId, $event)"
                      />
                    </label>
                    <button
                      type="button"
                      class="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:text-rose-600 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 sm:mt-0"
                      @click="toggleSource(entry.sourceId)"
                      aria-label="Maßnahme aus Ausgleich entfernen"
                    >
                      &minus;
                    </button>
                  </div>
                </div>
              </li>
            </ul>

            <div class="mt-5 space-y-2 rounded-2xl border border-slate-200 bg-white/90 p-4">
              <div class="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Bereits gedeckt</span>
                <span>{{ formatEuro(coveredAmount) }}</span>
              </div>
              <div
                class="flex items-center justify-between text-sm font-semibold"
                :class="missingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'"
              >
                <span>{{ missingAmount > 0 ? 'Fehlende Summe' : 'Überschuss' }}</span>
                <span>{{ formatEuro(deltaAmount) }}</span>
              </div>
            </div>
          </div>
        </section>

        <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
            @click="close"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-slate-400"
            :disabled="missingAmount > 0 || !hasAmountInput"
          >
            Ausgleich speichern
          </button>
        </div>
      </div>
    </form>
  </AppModal>
</template>
