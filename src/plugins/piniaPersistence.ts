/**
 * Pinia plugin for automatic state persistence
 *
 * Automatically saves budget store state to localStorage and URL hash
 * whenever relevant state changes occur.
 */

import type { PiniaPluginContext } from 'pinia'
import { watch } from 'vue'
import { STORAGE_CONFIG } from '@/config/constants'

const STORAGE_KEY = STORAGE_CONFIG.STORAGE_KEY

type StoredPayload = {
  selectedIds?: number[]
  yearMode?: '2026' | '2027' | 'both'
  customMassnahmen?: unknown[]
}

/**
 * Pinia plugin that auto-persists budget store state
 */
export function piniaPersistencePlugin({ store }: PiniaPluginContext) {
  // Only apply to budget store
  if (store.$id !== 'budget') return

  // Watch for changes to selected IDs, year mode, and custom measures
  watch(
    () => ({
      selectedIds: store.selectedIds,
      yearMode: store.yearMode,
      customMassnahmen: store.customMassnahmen,
    }),
    (state) => {
      // Persist to localStorage
      const payload: StoredPayload = {
        selectedIds: state.selectedIds,
        yearMode: state.yearMode,
        customMassnahmen: state.customMassnahmen,
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch (error) {
        console.warn('Failed to persist to localStorage:', error)
      }

      // Update URL hash
      updateHash(state.selectedIds)
    },
    { deep: true },
  )
}

/**
 * Update URL hash with selected IDs
 */
function updateHash(selectedIds: number[]) {
  const hash = selectedIds.length ? `sel=${selectedIds.join(',')}` : ''
  if (hash) {
    window.location.hash = hash
  } else {
    window.history.replaceState(null, '', window.location.pathname)
  }
}
