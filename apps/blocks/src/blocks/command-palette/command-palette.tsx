'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import {
  type CommandDefinition,
  type CommandRegistryManager,
  type KeyBinding,
  type NavigateAdapter,
  type UseBackgroundTasks,
  kbd,
  matchKeyBinding,
  useCommandExecution,
  useCommandRegistry,
  useGlobalShortcuts,
  useMultiStepExecution
} from '@constructive-io/command-palette';
import {
  CommandDialog,
  CommandDialogPopup,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandFooter,
  CommandPanel,
  CommandEmpty
} from '@constructive-io/ui/command';
import { MultiStepView } from './multi-step/multi-step-view';
import { KbdShortcut } from './kbd-shortcut';
import { InlineTaskBar } from './background/inline-task-bar';

const ICON_PROPS = { className: 'size-4 shrink-0' } as const;

const emptyContent = (
  <div className="flex flex-col items-center gap-2 py-4">
    <p className="text-sm">No commands found</p>
    <p className="text-xs text-muted-foreground">Try a different search term</p>
  </div>
);

const footerContent = (
  <div className="flex items-center gap-4">
    <span className="flex items-center gap-1 text-xs">
      <kbd className="rounded-xs border bg-muted px-1">↑</kbd>
      <kbd className="rounded-xs border bg-muted px-1">↓</kbd>
      Navigate
    </span>
    <span className="flex items-center gap-1 text-xs">
      <kbd className="rounded-xs border bg-muted px-1">↵</kbd>
      Select
    </span>
    <span className="flex items-center gap-1 text-xs">
      <kbd className="rounded-xs border bg-muted px-1">esc</kbd>
      Close
    </span>
  </div>
);

export interface CommandPaletteProps {
  /** Registry instance holding commands and groups */
  registry: CommandRegistryManager;
  /** Navigation adapter for 'navigation' type commands */
  navigate?: NavigateAdapter;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Keyboard shortcut binding to toggle the palette (default: Cmd/Ctrl+K) */
  shortcut?: KeyBinding;
  /** Search input placeholder */
  placeholder?: string;
  /** Accessible label announced for the command dialog */
  label?: string;
  /** Background task tracker — enables `background: true` commands */
  backgroundTasks?: UseBackgroundTasks;
}

export function CommandPalette({
  registry,
  navigate,
  open: controlledOpen,
  onOpenChange,
  shortcut = kbd('k', 'mod'),
  placeholder = 'Type a command or search...',
  label = 'Command palette',
  backgroundTasks,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
      // Reset search when closing
      if (!next) {
        setSearch('');
      }
    },
    [isControlled, onOpenChange]
  );

  // Multi-step flow state
  const multiStep = useMultiStepExecution({
    onCompleted: () => {
      setOpen(false);
    },
  });

  const handleMultiStepStart = useCallback(
    (cmd: CommandDefinition) => {
      if (cmd.multiStep) {
        multiStep.start(cmd.id, cmd.multiStep);
      }
    },
    [multiStep.start]
  );

  const handleMultiStepCancel = useCallback(() => {
    multiStep.cancel();
    setSearch('');
    // Don't close palette — return to command list (layered escape)
  }, [multiStep.cancel]);

  // Global keyboard shortcut to toggle palette
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (matchKeyBinding(e, shortcut)) {
        e.preventDefault();
        setOpen(!openRef.current);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcut, setOpen]);

  const { commands, groups } = useCommandRegistry(registry);
  const { execute } = useCommandExecution(navigate, handleMultiStepStart, backgroundTasks);

  // Global command shortcuts (disabled when palette is open)
  useGlobalShortcuts(commands, execute, !open);

  // Build grouped items sorted by priority
  const groupedItems = useMemo(() => {
    return [...groups]
      .sort((a, b) => a.priority - b.priority)
      .map((group) => {
        const groupCommands = commands
          .filter((cmd) => cmd.group === group.id && !cmd.hidden)
          .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

        return { id: group.id, label: group.label, commands: groupCommands };
      })
      .filter((g) => g.commands.length > 0);
  }, [commands, groups]);

  const handleSelect = useCallback(
    async (cmd: CommandDefinition) => {
      if (cmd.disabled) return;

      // Background commands: fire-and-forget, configurable palette behavior
      if (cmd.background && backgroundTasks) {
        const behavior = cmd.backgroundBehavior ?? 'close';
        if (typeof behavior === 'function') {
          behavior({
            close: () => setOpen(false),
            reset: () => setSearch(''),
            setSearch,
          });
        } else {
          switch (behavior) {
            case 'close':
              setOpen(false);
              break;
            case 'reset':
              setSearch('');
              break;
            case 'persist':
              break;
          }
        }
        void execute(cmd);
        return;
      }

      // Non-background: multi-step stays open, everything else closes
      if (cmd.type !== 'multi-step') {
        setOpen(false);
      }
      await execute(cmd);
    },
    [execute, setOpen, backgroundTasks]
  );

  const isMultiStepActive =
    multiStep.state !== null && multiStep.config !== null;

  const hasTasks = backgroundTasks != null && backgroundTasks.tasks.length > 0;

  return (
    <CommandDialog
      className={hasTasks ? 'max-h-[500px]' : undefined}
      label={label}
      onOpenChange={(next) => {
        if (!next && isMultiStepActive) {
          handleMultiStepCancel();
          return;
        }
        setOpen(next);
      }}
      open={open}
    >
      <CommandDialogPopup>
        {isMultiStepActive ? (
          <MultiStepView
            config={multiStep.config!}
            state={multiStep.state!}
            onCompleteStep={multiStep.completeStep}
            onBack={multiStep.goBack}
            onSkip={multiStep.skipStep}
            onCancel={handleMultiStepCancel}
            onError={multiStep.setError}
          />
        ) : (
          <>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={placeholder}
            />
            <CommandPanel>
              <CommandList className={hasTasks ? 'max-h-56' : undefined}>
                <CommandEmpty>{emptyContent}</CommandEmpty>
                {groupedItems.map((group, i) => (
                  <Fragment key={group.id}>
                    <CommandGroup heading={group.label}>
                      {group.commands.map((cmd) => (
                        <CommandItem
                          key={cmd.id}
                          value={cmd.id}
                          keywords={cmd.keywords}
                          disabled={cmd.disabled}
                          onSelect={() => handleSelect(cmd)}
                        >
                          {cmd.icon &&
                            typeof cmd.icon !== 'string' &&
                            React.createElement(cmd.icon, ICON_PROPS)}
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{cmd.label}</span>
                            {cmd.description && (
                              <span className="truncate text-xs text-muted-foreground">
                                {cmd.description}
                              </span>
                            )}
                          </div>
                          {cmd.shortcut && (
                            <span className="ml-auto pl-4">
                              <KbdShortcut binding={cmd.shortcut} />
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {i < groupedItems.length - 1 && <CommandSeparator />}
                  </Fragment>
                ))}
              </CommandList>
            </CommandPanel>
            {backgroundTasks && backgroundTasks.tasks.length > 0 && (
              <InlineTaskBar
                tasks={backgroundTasks.tasks}
                onCancel={backgroundTasks.cancel}
                onDismiss={backgroundTasks.dismiss}
              />
            )}
            <CommandFooter>{footerContent}</CommandFooter>
          </>
        )}
      </CommandDialogPopup>
    </CommandDialog>
  );
}
