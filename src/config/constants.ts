/**
 * Application-wide constants and configuration values
 */

/**
 * Budget and savings goals
 */
export const BUDGET_CONFIG = {
  /** Target savings goal per year in EUR */
  GOAL_PER_YEAR: 80_000_000,

  /** Teilhaushalt codes excluded from certain budget calculations */
  EXCLUDED_TEILHAUSHALT_CODES: ['2000', '5000'] as const,
} as const

/**
 * Storage and persistence
 */
export const STORAGE_CONFIG = {
  /** LocalStorage key for persisting user selections and custom measures */
  STORAGE_KEY: 'ks_sparpaket_v1',
} as const

/**
 * Distribution and chart calculations
 */
export const DISTRIBUTION_CONFIG = {
  /** Internal key for unassigned/unknown Teilhaushalte */
  UNKNOWN_TEILHAUSHALT_KEY: '__unknown__',

  /** Pattern to identify Teilhaushalt codes (numeric only) */
  TEILHAUSHALT_CODE_PATTERN: /^\d+$/,

  /** Default note for missing budget information */
  BUDGET_MISSING_NOTE: 'Budget noch nicht hinterlegt',
} as const

/**
 * UI and display settings
 */
export const UI_CONFIG = {
  /** Year mode labels for display */
  YEAR_MODE_LABELS: {
    '2026': 'Jahr 2026',
    '2027': 'Jahr 2027',
    both: 'Summe 2026 + 2027',
  },
} as const
