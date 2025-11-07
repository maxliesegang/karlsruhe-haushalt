<script setup lang="ts">
import { computed } from 'vue'
import type { Massnahme } from '@/types/massnahme'
import { formatEuro } from '@/utils/format'
import { savingsForMode, type SavingsMode } from '@/utils/savings'
const props = withDefaults(
  defineProps<{
    loading: boolean
    error: string | null
    measures: Massnahme[]
    selectedIds: number[]
    savingsMode: SavingsMode
    showCompensationButton?: boolean
    compensatedIds?: number[]
  }>(),
  {
    showCompensationButton: true,
    compensatedIds: () => [],
  },
)

const emit = defineEmits<{
  (e: 'toggle', id: number): void
  (e: 'compensate', measure: Massnahme): void
}>()

const selectedIdsSet = computed(() => new Set(props.selectedIds))
const compensatedIdSet = computed(() => new Set(props.compensatedIds))

const onRowClick = (event: MouseEvent, id: number) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, button, a')) return
  emit('toggle', id)
}
</script>

<template>
  <section class="space-y-3">
    <slot />

    <div
      v-if="loading"
      class="rounded-3xl border border-slate-200 bg-white/90 p-6 text-sm text-slate-600"
    >
      Daten werden geladen…
    </div>
    <div
      v-else-if="error"
      class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700"
    >
      {{ error }}
    </div>
    <div
      v-else-if="measures.length === 0"
      class="rounded-3xl border border-dashed border-slate-300 bg-white/95 p-8 text-center text-sm text-slate-600"
    >
      Keine Ergebnisse. Passe die Filter an.
    </div>

    <ul v-else class="space-y-2.5 pb-28 lg:pb-0" aria-label="Alle Maßnahmen">
      <li
        v-for="m in props.measures"
        :key="m.id"
        class="group rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm shadow-slate-200/80 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white"
        @click="onRowClick($event, m.id)"
      >
        <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
          <div class="flex w-full items-start gap-3">
            <input
              type="checkbox"
              :checked="selectedIdsSet.has(m.id)"
              @change="emit('toggle', m.id)"
              class="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded-xl border border-slate-400 text-indigo-600 shadow-sm focus-visible:border-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              :aria-label="`Maßnahme ${m.massnahme} auswählen`"
            />
            <div class="min-w-0 flex-1">
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6 sm:justify-between"
              >
                <div class="flex-1 min-w-0">
                  <p
                    class="text-base font-semibold leading-snug text-slate-900"
                    :title="m.massnahme"
                  >
                    {{ m.massnahme }}
                  </p>
                  <div
                    class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-700"
                  >
                    <span
                      class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-700"
                    >
                      {{ m.teilhaushalt }}
                    </span>
                    <span
                      class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5"
                    >
                      {{ m.dienststelle }}
                    </span>
                    <span
                      class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5"
                    >
                      Vorlage {{ m.vorlagennummer }}
                    </span>
                  </div>
                </div>
                <div
                  class="flex w-full flex-col items-end text-right sm:w-auto sm:flex-none sm:text-right"
                >
                  <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Ersparnis
                  </p>
                  <p class="text-lg font-semibold text-slate-900 tabular-nums">
                    {{ formatEuro(savingsForMode(m, props.savingsMode)) }}
                  </p>
                  <button
                    v-if="props.showCompensationButton"
                    type="button"
                    class="mt-3 inline-flex items-center rounded-xl border border-indigo-100 px-3 py-1.5 text-[13px] font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
                    @click.stop="emit('compensate', m)"
                  >
                    Ausgleich planen
                  </button>
                  <p
                    v-if="compensatedIdSet.has(m.id)"
                    class="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-600"
                  >
                    Plan gespeichert
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>
