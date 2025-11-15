<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Massnahme } from '@/types/massnahme'
import { useBudgetStore } from '@/stores/budget'
import { formatEuro } from '@/utils/format'
import AppModal from '@/components/ui/AppModal.vue'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: Massnahme[]): void
}>()

type RowBase = {
  id: string
  massnahme: string
  teilhaushalt: string
  dienststelle: string
  summe_2026: string | number
  summe_2027: string | number
}

type Row = RowBase & { key: number }
type ExistingRow = RowBase

const INITIAL_ROWS = 1
const nextKey = ref(0)
const rows = ref<Row[]>([])
const existingRows = ref<ExistingRow[]>([])
const selectedIdSet = computed(() => budgetStore.selectedIdSet)
const fileTransferFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)
const changeFeedback = ref<{ type: 'add' | 'remove'; message: string } | null>(null)
const budgetStore = useBudgetStore()
let changeFeedbackTimeout: ReturnType<typeof setTimeout> | null = null

function clearChangeFeedback() {
  changeFeedback.value = null
  if (changeFeedbackTimeout) {
    clearTimeout(changeFeedbackTimeout)
    changeFeedbackTimeout = null
  }
}

function showChangeFeedback(type: 'add' | 'remove', message: string) {
  changeFeedback.value = { type, message }
  if (changeFeedbackTimeout) clearTimeout(changeFeedbackTimeout)
  changeFeedbackTimeout = setTimeout(() => {
    changeFeedback.value = null
    changeFeedbackTimeout = null
  }, 4000)
}
const dienststellenOptions = computed(() => {
  const base = budgetStore.baseMassnahmen
  const unique = new Set(
    base
      .map((m) => m.dienststelle)
      .filter((name): name is string => typeof name === 'string' && !!name.trim()),
  )
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }))
})

function createRow(): Row {
  return {
    key: nextKey.value++,
    id: '',
    massnahme: '',
    teilhaushalt: '',
    dienststelle: '',
    summe_2026: '',
    summe_2027: '',
  }
}

function resetRows() {
  rows.value = Array.from({ length: INITIAL_ROWS }, () => createRow())
}

function addRows(count = 1) {
  for (let i = 0; i < count; i += 1) {
    rows.value.push(createRow())
  }
}

function removeRow(key: number) {
  if (rows.value.length === 1) {
    rows.value = [createRow()]
    return
  }
  rows.value = rows.value.filter((row) => row.key !== key)
}

function mapMeasureToExistingRow(measure: Massnahme): ExistingRow {
  return {
    id: typeof measure.id === 'string' ? measure.id : String(measure.id ?? ''),
    massnahme: measure.massnahme ?? '',
    teilhaushalt: measure.teilhaushalt ?? '',
    dienststelle: measure.dienststelle ?? '',
    summe_2026: measure.summe_2026 ?? '',
    summe_2027: measure.summe_2027 ?? '',
  }
}

function syncExistingRows() {
  existingRows.value = budgetStore.customMassnahmen.map((measure) =>
    mapMeasureToExistingRow(measure),
  )
}

watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (isOpen && !wasOpen) {
      resetRows()
      syncExistingRows()
      fileTransferFeedback.value = null
      clearChangeFeedback()
    } else if (!isOpen && wasOpen) {
      clearChangeFeedback()
    }
  },
)

watch(
  () => budgetStore.customMassnahmen,
  () => {
    syncExistingRows()
  },
  { deep: true },
)

function close() {
  emit('close')
}

function parseAmount(value: string | number): number | null {
  if (value === null || value === undefined) return null
  const trimmed = (typeof value === 'number' ? String(value) : value).trim()
  if (!trimmed) return null
  const numeric = Number(trimmed)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return numeric
}

