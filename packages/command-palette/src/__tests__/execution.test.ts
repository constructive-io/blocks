import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CommandDefinition } from '../types';

// Test the execution logic directly without React hooks
// (mirrors useCommandExecution behavior)
async function executeCommand(
  cmd: CommandDefinition,
  navigate?: (href: string) => void,
  onMultiStepStart?: (cmd: CommandDefinition) => void
): Promise<void> {
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
      await cmd.onSelect?.();
      break;
  }
}

function makeCommand(overrides: Partial<CommandDefinition>): CommandDefinition {
  return {
    id: 'test',
    label: 'Test',
    type: 'action',
    group: 'test',
    ...overrides,
  };
}

describe('Command execution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('navigation type', () => {
    it('calls navigate with href', async () => {
      const navigate = vi.fn();
      const cmd = makeCommand({
        type: 'navigation',
        href: '/dashboard',
      });
      await executeCommand(cmd, navigate);
      expect(navigate).toHaveBeenCalledWith('/dashboard');
    });

    it('does nothing without navigate adapter', async () => {
      const cmd = makeCommand({
        type: 'navigation',
        href: '/dashboard',
      });
      // Should not throw
      await executeCommand(cmd);
    });

    it('does nothing without href', async () => {
      const navigate = vi.fn();
      const cmd = makeCommand({ type: 'navigation' });
      await executeCommand(cmd, navigate);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('external type', () => {
    it('opens in new tab when external=true', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const cmd = makeCommand({
        type: 'external',
        href: 'https://example.com',
        external: true,
      });
      await executeCommand(cmd);
      expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank');
    });

    it('opens in same tab when external=false', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const cmd = makeCommand({
        type: 'external',
        href: 'https://example.com',
        external: false,
      });
      await executeCommand(cmd);
      expect(openSpy).toHaveBeenCalledWith('https://example.com', '_self');
    });

    it('does nothing without href', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const cmd = makeCommand({ type: 'external' });
      await executeCommand(cmd);
      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('action type', () => {
    it('calls onSelect', async () => {
      const onSelect = vi.fn();
      const cmd = makeCommand({ type: 'action', onSelect });
      await executeCommand(cmd);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('handles async onSelect', async () => {
      let resolved = false;
      const cmd = makeCommand({
        type: 'action',
        onSelect: async () => {
          await new Promise((r) => setTimeout(r, 10));
          resolved = true;
        },
      });
      await executeCommand(cmd);
      expect(resolved).toBe(true);
    });

    it('does nothing without onSelect', async () => {
      const cmd = makeCommand({ type: 'action' });
      // Should not throw
      await executeCommand(cmd);
    });
  });

  describe('search type', () => {
    it('calls onSelect same as action', async () => {
      const onSelect = vi.fn();
      const cmd = makeCommand({ type: 'search', onSelect });
      await executeCommand(cmd);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('multi-step type', () => {
    it('calls onMultiStepStart with the command', async () => {
      const onMultiStepStart = vi.fn();
      const cmd = makeCommand({
        type: 'multi-step',
        multiStep: { steps: [] },
      });
      await executeCommand(cmd, undefined, onMultiStepStart);
      expect(onMultiStepStart).toHaveBeenCalledWith(cmd);
    });

    it('does nothing without onMultiStepStart', async () => {
      const cmd = makeCommand({
        type: 'multi-step',
        multiStep: { steps: [] },
      });
      // Should not throw
      await executeCommand(cmd);
    });
  });
});
