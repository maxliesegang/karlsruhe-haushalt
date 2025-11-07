<script setup lang="ts">
import type { ChartSection } from '@/types'
import ChartBar from '@/components/ui/ChartBar.vue'

withDefaults(
  defineProps<{
    section: ChartSection
    barMinPercent?: number
  }>(),
  {
    barMinPercent: 5,
  },
)
</script>

<template>
  <section
    class="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 shadow-sm"
    :aria-label="`${section.title}: ${section.subtitle}`"
  >
    <div class="mb-3 space-y-1">
      <h3 class="text-base font-semibold text-slate-900">{{ section.title }}</h3>
      <p class="text-xs text-slate-500">{{ section.subtitle }}</p>
    </div>

    <div v-if="section.items.length" class="space-y-3">
      <ChartBar
        v-for="item in section.items"
        :key="item.key"
        :item="item"
        :bar-min-percent="barMinPercent"
      />
    </div>
    <p v-else class="text-sm text-slate-500">{{ section.emptyLabel }}</p>

    <slot name="footer" />
  </section>
</template>
