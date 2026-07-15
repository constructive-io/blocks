/**
 * shell-header — message catalog
 *
 * PURE LAYOUT block: no data fetching, no error codes surfaced by this block
 * itself. The `errors.UNKNOWN_ERROR` entry is kept per the spec in case a
 * host needs to signal an error through `onError`; it is never thrown here.
 */

export type ShellHeaderMessages = {
  /** Aria label for the <header> landmark */
  headerAriaLabel: string;
  /** Aria label for the sidebar hamburger toggle button */
  sidebarToggleAriaLabel: string;
  /** Aria label for the command palette trigger button */
  commandPaletteAriaLabel: string;
  /** Keyboard shortcut hint shown inside the command palette trigger */
  commandPaletteShortcut: string;
  /** Placeholder for the search input (used when showSearch=true) */
  searchPlaceholder: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultShellHeaderMessages: ShellHeaderMessages = {
  headerAriaLabel: 'Application header',
  sidebarToggleAriaLabel: 'Toggle sidebar',
  commandPaletteAriaLabel: 'Open command palette',
  commandPaletteShortcut: '⌘K',
  searchPlaceholder: 'Search…',
  errors: {
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
