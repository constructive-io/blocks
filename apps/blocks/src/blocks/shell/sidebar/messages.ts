/**
 * shell-sidebar — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4): top-level camelCase
 * keys are UI copy; the nested `errors` map is keyed UPPER_SNAKE_CASE.
 *
 * Pure layout block — no SDK binding, no data ops. Errors only arise from
 * the collapse/expand mechanism or forwarded child-block failures.
 */

export type ShellSidebarMessages = {
  /** Accessible label for the <nav> wrapping the nav item list. */
  navAriaLabel: string;
  /** Tooltip on the collapse toggle button (sidebar is currently expanded). */
  collapseTooltip: string;
  /** Tooltip on the expand toggle button (sidebar is currently collapsed). */
  expandTooltip: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultShellSidebarMessages: ShellSidebarMessages = {
  navAriaLabel: 'Main navigation',
  collapseTooltip: 'Collapse sidebar',
  expandTooltip: 'Expand sidebar',
  errors: {
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
