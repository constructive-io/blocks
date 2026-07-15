# shell-header

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `shell-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#shell-header`

**Pairing:** No page block — layout primitive. Used as: the top-bar slot in any consumer app shell layout. Composes [[shell-breadcrumbs]] and triggers [[shell-command-palette]] and [[shell-account-menu]].

## Purpose

Top application bar providing: a logo/wordmark slot, [[shell-breadcrumbs]], optional search input, [[shell-command-palette]] trigger (Cmd+K), [[shell-account-menu]] (or [[user-context-switcher]] in compact mode), and a sidebar hamburger toggle for mobile. The header holds no data-fetching responsibility — all data is delegated to child blocks.

## When to use

- As the top-bar primitive in the consumer's app shell layout.
- Paired with [[shell-sidebar]] for the classic sidebar + top-bar shell.
- Not a fit when: the app uses a mobile-only bottom-tab nav without a persistent header.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/shell/shell-header.tsx` | `registry:component` |
| `lib/shell/messages/shell-header-messages.ts` | `registry:lib` |

## Registry dependencies

- `[[shell-breadcrumbs]]` (shell-* block)
- `[[shell-command-palette]]` (shell-* block — trigger only; palette renders via portal)
- `[[shell-account-menu]]` (shell-* block)
- `button` (shadcn primitive — sidebar toggle)
- `input` (shadcn primitive — search, if `showSearch=true`)
- `separator` (shadcn primitive)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)

## DB procedures used by default hook

None directly. Delegates to child blocks.

## Props

```ts
export type ShellHeaderProps = {
  /** Logo / wordmark slot — renders left of breadcrumbs. */
  logo?: React.ReactNode;
  /** Show breadcrumbs section. Default: true */
  showBreadcrumbs?: boolean;
  /** Show search input. Default: false */
  showSearch?: boolean;
  /** Placeholder text for search input (if showSearch=true). */
  searchPlaceholder?: string;
  /** Fired when user types in search input. */
  onSearchChange?: (value: string) => void;
  /** Show command palette trigger button (Cmd+K). Default: true */
  showCommandPalette?: boolean;
  /** Show sidebar hamburger toggle. Default: true */
  showSidebarToggle?: boolean;
  /** Sidebar is currently open (for mobile drawer state). Default: false */
  sidebarOpen?: boolean;
  /** Called when hamburger is clicked — parent manages sidebar open state. */
  onSidebarToggle?: () => void;
  /** Props forwarded to [[shell-breadcrumbs]]. */
  breadcrumbsProps?: Partial<ShellBreadcrumbsProps>;
  /** Props forwarded to [[shell-account-menu]]. */
  accountMenuProps?: Partial<ShellAccountMenuProps>;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<ShellHeaderMessages>;
  onError?: (err: unknown) => void;
};
```

## Messages catalog

```ts
export type ShellHeaderMessages = {
  /** Aria label for the header landmark */
  headerAriaLabel: string;
  /** Aria label for sidebar toggle button */
  sidebarToggleAriaLabel: string;
  /** Aria label for command palette trigger */
  commandPaletteAriaLabel: string;
  /** Keyboard shortcut hint shown on command palette trigger */
  commandPaletteShortcut: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export const defaultShellHeaderMessages: ShellHeaderMessages = {
  headerAriaLabel: 'Application header',
  sidebarToggleAriaLabel: 'Toggle sidebar',
  commandPaletteAriaLabel: 'Open command palette',
  commandPaletteShortcut: '⌘K',
  errors: {
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default hook contract

No hook in this block.

## Step-up

Not applicable.

## Captcha

Not applicable.

## Notifications (default toasts)

Forwarded from child blocks.

## Accessibility

- `<header role="banner" aria-label={messages.headerAriaLabel}>` wrapping the entire bar.
- Sidebar toggle: `aria-controls` pointing to the sidebar element `id`, `aria-expanded` reflecting `sidebarOpen`.
- Command palette trigger: `aria-keyshortcuts="Meta+k"`.
- Search input: `role="search"` on the containing `<form>` element.

## Notes / gotchas

- **Logo slot**: accepts any `React.ReactNode`. For consistency, render an `<img>` with `alt="[App name]"` or an SVG with a `<title>` element.
- **Mobile layout**: hamburger toggle only visible on `< lg` breakpoint. On desktop, toggle is hidden (sidebar is persistent).
- **Command palette trigger**: clicking the button OR pressing Cmd+K opens the palette. The trigger itself doesn't manage palette state — it fires a custom event or calls a ref-exposed `open()` method on [[shell-command-palette]].
- Cross-ref: [[shell-sidebar]] — `sidebarOpen` + `onSidebarToggle` form the open/close bridge. [[shell-breadcrumbs]] — composed inside. [[shell-account-menu]] — top-right slot.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/shell/header/`
- Height: 56px (Tailwind `h-14`). Sticky positioned (`position: sticky; top: 0; z-index: 40`).
- Storybook stories: with logo, without logo, with breadcrumbs, with search, mobile (sidebar toggle visible), account menu slot.
