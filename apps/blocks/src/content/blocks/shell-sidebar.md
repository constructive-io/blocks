# shell-sidebar

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `shell-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#shell-sidebar`

**Pairing:** No page block — layout primitive. Used as: the left-rail slot in any consumer app shell layout. Composes [[user-context-switcher]] and [[shell-account-menu]] as inner blocks.

## Purpose

Collapsible application sidebar providing the primary navigation rail. Contains: [[user-context-switcher]] at the top (context switching), consumer-defined nav items in the middle, and [[shell-account-menu]] at the bottom (sign-out + settings). Collapses to icon-only mode with a keyboard shortcut and persists the collapsed state to `localStorage`.

## When to use

- As the navigation primitive in the consumer's app shell layout.
- Paired with [[shell-header]] for a classic sidebar + top-bar shell.
- Not a fit when: the app uses a bottom-tab nav (mobile-first) or a horizontal top nav only.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/shell/shell-sidebar.tsx` | `registry:component` |
| `lib/shell/messages/shell-sidebar-messages.ts` | `registry:lib` |

## Registry dependencies

- `[[user-context-switcher]]` (user-* block)
- `[[shell-account-menu]]` (shell-* block)
- `tooltip` (shadcn primitive — nav item labels in icon-only mode)
- `separator` (shadcn primitive)
- `button` (shadcn primitive — collapse toggle)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner` (peer — transitively via child blocks)

## DB procedures used by default hook

None directly. Delegates to [[user-context-switcher]] and [[shell-account-menu]] for all data fetching.

## Props

```ts
export type ShellSidebarNavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  /** Client-side hide only. Server RLS is the actual security gate. */
  requiredPermission?: string;
  badge?: string | number;
  /** Nested sub-items (renders as collapsible group). */
  children?: ShellSidebarNavItem[];
};

export type ShellSidebarProps = {
  /** Nav items for the middle section. Required. */
  navItems: ShellSidebarNavItem[];
  /** Start in collapsed (icon-only) mode. Default: false */
  defaultCollapsed?: boolean;
  /** Persist collapsed state to localStorage. Default: true */
  persistCollapsed?: boolean;
  /** localStorage key for collapsed state. Default: 'cnc_sidebar_collapsed' */
  persistKey?: string;
  /** Keyboard shortcut to toggle collapsed. Default: 'mod+b' */
  collapseShortcut?: string;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<ShellSidebarMessages>;
  /** Forwarded to [[user-context-switcher]] */
  onContextSwitch?: (user: User) => void;
  /** Forwarded to [[user-context-switcher]] */
  onCreateOrgClick?: () => void;
  onError?: (err: unknown) => void;
};

/** Minimal User type — same as user-context-switcher's User. */
export type User = {
  id: string;
  type: 'person' | 'organization';
  displayName: string;
  username: string | null;
  profilePicture: string | null;
};
```

## Messages catalog

```ts
export type ShellSidebarMessages = {
  /** Accessible label for the sidebar nav */
  navAriaLabel: string;
  /** Collapse toggle button tooltip */
  collapseTooltip: string;
  /** Expand toggle button tooltip */
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
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default hook contract

No hook in this block. Data fetching is delegated to child blocks.

## Step-up

Not applicable.

## Captcha

Not applicable.

## Notifications (default toasts)

Forwarded from child blocks ([[user-context-switcher]], [[shell-account-menu]]).

## Accessibility

- `<nav aria-label={messages.navAriaLabel}>` wrapping the nav item list.
- Nav items use `<a>` elements with correct `href`. Active item gets `aria-current="page"`.
- Collapsed state: nav item labels hidden visually but present in `aria-label` on icon buttons.
- Collapse toggle button has `aria-expanded` reflecting current state.
- Keyboard shortcut `Mod+B` is announced via a visually hidden `<kbd>` hint in the expanded tooltip.
- Mobile drawer: when sidebar becomes a drawer, add `role="dialog"` and focus trap.

## Notes / gotchas

- **Mobile behavior**: on viewports < `lg` (Tailwind), the sidebar should render as a fixed-position drawer triggered by [[shell-header]]'s hamburger button. The `open` / `onOpenChange` props from the parent manage this.
- **Collapsed persistence**: reads `localStorage` key on mount. SSR-safe: detect collapsed state in `useEffect` to avoid hydration mismatch.
- **`requiredPermission`**: client-side hide only. The server RLS is the actual security gate. Do not rely on this for access control.
- **Active detection**: use `usePathname()` (Next.js App Router) to mark the active item. Consumers on other routers pass `isActive` manually (future prop addition if needed).
- Cross-ref: [[shell-header]] — triggers mobile sidebar open. [[user-context-switcher]] — top slot. [[shell-account-menu]] — bottom slot.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/shell/sidebar/`
- Collapse behavior: the width switches directly between the 64px icon rail and the 240px expanded sidebar, avoiding layout animation.
- Nav item with children: renders an `<Accordion>` (or CSS-only expand on hover when collapsed).
- Storybook stories: expanded, collapsed, with badge, with sub-items, mobile drawer open, loading context (skeleton context switcher).
