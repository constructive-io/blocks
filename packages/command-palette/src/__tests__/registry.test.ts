import { describe, expect, it, vi } from 'vitest';

import { CommandRegistryManager } from '../registry';
import type { CommandDefinition, CommandGroupDef } from '../types';

function command(id: string, label = id): CommandDefinition {
  return { id, label, type: 'action', group: 'test', onSelect: () => undefined };
}

function group(id: string): CommandGroupDef {
  return { id, label: id, priority: 1 };
}

describe('CommandRegistryManager', () => {
  it('supports dynamic command replacement and removal by id', () => {
    const registry = new CommandRegistryManager({ commands: [command('a', 'First')], groups: [] });

    registry.registerCommand(command('a', 'Replacement'));
    registry.registerCommand(command('b'));
    registry.unregisterCommand('b');

    expect(registry.getCommands()).toEqual([expect.objectContaining({ id: 'a', label: 'Replacement' })]);
  });

  it('supports dynamic group registration and removal', () => {
    const registry = new CommandRegistryManager({ groups: [group('a')], commands: [] });

    registry.registerGroup(group('b'));
    registry.unregisterGroup('a');

    expect(registry.getGroups()).toEqual([expect.objectContaining({ id: 'b' })]);
  });

  it('notifies active subscribers for registry changes and stops after unsubscribe', () => {
    const registry = new CommandRegistryManager();
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);

    registry.registerCommand(command('a'));
    registry.unregisterCommand('a');
    registry.registerGroup(group('g'));
    registry.unregisterGroup('g');
    expect(listener).toHaveBeenCalledTimes(4);

    unsubscribe();
    registry.registerCommand(command('ignored'));
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
