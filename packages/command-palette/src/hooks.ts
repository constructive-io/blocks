import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { CommandRegistryManager } from './registry';
import type { CommandDefinition, NavigateAdapter } from './types';
import type { UseBackgroundTasks } from './background/use-background-tasks';

/**
 * Subscribe to a CommandRegistryManager and re-render on changes.
 * Uses useSyncExternalStore for concurrent-mode safety.
 */
export function useCommandRegistry(registry: CommandRegistryManager) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => registry.subscribe(onStoreChange),
    [registry]
  );

  const commands = useSyncExternalStore(
    subscribe,
    () => registry.getCommands(),
    () => registry.getCommands()
  );

  const groups = useSyncExternalStore(
    subscribe,
    () => registry.getGroups(),
    () => registry.getGroups()
  );

  return { commands, groups };
}

/**
 * Register commands when the component mounts, unregister on unmount.
 * Caller should memoize the commands array for stable references.
 */
export function usePageCommands(
  registry: CommandRegistryManager,
  commands: CommandDefinition[]
): void {
  useEffect(() => {
    commands.forEach((cmd) => registry.registerCommand(cmd));

    return () => {
      commands.forEach((cmd) => registry.unregisterCommand(cmd.id));
    };
  }, [registry, commands]);
}

/**
 * Returns an execute function that handles all command types.
 * Pass a navigate adapter for navigation commands (e.g. router.push).
 * Pass onMultiStepStart to handle multi-step command activation.
 */
export function useCommandExecution(
  navigate?: NavigateAdapter,
  onMultiStepStart?: (cmd: CommandDefinition) => void,
  backgroundTasks?: UseBackgroundTasks
) {
  const execute = useCallback(
    async (cmd: CommandDefinition): Promise<void> => {
      switch (cmd.type) {
        case 'navigation':
          if (cmd.href && navigate) {
            navigate(cmd.href);
          }
          break;
        case 'external':
          if (cmd.href) {
            window.open(cmd.href, cmd.external ? '_blank' : '_self');
          }
          break;
        case 'multi-step':
          onMultiStepStart?.(cmd);
          break;
        case 'action':
        case 'search':
          if (cmd.background && backgroundTasks) {
            backgroundTasks.dispatch(cmd, (signal) =>
              cmd.onSelect?.(signal) ?? Promise.resolve()
            );
          } else {
            await cmd.onSelect?.();
          }
          break;
      }
    },
    [navigate, onMultiStepStart, backgroundTasks]
  );

  return { execute };
}