function toPayload(row: RowBase): Massnahme | null {
  const id = row.id.trim()
  const name = row.massnahme.trim()
  const dienststelle = row.dienststelle.trim()
  const teilhaushalt = row.teilhaushalt.trim()
  const summe_2026 = parseAmount(row.summe_2026) ?? 0
  const summe_2027 = parseAmount(row.summe_2027) ?? 0
  if (!id || !name || !dienststelle || !teilhaushalt) return null
  if (summe_2026 + summe_2027 <= 0) return null
  return {
    id,
    massnahme: name,
    dienststelle,
    teilhaushalt,
    vorlagennummer: 'Eigene Vorlage',
    summe_2026,
    summe_2027,
  }
}

function toExistingPayload(row: ExistingRow): Massnahme | null {
  return toPayload(row)
}

const validPayloads = computed(() =>
  rows.value.map((row) => toPayload(row)).filter((row): row is Massnahme => row !== null),
)

const validCount = computed(() => validPayloads.value.length)
const totalPreview = computed(() =>
  validPayloads.value.reduce((sum, row) => sum + (row.summe_2026 ?? 0) + (row.summe_2027 ?? 0), 0),
)
const hasValidRows = computed(() => validCount.value > 0)
const bulkSaveLabel = computed(() =>
  hasValidRows.value
    ? `${validCount.value} Maßnahme${validCount.value === 1 ? '' : 'n'} hinzufügen`
    : 'Keine gültigen Zeilen',
)

const existingPayloads = computed(() =>
  existingRows.value.map((row) => ({ id: row.id, payload: toExistingPayload(row) })),
)
const existingInvalidIdSet = computed(() => {
  const ids = new Set<string>()
  for (const row of existingPayloads.value) {
    if (!row.payload) ids.add(row.id)
  }
  return ids
})
const existingIsValid = computed(() => existingInvalidIdSet.value.size === 0)

function rowTotal(row: Row): string {
  const total = (parseAmount(row.summe_2026) ?? 0) + (parseAmount(row.summe_2027) ?? 0)
  return total > 0 ? formatEuro(total) : '–'
}

function existingRowTotal(row: ExistingRow): string {
  const total = (parseAmount(row.summe_2026) ?? 0) + (parseAmount(row.summe_2027) ?? 0)
  return total > 0 ? formatEuro(total) : '–'
}

function removeExistingRow(id: string) {
  existingRows.value = existingRows.value.filter((row) => row.id !== id)
  showChangeFeedback('remove', 'Maßnahme entfernt – speichern nicht vergessen.')
}

function handleExistingSave() {
  if (!existingIsValid.value) return
  const payloads = existingRows.value
    .map((row) => toExistingPayload(row))
    .filter((row): row is Massnahme => row !== null)
  budgetStore.updateCustomMassnahmen(payloads)
  syncExistingRows()
  showChangeFeedback('add', 'Änderungen gespeichert.')
}

function isExistingRowSelected(row: ExistingRow): boolean {
  return selectedIdSet.value.has(row.id)
}

function toggleExistingSelection(id: string) {
  if (!id) return
  budgetStore.toggle(id)
}

function handleBulkSave() {
  if (!hasValidRows.value) return
  const payloads = [...validPayloads.value]
  emit('save', payloads)
  showChangeFeedback(
    'add',
    `${payloads.length} neue Maßnahme${payloads.length === 1 ? '' : 'n'} übernommen.`,
  )
  resetRows()
}

function showTransferFeedback(type: 'success' | 'error', message: string) {
  fileTransferFeedback.value = { type, message }
}

function handleExportJson() {
  if (!existingRows.value.length) {
    showTransferFeedback('error', 'Keine gespeicherten Maßnahmen zum Export vorhanden.')
    return
  }
  const selectedSet = budgetStore.selectedIdSet
  const customPayload = existingRows.value.map((row) => ({
    id: row.id.trim(),
    massnahme: row.massnahme.trim(),
    teilhaushalt: row.teilhaushalt.trim(),
    dienststelle: row.dienststelle.trim(),
    vorlagennummer: 'Eigene Vorlage',
    summe_2026: parseAmount(row.summe_2026),
    summe_2027: parseAmount(row.summe_2027),
    selected: selectedSet.has(row.id.trim()),
  }))
  const exportPayload = {
    format: 'ks-custom-measures',
    version: 2,
    exportedAt: new Date().toISOString(),
    customMassnahmen: customPayload,
    selectedIds: [...budgetStore.selectedIds],
  }
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const today = new Date().toISOString().split('T')[0]
  link.href = url
  link.download = `massnahmen-export-${today}.json`
  link.click()
  URL.revokeObjectURL(url)
  showTransferFeedback(
    'success',
    `${customPayload.length} gespeicherte Maßnahme${customPayload.length === 1 ? '' : 'n'} exportiert (Auswahl gespeichert).`,
  )
}

