import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The data path uses generated hooks from `@/generated/auth` — mock the module
// so no real client is touched (sdk-binding-contract.md: tests mock `@/generated/<ns>`).
//
// NOTE: useSendSmsOtpMutation and useVerifyPhoneOtpMutation are NOT present in
// this mock because those procedures are backend-pending CASE b — no generated
// hooks exist in the SDK. The block compiles and tests use the onSubmit override
// seams for those operations.
const {
  mutateAsyncCreateMock,
  mutateAsyncUpdateMock,
  mutateAsyncDeleteMock,
  phonesQueryDataMock
} = vi.hoisted(() => ({
  mutateAsyncCreateMock: vi.fn(),
  mutateAsyncUpdateMock: vi.fn(),
  mutateAsyncDeleteMock: vi.fn(),
  phonesQueryDataMock: vi.fn()
}));

vi.mock('@/generated/auth', () => ({
  usePhoneNumbersQuery: (params: unknown) => ({
    data: phonesQueryDataMock(params),
    isLoading: false
  }),
  useCreatePhoneNumberMutation: () => ({
    mutateAsync: mutateAsyncCreateMock,
    isPending: false
  }),
  useUpdatePhoneNumberMutation: () => ({
    mutateAsync: mutateAsyncUpdateMock,
    isPending: false
  }),
  useDeletePhoneNumberMutation: () => ({
    mutateAsync: mutateAsyncDeleteMock,
    isPending: false
  })
}));

