import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MobileDrawer } from '@/components/docs/mobile-drawer';

vi.mock('../sidebar', () => ({
  Sidebar: ({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) => (
    <nav aria-label="Mobile registry navigation" data-mobile-sidebar={mobile || undefined}>
      <button type="button" onClick={onNavigate}>
        Navigate to blocks
      </button>
    </nav>
  ),
}));

vi.mock('../right-panel', () => ({
  GitHubChip: () => <span>GitHub</span>,
  SettingsRows: () => <div>Settings</div>,
}));

function DrawerHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open navigation
      </button>
      <MobileDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}

function mobileNavigation() {
  return screen.queryByRole('navigation', { name: 'Mobile registry navigation' });
}

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole('button', { name: 'Open navigation' });
  await user.click(trigger);
  await screen.findByRole('dialog', { name: 'Registry navigation' });
  return trigger;
}

function getBackdrop() {
  const backdrop = document.querySelector<HTMLElement>('.z-40');
  if (!backdrop) throw new Error('Mobile drawer backdrop did not mount');
  return backdrop;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MobileDrawer presence lifecycle', () => {
  it('mounts only while open, closes with Escape, and restores trigger focus', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);

    expect(mobileNavigation()).not.toBeInTheDocument();
    const trigger = await openDrawer(user);
    expect(screen.getAllByRole('navigation', { name: 'Mobile registry navigation' })).toHaveLength(1);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(mobileNavigation()).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog', { name: 'Registry navigation' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes and unmounts through Sidebar navigation, then mounts one fresh tree', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const trigger = await openDrawer(user);

    await user.click(screen.getByRole('button', { name: 'Navigate to blocks' }));

    await waitFor(() => expect(mobileNavigation()).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    await openDrawer(user);
    expect(screen.getAllByRole('navigation', { name: 'Mobile registry navigation' })).toHaveLength(1);
  });

  it('handles backdrop close followed by a rapid reopen without duplicate trees', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const trigger = await openDrawer(user);

    await user.click(getBackdrop());
    await user.click(trigger);

    await screen.findByRole('dialog', { name: 'Registry navigation' });
    expect(screen.getAllByRole('navigation', { name: 'Mobile registry navigation' })).toHaveLength(1);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(mobileNavigation()).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
