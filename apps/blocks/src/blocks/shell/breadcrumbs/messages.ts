/**
 * shell-breadcrumbs — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4): top-level
 * camelCase keys are UI copy / accessible labels. The nested `errors` map
 * is keyed by UPPER_SNAKE_CASE codes and passed to `parseGraphQLError` as
 * `customMessages` when an async resolveLabel call throws.
 *
 * This block is a presentational layout primitive — it has no data hook and
 * therefore no mutation errors. The `errors` entry is a catch-all for
 * unexpected throws from the consumer-supplied `resolveLabel` async function.
 */

export type ShellBreadcrumbsMessages = {
  /** Accessible label for the home icon breadcrumb link. */
  homeAriaLabel: string;
  /** Accessible label for the collapsed-segments ellipsis button. */
  ellipsisAriaLabel: string;
  /** Accessible label for the `<nav>` landmark element. */
  navAriaLabel: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultShellBreadcrumbsMessages: ShellBreadcrumbsMessages = {
  homeAriaLabel: 'Home',
  ellipsisAriaLabel: 'Show more breadcrumbs',
  navAriaLabel: 'Breadcrumb',
  errors: {
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
