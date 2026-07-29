import { describe, it, expect, vi } from 'vitest';
import { CommandRegistryManager, createCommandRegistry } from '../registry';
import type { CommandDefinition, CommandGroupDef } from '../types';

function makeCommand(overrides: Partial<CommandDefinition> = {}): CommandDefinition {
  return {
    id: 'test-cmd',
    label: 'Test Command',
    type: 'action',
    group: 'test',
    onSelect: () => {},
    ...overrides,
  };
}

function makeGroup(overrides: Partial<CommandGroupDef> = {}): CommandGroupDef {
  return {
    id: 'test',
    label: 'Test Group',
    priority: 1,
    ...overrides,
  };
}

describe('CommandRegistryManager', () => {
  it('initializes empty', () => {
    const reg = new CommandRegistryManager();
    expect(reg.getCommands()).toEqual([]);
    expect(reg.getGroups()).toEqual([]);
  });

  it('initializes with seed data', () => {
    const reg = new CommandRegistryManager({
      groups: [makeGroup()],
      commands: [makeCommand()],
    });
    expect(reg.getCommands()).toHaveLength(1);
    expect(reg.getGroups()).toHaveLength(1);
  });

  it('registers and retrieves commands', () => {
    const reg = new CommandRegistryManager();
    reg.registerCommand(makeCommand({ id: 'a' }));
    reg.registerCommand(makeCommand({ id: 'b' }));
    expect(reg.getCommands()).toHaveLength(2);
    expect(reg.getCommands().map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('unregisters commands', () => {
    const reg = new CommandRegistryManager();
    reg.registerCommand(makeCommand({ id: 'a' }));
    reg.registerCommand(makeCommand({ id: 'b' }));
    reg.unregisterCommand('a');
    expect(reg.getCommands()).toHaveLength(1);
    expect(reg.getCommands()[0].id).toBe('b');
  });

  it('overwrites commands with same id', () => {
    const reg = new CommandRegistryManager();
    reg.registerCommand(makeCommand({ id: 'a', label: 'First' }));
    reg.registerCommand(makeCommand({ id: 'a', label: 'Second' }));
    expect(reg.getCommands()).toHaveLength(1);
    expect(reg.getCommands()[0].label).toBe('Second');
  });

  it('registers and retrieves groups', () => {
    const reg = new CommandRegistryManager();
    reg.registerGroup(makeGroup({ id: 'g1' }));
    reg.registerGroup(makeGroup({ id: 'g2' }));
    expect(reg.getGroups()).toHaveLength(2);
  });

  it('unregisters groups', () => {
    const reg = new CommandRegistryManager();
    reg.registerGroup(makeGroup({ id: 'g1' }));
    reg.registerGroup(makeGroup({ id: 'g2' }));
    reg.unregisterGroup('g1');
    expect(reg.getGroups()).toHaveLength(1);
    expect(reg.getGroups()[0].id).toBe('g2');
  });

  it('notifies subscribers on registerCommand', () => {
    const reg = new CommandRegistryManager();
    const listener = vi.fn();
    reg.subscribe(listener);
    reg.registerCommand(makeCommand());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on unregisterCommand', () => {
    const reg = new CommandRegistryManager();
    reg.registerCommand(makeCommand({ id: 'a' }));
    const listener = vi.fn();
    reg.subscribe(listener);
    reg.unregisterCommand('a');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on registerGroup', () => {
    const reg = new CommandRegistryManager();
    const listener = vi.fn();
    reg.subscribe(listener);
    reg.registerGroup(makeGroup());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on unregisterGroup', () => {
    const reg = new CommandRegistryManager();
    reg.registerGroup(makeGroup({ id: 'g1' }));
    const listener = vi.fn();
    reg.subscribe(listener);
    reg.unregisterGroup('g1');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes correctly', () => {
    const reg = new CommandRegistryManager();
    const listener = vi.fn();
    const unsub = reg.subscribe(listener);
    unsub();
    reg.registerCommand(makeCommand());
    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers', () => {
    const reg = new CommandRegistryManager();
    const l1 = vi.fn();
    const l2 = vi.fn();
    reg.subscribe(l1);
    reg.subscribe(l2);
    reg.registerCommand(makeCommand());
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);
  });
});

describe('createCommandRegistry', () => {
  it('returns a CommandRegistryManager', () => {
    const reg = createCommandRegistry();
    expect(reg).toBeInstanceOf(CommandRegistryManager);
  });

  it('passes initial data', () => {
    const reg = createCommandRegistry({
      groups: [makeGroup()],
      commands: [makeCommand()],
    });
    expect(reg.getCommands()).toHaveLength(1);
    expect(reg.getGroups()).toHaveLength(1);
  });
});

describe('Sorting behavior', () => {
  it('groups sort by priority', () => {
    const reg = createCommandRegistry({
      groups: [
        makeGroup({ id: 'c', priority: 10 }),
        makeGroup({ id: 'a', priority: 1 }),
        makeGroup({ id: 'b', priority: 5 }),
      ],
      commands: [],
    });
    const sorted = reg.getGroups().sort((a, b) => a.priority - b.priority);
    expect(sorted.map((g) => g.id)).toEqual(['a', 'b', 'c']);
  });

  it('commands sort by priority within a group', () => {
    const commands = [
      makeCommand({ id: 'c', priority: 30, group: 'g1' }),
      makeCommand({ id: 'a', priority: 5, group: 'g1' }),
      makeCommand({ id: 'b', priority: 10, group: 'g1' }),
      makeCommand({ id: 'd', group: 'g1' }), // default 99
    ];
    const sorted = commands.sort(
      (a, b) => (a.priority ?? 99) - (b.priority ?? 99)
    );
    expect(sorted.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
