/**
 * mfa-backup-codes-display — unit tests
 *
 * This block is display-only: no generated hook, no network call.
 * vi.mock('@/generated/auth') is NOT needed — this block imports no generated hook.
 *
 * Tests cover:
 *   1. Renders all codes in a list
 *   2. Renders title/description/warning text from defaults
 *   3. Renders copy-all and download buttons
 *   4. Copy-all writes all codes to clipboard
 *   5. Shows "Copied!" briefly after copy-all, then reverts
 *   6. Download triggers anchor click
 *   7. Continue is disabled by default (requireConfirmation=true)
 *   8. Continue enables after checkbox is checked
 *   9. onConfirm and onMessage fire on Continue
 *  10. Does NOT fire onConfirm when Continue is clicked before checkbox
 *  11. requireConfirmation=false: no checkbox, Continue enabled immediately
 *  12. requireConfirmation=false: onConfirm fires immediately on Continue
 *  13. Message overrides applied
 *  14. Codes list has correct aria-label
 *  15. Empty codes renders without crash
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MfaBackupCodesDisplay } from './mfa-backup-codes-display';
import { defaultMfaBackupCodesDisplayMessages } from './messages';

const SAMPLE_CODES = ['ABCD1234', 'EFGH5678', 'IJKL9012', 'MNOP3456'];

// Setup a fresh clipboard mock for each test — defined in beforeEach so each test gets a clean spy.
let writeTextMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeTextMock = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    writable: true,
    configurable: true
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ----- URL + anchor mocks (for download) ------------------------------------
const createObjectURLMock = vi.fn(() => 'blob:mock');
const revokeObjectURLMock = vi.fn();
Object.defineProperty(URL, 'createObjectURL', { value: createObjectURLMock, configurable: true, writable: true });
Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURLMock, configurable: true, writable: true });

describe('MfaBackupCodesDisplay', () => {
  // ---------------------------------------------------------------------------
  // 1. Renders all codes
  // ---------------------------------------------------------------------------
  it('renders all backup codes in a list', () => {
    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} />);
    for (const code of SAMPLE_CODES) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Default messages
  // ---------------------------------------------------------------------------
  it('renders title, description, and warning text from defaults', () => {
    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} />);
    expect(screen.getByText(defaultMfaBackupCodesDisplayMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultMfaBackupCodesDisplayMessages.description)).toBeInTheDocument();
    expect(screen.getByText(defaultMfaBackupCodesDisplayMessages.warningText)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 3. Buttons present
  // ---------------------------------------------------------------------------
  it('renders copy-all and download buttons', () => {
    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} />);
    expect(screen.getByTestId('copy-all')).toBeInTheDocument();
    expect(screen.getByTestId('download')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 4. Copy all → clipboard
  // ---------------------------------------------------------------------------
  it('copy-all writes all codes as newline-separated text to clipboard', async () => {
    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-all'));
      await Promise.resolve();
    });

    expect(writeTextMock).toHaveBeenCalledWith(SAMPLE_CODES.join('\n'));
  });

  // ---------------------------------------------------------------------------
  // 5. "Copied!" label briefly shown
  // ---------------------------------------------------------------------------
  it('shows "Copied!" label briefly after copy-all and reverts after 2s', async () => {
    vi.useFakeTimers();

    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-all'));
      await Promise.resolve();
    });

    expect(screen.getByTestId('copy-all')).toHaveTextContent(defaultMfaBackupCodesDisplayMessages.copiedButton);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(screen.getByTestId('copy-all')).toHaveTextContent(defaultMfaBackupCodesDisplayMessages.copyAllButton);

    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // 6. Download → triggers anchor click
  // ---------------------------------------------------------------------------
  it('download triggers a file download (anchor.click called)', async () => {
    const anchorClickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: any) => {
      const el = origCreateElement(tag, options);
      if (tag === 'a') {
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(anchorClickSpy);
      }
      return el;
    });

    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('download'));
    });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 7. Confirmation gate — disabled by default
  // ---------------------------------------------------------------------------
  it('renders confirmation checkbox and disabled Continue by default (requireConfirmation=true)', () => {
    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} />);
    const checkbox = screen.getByTestId('confirm-checkbox');
    const continueBtn = screen.getByTestId('continue-button');

    expect(checkbox).toBeInTheDocument();
    expect(continueBtn).toBeDisabled();
    expect(continueBtn).toHaveAttribute('aria-disabled', 'true');
  });

  // ---------------------------------------------------------------------------
  // 8. Checkbox enables Continue
  // ---------------------------------------------------------------------------
  it('enables Continue after the confirmation checkbox is checked', async () => {
    const user = userEvent.setup();
    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} />);

    await user.click(screen.getByTestId('confirm-checkbox'));

    const continueBtn = screen.getByTestId('continue-button');
    expect(continueBtn).not.toBeDisabled();
    expect(continueBtn).toHaveAttribute('aria-disabled', 'false');
  });

  // ---------------------------------------------------------------------------
  // 9. onConfirm + onMessage fire when confirmed
  // ---------------------------------------------------------------------------
  it('fires onConfirm and onMessage when Continue is clicked after checkbox', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onMessage = vi.fn();

    render(
      <MfaBackupCodesDisplay codes={SAMPLE_CODES} onConfirm={onConfirm} onMessage={onMessage} />
    );

    await user.click(screen.getByTestId('confirm-checkbox'));
    await user.click(screen.getByTestId('continue-button'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'success',
      key: 'backupCodes.confirmed'
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Continue before checkbox does NOT fire onConfirm
  // ---------------------------------------------------------------------------
  it('does NOT fire onConfirm when Continue is clicked before checkbox is checked', async () => {
    const onConfirm = vi.fn();

    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} onConfirm={onConfirm} />);

    const continueBtn = screen.getByTestId('continue-button');
    expect(continueBtn).toBeDisabled();

    // Fire click directly — disabled button should not call handler
    await act(async () => {
      fireEvent.click(continueBtn);
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 11. requireConfirmation=false → no checkbox, Continue enabled
  // ---------------------------------------------------------------------------
  it('shows Continue enabled immediately when requireConfirmation=false (no checkbox)', () => {
    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} requireConfirmation={false} />);
    const continueBtn = screen.getByTestId('continue-button');
    expect(continueBtn).not.toBeDisabled();
    expect(screen.queryByTestId('confirm-checkbox')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 12. requireConfirmation=false → onConfirm fires immediately
  // ---------------------------------------------------------------------------
  it('fires onConfirm immediately when requireConfirmation=false and Continue clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <MfaBackupCodesDisplay codes={SAMPLE_CODES} requireConfirmation={false} onConfirm={onConfirm} />
    );

    await user.click(screen.getByTestId('continue-button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 13. Message overrides
  // ---------------------------------------------------------------------------
  it('applies message overrides', () => {
    render(
      <MfaBackupCodesDisplay
        codes={SAMPLE_CODES}
        messages={{ title: 'Your one-time codes', continueButton: 'I understand' }}
      />
    );
    expect(screen.getByText('Your one-time codes')).toBeInTheDocument();
    expect(screen.getByTestId('continue-button')).toHaveTextContent('I understand');
  });

  // ---------------------------------------------------------------------------
  // 14. Accessible list label
  // ---------------------------------------------------------------------------
  it('renders the codes list with correct aria-label for screen readers', () => {
    render(<MfaBackupCodesDisplay codes={SAMPLE_CODES} />);
    expect(screen.getByRole('list', { name: 'Backup codes' })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 15. Empty codes
  // ---------------------------------------------------------------------------
  it('renders gracefully when codes is empty', () => {
    render(<MfaBackupCodesDisplay codes={[]} />);
    expect(screen.getByRole('list', { name: 'Backup codes' })).toBeInTheDocument();
  });
});
