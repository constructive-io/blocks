import type { CommandDefinition, CommandGroupDef, CommandRegistry } from './types';

/**
 * CommandRegistryManager holds commands and groups with pub/sub notifications.
 * Subscribe to changes via `subscribe()` for reactive UI updates.
 */
export class CommandRegistryManager {
  private commands: Map<string, CommandDefinition> = new Map();
  private groups: Map<string, CommandGroupDef> = new Map();
  private listeners: Set<() => void> = new Set();

  // Cached snapshots — only replaced on mutation so useSyncExternalStore
  // receives a referentially stable value between re-renders.
  private commandsSnapshot: CommandDefinition[] = [];
  private groupsSnapshot: CommandGroupDef[] = [];

  constructor(initial?: CommandRegistry) {
    if (initial) {
      initial.groups.forEach((g) => this.groups.set(g.id, g));
      initial.commands.forEach((c) => this.commands.set(c.id, c));
      this.commandsSnapshot = Array.from(this.commands.values());
      this.groupsSnapshot = Array.from(this.groups.values());
    }
  }

  registerCommand(command: CommandDefinition): void {
    this.commands.set(command.id, command);
    this.invalidate();
  }

  unregisterCommand(id: string): void {
    this.commands.delete(id);
    this.invalidate();
  }

  registerGroup(group: CommandGroupDef): void {
    this.groups.set(group.id, group);
    this.invalidate();
  }

  unregisterGroup(id: string): void {
    this.groups.delete(id);
    this.invalidate();
  }

  getCommands(): CommandDefinition[] {
    return this.commandsSnapshot;
  }

  getGroups(): CommandGroupDef[] {
    return this.groupsSnapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private invalidate(): void {
    this.commandsSnapshot = Array.from(this.commands.values());
    this.groupsSnapshot = Array.from(this.groups.values());
    this.listeners.forEach((l) => l());
  }
}

/** Factory to create a new CommandRegistryManager */
export function createCommandRegistry(
  initial?: CommandRegistry
): CommandRegistryManager {
  return new CommandRegistryManager(initial);
}
