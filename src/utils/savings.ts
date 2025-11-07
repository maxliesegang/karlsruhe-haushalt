import type { Massnahme } from '@/types/massnahme'

export type SavingsMode = '2026' | '2027' | 'both'

function cleanAmount(amount?: number | null): number | null {
  return typeof amount === 'number' && !Number.isNaN(amount) ? amount : null
}

function normalizeAmount(amount?: number | null): number {
  return cleanAmount(amount) ?? 0
}

function amountForYear(m: Massnahme, year: Exclude<SavingsMode, 'both'>): number {
  return year === '2026' ? normalizeAmount(m.summe_2026) : normalizeAmount(m.summe_2027)
}

export function savingsForMode(m: Massnahme, mode: SavingsMode): number {
  return mode === 'both'
    ? amountForYear(m, '2026') + amountForYear(m, '2027')
    : amountForYear(m, mode)
}

export function totalSavings(m: Massnahme): number {
  return savingsForMode(m, 'both')
}
