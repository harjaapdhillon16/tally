/**
 * Analytics event constants for tracking user interactions
 * These should be used consistently across the application
 */

export const ANALYTICS_EVENTS = {
  TRANSACTIONS_FILTER_CHANGED: 'TRANSACTIONS_FILTER_CHANGED',
  TRANSACTION_CATEGORY_CORRECTED: 'TRANSACTION_CATEGORY_CORRECTED',
  TRANSACTION_CATEGORY_LOW_CONF_WARNING_SHOWN: 'TRANSACTION_CATEGORY_LOW_CONF_WARNING_SHOWN',
  TRANSACTIONS_DELETED: 'TRANSACTIONS_DELETED',
  PL_PAGE_VIEWED: 'PL_PAGE_VIEWED',
  PL_CATEGORY_EXPANDED: 'PL_CATEGORY_EXPANDED',
  PL_TRANSACTIONS_LOADED: 'PL_TRANSACTIONS_LOADED',
  PL_MONTH_CHANGED: 'PL_MONTH_CHANGED',
} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

/**
 * Properties for transactions filter changed event
 */
export interface TransactionsFilterChangedProps {
  filter_keys: string[];
  low_conf_only: boolean;
  results_count: number;
  org_id: string;
  user_id: string;
}

/**
 * Properties for transaction category corrected event
 */
export interface TransactionCategoryCorrectedProps {
  old_category_id: string | null;
  new_category_id: string | null;
  confidence: number | null;
  tx_amount_cents: number;
  org_id: string;
  user_id: string;
  transaction_id: string;
}

/**
 * Properties for low confidence warning shown event
 */
export interface TransactionLowConfWarningShownProps {
  transaction_id: string;
  confidence: number;
  category_id: string | null;
  org_id: string;
  user_id: string;
}

/**
 * Properties for transactions deleted event
 */
export interface TransactionsDeletedProps {
  org_id: string;
  user_id: string;
  transaction_count: number;
  deleted_count: number;
  error_count: number;
}

/**
 * Properties for P&L page viewed event
 */
export interface PLPageViewedProps {
  org_id: string;
  user_id: string;
  month: string;
}

/**
 * Properties for P&L category expanded event
 */
export interface PLCategoryExpandedProps {
  org_id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  tier: 1 | 2;
}

/**
 * Properties for P&L transactions loaded event
 */
export interface PLTransactionsLoadedProps {
  org_id: string;
  user_id: string;
  category_id: string;
  offset: number;
  limit: number;
}

/**
 * Properties for P&L month changed event
 */
export interface PLMonthChangedProps {
  org_id: string;
  user_id: string;
  old_month: string;
  new_month: string;
}