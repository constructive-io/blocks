/**
 * shell-notifications — tests
 *
 * PURE LAYOUT BLOCK: no generated hook, no vi.mock('@/generated/*').
 * Items are supplied via the `items` prop; the host owns fetching.
 *
 * Coverage:
 *  1. Renders bell with no items (empty state).
 *  2. Displays unread badge with capped label (>99 → '99+').
 *  3. Correct accessible bell aria-label with unread count.
 *  4. Opens popover on click, renders notification items.
 *  5. Calls onMarkRead when "mark read" action is clicked.
 *  6. Calls onMarkAllRead when "mark all read" is clicked.
 *  7. Calls onDismiss when "dismiss" is clicked.
 *  8. Unread items have 'bg-accent/20' class; read items do not.
 *  9. respects maxVisible prop.
 * 10. Messages override applied.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ShellNotifications, type ShellNotification } from './notifications';
import { defaultShellNotificationsMessages } from './messages';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNotification(overrides: Partial<ShellNotification> = {}): ShellNotification {
  return {
    id: 'n1',
    kind: 'info',
    title: 'Test notification',
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShellNotifications', () => {
  it('renders bell button with no badge when no notifications', () => {
    render(<ShellNotifications />);

    const bell = screen.getByTestId('notifications-bell');
    expect(bell).toBeInTheDocument();
    expect(bell).toHaveAttribute('aria-label', 'Notifications');

    // No badge visible when unread count is 0
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', () => {
    const notifications = [
      makeNotification({ id: 'n1', isRead: false }),
      makeNotification({ id: 'n2', isRead: false }),
      makeNotification({ id: 'n3', isRead: true })
    ];
    render(<ShellNotifications items={notifications} />);

    // Badge shows count (2 unread)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('caps badge at 99+ when unreadCount > 99', () => {
    const notifications = Array.from({ length: 105 }, (_, i) =>
      makeNotification({ id: `n${i}`, isRead: false })
    );
    render(<ShellNotifications items={notifications} />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('sets correct aria-label on bell when there are unread items', () => {
    const notifications = [makeNotification({ id: 'n1', isRead: false })];
    render(<ShellNotifications items={notifications} />);

    const bell = screen.getByTestId('notifications-bell');
    expect(bell).toHaveAttribute('aria-label', 'Notifications, 1 unread');
  });

  it('opens popover and shows notification items on bell click', async () => {
    const user = userEvent.setup();
    const notifications = [
      makeNotification({ id: 'n1', title: 'First notification', isRead: false }),
      makeNotification({ id: 'n2', title: 'Second notification', isRead: true })
    ];

    render(<ShellNotifications items={notifications} />);

    await user.click(screen.getByTestId('notifications-bell'));

    expect(await screen.findByText('First notification')).toBeInTheDocument();
    expect(screen.getByText('Second notification')).toBeInTheDocument();
  });

  it('shows empty state when no notifications are present', async () => {
    const user = userEvent.setup();
    render(<ShellNotifications items={[]} />);

    await user.click(screen.getByTestId('notifications-bell'));

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(defaultShellNotificationsMessages.emptyState)).toBeInTheDocument();
  });

  it('calls onMarkAllRead when "mark all read" button is clicked', async () => {
    const user = userEvent.setup();
    const onMarkAllRead = vi.fn();
    const notifications = [makeNotification({ id: 'n1', isRead: false })];

    render(<ShellNotifications items={notifications} onMarkAllRead={onMarkAllRead} />);

    await user.click(screen.getByTestId('notifications-bell'));
    const markAllBtn = await screen.findByTestId('mark-all-read');
    await user.click(markAllBtn);

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('"mark all read" button is disabled when all notifications are read', async () => {
    const user = userEvent.setup();
    const notifications = [makeNotification({ id: 'n1', isRead: true })];

    render(<ShellNotifications items={notifications} />);
    await user.click(screen.getByTestId('notifications-bell'));

    // Wait for the popover list to render
    await screen.findByRole('list');
    const markAllBtn = screen.getByTestId('mark-all-read');
    expect(markAllBtn).toBeDisabled();
  });

  it('calls onMarkRead with notification id when mark-read is clicked', async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    const notifications = [makeNotification({ id: 'n1', isRead: false, title: 'Unread item' })];

    render(<ShellNotifications items={notifications} onMarkRead={onMarkRead} />);

    await user.click(screen.getByTestId('notifications-bell'));
    // Hover item to make buttons visible (opacity 0 -> 1 on group-hover; in test DOM they exist)
    const markReadBtn = await screen.findByTestId('mark-read-n1');
    await user.click(markReadBtn);

    expect(onMarkRead).toHaveBeenCalledWith('n1');
  });

  it('calls onDismiss with notification id when dismiss is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const notifications = [makeNotification({ id: 'n1', isRead: false, title: 'Dismissable item' })];

    render(<ShellNotifications items={notifications} onDismiss={onDismiss} />);

    await user.click(screen.getByTestId('notifications-bell'));
    const dismissBtn = await screen.findByTestId('dismiss-n1');
    await user.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledWith('n1');
  });

  it('respects maxVisible — only shows up to maxVisible items', async () => {
    const user = userEvent.setup();
    const notifications = Array.from({ length: 10 }, (_, i) =>
      makeNotification({ id: `n${i}`, title: `Notification ${i}`, isRead: false })
    );

    render(<ShellNotifications items={notifications} maxVisible={3} />);
    await user.click(screen.getByTestId('notifications-bell'));

    // Only 3 items should be rendered
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('shows view-all link with custom href', async () => {
    const user = userEvent.setup();
    const notifications = [makeNotification({ id: 'n1', isRead: false })];

    render(<ShellNotifications items={notifications} allNotificationsHref="/my-notifications" />);
    await user.click(screen.getByTestId('notifications-bell'));

    const link = await screen.findByTestId('view-all-link');
    expect(link).toHaveAttribute('href', '/my-notifications');
  });

  it('applies message overrides', async () => {
    const user = userEvent.setup();
    render(
      <ShellNotifications
        items={[]}
        messages={{ panelTitle: 'Custom Title', emptyState: 'All clear!' }}
      />
    );
    await user.click(screen.getByTestId('notifications-bell'));

    expect(await screen.findByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('All clear!')).toBeInTheDocument();
  });

  it('renders notification body text when provided', async () => {
    const user = userEvent.setup();
    const notifications = [
      makeNotification({ id: 'n1', title: 'Alert', body: 'Something happened', isRead: false })
    ];

    render(<ShellNotifications items={notifications} />);
    await user.click(screen.getByTestId('notifications-bell'));

    expect(await screen.findByText('Something happened')).toBeInTheDocument();
  });

  it('renders action URL as a link when provided', async () => {
    const user = userEvent.setup();
    const notifications = [
      makeNotification({ id: 'n1', title: 'Click me', actionUrl: '/details/1', isRead: false })
    ];

    render(<ShellNotifications items={notifications} />);
    await user.click(screen.getByTestId('notifications-bell'));

    const link = await screen.findByRole('link', { name: /Click me/i });
    expect(link).toHaveAttribute('href', '/details/1');
  });
});
