<script setup lang="ts">
import type { ChartItem } from '@/types'
import { formatEuro, formatPercent } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    item: ChartItem
    barMinPercent?: number
  }>(),
  {
    barMinPercent: 5,
  },
)

const barWidth = (): string => {
  if (props.item.amount <= 0 || props.item.barShare <= 0) return '0%'
  return `${Math.max(props.item.barShare * 100, props.barMinPercent)}%`
}
</script>

<template>
  <article class="rounded-xl bg-white/80 p-3 shadow-sm shadow-slate-200/60">
    <div class="flex items-baseline justify-between gap-3 text-sm">
      <div>
        <p class="font-semibold text-slate-900" :title="item.label">
          {{ item.label }}
        </p>
        <p v-if="item.note" class="text-[11px] text-slate-500">
          {{ item.note }}
        </p>
      </div>
      <div class="text-right text-xs text-slate-500">
        <p class="font-semibold text-slate-900 tabular-nums">{{ formatEuro(item.amount) }}</p>
        <p>Anteil: {{ formatPercent(item.percentOfTotal) }}</p>
      </div>
    </div>
    <div class="mt-2 h-2 rounded-full bg-slate-100">
      <div
        class="h-2 rounded-full bg-indigo-500 transition-[width]"
        :style="{ width: barWidth() }"
      ></div>
    </div>
  </article>
</template>