function normalizeString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function normalizeAmountInput(value: unknown): string | number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  if (typeof value === 'string') return value.trim()
  return ''
}

function normalizeId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function normalizeSelectedIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const ids = new Set<string>()
  for (const entry of value) {
    const normalized = normalizeId(entry)
    if (normalized) ids.add(normalized)
  }
  return ids.size ? [...ids] : null
}

function isSelectedFlag(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true'
  return false
}

function toImportedRowBase(entry: Record<string, unknown>): RowBase | null {
  const base: RowBase = {
    id: normalizeString(entry['id'] ?? entry['massnahmen_nummer']),
    massnahme: normalizeString(entry['massnahme']),
    dienststelle: normalizeString(entry['dienststelle']),
    teilhaushalt: normalizeString(entry['teilhaushalt']),
    summe_2026: normalizeAmountInput(entry['summe_2026']),
    summe_2027: normalizeAmountInput(entry['summe_2027']),
  }
  const hasContent =
    base.massnahme ||
    base.dienststelle ||
    base.teilhaushalt ||
    (typeof base.summe_2026 === 'number' && base.summe_2026 > 0) ||
    (typeof base.summe_2026 === 'string' && base.summe_2026) ||
    (typeof base.summe_2027 === 'number' && base.summe_2027 > 0) ||
    (typeof base.summe_2027 === 'string' && base.summe_2027)

  return hasContent ? base : null
}

type NormalizedLegacyImport = {
  kind: 'legacy'
  existing: ExistingRow[]
  fresh: RowBase[]
}

type NormalizedScenarioImport = {
  kind: 'scenario'
  existing: ExistingRow[]
  fresh: RowBase[]
  selectedIds: string[] | null
}

type NormalizedImport = NormalizedLegacyImport | NormalizedScenarioImport

function extractRowsFromArray(entries: unknown[]): {
  existing: ExistingRow[]
  fresh: RowBase[]
  selectedByFlag: string[]
} {
  const existing: ExistingRow[] = []
  const fresh: RowBase[] = []
  const selectedByFlag: string[] = []
  for (const entry of entries) {
    if (!isRecord(entry)) continue
    const rowBase = toImportedRowBase(entry)
    if (!rowBase) continue
    const maybeId = normalizeId(entry['id'] ?? entry['massnahmen_nummer'])
    if (maybeId !== null) {
      existing.push({ ...rowBase, id: maybeId })
      if (isSelectedFlag(entry['selected'])) selectedByFlag.push(maybeId)
    } else {
      fresh.push(rowBase)
    }
  }
  return {
    existing,
    fresh,
    selectedByFlag: Array.from(new Set(selectedByFlag)),
  }
}

function normalizeImportedPayload(payload: unknown): NormalizedImport | null {
  if (Array.isArray(payload)) {
    const rows = extractRowsFromArray(payload)
    return { kind: 'legacy', existing: rows.existing, fresh: rows.fresh }
  }
  if (!isRecord(payload)) return null
  if (Array.isArray(payload['customMassnahmen'])) {
    const rows = extractRowsFromArray(payload['customMassnahmen'])
    const hasFormat =
      typeof payload['format'] === 'string' && payload['format'] === 'ks-custom-measures'
    if (hasFormat) {
      const normalizedSelected = normalizeSelectedIds(payload['selectedIds'])
      const selectedIds =
        normalizedSelected ?? (rows.selectedByFlag.length ? rows.selectedByFlag : null)
      return {
        kind: 'scenario',
        existing: rows.existing,
        fresh: rows.fresh,
        selectedIds,
      }
    }
    return { kind: 'legacy', existing: rows.existing, fresh: rows.fresh }
  }
  return null
}

