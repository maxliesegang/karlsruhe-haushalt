export type FilterState = {
  q: string
  dienststelle: string | null
  minAmount: number | null
  maxAmount: number | null
}

export function createDefaultFilter(): FilterState {
  return { q: '', dienststelle: null, minAmount: null, maxAmount: null }
}
