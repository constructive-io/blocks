/**
 * shell-command-palette — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend
 * error CODE (UPPER_SNAKE_CASE).
 */

export type ShellCommandPaletteMessages = {
  searchPlaceholder: string;
  noResultsMessage: string;
  /** Built-in command group labels */
  navigationGroupLabel: string;
  accountGroupLabel: string;
  contextGroupLabel: string;
  /** Built-in command labels */
  goToSettingsCommand: string;
  signOutCommand: string;
  switchToContextCommand: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultShellCommandPaletteMessages: ShellCommandPaletteMessages = {
  searchPlaceholder: 'Search commands…',
  noResultsMessage: 'No results found.',
  navigationGroupLabel: 'Navigation',
  accountGroupLabel: 'Account',
  contextGroupLabel: 'Switch context',
  goToSettingsCommand: 'Go to account settings',
  signOutCommand: 'Sign out',
  switchToContextCommand: 'Switch to {{name}}',
  errors: {
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
