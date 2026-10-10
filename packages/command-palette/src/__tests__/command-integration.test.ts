import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CommandRegistryManager,
  kbd,
  useBackgroundTasks,
  useCommandExecution,
  useCommandRegistry,
  useGlobalShortcuts,
  usePageCommands,
  type CommandDefinition,
} from '../index';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const command = (overrides: Partial<CommandDefinition>): CommandDefinition => ({
  id: 'home', label: 'Home', type: 'navigation', group: 'pages', href: '/home',
  shortcut: kbd('h', 'mod'), ...overrides,
});

describe('command host integration', () => {
  it('uses current registered shortcuts without stealing input, and removes them on unmount', async () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    const registry = new CommandRegistryManager();
    const navigate = vi.fn();
    const initialCommands = [
      command({ id: 'disabled', disabled: true }),
      command({ id: 'hidden', hidden: true }),
      command({}),
      command({ id: 'duplicate', href: '/duplicate' }),
    ];
    const { result, rerender, unmount } = renderHook(({ commands, enabled }) => {
      usePageCommands(registry, commands);
      const snapshot = useCommandRegistry(registry);
      const { execute } = useCommandExecution(navigate);
      useGlobalShortcuts(snapshot.commands, execute, enabled);
      return snapshot;
    }, { initialProps: { commands: initialCommands, enabled: true } });

    for (const target of [document.createElement('input'), document.createElement('textarea'), document.createElement('select'), document.createElement('div')]) {
      if (target.tagName === 'DIV') target.contentEditable = 'true';
      document.body.append(target);
      fireEvent.keyDown(target, { key: 'h', ctrlKey: true });
      target.remove();
    }
    fireEvent.keyDown(document, { key: 'h' });
    fireEvent.keyDown(document, { key: 'h', ctrlKey: true, shiftKey: true });
    expect(navigate).not.toHaveBeenCalled();
    await act(async () => fireEvent.keyDown(document, { key: 'H', ctrlKey: true }));
    expect(navigate.mock.calls).toEqual([['/home']]);

    rerender({ commands: [command({ id: 'replacement', href: '/settings' })], enabled: true });
    expect(result.current.commands.map((item) => item.id)).toEqual(['replacement']);
    await act(async () => fireEvent.keyDown(document, { key: 'h', ctrlKey: true }));
    expect(navigate.mock.calls).toEqual([['/home'], ['/settings']]);
    rerender({ commands: [command({})], enabled: false });
    fireEvent.keyDown(document, { key: 'h', ctrlKey: true });
    expect(navigate).toHaveBeenCalledTimes(2);
    unmount();
    expect(registry.getCommands()).toEqual([]);
    fireEvent.keyDown(document, { key: 'h', ctrlKey: true });
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('routes host actions, searches, external links, and multi-step flows through the real executor', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const onStart = vi.fn();
    const onSelect = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCommandExecution(undefined, onStart));
    const flow = command({ type: 'multi-step', multiStep: { steps: [] } });
    await act(async () => {
      await result.current.execute(command({ type: 'action', onSelect }));
      await result.current.execute(command({ type: 'search', onSelect }));
      await result.current.execute(command({ type: 'external', href: 'https://example.com', external: true }));
      await result.current.execute(command({ type: 'external', href: '/local', external: false }));
      await result.current.execute(flow);
    });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(open.mock.calls).toEqual([['https://example.com', '_blank'], ['/local', '_self']]);
    expect(onStart).toHaveBeenCalledWith(flow);
  });

  it('dispatches background commands with abortable work and preserves cancellation after late completion', async () => {
    let finish: () => void = () => {};
    let signal: AbortSignal | undefined;
    const work = new Promise<void>((resolve) => { finish = resolve; });
    const { result } = renderHook(() => {
      const background = useBackgroundTasks({ cancelledDismissMs: 0, successDismissMs: 0 });
      return { background, ...useCommandExecution(undefined, undefined, background) };
    });
    await act(async () => result.current.execute(command({
      type: 'action', background: true, onSelect: async (nextSignal) => { signal = nextSignal; await work; },
    })));
    expect(result.current.background.tasks).toEqual([expect.objectContaining({ commandId: 'home', label: 'Home', status: 'running' })]);
    expect(signal?.aborted).toBe(false);
    act(() => result.current.background.cancel(result.current.background.tasks[0].id));
    expect(signal?.aborted).toBe(true);
    await act(async () => finish());
    expect(result.current.background.tasks[0].status).toBe('cancelled');
    act(() => result.current.background.dismiss(result.current.background.tasks[0].id));
    expect(result.current.background.tasks).toEqual([]);
    await act(async () => result.current.execute(command({ type: 'action', background: true, onSelect: async () => {} })));
    expect(result.current.background.tasks[0].status).toBe('success');
  });
});
