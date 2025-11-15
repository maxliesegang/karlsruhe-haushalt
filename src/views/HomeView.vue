<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBudgetStore } from '@/stores/budget'
import { useModalManager } from '@/composables/useModalManager'
import BudgetHero from '@/components/BudgetHero.vue'
import MeasureFiltersCard from '@/components/MeasureFiltersCard.vue'
import MeasureList from '@/components/MeasureList.vue'
import SelectedMeasures from '@/components/SelectedMeasures.vue'
import MeasureCompensationModal from '@/components/MeasureCompensationModal.vue'
import CustomMeasureModal from '@/components/CustomMeasureModal.vue'
import MeasureDistributionModal from '@/components/MeasureDistributionModal.vue'
import MeasureActionToolbar from '@/components/MeasureActionToolbar.vue'
import type { Massnahme } from '@/types/massnahme'

const store = useBudgetStore()
const {
  massnahmen,
  filtered,
  selected,
  selectedIds,
  loading,
  error,
  filter,
  totalSingle,
  goal,
  allSelected,
  progressPercent,
  heroStatus,
  yearMode,
  customMassnahmen,
  dienststellen,
} = storeToRefs(store)

const {
  compensationModalOpen,
  compensationTarget,
  compensatedIds,
  currentCompensationPlan,
  openCompensationModal,
  closeCompensationModal,
  saveCompensationPlan,
  customMeasureModalOpen,
  openCustomMeasureModal,
  closeCustomMeasureModal,
  distributionModalOpen,
  openDistributionModal,
  closeDistributionModal,
} = useModalManager()

const hasCustomMeasures = computed(() => customMassnahmen.value.length > 0)

function handleCustomMeasureSave(payloads: Massnahme[]) {
  store.addCustomMassnahmen(payloads)
}

function handleResetCustomMeasures() {
  store.resetCustomMassnahmen()
}

onMounted(() => {
  if (!massnahmen.value.length) store.load()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50/80 text-slate-900">
    <div class="mx-auto max-w-7xl space-y-6 px-4 pt-6 pb-28 md:px-6 lg:py-10 lg:pb-12">
      <BudgetHero
        :progress="progressPercent"
        :total="totalSingle"
        :goal="goal"
        :remaining="heroStatus.remaining"
        :remaining-label="heroStatus.remainingLabel"
        :savings-mode="yearMode"
        @change-mode="store.setYearMode"
      />

      <div
        class="grid gap-6 lg:items-start lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)] xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.85fr)] xl:gap-8"
      >
        <MeasureList
          :loading="loading"
          :error="error"
          :measures="filtered"
          :selected-ids="selectedIds"
          :savings-mode="yearMode"
          :compensated-ids="compensatedIds"
          @toggle="store.toggle"
          @compensate="openCompensationModal"
        >
          <MeasureFiltersCard
            :filter="filter"
            :dienststellen-options="dienststellen"
            @update-filter="store.patchFilter"
            @reset="store.resetFilter"
          />

          <MeasureActionToolbar
            :has-custom-measures="hasCustomMeasures"
            :custom-measure-count="customMassnahmen.length"
            @show-distribution="openDistributionModal"
            @add-custom-measure="openCustomMeasureModal"
            @reset-custom-measures="handleResetCustomMeasures"
          />
        </MeasureList>

        <SelectedMeasures
          :selected="selected"
          :total-count="massnahmen.length"
          :all-selected="allSelected"
          :savings-mode="yearMode"
          :goal="goal"
          @toggle="store.toggle"
          @select-all="store.selectAll"
          @clear="store.clear"
        />
      </div>

      <MeasureCompensationModal
        :open="compensationModalOpen"
        :measure="compensationTarget"
        :measures="massnahmen"
        :savings-mode="yearMode"
        :existing-plan="currentCompensationPlan"
        @close="closeCompensationModal"
        @save="saveCompensationPlan"
      />

      <CustomMeasureModal
        :open="customMeasureModalOpen"
        @close="closeCustomMeasureModal"
        @save="handleCustomMeasureSave"
      />

      <MeasureDistributionModal
        :open="distributionModalOpen"
        :measures="filtered"
        :savings-mode="yearMode"
        @close="closeDistributionModal"
      />
    </div>
  </div>
</template>
