<script setup lang="ts">
import { computed } from 'vue'
import { formatEuro } from '@/utils/format'
import type { SavingsMode } from '@/utils/savings'

const props = defineProps<{
  progress: number
  total: number
  goal: number
  remaining: number
  remainingLabel: string
  savingsMode: SavingsMode
}>()

const emit = defineEmits<{
  (e: 'change-mode', mode: SavingsMode): void
}>()

const modeOptions: Array<{ value: SavingsMode; label: string }> = [
  { value: '2026', label: 'Nur 2026' },
  { value: '2027', label: 'Nur 2027' },
  { value: 'both', label: 'Beide Jahre' },
]

const boundedProgress = computed(() => Math.min(100, Math.max(0, props.progress)))
const formattedTotal = computed(() => formatEuro(props.total))
const formattedGoal = computed(() => formatEuro(props.goal))
const formattedRemaining = computed(() => formatEuro(props.remaining))

function handleModeChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  const value = target.value as SavingsMode
  emit('change-mode', value)
}
</script>

<template>
  <header>
    <div
      class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 px-5 py-5 text-white shadow-xl ring-1 ring-white/20 sm:px-6 lg:px-8"
    >
      <div class="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div class="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-sky-400/40 blur-3xl"></div>
        <div
          class="absolute -bottom-10 left-6 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl"
        ></div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Haushalt Karlsruhe</h1>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-200">
            <span class="text-[10px] uppercase tracking-[0.35em] text-slate-200/80">Jahre</span>
            <select
              id="hero-savings-mode"
              class="cursor-pointer rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-50 transition focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
              :value="props.savingsMode"
              @change="handleModeChange"
            >
              <option v-for="option in modeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <div
          class="flex flex-col gap-4 rounded-2xl border border-white/25 bg-white/10 px-4 py-4 text-white backdrop-blur lg:flex-row lg:items-center lg:gap-6"
        >
          <div class="flex-1 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-100">
                Fortschritt
              </div>
              <div class="text-2xl font-semibold tabular-nums">{{ boundedProgress }}%</div>
            </div>
            <div class="relative h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div
                class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 transition-[width] duration-300 ease-out"
                :style="{ width: boundedProgress + '%' }"
              ></div>
            </div>
          </div>
          <div class="flex flex-1 flex-wrap gap-3">
            <div class="min-w-[140px] flex-1 rounded-2xl bg-white/15 p-3 backdrop-blur">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-100">
                Eingespart
              </p>
              <p class="text-lg font-semibold tabular-nums">{{ formattedTotal }}</p>
            </div>
            <div class="min-w-[140px] flex-1 rounded-2xl bg-white/15 p-3 backdrop-blur">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-100">Ziel</p>
              <p class="text-lg font-semibold tabular-nums">{{ formattedGoal }}</p>
            </div>
            <div class="min-w-[160px] flex-1 rounded-2xl bg-white/15 p-3 backdrop-blur">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-100">
                {{ remainingLabel }}
              </p>
              <p class="text-lg font-semibold tabular-nums">{{ formattedRemaining }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