function triggerImportJson() {
  importInputRef.value?.click()
}

async function handleImportJson(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as unknown
    const normalized = normalizeImportedPayload(parsed)
    if (!normalized) {
      throw new Error('Die Datei enthält keine verwertbaren Maßnahmen.')
    }
    if (normalized.kind === 'legacy') {
      const { existing, fresh } = normalized
      if (!existing.length && !fresh.length) {
        throw new Error('Die Datei enthält keine verwertbaren Maßnahmen.')
      }
      if (existing.length) {
        existingRows.value = existing
      }
      if (fresh.length) {
        rows.value = fresh.map((row) => ({
          key: nextKey.value++,
          ...row,
        }))
      }
      showTransferFeedback(
        'success',
        [
          existing.length
            ? `${existing.length} gespeicherte Maßnahme${existing.length === 1 ? '' : 'n'} geladen`
            : null,
          fresh.length
            ? `${fresh.length} neue Zeile${fresh.length === 1 ? '' : 'n'} bereitgestellt`
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
      )
      return
    }

    const payloads = normalized.existing
      .map((row) => toExistingPayload(row))
      .filter((row): row is Massnahme => row !== null)
    budgetStore.updateCustomMassnahmen(payloads)
    syncExistingRows()

    if (normalized.fresh.length) {
      rows.value = normalized.fresh.map((row) => ({
        key: nextKey.value++,
        ...row,
      }))
    } else {
      resetRows()
    }

    if (normalized.selectedIds !== null) {
      budgetStore.setSelection(normalized.selectedIds)
    }

    const selectionMessage =
      normalized.selectedIds !== null
        ? normalized.selectedIds.length
          ? 'Auswahl wiederhergestellt.'
          : 'Auswahl geleert.'
        : null
    const measuresMessage = payloads.length
      ? `${payloads.length} gespeicherte Maßnahme${payloads.length === 1 ? '' : 'n'} übernommen`
      : 'Keine eigenen Maßnahmen im Import'

    showTransferFeedback('success', [measuresMessage, selectionMessage].filter(Boolean).join(' · '))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import fehlgeschlagen.'
    showTransferFeedback('error', message)
  } finally {
    if (input) input.value = ''
  }
}

onBeforeUnmount(() => {
  clearChangeFeedback()
})
</script>

