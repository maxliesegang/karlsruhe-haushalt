<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Massnahme } from '@/types/massnahme'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { formatEuro } from '@/utils/format'
import { savingsForMode, type SavingsMode } from '@/utils/savings'

const props = defineProps<{
  selected: Massnahme[]
  totalCount: number
  allSelected: boolean
  savingsMode: SavingsMode
  goal: number
}>()

const emit = defineEmits<{
  (e: 'toggle', id: number): void
  (e: 'select-all'): void
  (e: 'clear'): void
}>()

const sortOptions = [
  { value: 'amount', label: 'nach Ersparnis' },
  { value: 'alpha', label: 'alphabetisch' },
] as const

type SortMode = (typeof sortOptions)[number]['value']
const sortMode = ref<SortMode>('amount')
const mobilePanelOpen = ref(false)
const isDesktop = useMediaQuery('(min-width: 1024px)')

const sortedSelected = computed(() => {
  const items = [...props.selected]
  if (sortMode.value === 'alpha') {
    return items.sort((a, b) =>
      a.massnahme.localeCompare(b.massnahme, 'de', { sensitivity: 'base' }),
    )
  }
  return items.sort(
    (a, b) => savingsForMode(b, props.savingsMode) - savingsForMode(a, props.savingsMode),
  )
})

const hasSelection = computed(() => props.selected.length > 0)
const toggleAllLabel = computed(() => (props.allSelected ? 'Alle abwählen' : 'Alle auswählen'))
const selectionCount = computed(() => props.selected.length)
const totalSavings = computed(() =>
  props.selected.reduce((sum, item) => sum + savingsForMode(item, props.savingsMode), 0),
)
const formattedTotalSavings = computed(() => formatEuro(totalSavings.value))
const goalProgress = computed(() => {
  if (props.goal <= 0) return 0
  const percent = (totalSavings.value / props.goal) * 100
  return Math.round(Math.min(100, Math.max(0, percent)))
})
const mobileSummaryLabel = computed(() =>
  hasSelection.value ? formattedTotalSavings.value : 'Noch keine Auswahl',
)
const shouldDisplayOverlay = computed(() => mobilePanelOpen.value && !isDesktop.value)
const panelIsInteractive = computed(() => isDesktop.value || mobilePanelOpen.value)

function handleToggleAll() {
  if (props.allSelected) emit('clear')
  else emit('select-all')
}

function savingsLabel(m: Massnahme): string {
  return formatEuro(savingsForMode(m, props.savingsMode))
}

const savingsHint = computed(() =>
  props.savingsMode === 'both' ? 'Summe 2026 + 2027' : `Jahr ${props.savingsMode}`,
)

function openMobilePanel() {
  mobilePanelOpen.value = true
}

function closeMobilePanel() {
  mobilePanelOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && mobilePanelOpen.value && !isDesktop.value) {
    closeMobilePanel()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
})

watch(
  () => props.selected.length,
  (next) => {
    if (next === 0) {
      closeMobilePanel()
    }
  },
)

watch(isDesktop, (matches) => {
  if (matches) {
    mobilePanelOpen.value = false
  }
})
</script>

<template>
  <aside class="relative space-y-4 lg:space-y-6" aria-live="polite">
    <div v-if="!mobilePanelOpen" class="lg:hidden">
      <div class="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
        <button
          type="button"
          class="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-lg shadow-slate-900/5 transition hover:border-indigo-200 hover:bg-white focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
          aria-controls="selected-measures-panel"
          :aria-expanded="mobilePanelOpen"
          @click="openMobilePanel"
        >
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Auswahl
            </p>
            <p class="text-base font-semibold text-slate-900">
              {{ selectionCount }} / {{ totalCount }} aktiv
            </p>
            <p class="text-[11px] text-slate-500">{{ goalProgress }}% des Ziels</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-500">Eingespart</p>
            <p class="text-lg font-semibold text-slate-900 tabular-nums">
              {{ mobileSummaryLabel }}
            </p>
          </div>
        </button>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="shouldDisplayOverlay"
        class="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
        @click="closeMobilePanel"
      ></div>
    </transition>

    <section
      id="selected-measures-panel"
      class="pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] lg:max-w-none lg:rounded-3xl lg:border-slate-200/80 lg:bg-white lg:shadow-sm"
      :class="[
        mobilePanelOpen ? 'translate-y-0' : 'translate-y-[calc(100%+2rem)] lg:translate-y-0',
        panelIsInteractive ? 'pointer-events-auto' : 'pointer-events-none',
      ]"
      :aria-hidden="panelIsInteractive ? undefined : 'true'"
      aria-label="Ausgewählte Maßnahmen"
    >
      <div
        class="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 text-sm text-slate-600 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4"
      >
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Auswahl</p>
          <span
            class="inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-full border border-slate-200 px-2 text-[13px] font-semibold text-slate-800"
            aria-label="Anzahl ausgewählter Maßnahmen"
          >
            {{ selectionCount }}
          </span>
          <span class="text-xs text-slate-500">von {{ totalCount }} Vorschlägen aktiv</span>
        </div>
        <div class="flex flex-1 flex-wrap items-center gap-3 lg:justify-end">
          <button
            type="button"
            class="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600 whitespace-nowrap"
            @click="handleToggleAll"
          >
            {{ toggleAllLabel }}
          </button>
          <select
            id="selected-sort"
            v-model="sortMode"
            aria-label="Auswahl sortieren"
            class="h-9 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <button
          type="button"
          class="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 text-lg text-slate-400 transition hover:border-slate-300 hover:text-slate-600 lg:hidden"
          aria-label="Auswahl schließen"
          @click="closeMobilePanel"
        >
          &times;
        </button>
      </div>

      <div v-if="!hasSelection" class="px-5 py-6 text-sm text-slate-500">
        Noch keine Auswahl getroffen. Aktiviere links passende Vorschläge.
      </div>

      <div v-else class="flex-1 overflow-y-auto px-4 py-1 lg:max-h-none lg:overflow-visible">
        <ul class="space-y-2.5" role="list">
          <li
            v-for="m in sortedSelected"
            :key="m.id"
            class="group rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-3 text-sm shadow-sm transition hover:border-indigo-200 hover:bg-white"
          >
            <div class="flex items-start gap-3">
              <button
                class="h-8 w-8 shrink-0 rounded-full border border-slate-200/90 text-base font-semibold text-slate-400 transition group-hover:border-rose-200 group-hover:text-rose-600"
                aria-label="Maßnahme entfernen"
                @click="emit('toggle', m.id)"
              >
                &times;
              </button>
              <div class="min-w-0 flex-1 space-y-1.5">
                <p
                  class="text-[15px] font-semibold leading-tight text-slate-900 sm:text-base"
                  :title="m.massnahme"
                >
                  {{ m.massnahme }}
                </p>
                <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Ersparnis
                  </p>
                  <div class="flex items-baseline gap-2 text-right text-slate-900">
                    <p class="text-base font-semibold tabular-nums">{{ savingsLabel(m) }}</p>
                    <span
                      class="rounded-full border border-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {{ savingsHint }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
