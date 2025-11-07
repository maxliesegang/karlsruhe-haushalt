export function formatEuro(n = 0): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export function formatPercent(value = 0): string {
  if (!Number.isFinite(value) || value <= 0) return '0 %'
  const normalized = Math.max(0, value)
  const decimals = normalized >= 10 ? 0 : 1
  return `${normalized.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`
}