<template>
  <AppModal
    :open="open"
    aria-label="Mehrere eigene Maßnahmen erfassen"
    align="end"
    panel-class="max-w-6xl rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
    @close="close"
  >
    <form @submit.prevent="handleBulkSave">
      <header
        class="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Eigenes Szenario
          </p>
          <p class="mt-1 text-lg font-semibold text-slate-900">
            Schnelleingabe für eigene Maßnahmen
          </p>
          <p class="text-sm text-slate-500">
            Erfasse mehrere Maßnahmen gleichzeitig – ähnlich wie in einer Tabelle.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
            @click="close"
            aria-label="Modal schließen"
          >
            &times;
          </button>
        </div>
      </header>

      <div class="max-h-[70vh] space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <p>
            Ergänze in jeder Zeile eine eindeutige Maßnahmen-Nummer, Titel, Dienststelle,
            Teilhaushalt und mindestens einen Betrag.
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              @click="triggerImportJson"
            >
              JSON importieren
            </button>
            <button
              type="button"
              class="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              @click="handleExportJson"
            >
              JSON exportieren
            </button>
            <button
              type="button"
              class="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              @click="addRows()"
            >
              +1 Zeile
            </button>
            <button
              type="button"
              class="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              @click="resetRows"
            >
              Tabelle leeren
            </button>
          </div>
          <input
            ref="importInputRef"
            type="file"
            accept="application/json"
            class="sr-only"
            @change="handleImportJson"
          />
          <p
            v-if="fileTransferFeedback"
            class="w-full pt-1 text-xs font-medium"
            :class="fileTransferFeedback.type === 'error' ? 'text-rose-600' : 'text-emerald-600'"
            role="status"
            aria-live="polite"
          >
            {{ fileTransferFeedback.message }}
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-[13px] text-slate-800">
            <thead>
              <tr class="text-[11px] uppercase tracking-wide text-slate-500">
                <th class="w-[14%] px-2 py-2">Maßnahmen-Nr.</th>
                <th class="w-[28%] px-2 py-2">Maßnahme</th>
                <th class="w-[18%] px-2 py-2">Dienststelle</th>
                <th class="w-[16%] px-2 py-2">Teilhaushalt</th>
                <th class="px-2 py-2 text-right">2026</th>
                <th class="px-2 py-2 text-right">2027</th>
                <th class="px-2 py-2 text-right">Summe</th>
                <th class="px-2 py-2 text-center">Aktionen</th>
              </tr>
            </thead>
            <TransitionGroup tag="tbody" name="row-fade">
              <tr v-for="row in rows" :key="row.key" class="border-t border-slate-100 text-sm">
                <td class="w-[14%] px-2 py-2">
                  <input
                    v-model="row.id"
                    type="text"
                    placeholder="z. B. HHS4_X1"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm uppercase tracking-wide text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </td>
                <td class="w-[28%] px-2 py-2">
                  <input
                    v-model="row.massnahme"
                    type="text"
                    placeholder="Titel"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </td>
                <td class="w-[18%] px-2 py-2">
                  <select
                    v-model="row.dienststelle"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  >
                    <option value="">Dienststelle wählen</option>
                    <option v-for="option in dienststellenOptions" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                </td>
                <td class="w-[16%] px-2 py-2">
                  <input
                    v-model="row.teilhaushalt"
                    type="text"
                    placeholder="z. B. 1200"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </td>
                <td class="px-2 py-2">
                  <input
                    v-model="row.summe_2026"
                    type="number"
                    min="0"
                    step="1000"
                    inputmode="decimal"
                    placeholder="0"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-right text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </td>
                <td class="px-2 py-2">
                  <input
                    v-model="row.summe_2027"
                    type="number"
                    min="0"
                    step="1000"
                    inputmode="decimal"
                    placeholder="0"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-right text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                  />
                </td>
                <td class="px-2 py-2 text-right text-sm font-semibold text-slate-700">
                  {{ rowTotal(row) }}
                </td>
                <td class="px-2 py-2 text-center">
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:text-rose-600 focus-visible:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-100"
                    @click="removeRow(row.key)"
                    aria-label="Zeile entfernen"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            </TransitionGroup>
          </table>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div class="text-xs text-slate-500">
            <span class="font-semibold text-slate-700">{{ validCount }}</span>
            gültige Zeile{{ validCount === 1 ? '' : 'n' }} vorbereitet.
          </div>
          <button
            type="submit"
            :disabled="!hasValidRows"
            class="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            :class="[
              hasValidRows
                ? 'bg-emerald-600 hover:bg-emerald-700 focus-visible:bg-emerald-700'
                : 'bg-slate-300 text-slate-600 cursor-not-allowed',
            ]"
          >
            {{ bulkSaveLabel }}
          </button>
        </div>

        <div
          v-if="existingRows.length"
          class="rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Bereits erfasste Maßnahmen
              </p>
              <p class="text-xs text-slate-500">
                Passe bestehende Einträge an, entferne sie oder steuere die Auswahl direkt in dieser
                Ansicht.
              </p>
            </div>
            <span class="text-[11px] font-semibold text-slate-500">
              {{ existingRows.length }} Eintrag(e)
            </span>
          </div>
          <div
            v-if="changeFeedback"
            class="mt-3 flex items-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-semibold"
            :class="[
              changeFeedback.type === 'add'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700',
            ]"
            role="status"
            aria-live="polite"
          >
            <span aria-hidden="true" class="text-base">
              {{ changeFeedback.type === 'add' ? '✓' : '–' }}
            </span>
            <span>{{ changeFeedback.message }}</span>
          </div>
          <div class="mt-3 overflow-x-auto">
            <table class="min-w-full text-left text-[13px] text-slate-800">
              <thead>
                <tr class="text-[11px] uppercase tracking-wide text-slate-500">
                  <th class="w-[6%] px-2 py-2 text-center">Auswahl</th>
                  <th class="w-[16%] px-2 py-2">Maßnahmen-Nr.</th>
                  <th class="w-[28%] px-2 py-2">Maßnahme</th>
                  <th class="w-[18%] px-2 py-2">Dienststelle</th>
                  <th class="w-[16%] px-2 py-2">Teilhaushalt</th>
                  <th class="px-2 py-2 text-right">2026</th>
                  <th class="px-2 py-2 text-right">2027</th>
                  <th class="px-2 py-2 text-right">Summe</th>
                  <th class="px-2 py-2 text-center">Aktionen</th>
                </tr>
              </thead>
              <TransitionGroup tag="tbody" name="row-fade">
                <tr
                  v-for="row in existingRows"
                  :key="row.id"
                  class="border-t border-slate-200 text-sm transition"
                  :class="existingInvalidIdSet.has(row.id) ? 'bg-rose-50/70' : 'bg-white/70'"
                >
                  <td class="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      :checked="isExistingRowSelected(row)"
                      @change="toggleExistingSelection(row.id)"
                      class="h-5 w-5 cursor-pointer rounded-xl border border-slate-400 text-indigo-600 shadow-sm focus-visible:border-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      :aria-label="`Maßnahme ${row.massnahme || row.id} auswählen`"
                    />
                  </td>
                  <td class="w-[16%] px-2 py-2">
                    <input
                      v-model="row.id"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm uppercase tracking-wide text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    />
                  </td>
                  <td class="w-[28%] px-2 py-2">
                    <input
                      v-model="row.massnahme"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    />
                  </td>
                  <td class="w-[18%] px-2 py-2">
                    <select
                      v-model="row.dienststelle"
                      class="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    >
                      <option value="">Dienststelle wählen</option>
                      <option v-for="option in dienststellenOptions" :key="option" :value="option">
                        {{ option }}
                      </option>
                    </select>
                  </td>
                  <td class="w-[16%] px-2 py-2">
                    <input
                      v-model="row.teilhaushalt"
                      type="text"
                      class="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model="row.summe_2026"
                      type="number"
                      min="0"
                      step="1000"
                      inputmode="decimal"
                      class="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    />
                  </td>
                  <td class="px-2 py-2">
                    <input
                      v-model="row.summe_2027"
                      type="number"
                      min="0"
                      step="1000"
                      inputmode="decimal"
                      class="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100"
                    />
                  </td>
                  <td class="px-2 py-2 text-right text-sm font-semibold text-slate-700">
                    {{ existingRowTotal(row) }}
                  </td>
                  <td class="px-2 py-2 text-center">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:text-rose-600"
                      @click="removeExistingRow(row.id)"
                      aria-label="Gespeicherte Maßnahme entfernen"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              </TransitionGroup>
            </table>
          </div>
          <p v-if="existingInvalidIdSet.size" class="mt-3 text-xs font-medium text-rose-600">
            Ungültige Zeilen sind markiert – fülle Nummer, Titel, Dienststelle, Teilhaushalt und
            mindestens einen Betrag aus.
          </p>
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-900 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              @click="syncExistingRows"
            >
              Änderungen verwerfen
            </button>
            <button
              type="button"
              :disabled="!existingRows.length || !existingIsValid"
              class="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
              :class="[
                existingRows.length && existingIsValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 focus-visible:bg-emerald-700'
                  : 'bg-slate-300 text-slate-600 cursor-not-allowed',
              ]"
              @click="handleExistingSave"
            >
              Gespeicherte Maßnahmen aktualisieren
            </button>
          </div>
        </div>
      </div>
    </form>
  </AppModal>
</template>

<style scoped>
.row-fade-enter-active,
.row-fade-leave-active {
  transition: all 0.2s ease;
}

.row-fade-enter-from,
.row-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.row-fade-leave-active {
  position: relative;
}

.row-fade-move {
  transition: transform 0.2s ease;
}
</style>
