export interface Massnahme {
  id: string
  vorlagennummer: string
  teilhaushalt: string
  dienststelle: string
  massnahme: string
  summe_2026?: number | null
  summe_2027?: number | null
}