import { AccountPhonesList } from './account-phones-list';
import { defaultAccountPhonesListMessages } from './messages';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePhone(
  overrides: Partial<{
    id: string;
    cc: string;
    number: string;
    isPrimary: boolean;
    isVerified: boolean;
    createdAt: string | null;
  }> = {}
) {
  return {
    id: 'p1',
    cc: '+1',
    number: '5555550001',
    isPrimary: false,
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

function twoPhones() {
  return {
    phoneNumbers: {
      nodes: [
        makePhone({ id: 'p1', cc: '+1', number: '5555550001', isPrimary: true, isVerified: true }),
        makePhone({ id: 'p2', cc: '+44', number: '7700900001', isPrimary: false, isVerified: true })
      ]
    }
  };
}

beforeEach(() => {
  mutateAsyncCreateMock.mockReset();
  mutateAsyncUpdateMock.mockReset();
  mutateAsyncDeleteMock.mockReset();
  phonesQueryDataMock.mockReturnValue({ phoneNumbers: { nodes: [] } });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openAddDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('add-phone-button'));
}

async function fillAndSubmitAdd(
  user: ReturnType<typeof userEvent.setup>,
  { number = '5555550099' } = {}
) {
  await openAddDialog(user);
  await user.clear(screen.getByTestId('add-phone-number'));
  await user.type(screen.getByTestId('add-phone-number'), number);
  await user.click(screen.getByTestId('add-phone-submit'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountPhonesList', () => {
  it('renders the card title and description', () => {
    render(<AccountPhonesList />);
    expect(screen.getByText(defaultAccountPhonesListMessages.title)).toBeInTheDocument();
    expect(screen.getByText(defaultAccountPhonesListMessages.description)).toBeInTheDocument();
  });

  it('renders empty state when there are no phones', () => {
    render(<AccountPhonesList />);
    expect(screen.getByTestId('phones-empty')).toBeInTheDocument();
  });

  it('renders phone rows with primary and verified badges', () => {
    phonesQueryDataMock.mockReturnValue(twoPhones());
    render(<AccountPhonesList />);

    const primaryRow = screen.getByTestId('phone-row-p1');
    expect(within(primaryRow).getByTestId('badge-primary-p1')).toHaveTextContent('Primary');
    expect(within(primaryRow).getByTestId('badge-verified-p1')).toHaveTextContent('Verified');

    const secondaryRow = screen.getByTestId('phone-row-p2');
    expect(within(secondaryRow).queryByTestId('badge-primary-p2')).not.toBeInTheDocument();
    expect(within(secondaryRow).getByTestId('badge-verified-p2')).toHaveTextContent('Verified');
  });

  it('disables delete button for primary phone and enables for non-primary', () => {
    phonesQueryDataMock.mockReturnValue(twoPhones());
    render(<AccountPhonesList />);

    expect(screen.getByTestId('delete-button-p1')).toBeDisabled();
    expect(screen.getByTestId('delete-button-p2')).not.toBeDisabled();
  });

  it('shows unverified badge and verify button for unverified phone', () => {
    phonesQueryDataMock.mockReturnValue({
      phoneNumbers: {
        nodes: [makePhone({ id: 'p3', isPrimary: false, isVerified: false })]
      }
    });
    render(<AccountPhonesList />);
    expect(screen.getByTestId('badge-unverified-p3')).toHaveTextContent('Unverified');
    expect(screen.getByTestId('verify-button-p3')).toBeInTheDocument();
  });

  it('add-phone with onSubmitAdd override: calls override, opens OTP step, fires onPhoneAdded', async () => {
    const user = userEvent.setup();
    const onPhoneAdded = vi.fn();
    const onMessage = vi.fn();
    const newRow = makePhone({ id: 'p99', cc: '+1', number: '5555550099', isVerified: false });
    const onSubmitAdd = vi.fn().mockResolvedValue(newRow);

    render(
      <AccountPhonesList onSubmitAdd={onSubmitAdd} onPhoneAdded={onPhoneAdded} onMessage={onMessage} />
    );
    await fillAndSubmitAdd(user);

    await waitFor(() => expect(onSubmitAdd).toHaveBeenCalledTimes(1));
    expect(onSubmitAdd).toHaveBeenCalledWith('+1', '5555550099');
    await waitFor(() => expect(onPhoneAdded).toHaveBeenCalledTimes(1));
    expect(onPhoneAdded).toHaveBeenCalledWith(expect.objectContaining({ id: 'p99' }));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'phoneAdded' })
    );

    // OTP step should be visible in the dialog
    expect(await screen.findByTestId('dialog-otp-input')).toBeInTheDocument();
    // Generated create mutation should NOT have been called (override used)
    expect(mutateAsyncCreateMock).not.toHaveBeenCalled();
  });

  it('add-phone default path (no override): calls createPhoneNumber mutation', async () => {
    const user = userEvent.setup();
    const onPhoneAdded = vi.fn();
    const newRow = makePhone({ id: 'p55', cc: '+1', number: '5555550055', isVerified: false });
    mutateAsyncCreateMock.mockResolvedValue({ createPhoneNumber: { phoneNumber: newRow } });

    render(<AccountPhonesList onPhoneAdded={onPhoneAdded} />);
    await fillAndSubmitAdd(user, { number: '5555550055' });

    await waitFor(() => expect(mutateAsyncCreateMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncCreateMock).toHaveBeenCalledWith({ cc: '+1', number: '5555550055' });
    await waitFor(() => expect(onPhoneAdded).toHaveBeenCalledTimes(1));
  });

  it('add-phone error: shows inline error alert and fires onError', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();

    const onSubmitAdd = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('rate limited'), { extensions: { code: 'RATE_LIMITED' } })
      );

    render(
      <AccountPhonesList
        onSubmitAdd={onSubmitAdd}
        onError={onError}
        onMessage={onMessage}
        messages={{ errors: { RATE_LIMITED: 'Slow down.' } }}
      />
    );
    await fillAndSubmitAdd(user);

    expect(await screen.findByText('Slow down.')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith({ message: 'Slow down.', code: 'RATE_LIMITED' });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'RATE_LIMITED', message: 'Slow down.' })
    );
  });

  it('add-phone validates invalid phone and blocks submit', async () => {
    const user = userEvent.setup();
    const onSubmitAdd = vi.fn();
    render(<AccountPhonesList onSubmitAdd={onSubmitAdd} />);
    await openAddDialog(user);
    await user.type(screen.getByTestId('add-phone-number'), '123');
    await user.click(screen.getByTestId('add-phone-submit'));

    // Field-level error appears
    expect(
      await screen.findByText(defaultAccountPhonesListMessages.errors.INVALID_PHONE)
    ).toBeInTheDocument();
    expect(onSubmitAdd).not.toHaveBeenCalled();
  });

  it('OTP verify with onSubmitVerifyOtp override: calls override, fires onPhoneVerified', async () => {
    const user = userEvent.setup();
    const onPhoneVerified = vi.fn();
    const onMessage = vi.fn();
    // The pending phone row returned by onSubmitAdd — number matches what we type in the form
    const newRow = makePhone({ id: 'p99', cc: '+1', number: '5555550099', isVerified: false });
    const verifiedRow = { ...newRow, isVerified: true };
    const onSubmitAdd = vi.fn().mockResolvedValue(newRow);
    const onSubmitVerifyOtp = vi.fn().mockResolvedValue(verifiedRow);

    render(
      <AccountPhonesList
        onSubmitAdd={onSubmitAdd}
        onSubmitVerifyOtp={onSubmitVerifyOtp}
        onPhoneVerified={onPhoneVerified}
        onMessage={onMessage}
      />
    );

    // Add phone (number = '5555550099') to reach OTP step
    await fillAndSubmitAdd(user, { number: '5555550099' });
    await waitFor(() => expect(screen.getByTestId('dialog-otp-input')).toBeInTheDocument());

    // Enter 6-digit code
    await user.type(screen.getByTestId('dialog-otp-input'), '123456');
    await user.click(screen.getByTestId('otp-dialog-submit'));

    await waitFor(() => expect(onSubmitVerifyOtp).toHaveBeenCalledTimes(1));
    // E.164: cc '+1' + number '5555550099'
    expect(onSubmitVerifyOtp).toHaveBeenCalledWith('+15555550099', '123456');
    await waitFor(() => expect(onPhoneVerified).toHaveBeenCalledTimes(1));
    expect(onPhoneVerified).toHaveBeenCalledWith(expect.objectContaining({ isVerified: true }));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'phoneVerified' })
    );
  });

  it('OTP verify without override: surfaces PROCEDURE_NOT_FOUND error', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const newRow = makePhone({ id: 'p99', isVerified: false });
    const onSubmitAdd = vi.fn().mockResolvedValue(newRow);

    render(<AccountPhonesList onSubmitAdd={onSubmitAdd} onError={onError} onMessage={onMessage} />);

    await fillAndSubmitAdd(user);
    await waitFor(() => expect(screen.getByTestId('dialog-otp-input')).toBeInTheDocument());

    await user.type(screen.getByTestId('dialog-otp-input'), '123456');
    await user.click(screen.getByTestId('otp-dialog-submit'));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'PROCEDURE_NOT_FOUND' })
      )
    );
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', key: 'PROCEDURE_NOT_FOUND' })
    );
    // The PROCEDURE_NOT_FOUND message from the catalog should appear
    expect(
      await screen.findByText(defaultAccountPhonesListMessages.errors.PROCEDURE_NOT_FOUND)
    ).toBeInTheDocument();
  });

  it('set-primary: calls updatePhoneNumber, fires onPrimaryChanged and onMessage', async () => {
    const user = userEvent.setup();
    const onPrimaryChanged = vi.fn();
    const onMessage = vi.fn();
    const updatedRow = makePhone({ id: 'p2', cc: '+44', number: '7700900001', isPrimary: true });
    mutateAsyncUpdateMock.mockResolvedValue({ updatePhoneNumber: { phoneNumber: updatedRow } });
    phonesQueryDataMock.mockReturnValue(twoPhones());

    render(<AccountPhonesList onPrimaryChanged={onPrimaryChanged} onMessage={onMessage} />);
    await user.click(screen.getByTestId('set-primary-button-p2'));

    await waitFor(() => expect(mutateAsyncUpdateMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncUpdateMock).toHaveBeenCalledWith({
      id: 'p2',
      phoneNumberPatch: { isPrimary: true }
    });
    await waitFor(() => expect(onPrimaryChanged).toHaveBeenCalledTimes(1));
    expect(onPrimaryChanged).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' }));
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'primaryChanged' })
    );
  });

  it('delete non-primary: opens confirm dialog, calls deletePhoneNumber, fires onPhoneDeleted', async () => {
    const user = userEvent.setup();
    const onPhoneDeleted = vi.fn();
    const onMessage = vi.fn();
    mutateAsyncDeleteMock.mockResolvedValue({ deletePhoneNumber: { phoneNumber: { id: 'p2' } } });
    phonesQueryDataMock.mockReturnValue(twoPhones());

    render(<AccountPhonesList onPhoneDeleted={onPhoneDeleted} onMessage={onMessage} />);

    await user.click(screen.getByTestId('delete-button-p2'));
    expect(await screen.findByTestId('delete-phone-confirm')).toBeInTheDocument();

    await user.click(screen.getByTestId('delete-phone-confirm'));

    await waitFor(() => expect(mutateAsyncDeleteMock).toHaveBeenCalledTimes(1));
    expect(mutateAsyncDeleteMock).toHaveBeenCalledWith({ id: 'p2' });
    await waitFor(() => expect(onPhoneDeleted).toHaveBeenCalledTimes(1));
    expect(onPhoneDeleted).toHaveBeenCalledWith('p2');
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', key: 'phoneDeleted' })
    );
  });

  it('delete primary phone: delete button is disabled and mutation is never called', async () => {
    const user = userEvent.setup();
    phonesQueryDataMock.mockReturnValue(twoPhones());
    render(<AccountPhonesList />);

    const primaryDeleteBtn = screen.getByTestId('delete-button-p1');
    expect(primaryDeleteBtn).toBeDisabled();
    await user.click(primaryDeleteBtn);
    expect(mutateAsyncDeleteMock).not.toHaveBeenCalled();
  });

  it('onSubmitSetPrimary override: calls override fn, skips generated hook', async () => {
    const user = userEvent.setup();
    const overrideRow = makePhone({ id: 'p2', isPrimary: true });
    const onSubmitSetPrimary = vi.fn().mockResolvedValue(overrideRow);
    const onPrimaryChanged = vi.fn();
    phonesQueryDataMock.mockReturnValue(twoPhones());

    render(
      <AccountPhonesList onSubmitSetPrimary={onSubmitSetPrimary} onPrimaryChanged={onPrimaryChanged} />
    );
    await user.click(screen.getByTestId('set-primary-button-p2'));

    await waitFor(() => expect(onSubmitSetPrimary).toHaveBeenCalledTimes(1));
    expect(onSubmitSetPrimary).toHaveBeenCalledWith('p2');
    expect(mutateAsyncUpdateMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(onPrimaryChanged).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' }))
    );
  });

  it('readOnly mode: hides all action buttons', () => {
    phonesQueryDataMock.mockReturnValue(twoPhones());
    render(<AccountPhonesList readOnly />);

    expect(screen.queryByTestId('add-phone-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-button-p1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-button-p2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('set-primary-button-p2')).not.toBeInTheDocument();
  });

  it('verify inline: clicking verify sends OTP via onSubmitSendOtp, shows inline OTP field', async () => {
    const user = userEvent.setup();
    const onMessage = vi.fn();
    const onSubmitSendOtp = vi.fn().mockResolvedValue(undefined);
    phonesQueryDataMock.mockReturnValue({
      phoneNumbers: {
        nodes: [makePhone({ id: 'p5', isPrimary: false, isVerified: false })]
      }
    });

    render(<AccountPhonesList onSubmitSendOtp={onSubmitSendOtp} onMessage={onMessage} />);
    await user.click(screen.getByTestId('verify-button-p5'));

    await waitFor(() => expect(onSubmitSendOtp).toHaveBeenCalledTimes(1));
    expect(onSubmitSendOtp).toHaveBeenCalledWith('+1', '5555550001');
    expect(await screen.findByTestId(`otp-input-p5`)).toBeInTheDocument();
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'info', key: 'otpSent' })
    );
  });

  it('resend countdown decrements to zero, restarts, and cleans up on unmount', async () => {
    vi.useFakeTimers();
    const onSubmitSendOtp = vi.fn().mockResolvedValue(undefined);
    phonesQueryDataMock.mockReturnValue({
      phoneNumbers: {
        nodes: [makePhone({ id: 'p5', isPrimary: false, isVerified: false })]
      }
    });

    const { unmount } = render(<AccountPhonesList onSubmitSendOtp={onSubmitSendOtp} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('verify-button-p5'));
    });

    const resendButton = screen.getByTestId('otp-resend-p5');
    expect(resendButton).toHaveTextContent('Resend in 60s');
    expect(resendButton).toBeDisabled();
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(resendButton).toHaveTextContent('Resend in 59s');
    expect(vi.getTimerCount()).toBe(1);

    for (let second = 0; second < 59; second += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(resendButton).toHaveTextContent('Resend code');
    expect(resendButton).not.toBeDisabled();
    expect(vi.getTimerCount()).toBe(0);

    await act(async () => {
      fireEvent.click(resendButton);
    });
    expect(onSubmitSendOtp).toHaveBeenCalledTimes(2);
    expect(resendButton).toHaveTextContent('Resend in 60s');
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('verify inline without onSubmitSendOtp: surfaces PROCEDURE_NOT_FOUND', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    phonesQueryDataMock.mockReturnValue({
      phoneNumbers: {
        nodes: [makePhone({ id: 'p6', isPrimary: false, isVerified: false })]
      }
    });

    render(<AccountPhonesList onError={onError} />);
    await user.click(screen.getByTestId('verify-button-p6'));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'PROCEDURE_NOT_FOUND' })
      )
    );
    expect(
      await screen.findByText(defaultAccountPhonesListMessages.errors.PROCEDURE_NOT_FOUND)
    ).toBeInTheDocument();
  });

  it('messages override applies to a single error code', async () => {
    const user = userEvent.setup();
    const onSubmitAdd = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('invalid'), { extensions: { code: 'INVALID_PHONE' } })
      );

    render(
      <AccountPhonesList
        onSubmitAdd={onSubmitAdd}
        messages={{ errors: { INVALID_PHONE: 'Bad number.' } }}
      />
    );
    await fillAndSubmitAdd(user, { number: '5555550099' });

    expect(await screen.findByText('Bad number.')).toBeInTheDocument();
  });
});
