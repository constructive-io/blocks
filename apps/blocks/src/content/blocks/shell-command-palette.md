# shell-command-palette

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespace:** `shell-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#shell-command-palette`

**Pairing:** No page block — overlay primitive. Used as: a portal-rendered overlay inside [[shell-header]] (trigger) and opened via Cmd+K keyboard shortcut.

## Purpose

Auth-aware command palette (Cmd+K) wrapping the shadcn `command` primitive. Provides a search-filtered list of commands: built-in navigation and system commands (context switch, go to settings, sign out) plus consumer-registered domain commands. Only shows commands the current user has access to (client-side permission filter — security enforced by server RLS). Opened via [[shell-header]]'s command palette trigger or via the `Mod+K` global shortcut.

## When to use

- As the global power-user navigation primitive in the consumer's app shell.
- Configured via `<ShellCommandPaletteProvider commands={[...]}>{children}</ShellCommandPaletteProvider>` to allow deeply-nested components to register commands without prop drilling.
- Not a fit when: the app doesn't need a command palette (the palette is progressive enhancement, not required for basic nav).

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/shell/shell-command-palette.tsx` | `registry:component` |
| `components/shell/shell-command-palette-provider.tsx` | `registry:component` |
| `components/shell/shell-command-palette.requires.json` | `registry:file` |
| `lib/shell/hooks/use-command-palette.ts` | `registry:lib` |
| `lib/shell/messages/shell-command-palette-messages.ts` | `registry:lib` |

> No generated data hook is shipped. The block-owned `use-command-palette.ts` utility hook internally imports `useCurrentUserQuery` from the host's generated `auth` SDK (`@/generated/auth`). Context-switch built-in commands are powered by `[[user-context-switcher]]`'s own hooks. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block — supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `command` (shadcn primitive — CMDK-based `<Command>`, `<CommandInput>`, `<CommandList>`, etc.)
- `dialog` (shadcn primitive — modal wrapper for the palette)
- `[[user-context-switcher]]` (user-* block — powers "Switch to [org]" built-in commands)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner` (peer)
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

- `constructive_auth_public.current_user()` — schema `constructive_auth_public` → **namespace `auth`** → generated op `currentUser` → hook `useCurrentUserQuery`. Used inside the block-owned `use-command-palette.ts` utility hook to read the user's context for built-in commands.
- Context-switch commands are powered by `[[user-context-switcher]]`'s own hooks (not fetched directly by this block).
- No additional DB procedures. Command filtering is client-side.

## Props

```ts
export type CommandRegistryEntry = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  group?: string;
  /** If set, only show when user has this permission in the active context. Client-side only. */
  requiredPermission?: string;
  onSelect: () => void;
  /** Keyboard shortcut display label (rendering only — actual binding is caller's responsibility). */
  shortcut?: string;
};

export type ShellCommandPaletteProps = {
  /** Open/close controlled externally. Default: internally managed. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Additional consumer commands. Built-in commands are always included. */
  commands?: CommandRegistryEntry[];
  /** Global keyboard shortcut. Default: 'mod+k' */
  trigger?: string;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<ShellCommandPaletteMessages>;
  onError?: (err: unknown) => void;
};
```

## Messages catalog

```ts
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
```

## Default data hook (generated, not shipped)

The block does **not** ship a generated data hook. The block-owned `use-command-palette.ts` utility hook (authored, shipped) internally calls:

- **Import:** `import { useCurrentUserQuery } from '@/generated/auth';`
- **Instantiate:**
  ```ts
  const currentUser = useCurrentUserQuery({
    selection: { fields: { id: true, type: true, displayName: true } },
  });
  ```
- **Read result:** `currentUser.data?.currentUser` — used to build built-in context commands.

**`useCommandPalette`** (block-owned utility hook, shipped)
- Module: `lib/shell/hooks/use-command-palette.ts`
- Internally calls `useCurrentUserQuery` (from `@/generated/auth`) and reads context-switch data from `[[user-context-switcher]]`'s context provider (no direct fetch from this block for org list).
- Merges with consumer-registered commands from `ShellCommandPaletteProvider` context.
- Filters by `requiredPermission` against the current session's permission bits (client-side).
- Returns: `{ allCommands: CommandRegistryEntry[], isPending }`.

### `shell-command-palette.requires.json`

```json
{
  "namespace": "auth",
  "mutations": [],
  "queries": ["currentUser"],
  "models": []
}
```

## Callbacks

- `onOpenChange(open)` — fires when palette opens or closes.
- `onError(err)` — fires on errors (e.g., context fetch failure).

## Step-up

Not applicable. Commands that trigger sensitive actions (e.g., sign-out, revoke session) handle step-up within their own click handlers, not at the palette level.

## Captcha

Not applicable.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Dialog has `role="dialog"` with `aria-label` from the search input's placeholder.
- `<CommandInput>` is auto-focused on open.
- Results list uses `role="listbox"` / `role="option"`. Selected item tracked with `aria-selected`.
- Keyboard shortcut hint `⌘K` is announced via `aria-keyshortcuts` on the trigger button (in [[shell-header]]).
- Palette closes on `Escape`. Focus returns to the triggering element.

## Notes / gotchas

- **Built-in commands**: "Switch to [org name]" (one per org membership), "Go to account settings", "Sign out". These are always present unless the user has no orgs (context switch commands hidden).
- **Consumer command registration**: use `<ShellCommandPaletteProvider commands={[...]}>{children}</ShellCommandPaletteProvider>` at the app root. Components anywhere in the tree can call `useRegisterCommands(entries)` to add commands without prop drilling.
- **`requiredPermission` filter**: client-side only (removes the command from the list). The command's `onSelect` handler must still gate against server-side auth if the action is sensitive.
- **`Mod+K` shortcut**: block registers a global `keydown` listener. Ensure only one instance is mounted (use a portal or a single provider at root).
- Cross-ref: [[shell-header]] — renders the command palette trigger button. [[user-context-switcher]] — provides org list for built-in switch commands.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/shell/command-palette/`
- Use the shadcn `command` block (which wraps CMDK) as the inner list. The outer wrapper is a `<Dialog>` for the overlay + backdrop.
- Group commands by `group` field. Built-in groups: `'context'`, `'account'`, `'navigation'`. Consumer groups render after built-ins.
- Storybook stories: empty search, filtered results, no results, with consumer commands, built-in context-switch commands, sign-out command.
