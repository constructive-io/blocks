# shell-breadcrumbs

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `shell-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#shell-breadcrumbs`

**Pairing:** No page block — layout primitive. Used as: composed inside [[shell-header]].

## Purpose

Route-based breadcrumb trail that reads the Next.js `pathname` and maps path segments to human-readable labels via a consumer-provided `resolveLabel` function. Integrates with the active org context (reads `display_name` from [[user-context-switcher]]'s context provider) so org-scoped routes show the org name rather than a raw UUID. Renders as a `<nav>` with `<ol>` for structured navigation and screen reader support.

## When to use

- Inside [[shell-header]] for route-context orientation.
- On any route where the pathname is meaningful and the user needs to know where they are.
- Not a fit when: the app uses a fixed, non-route-based navigation structure where breadcrumbs add no context.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/shell/shell-breadcrumbs.tsx` | `registry:component` |
| `lib/shell/messages/shell-breadcrumbs-messages.ts` | `registry:lib` |

## Registry dependencies

- `breadcrumb` (shadcn primitive — `<Breadcrumb>`, `<BreadcrumbItem>`, `<BreadcrumbLink>`, `<BreadcrumbPage>`, `<BreadcrumbSeparator>`, `<BreadcrumbEllipsis>`)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `next` (peer, ^15) — uses `usePathname` from `next/navigation`

## DB procedures used by default hook

None. Label resolution is consumer-provided via the `resolveLabel` prop. The block may read from the [[user-context-switcher]] React context (if available) to resolve org IDs to org display names without an additional DB call.

## Props

```ts
export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export type ShellBreadcrumbsProps = {
  /**
   * Override automatic pathname parsing with explicit segments.
   * If omitted, block parses `usePathname()` and applies `resolveLabel`.
   */
  segments?: BreadcrumbSegment[];
  /**
   * Consumer-provided label resolver for dynamic path segments.
   * Called with each path segment string and the full pathname.
   * Return null to use the raw segment as-is.
   * May return a Promise for async resolution (e.g., entity name fetch).
   */
  resolveLabel?: (segment: string, fullPath: string) => string | null | Promise<string | null>;
  /** Max segments to show before collapsing with ellipsis. Default: 4 */
  maxVisible?: number;
  /** Show home icon as the first crumb. Default: true */
  showHome?: boolean;
  /** Home crumb href. Default: '/' */
  homeHref?: string;
  messages?: Partial<ShellBreadcrumbsMessages>;
  onError?: (err: unknown) => void;
};
```

## Messages catalog

```ts
export type ShellBreadcrumbsMessages = {
  /** Home icon accessible label */
  homeAriaLabel: string;
  /** Collapsed segments toggle aria label */
  ellipsisAriaLabel: string;
  /** Nav landmark aria label */
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
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default hook contract

No data hook. Parsing is synchronous. Async `resolveLabel` calls are managed internally with `useState` + `useEffect`.

## Step-up

Not applicable.

## Captcha

Not applicable.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Renders `<nav aria-label={messages.navAriaLabel}>` containing `<ol>`.
- Last crumb uses `<BreadcrumbPage>` with `aria-current="page"` — NOT a link.
- Collapsed ellipsis: renders `<BreadcrumbEllipsis aria-label={messages.ellipsisAriaLabel}>`. On click or focus+Enter, expands inline.
- Home icon: rendered as `<BreadcrumbLink href={homeHref} aria-label={messages.homeAriaLabel}>` with an `<svg>` home icon.
- All intermediate crumbs are `<BreadcrumbLink>` anchor elements.

## Notes / gotchas

- **Async `resolveLabel`**: segments are rendered synchronously first (with raw segment text as placeholder), then updated when the resolved label returns. This prevents layout shift on fast connections and shows something immediately on slow ones.
- **Org ID resolution**: the block checks the [[user-context-switcher]] React context first (zero extra DB calls if the org is already loaded). If not in context, falls back to `resolveLabel` (caller's responsibility to fetch).
- **Next.js App Router**: uses `usePathname()` from `next/navigation`. For Pages Router consumers, pass `segments` manually (the `usePathname` import is tree-shaken if `segments` is provided).
- **`maxVisible` collapsing**: when the path has more segments than `maxVisible`, intermediate segments are replaced with an ellipsis button. The first and last segments are always shown.
- Cross-ref: [[shell-header]] — hosts this component. [[user-context-switcher]] — provides org display name via context, avoiding an extra DB call for org-scoped routes.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/shell/breadcrumbs/`
- Segment auto-parsing: split `pathname` on `/`, filter empty strings, map via `resolveLabel`. Capitalize first letter of raw segments as fallback (e.g., `settings` → `Settings`).
- Storybook stories: 2-segment path, 5-segment path (with ellipsis), with home icon, with async resolveLabel, explicit segments override, Pages Router (segments prop).
