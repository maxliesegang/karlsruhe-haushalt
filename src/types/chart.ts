/**
 * Chart and distribution visualization types
 */

/**
 * A single item/bar in a chart display
 */
export interface ChartItem {
  /** Unique key for the item */
  key: string

  /** Display label for the item */
  label: string

  /** Monetary amount in EUR */
  amount: number

  /** Percentage of the total (0-100) */
  percentOfTotal: number

  /** Relative size for bar display (0-1) */
  barShare: number

  /** Optional additional note or context */
  note?: string
}

/**
 * A grouped section of chart items with metadata
 */
export interface ChartSection {
  /** Unique section identifier */
  id: string

  /** Section title */
  title: string

  /** Section subtitle/description */
  subtitle: string

  /** Chart items in this section */
  items: ChartItem[]

  /** Message to display when section has no data */
  emptyLabel: string
}

/**
 * Tab configuration for distribution modal
 */
export interface DistributionTab {
  /** Unique tab identifier */
  id: string

  /** Tab label */
  label: string

  /** Tab description */
  description: string
}
