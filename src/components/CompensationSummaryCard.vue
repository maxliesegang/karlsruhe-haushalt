<script setup lang="ts">
import { computed } from 'vue'
import { formatEuro } from '@/utils/format'

const props = defineProps<{
  requiredAmount: number
  coveredAmount: number
  missingAmount: number
  deltaAmount: number
  coveragePercent: number
  hasOverCoverage: boolean
  selectedCount: number
}>()

const statusLabel = computed(() => (props.missingAmount > 0 ? 'Offen' : 'Überschuss'))
const statusColor = computed(() => (props.missingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'))
const progressColor = computed(() =>
  props.hasOverCoverage ? 'bg-amber-500' : props.missingAmount ? 'bg-indigo-500' : 'bg-emerald-500',
)
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-inner shadow-slate-200/60"
    aria-label="Ausgleichsstatus"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Zielbetrag</p>
        <p class="text-xl font-semibold text-slate-900 tabular-nums">
          {{ formatEuro(requiredAmount) }}
        </p>
      </div>
      <div class="text-right">
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Bisher gedeckt
        </p>
        <p class="text-xl font-semibold text-slate-900 tabular-nums">
          {{ formatEuro(coveredAmount) }}
        </p>
      </div>
    </div>
    <div class="mt-3 grid gap-2 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm text-slate-600">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Fortschritt
        </p>
        <p class="mt-0.5 text-base font-semibold text-slate-900">{{ coveragePercent }}%</p>
        <div class="mt-2 h-1.5 rounded-full bg-slate-100">
          <div
            class="h-full rounded-full transition-all"
            :class="progressColor"
            :style="{ width: `${coveragePercent}%` }"
          ></div>
        </div>
      </div>
      <div class="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm text-slate-600">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</p>
        <p class="mt-0.5 text-base font-semibold" :class="statusColor">{{ statusLabel }}</p>
        <p class="text-sm font-semibold text-slate-900 tabular-nums">
          {{ formatEuro(deltaAmount) }}
        </p>
      </div>
      <div class="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm text-slate-600">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Ausgewählt
        </p>
        <p class="mt-0.5 text-base font-semibold text-slate-900">
          {{ selectedCount }}
        </p>
        <p class="text-xs text-slate-500">Ersatzmaßnahmen</p>
      </div>
    </div>
  </section>
</template>
