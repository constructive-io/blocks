# Command Palette contract

The command system has two distribution boundaries:

- `@constructive-io/command-palette` is the headless engine. It owns command types, registration, shortcuts, execution, multi-step state, and background-task lifecycle.
- `@constructive/command-palette` is a shadcn registry block. It owns the dialog, search results, shortcut presentation, multi-step view, and task feedback using source-installed primitives.

This split keeps behavioral updates centrally versioned while leaving all application UI editable. Neither surface imports the npm `@constructive-io/ui` package at runtime.

## Command model

```ts
type CommandType = 'navigation' | 'action' | 'search' | 'external' | 'multi-step';

interface CommandDefinition {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }> | string;
  shortcut?: KeyBinding;
  type: CommandType;
  group: string;
  keywords?: string[];
  href?: string;
  external?: boolean;
  onSelect?: (signal?: AbortSignal) => void | Promise<void>;
  background?: boolean;
  backgroundBehavior?: 'close' | 'reset' | 'persist' | ((controls: BackgroundPaletteControls) => void);
  disabled?: boolean;
  hidden?: boolean;
  priority?: number;
  multiStep?: MultiStepConfig<unknown>;
}
```

IDs are application-wide identities. Groups sort by ascending `priority`; commands sort by ascending `priority` within a group. Hidden commands do not render or receive shortcuts, while disabled commands remain discoverable without executing.

## Registry lifecycle

`CommandRegistryManager` stores commands and groups in keyed maps and publishes referentially stable snapshots through `useSyncExternalStore`.

- Create one registry per application shell with `createCommandRegistry`.
- Register stable application-wide commands in the initial seed.
- Register page commands with `usePageCommands`; memoize the array so mount and cleanup remain deterministic.
- Keep authorization evidence in application state and derive `hidden` or `disabled` from it. The registry does not grant authority.

## Execution boundary

`useCommandExecution` handles five command kinds:

- `navigation` calls the host-supplied navigation adapter.
- `external` opens the supplied URL in the requested browsing context.
- `action` and `search` call `onSelect`.
- `multi-step` hands the definition to the multi-step machine.
- Background actions dispatch through `useBackgroundTasks` and receive an `AbortSignal`.

The host remains responsible for routing, authorization, GraphQL mutations, errors, and telemetry. PostgreSQL privileges and RLS remain authoritative after a command becomes visible.

## Shortcuts

```ts
const shortcut = kbd('k', 'mod');
```

`mod` maps to Command on Apple platforms and Control elsewhere. Matching is strict: unspecified modifiers must not be pressed. `useGlobalShortcuts` installs one document listener, ignores editable targets, skips hidden or disabled commands, and executes the first match.

The visual block opens with `mod+k` by default and disables command shortcuts while its dialog is open, leaving `cmdk` in control of list navigation.

## Multi-step flows

`multiStepCommand` builds a typed sequence of steps. Each step can render a component, load data, validate accumulated context, and opt into skipping. The machine owns forward/back navigation, loader cancellation, completion, retryable errors, and the terminal callback.

```ts
const command = multiStepCommand<CreateProject>({
  id: 'create-project',
  label: 'Create project',
  group: 'actions'
})
  .step({ id: 'details', title: 'Details', Component: ProjectDetails })
  .step({ id: 'confirm', title: 'Confirm', Component: ProjectConfirmation })
  .onComplete((context) => createProject(context))
  .build();
```

The installed view prevents `cmdk` from consuming Enter and arrow keys inside a step. Backspace navigates backward only when focus is outside an editable control, and Escape returns to command search before closing the dialog.

## Background tasks

`useBackgroundTasks` tracks concurrent command runs with an `AbortController` per invocation. Running tasks sort first; completed tasks sort by completion time. Success and cancellation can auto-dismiss, while errors persist until dismissed.

```tsx
const backgroundTasks = useBackgroundTasks({
  onTaskChange: (task) => logTaskTransition(task)
});

<CommandPalette registry={registry} backgroundTasks={backgroundTasks} />;
<BackgroundTaskStack
  tasks={backgroundTasks.tasks}
  onCancel={backgroundTasks.cancel}
  onDismiss={backgroundTasks.dismiss}
/>;
```

Cancellation is cooperative: application handlers must observe the provided signal.

## Public exports

The package exports command types, `CommandRegistryManager`, `createCommandRegistry`, keybinding helpers, registry/execution hooks, the multi-step builder and hook, and background-task types and hook. Presentation components are intentionally exported only from the installed registry source.

## Verification contract

- Headless behavior tests cover registration, execution, shortcut matching, multi-step transitions, builders, and background-task lifecycle.
- The registry compiler must rewrite every Constructive UI import to the consumer's configured aliases and reject any remaining npm `@constructive-io/ui` reference.
- A clean shadcn consumer must install `@constructive/command-palette`, typecheck its complete dependency closure, and compile its Tailwind source.
- Browser-level documentation checks should cover opening, searching, executing, multi-step keyboard isolation, light/dark themes, and reduced motion. Visual snapshot/unit-test duplication is intentionally avoided.
