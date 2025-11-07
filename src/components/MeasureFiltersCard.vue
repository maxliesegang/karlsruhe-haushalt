<script setup lang="ts">
import { computed } from 'vue'
import type { FilterState } from '@/utils/filterState'

const props = withDefaults(
  defineProps<{
    filter: FilterState
    title?: string
    description?: string
    dienststellenOptions?: string[]
  }>(),
  {
    title: 'Maßnahmen filtern',
    description: 'Suche nach Inhalt und begrenze nach Einsparbetrag.',
    dienststellenOptions: () => [],
  },
)

const emit = defineEmits<{
  (e: 'update-filter', payload: Partial<FilterState>): void
  (e: 'reset'): void
}>()

function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
  emit('update-filter', { [key]: value })
}

function handleAmountInput(key: 'minAmount' | 'maxAmount', event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value === '') {
    updateFilter(key, null)
    return
  }
  const numeric = Number(value)
  updateFilter(key, Number.isNaN(numeric) ? null : numeric)
}

const dienststellen = computed(() => {
  const normalized = props.dienststellenOptions
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry): entry is string => entry.length > 0)
  const unique = Array.from(new Set(normalized))
  return unique.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }))
})
</script>

<template>
  <div
    class="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-4 py-4 shadow-sm"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          {{ props.title }}
        </p>
        <p class="text-sm text-slate-600">
          {{ props.description }}
        </p>
      </div>
      <button
        type="button"
        @click="emit('reset')"
        class="text-xs font-semibold text-indigo-700 underline underline-offset-4 transition hover:text-indigo-900"
      >
        Filter leeren
      </button>
    </div>

    <form class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
      <div class="md:col-span-2">
        <label
          for="q"
          class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600"
          >Stichwort</label
        >
        <input
          id="q"
          :value="props.filter.q"
          type="search"
          autocomplete="off"
          placeholder="Titel, Vorlage oder Dienststelle"
          class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          @input="updateFilter('q', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="md:col-span-1">
        <label
          for="dienststelle"
          class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          Dienststelle
        </label>
        <select
          id="dienststelle"
          :value="props.filter.dienststelle ?? ''"
          class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          @change="updateFilter('dienststelle', ($event.target as HTMLSelectElement).value || null)"
        >
          <option value="">Alle Dienststellen</option>
          <option v-for="option in dienststellen" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </div>
      <div class="md:col-span-1">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
          Einsparung (EUR)
        </label>
        <div class="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            step="50000"
            inputmode="numeric"
            :value="props.filter.minAmount ?? ''"
            placeholder="min"
            class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            @input="handleAmountInput('minAmount', $event)"
          />
          <input
            type="number"
            min="0"
            step="50000"
            inputmode="numeric"
            :value="props.filter.maxAmount ?? ''"
            placeholder="max"
            class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            @input="handleAmountInput('maxAmount', $event)"
          />
        </div>
      </div>
    </form>
  </div>
</template>
