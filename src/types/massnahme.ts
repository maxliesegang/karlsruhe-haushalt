export interface Massnahme {
  id: number
  vorlagennummer: string
  teilhaushalt: string
  dienststelle: string
  massnahme: string
  summe_2026?: number | null
  summe_2027?: number | null
}
