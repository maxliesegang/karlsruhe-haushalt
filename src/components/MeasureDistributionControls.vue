<script setup lang="ts">
export type MeasureDistributionTab = {
  id: string
  label: string
  description?: string
}

defineProps<{
  tabs: MeasureDistributionTab[]
}>()

const activeTab = defineModel<string>('activeTab', {
  required: true,
})

const excludeLargeTeilhaushalte = defineModel<boolean>('excludeLargeTeilhaushalte', {
  required: true,
})

const toggleLargeTeilhaushalte = () => {
  excludeLargeTeilhaushalte.value = !excludeLargeTeilhaushalte.value
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white/70 p-3">
    <div class="flex flex-wrap items-center gap-2">
      <div
        class="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Darstellung der Einsparungen wählen"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="flex-1 rounded-xl px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 sm:flex-none sm:px-4"
          :class="
            activeTab === tab.id
              ? 'border border-indigo-200 bg-indigo-50 text-indigo-900 shadow-sm'
              : 'border border-transparent text-slate-600 hover:bg-slate-50'
          "
          role="tab"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          <p class="font-semibold">{{ tab.label }}</p>
          <p v-if="tab.description" class="text-[11px] text-slate-500">{{ tab.description }}</p>
        </button>
      </div>

      <div class="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
        <p class="hidden whitespace-nowrap font-medium text-slate-500 sm:block">
          TH 2000/5000 {{ excludeLargeTeilhaushalte ? 'ausgeblendet' : 'einbezogen' }}
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 font-semibold text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
          role="switch"
          :aria-checked="excludeLargeTeilhaushalte"
          aria-label="TH 2000/5000 ein- oder ausblenden"
          @click="toggleLargeTeilhaushalte"
        >
          <span
            class="relative inline-flex h-4 w-7 items-center rounded-full px-0.5 transition"
            :class="excludeLargeTeilhaushalte ? 'bg-amber-300/80' : 'bg-slate-200'"
          >
            <span
              class="h-3.5 w-3.5 rounded-full bg-white shadow transition"
              :class="excludeLargeTeilhaushalte ? 'translate-x-3' : 'translate-x-0'"
            />
          </span>
          <span>{{ excludeLargeTeilhaushalte ? 'Aus' : 'An' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
