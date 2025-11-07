/**
 * Composable for managing modal states
 *
 * Centralizes modal open/close state and related data management
 * to reduce clutter in view components.
 */

import { ref, computed } from 'vue'
import type { Massnahme, CompensationEntry } from '@/types'

export function useModalManager() {
  // Compensation modal state
  const compensationModalOpen = ref(false)
  const compensationTarget = ref<Massnahme | null>(null)
  const compensationPlans = ref<Record<number, CompensationEntry[]>>({})

  // Custom measure modal state
  const customMeasureModalOpen = ref(false)

  // Distribution modal state
  const distributionModalOpen = ref(false)

  // Computed properties
  const compensatedIds = computed(() =>
    Object.entries(compensationPlans.value)
      .filter(([, entries]) => entries.length > 0)
      .map(([id]) => Number(id)),
  )

  const currentCompensationPlan = computed(() => {
    if (!compensationTarget.value) return []
    return compensationPlans.value[compensationTarget.value.id] ?? []
  })

  // Compensation modal actions
  function openCompensationModal(measure: Massnahme) {
    compensationTarget.value = measure
    compensationModalOpen.value = true
  }

  function closeCompensationModal() {
    compensationModalOpen.value = false
    compensationTarget.value = null
  }

  function saveCompensationPlan(payload: { measureId: number; entries: CompensationEntry[] }) {
    compensationPlans.value = {
      ...compensationPlans.value,
      [payload.measureId]: payload.entries.map((entry) => ({ ...entry })),
    }
  }

  // Custom measure modal actions
  function openCustomMeasureModal() {
    customMeasureModalOpen.value = true
  }

  function closeCustomMeasureModal() {
    customMeasureModalOpen.value = false
  }

  // Distribution modal actions
  function openDistributionModal() {
    distributionModalOpen.value = true
  }

  function closeDistributionModal() {
    distributionModalOpen.value = false
  }

  return {
    // Compensation modal
    compensationModalOpen,
    compensationTarget,
    compensationPlans,
    compensatedIds,
    currentCompensationPlan,
    openCompensationModal,
    closeCompensationModal,
    saveCompensationPlan,

    // Custom measure modal
    customMeasureModalOpen,
    openCustomMeasureModal,
    closeCustomMeasureModal,

    // Distribution modal
    distributionModalOpen,
    openDistributionModal,
    closeDistributionModal,
  }
}
