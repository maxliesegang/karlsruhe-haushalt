export type TeilhaushaltConfig = {
  code: string
  label?: string
  /**
   * Annual budget in EUR. Leave null to hide the entry from budget-aware charts.
   */
  budget?: number | null
}

export type DezernatConfig = {
  id: string
  label: string
  teilhaushalte: TeilhaushaltConfig[]
}

export const dezernate: DezernatConfig[] = [
  {
    id: 'dez1',
    label: 'Dezernat 1',
    teilhaushalte: [
      { code: '1000', label: 'Hauptverwaltung', budget: 20_538_400 },
      { code: '1300', label: 'Presse und Information', budget: 2_561_392 },
      { code: '1400', label: 'Rechnungspruefung', budget: 3_285_340 },
      { code: '1500', label: 'OV und Stadtamt Durlach', budget: 6_484_287 },
      { code: '1501', label: 'Stadtamt Durlach', budget: 1_707_831 },
      { code: '1502', label: 'OV Stupferich', budget: 478_274 },
      { code: '1503', label: 'OV Hohenwettersbach', budget: 236_804 },
      { code: '1504', label: 'OV Wolfartsweier', budget: 282_133 },
      { code: '1505', label: 'OV Groetzingen', budget: 1_086_390 },
      { code: '1506', label: 'OV Wettersbach', budget: 1_081_271 },
      { code: '1507', label: 'OV Neureut', budget: 1_611_584 },
      { code: '3000', label: 'Zentraler Juristischer Dienst', budget: 6_111_801 },
    ],
  },
  {
    id: 'dez2',
    label: 'Dezernat 2',
    teilhaushalte: [
      { code: '1100', label: 'Personal und Organisation', budget: 20_974_903 },
      { code: '1200', label: 'Stadtentwicklung', budget: 4_459_008 },
      { code: '1700', label: 'Informationstechnik und Digitalisierung', budget: 15_539_198 },
      { code: '3200', label: 'Ordnungs- und Buergerwesen', budget: 39_344_691 },
      { code: '4100', label: 'Kultur', budget: 58_411_145 },
    ],
  },
  {
    id: 'dez3',
    label: 'Dezernat 3',
    teilhaushalte: [
      { code: '4000', label: 'Schulen und Sport', budget: 65_897_816 },
      { code: '4300', label: 'Musikschulen', budget: 5_583_559 },
      { code: '5000', label: 'Jugend und Soziales (inkl. StaJA)', budget: 676_575_262 },
      { code: '5200', label: 'Baeder', budget: 13_507_207 },
    ],
  },
  {
    id: 'dez4',
    label: 'Dezernat 4',
    teilhaushalte: [
      { code: '2000', label: 'Finanzen', budget: 219_945_453 },
      { code: '7200', label: 'Maerkte', budget: 2_475_181 },
      { code: '8000', label: 'Wirtschaftsfoerderung', budget: 6_488_060 },
    ],
  },
  {
    id: 'dez5',
    label: 'Dezernat 5',
    teilhaushalte: [
      { code: '3100', label: 'Umwelt- und Arbeitsschutz', budget: 22_927_490 },
      { code: '3700', label: 'Feuerwehr', budget: 27_672_951 },
      { code: '6700', label: 'Gartenbau', budget: 29_334_906 },
      { code: '6900', label: 'Friedhof und Bestattung', budget: 11_100_922 },
      { code: '8200', label: 'Forsten', budget: 3_321_721 },
    ],
  },
  {
    id: 'dez6',
    label: 'Dezernat 6',
    teilhaushalte: [
      { code: '6100', label: 'Stadtplanung', budget: 8_896_254 },
      { code: '6200', label: 'Liegenschaften', budget: 16_876_116 },
      { code: '6300', label: 'Bauordnung', budget: 5_165_058 },
      { code: '6600', label: 'Tiefbau', budget: 38_313_665 },
      { code: '6800', label: 'Zoo', budget: 9_354_218 },
      { code: '7400', label: 'Abwasserbeseitigung', budget: 31_378_508 },
      { code: '8800', label: 'Hochbau und Gebaeudewirtschaft', budget: 111_033_604 },
    ],
  },
]

export function normalizeTeilhaushaltId(value?: string | number | null): string | null {
  if (value === null || value === undefined) return null
  const raw = typeof value === 'number' ? String(value) : value.trim()
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  const target = digits.length ? digits : raw
  if (!/^\d+$/.test(target)) return target
  if (target.length >= 4) {
    return target
  }
  return target.padEnd(4, '0')
}

export function getDezernatForTeilhaushalt(
  teilhaushalt?: string | number | null,
): DezernatConfig | null {
  const normalized = normalizeTeilhaushaltId(teilhaushalt)
  if (!normalized) return null
  return teilhaushaltToDezernat.get(normalized) ?? null
}

export function getTeilhaushaltConfig(
  teilhaushalt?: string | number | null,
): TeilhaushaltConfig | null {
  const normalized = normalizeTeilhaushaltId(teilhaushalt)
  if (!normalized) return null
  return teilhaushaltConfigMap.get(normalized) ?? null
}

const teilhaushaltToDezernat = new Map<string, DezernatConfig>()
const teilhaushaltConfigMap = new Map<string, TeilhaushaltConfig>()

for (const dezernat of dezernate) {
  for (const config of dezernat.teilhaushalte) {
    const normalized = normalizeTeilhaushaltId(config.code)
    if (!normalized) continue
    teilhaushaltToDezernat.set(normalized, dezernat)
    teilhaushaltConfigMap.set(normalized, config)
  }
}
