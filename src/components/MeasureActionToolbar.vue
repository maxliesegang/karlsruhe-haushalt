<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    hasCustomMeasures?: boolean
    customMeasureCount?: number
  }>(),
  {
    hasCustomMeasures: false,
    customMeasureCount: 0,
  },
)

const emit = defineEmits<{
  (e: 'show-distribution'): void
  (e: 'add-custom-measure'): void
  (e: 'reset-custom-measures'): void
}>()
</script>

<template>
  <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
      @click="emit('show-distribution')"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        class="h-4 w-4 text-indigo-600"
        fill="currentColor"
      >
        <rect x="3" y="10" width="4" height="11" rx="1" />
        <rect x="10" y="5" width="4" height="16" rx="1" />
        <rect x="17" y="2" width="4" height="19" rx="1" />
      </svg>
      Verteilung anzeigen
    </button>
    <span aria-hidden="true">·</span>
    <button
      type="button"
      class="inline-flex items-center gap-1 font-semibold text-indigo-700 transition hover:text-indigo-900"
      @click="emit('add-custom-measure')"
    >
      <span class="text-base">+</span>
      Eigenes Szenario
    </button>
    <span aria-hidden="true">·</span>
    <button
      type="button"
      class="inline-flex items-center gap-1 font-semibold text-slate-500 underline decoration-dotted underline-offset-4 transition hover:text-slate-800 disabled:text-slate-300 disabled:no-underline"
      :disabled="!props.hasCustomMeasures"
      @click="emit('reset-custom-measures')"
    >
      Datensatz zurücksetzen
    </button>
    <span v-if="props.customMeasureCount" class="text-[11px] text-slate-400">
      {{ props.customMeasureCount }} eigene Maßnahme(n)
    </span>
  </div>
</template>
