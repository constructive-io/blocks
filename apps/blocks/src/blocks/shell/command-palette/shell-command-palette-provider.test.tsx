import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CommandRegistryEntry } from './command-palette';
import {
  ShellCommandPaletteProvider,
  useRegisterCommands,
  useShellCommandPaletteContext,
} from './shell-command-palette-provider';

function RegisterCommands({ commands }: { commands: CommandRegistryEntry[] }) {
  useRegisterCommands(commands);
  return null;
}

function RegisteredCommandsProbe() {
  const context = useShellCommandPaletteContext();
  const commands = context?.dynamicCommands ?? [];

  return (
    <div>
      <output data-testid="registered-command-ids">{commands.map((command) => command.id).join(',')}</output>
      {commands.map((command, index) => (
        <button key={`${command.id}-${index}`} onClick={() => void command.onSelect()} type="button">
          {command.label}
        </button>
      ))}
    </div>
  );
}

type RegistrationHarnessProps = {
  commands: CommandRegistryEntry[];
  providerKey?: string;
  renderMarker?: string;
  showRegistrar?: boolean;
};

function RegistrationHarness({
  commands,
  providerKey = 'provider',
  renderMarker = 'initial',
  showRegistrar = true,
}: RegistrationHarnessProps) {
  return (
    <StrictMode>
      <ShellCommandPaletteProvider key={providerKey}>
        <span data-testid="render-marker">{renderMarker}</span>
        {showRegistrar && <RegisterCommands commands={commands} />}
        <RegisteredCommandsProbe />
      </ShellCommandPaletteProvider>
    </StrictMode>
  );
}

function command(id: string, label: string, onSelect = vi.fn()): CommandRegistryEntry {
  return { id, label, onSelect };
}

describe('useRegisterCommands', () => {
  it('registers once, ignores a memoized-array rerender, and replaces a changed batch', async () => {
    const firstOnSelect = vi.fn();
    const secondOnSelect = vi.fn();
    const firstCommands = [command('first', 'First command', firstOnSelect)];
    const secondCommands = [command('second', 'Second command', secondOnSelect)];
    const view = render(<RegistrationHarness commands={firstCommands} />);

    await waitFor(() => expect(screen.getByTestId('registered-command-ids')).toHaveTextContent('first'));
    expect(screen.getAllByRole('button', { name: 'First command' })).toHaveLength(1);

    view.rerender(<RegistrationHarness commands={firstCommands} renderMarker="rerendered" />);

    expect(screen.getByTestId('render-marker')).toHaveTextContent('rerendered');
    expect(screen.getByTestId('registered-command-ids')).toHaveTextContent('first');
    expect(screen.getAllByRole('button', { name: 'First command' })).toHaveLength(1);

    view.rerender(<RegistrationHarness commands={secondCommands} renderMarker="changed" />);

    await waitFor(() => expect(screen.getByTestId('registered-command-ids')).toHaveTextContent('second'));
    expect(screen.queryByRole('button', { name: 'First command' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Second command' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Second command' }));
    expect(firstOnSelect).not.toHaveBeenCalled();
    expect(secondOnSelect).toHaveBeenCalledTimes(1);
  });

  it('registers exactly once when the provider context is replaced', async () => {
    const commands = [command('replacement', 'Replacement command')];
    const view = render(<RegistrationHarness commands={commands} />);

    await waitFor(() => expect(screen.getByTestId('registered-command-ids')).toHaveTextContent('replacement'));

    view.rerender(<RegistrationHarness commands={commands} providerKey="replacement-provider" />);

    await waitFor(() => expect(screen.getByTestId('registered-command-ids')).toHaveTextContent('replacement'));
    expect(screen.getAllByRole('button', { name: 'Replacement command' })).toHaveLength(1);
  });

  it('unregisters the committed batch when the caller unmounts', async () => {
    const commands = [command('temporary', 'Temporary command')];
    const view = render(<RegistrationHarness commands={commands} />);

    await waitFor(() => expect(screen.getByTestId('registered-command-ids')).toHaveTextContent('temporary'));

    view.rerender(<RegistrationHarness commands={commands} showRegistrar={false} />);

    await waitFor(() => expect(screen.getByTestId('registered-command-ids')).toBeEmptyDOMElement());
    expect(screen.queryByRole('button', { name: 'Temporary command' })).not.toBeInTheDocument();
  });
});
