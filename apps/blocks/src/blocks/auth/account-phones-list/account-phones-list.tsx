'use client';

/**
 * account-phones-list  (registry: auth-account-phones-list)
 *
 * Multi-phone management card. Lists the signed-in user's phone numbers from the
 * generated `usePhoneNumbersQuery`, lets the user add a new number (create row
 * via `useCreatePhoneNumberMutation` then trigger OTP send via the
 * `onSubmitSendOtp` override seam — SMS procedures are backend-pending), verify
 * with an inline 6-digit OTP (`onSubmitVerifyOtp` override seam), set a primary
 * number (`useUpdatePhoneNumberMutation`), and delete with confirmation
 * (`useDeletePhoneNumberMutation`).
 *
 * BACKEND-PENDING (CASE b): `send_sms_otp` and `verify_phone_otp` procedures
 * are NOT yet deployed in constructive_auth_public, so their generated hooks
 * (`useSendSmsOtpMutation`, `useVerifyPhoneOtpMutation`) do NOT exist in the
 * SDK. The add/verify flow therefore uses `onSubmitSendOtp` / `onSubmitVerifyOtp`
 * as the primary (required) seams for those two operations. Hosts wire the
 * generated bindings once they regenerate the SDK after deployment.
 * `requires.json` names both pending ops so `check-sdk.mjs` fails clearly.
 *
 * Binding doctrine:
 *   • All list/CRUD data via generated hooks from `@/generated/auth`. NO fetch,
 *     NO GraphQL document strings, NO `@constructive-io/data`, NO `configure()`.
 *   • Override seams: `onSubmitAdd`, `onSubmitSendOtp`, `onSubmitVerifyOtp`,
 *     `onSubmitSetPrimary`, `onSubmitDelete` fully replace respective calls.
 *   • Error mapping via `parseGraphQLError`; inline `<AuthErrorAlert>` for form
 *     errors; per-action errors reported via `onError` / `onMessage`.
 *   • OTP dialog stays open after phone creation; user enters the code inline.
 *   • 60-second resend cooldown tracked with a useEffect timeout.
 */

import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';
import { Separator } from '@constructive-io/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@constructive-io/ui/dialog';

import { cn } from '@/lib/utils';
import {
  usePhoneNumbersQuery,
  useCreatePhoneNumberMutation,
  useUpdatePhoneNumberMutation,
  useDeletePhoneNumberMutation
} from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import {
  defaultAccountPhonesListMessages,
  type AccountPhonesListMessages,
  type AccountPhonesListMessageOverrides
} from './messages';

// ---------------------------------------------------------------------------
// Country codes — minimal list (no libphonenumber dependency)
// ---------------------------------------------------------------------------

const COUNTRY_CODES = [
  { code: '+1', label: 'US / CA (+1)', value: '+1' },
  { code: '+44', label: 'GB (+44)', value: '+44' },
  { code: '+61', label: 'AU (+61)', value: '+61' },
  { code: '+33', label: 'FR (+33)', value: '+33' },
  { code: '+49', label: 'DE (+49)', value: '+49' },
  { code: '+81', label: 'JP (+81)', value: '+81' },
  { code: '+82', label: 'KR (+82)', value: '+82' },
  { code: '+86', label: 'CN (+86)', value: '+86' },
  { code: '+91', label: 'IN (+91)', value: '+91' },
  { code: '+52', label: 'MX (+52)', value: '+52' },
  { code: '+55', label: 'BR (+55)', value: '+55' },
  { code: '+34', label: 'ES (+34)', value: '+34' },
  { code: '+39', label: 'IT (+39)', value: '+39' },
  { code: '+7', label: 'RU (+7)', value: '+7' },
  { code: '+31', label: 'NL (+31)', value: '+31' },
  { code: '+46', label: 'SE (+46)', value: '+46' },
  { code: '+47', label: 'NO (+47)', value: '+47' },
  { code: '+45', label: 'DK (+45)', value: '+45' },
  { code: '+358', label: 'FI (+358)', value: '+358' },
  { code: '+41', label: 'CH (+41)', value: '+41' }
];

const OTP_RESEND_SECONDS = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PhoneRow = {
  id: string;
  /** Country calling code, e.g. '+1' */
  cc: string;
  /** Phone number without country code */
  number: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string | null;
};

type AddPhoneFormData = {
  cc: string;
  number: string;
};

type OtpFormData = {
  otp: string;
};

export type AccountPhonesListProps = {
  /** Fires after a new phone row is created and OTP sent. */
  onPhoneAdded?: (phone: PhoneRow) => void;
  /** Fires after OTP verified successfully. */
  onPhoneVerified?: (phone: PhoneRow) => void;
  /** Fires after primary promotion. */
  onPrimaryChanged?: (phone: PhoneRow) => void;
  /** Fires after deletion. */
  onPhoneDeleted?: (phoneId: string) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and info events. */
  onMessage?: (event: {
    kind: 'success' | 'error' | 'info' | 'warning';
    key: string;
    message?: string;
  }) => void;
  /**
   * Override the add-phone + send-OTP operation.
   *
   * BACKEND-PENDING: `send_sms_otp` is not yet deployed. This seam is the
   * PRIMARY path for add+OTP-send until the generated `useSendSmsOtpMutation`
   * exists. The host creates the phone row AND sends the OTP within this fn.
   * Return the created PhoneRow.
   */
  onSubmitAdd?: (cc: string, number: string) => Promise<PhoneRow>;
  /**
   * Override the send/resend OTP operation for an existing unverified phone.
   *
   * BACKEND-PENDING: wraps the pending `send_sms_otp` procedure.
   */
  onSubmitSendOtp?: (cc: string, number: string) => Promise<void>;
  /**
   * Override the OTP verify operation.
   *
   * BACKEND-PENDING: wraps the pending `verify_phone_otp` procedure.
   * Receives the phone number (E.164 = cc+number) and the 6-digit OTP.
   * Return the updated PhoneRow on success.
   */
  onSubmitVerifyOtp?: (phoneE164: string, otp: string) => Promise<PhoneRow>;
  /** Override the set-primary operation. */
  onSubmitSetPrimary?: (phoneId: string) => Promise<PhoneRow>;
  /** Override the delete operation. */
  onSubmitDelete?: (phoneId: string) => Promise<void>;
  messages?: AccountPhonesListMessageOverrides;
  /** Default country code for the picker. Default: '+1'. */
  defaultCountry?: string;
  /** Disables add/delete/primary operations. Read-only display mode. */
  readOnly?: boolean;
  /** Max phone numbers allowed. Default: 5. */
  maxPhones?: number;
  className?: string;
};

// ---------------------------------------------------------------------------
// Field selection — mirrors PhoneRow shape
// ---------------------------------------------------------------------------

const PHONE_FIELDS = {
  id: true,
  cc: true,
  number: true,
  isPrimary: true,
  isVerified: true,
  createdAt: true
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toE164(cc: string, number: string): string {
  // Strip any non-digit chars from the local number, prepend cc
  const localDigits = number.replace(/\D/g, '');
  const prefix = cc.startsWith('+') ? cc : `+${cc}`;
  return `${prefix}${localDigits}`;
}

function validatePhone(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountPhonesList({
  onPhoneAdded,
  onPhoneVerified,
  onPrimaryChanged,
  onPhoneDeleted,
  onError,
  onMessage,
  onSubmitAdd: onSubmitAddOverride,
  onSubmitSendOtp: onSubmitSendOtpOverride,
  onSubmitVerifyOtp: onSubmitVerifyOtpOverride,
  onSubmitSetPrimary: onSubmitSetPrimaryOverride,
  onSubmitDelete: onSubmitDeleteOverride,
  messages: messageOverrides,
  defaultCountry = '+1',
  readOnly = false,
  maxPhones = 5,
  className
}: AccountPhonesListProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: AccountPhonesListMessages = {
    ...defaultAccountPhonesListMessages,
    ...messageOverrides,
    errors: { ...defaultAccountPhonesListMessages.errors, ...messageOverrides?.errors }
  };

  // -------------------------------------------------------------------------
  // Query — list phone numbers
  // -------------------------------------------------------------------------

  const phonesQuery = usePhoneNumbersQuery({
    selection: {
      fields: PHONE_FIELDS,
      orderBy: ['CREATED_AT_DESC']
    }
  });

  const phones: PhoneRow[] = (phonesQuery.data?.phoneNumbers?.nodes ?? []) as PhoneRow[];

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const createPhoneMutation = useCreatePhoneNumberMutation({
    selection: { fields: PHONE_FIELDS }
  });

  const updatePhoneMutation = useUpdatePhoneNumberMutation({
    selection: { fields: PHONE_FIELDS }
  });

  const deletePhoneMutation = useDeletePhoneNumberMutation({
    selection: { fields: { id: true } }
  });

  // -------------------------------------------------------------------------
  // Dialog state — add phone (two steps: number → OTP)
  // Step 0 = closed; Step 1 = enter phone number; Step 2 = enter OTP
  // -------------------------------------------------------------------------

  const [addStep, setAddStep] = useState<0 | 1 | 2>(0);
  const [pendingPhone, setPendingPhone] = useState<PhoneRow | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addOverridePending, setAddOverridePending] = useState(false);

  const isAddPending = onSubmitAddOverride ? addOverridePending : createPhoneMutation.isPending;

  // OTP step pending (no generated hook — backend-pending CASE b)
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpOverridePending, setOtpOverridePending] = useState(false);

  // Resend cooldown
  const [resendCountdown, setResendCountdown] = useState(0);

  function startResendCountdown() {
    setResendCountdown(OTP_RESEND_SECONDS);
  }

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timeout = setTimeout(() => {
      setResendCountdown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [resendCountdown]);

  // -------------------------------------------------------------------------
  // Delete confirm state
  // -------------------------------------------------------------------------

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteOverridePending, setDeleteOverridePending] = useState(false);
  const isDeletePending = onSubmitDeleteOverride ? deleteOverridePending : deletePhoneMutation.isPending;

  // -------------------------------------------------------------------------
  // Per-row action pending tracking
  // -------------------------------------------------------------------------

  const [primaryPendingId, setPrimaryPendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // Inline OTP entry: which phone row is being verified
  const [inlineVerifyPhoneId, setInlineVerifyPhoneId] = useState<string | null>(null);
  const [inlineOtpError, setInlineOtpError] = useState<string | null>(null);
  const [inlineOtpPending, setInlineOtpPending] = useState(false);

  // -------------------------------------------------------------------------
  // Add-phone form (step 1)
  // -------------------------------------------------------------------------

  const addForm = useForm({
    defaultValues: { cc: defaultCountry, number: '' } as AddPhoneFormData,
    onSubmit: async ({ value }) => {
      await handleAdd(value.cc, value.number);
    }
  });

  // OTP form (step 2 in dialog)
  const otpForm = useForm({
    defaultValues: { otp: '' } as OtpFormData,
    onSubmit: async ({ value }) => {
      await handleVerifyOtp(value.otp);
    }
  });

  // Inline OTP form (for rows shown in the list)
  const inlineOtpForm = useForm({
    defaultValues: { otp: '' } as OtpFormData,
    onSubmit: async ({ value }) => {
      await handleInlineVerifyOtp(value.otp);
    }
  });

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleAdd(cc: string, number: string) {
    setAddError(null);

    if (!validatePhone(number)) {
      setAddError(merged.errors.INVALID_PHONE);
      return;
    }

    if (onSubmitAddOverride) setAddOverridePending(true);

    try {
      let newRow: PhoneRow;

      if (onSubmitAddOverride) {
        // Host override: creates row + sends OTP in one call
        newRow = await onSubmitAddOverride(cc, number);
        setPendingPhone(newRow);
        onMessage?.({ kind: 'success', key: 'phoneAdded', message: merged.phoneAddedMessage });
        onPhoneAdded?.(newRow);
        startResendCountdown();
        setAddStep(2);
      } else {
        // Default path: create the phone row (CASE b — no sendSmsOtp generated hook).
        // The OTP-send seam requires onSubmitSendOtp override when SMS is needed.
        const createData = await createPhoneMutation.mutateAsync({ cc, number });
        newRow = createData.createPhoneNumber.phoneNumber as unknown as PhoneRow;
        setPendingPhone(newRow);
        onMessage?.({ kind: 'success', key: 'phoneAdded', message: merged.phoneAddedMessage });
        onPhoneAdded?.(newRow);

        // If the host has provided a send-OTP override, call it now
        if (onSubmitSendOtpOverride) {
          try {
            await onSubmitSendOtpOverride(cc, number);
            onMessage?.({ kind: 'info', key: 'otpSent', message: merged.otpSentMessage });
          } catch (otpErr) {
            const { code, message } = parseGraphQLError(otpErr, {
              customMessages: merged.errors,
              defaultMessage: merged.errors.UNKNOWN_ERROR
            });
            const key = code ?? 'UNKNOWN_ERROR';
            onMessage?.({ kind: 'error', key, message });
            onError?.({ message, code: key });
            // Don't block — phone was created, OTP send failed
          }
        }
        startResendCountdown();
        setAddStep(2);
      }
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setAddError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitAddOverride) setAddOverridePending(false);
    }
  }

  async function handleVerifyOtp(otp: string) {
    if (!pendingPhone) return;
    setOtpError(null);

    if (!otp || otp.length !== 6) {
      setOtpError(merged.errors.INVALID_OTP);
      return;
    }

    setOtpOverridePending(true);
    const phoneE164 = toE164(pendingPhone.cc, pendingPhone.number);

    try {
      if (onSubmitVerifyOtpOverride) {
        const updatedRow = await onSubmitVerifyOtpOverride(phoneE164, otp);
        onMessage?.({ kind: 'success', key: 'phoneVerified', message: merged.phoneVerifiedMessage });
        onPhoneVerified?.(updatedRow);
      } else {
        // CASE b — no generated verify hook. Surface PROCEDURE_NOT_FOUND.
        throw Object.assign(new Error('verify_phone_otp not deployed'), {
          extensions: { code: 'PROCEDURE_NOT_FOUND' }
        });
      }
      // Close dialog after successful verify
      setAddStep(0);
      setPendingPhone(null);
      otpForm.reset();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setOtpError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setOtpOverridePending(false);
    }
  }

  async function handleResendOtp() {
    if (!pendingPhone || resendCountdown > 0) return;
    setOtpError(null);

    try {
      if (onSubmitSendOtpOverride) {
        await onSubmitSendOtpOverride(pendingPhone.cc, pendingPhone.number);
        onMessage?.({ kind: 'info', key: 'otpSent', message: merged.otpSentMessage });
      } else {
        throw Object.assign(new Error('send_sms_otp not deployed'), {
          extensions: { code: 'PROCEDURE_NOT_FOUND' }
        });
      }
      startResendCountdown();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setOtpError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    }
  }

  async function handleSetPrimary(phoneId: string) {
    setRowError(null);
    setPrimaryPendingId(phoneId);
    try {
      let updatedRow: PhoneRow;
      if (onSubmitSetPrimaryOverride) {
        updatedRow = await onSubmitSetPrimaryOverride(phoneId);
      } else {
        const data = await updatePhoneMutation.mutateAsync({
          id: phoneId,
          phoneNumberPatch: { isPrimary: true }
        });
        updatedRow = data.updatePhoneNumber.phoneNumber as unknown as PhoneRow;
      }
      onMessage?.({ kind: 'success', key: 'primaryChanged', message: merged.primaryChangedMessage });
      onPrimaryChanged?.(updatedRow);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setRowError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setPrimaryPendingId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setRowError(null);
    if (onSubmitDeleteOverride) setDeleteOverridePending(true);
    try {
      if (onSubmitDeleteOverride) {
        await onSubmitDeleteOverride(deleteTargetId);
      } else {
        await deletePhoneMutation.mutateAsync({ id: deleteTargetId });
      }
      const deletedId = deleteTargetId;
      setDeleteTargetId(null);
      onMessage?.({ kind: 'success', key: 'phoneDeleted', message: merged.phoneDeletedMessage });
      onPhoneDeleted?.(deletedId);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setRowError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
      setDeleteTargetId(null);
    } finally {
      if (onSubmitDeleteOverride) setDeleteOverridePending(false);
    }
  }

  async function handleInlineSendOtp(phone: PhoneRow) {
    setInlineOtpError(null);
    setInlineVerifyPhoneId(phone.id);
    inlineOtpForm.reset();
    try {
      if (onSubmitSendOtpOverride) {
        await onSubmitSendOtpOverride(phone.cc, phone.number);
        onMessage?.({ kind: 'info', key: 'otpSent', message: merged.otpSentMessage });
      } else {
        throw Object.assign(new Error('send_sms_otp not deployed'), {
          extensions: { code: 'PROCEDURE_NOT_FOUND' }
        });
      }
      startResendCountdown();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setRowError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    }
  }

  async function handleInlineVerifyOtp(otp: string) {
    const phone = phones.find((p) => p.id === inlineVerifyPhoneId);
    if (!phone) return;
    setInlineOtpError(null);

    if (!otp || otp.length !== 6) {
      setInlineOtpError(merged.errors.INVALID_OTP);
      return;
    }

    setInlineOtpPending(true);
    const phoneE164 = toE164(phone.cc, phone.number);

    try {
      if (onSubmitVerifyOtpOverride) {
        const updatedRow = await onSubmitVerifyOtpOverride(phoneE164, otp);
        onMessage?.({ kind: 'success', key: 'phoneVerified', message: merged.phoneVerifiedMessage });
        onPhoneVerified?.(updatedRow);
      } else {
        throw Object.assign(new Error('verify_phone_otp not deployed'), {
          extensions: { code: 'PROCEDURE_NOT_FOUND' }
        });
      }
      setInlineVerifyPhoneId(null);
      inlineOtpForm.reset();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setInlineOtpError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      setInlineOtpPending(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const atMax = phones.length >= maxPhones;
  const deleteTarget = phones.find((p) => p.id === deleteTargetId);

  function formatPhoneDisplay(phone: PhoneRow): string {
    return `${phone.cc} ${phone.number}`;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <Card data-slot="account-phones-list" className={cn('w-full', className)}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{merged.title}</CardTitle>
            <CardDescription>{merged.description}</CardDescription>
          </div>
          {!readOnly && !atMax && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddError(null);
                addForm.reset();
                setAddStep(1);
              }}
              data-testid="add-phone-button"
            >
              {merged.addPhoneButton}
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {rowError && (
            <div className="px-6 pb-2">
              <AuthErrorAlert error={rowError} />
            </div>
          )}

          {phonesQuery.isLoading ? (
            <div className="px-6 py-4 text-sm text-muted-foreground" data-testid="phones-loading">
              Loading…
            </div>
          ) : phones.length === 0 ? (
            <div className="px-6 py-4 text-sm text-muted-foreground" data-testid="phones-empty">
              No phone numbers found.
            </div>
          ) : (
            <ul role="list" className="divide-y divide-border/40 list-none">
              {phones.map((phone, idx) => (
                <li key={phone.id} data-testid={`phone-row-${phone.id}`}>
                  {idx > 0 && <Separator />}
                  <div className="flex flex-col gap-3 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Phone + badges */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span
                          className="truncate text-sm font-medium"
                          data-testid={`phone-number-${phone.id}`}
                        >
                          {formatPhoneDisplay(phone)}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {phone.isPrimary && (
                            <Badge variant="default" data-testid={`badge-primary-${phone.id}`}>
                              {merged.primaryBadge}
                            </Badge>
                          )}
                          <Badge
                            variant={phone.isVerified ? 'success' : 'warning'}
                            role="status"
                            data-testid={
                              phone.isVerified
                                ? `badge-verified-${phone.id}`
                                : `badge-unverified-${phone.id}`
                            }
                          >
                            {phone.isVerified ? merged.verifiedBadge : merged.unverifiedBadge}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      {!readOnly && (
                        <div className="flex shrink-0 items-center gap-2">
                          {/* Verify — for unverified phones */}
                          {!phone.isVerified && inlineVerifyPhoneId !== phone.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInlineSendOtp(phone)}
                              data-testid={`verify-button-${phone.id}`}
                            >
                              {merged.verifyButton}
                            </Button>
                          )}

                          {/* Set primary — only for verified non-primary */}
                          {!phone.isPrimary && phone.isVerified && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={primaryPendingId === phone.id}
                              onClick={() => handleSetPrimary(phone.id)}
                              data-testid={`set-primary-button-${phone.id}`}
                            >
                              {merged.setPrimaryButton}
                            </Button>
                          )}

                          {/* Delete — disabled for primary */}
                          <Button
                            variant="destructive-outline"
                            size="sm"
                            disabled={phone.isPrimary}
                            title={phone.isPrimary ? merged.cannotDeletePrimary : undefined}
                            aria-hidden={phone.isPrimary}
                            onClick={() => !phone.isPrimary && setDeleteTargetId(phone.id)}
                            data-testid={`delete-button-${phone.id}`}
                          >
                            {merged.deleteButton}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Inline OTP entry for this row */}
                    {!readOnly && inlineVerifyPhoneId === phone.id && (
                      <div
                        className="rounded-md border border-border/40 bg-muted/20 p-4 space-y-3"
                        data-testid={`otp-inline-${phone.id}`}
                      >
                        <AuthErrorAlert error={inlineOtpError} />
                        <form
                          noValidate
                          aria-busy={inlineOtpPending}
                          className="flex items-end gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            inlineOtpForm.handleSubmit();
                          }}
                        >
                          <div className="flex-1">
                            <inlineOtpForm.Field
                              name="otp"
                              validators={{
                                onChange: ({ value }) => {
                                  if (!value) return 'Code is required';
                                  if (!/^\d{6}$/.test(value)) return 'Enter the 6-digit code';
                                  return undefined;
                                }
                              }}
                            >
                              {(field) => (
                                <FormField
                                  field={field}
                                  label={merged.otpLabel}
                                  placeholder={merged.otpPlaceholder}
                                  type="text"
                                  testId={`otp-input-${phone.id}`}
                                />
                              )}
                            </inlineOtpForm.Field>
                          </div>
                          <AuthLoadingButton
                            type="submit"
                            size="sm"
                            isLoading={inlineOtpPending}
                            loadingText={merged.otpSubmitting}
                            data-testid={`otp-submit-${phone.id}`}
                          >
                            {merged.otpSubmit}
                          </AuthLoadingButton>
                        </form>

                        <div className="flex items-center gap-2" aria-live="polite">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={resendCountdown > 0}
                            onClick={() => {
                              if (resendCountdown <= 0) handleInlineSendOtp(phone);
                            }}
                            data-testid={`otp-resend-${phone.id}`}
                          >
                            {resendCountdown > 0
                              ? merged.otpResendCooldown.replace('{{seconds}}', String(resendCountdown))
                              : merged.resendButton}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setInlineVerifyPhoneId(null);
                              setInlineOtpError(null);
                              inlineOtpForm.reset();
                            }}
                            data-testid={`otp-cancel-${phone.id}`}
                          >
                            {merged.deleteCancelButton}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------
          Add phone dialog — step 1: enter phone number
                          — step 2: enter OTP
      --------------------------------------------------------------- */}
      <Dialog
        open={addStep > 0}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setAddStep(0);
            setPendingPhone(null);
            setAddError(null);
            setOtpError(null);
            addForm.reset();
            otpForm.reset();
          }
        }}
      >
        <DialogContent data-slot="add-phone-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{merged.addPhoneDialogTitle}</DialogTitle>
            <DialogDescription aria-live="polite" />
          </DialogHeader>

          {addStep === 1 && (
            <div className="px-6 pb-2 space-y-4">
              <AuthErrorAlert error={addError} />

              <form
                noValidate
                aria-busy={isAddPending}
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addForm.handleSubmit();
                }}
              >
                {/* Country code selector */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="add-phone-cc">
                    {merged.countryCodeLabel}
                  </label>
                  <addForm.Field name="cc">
                    {(field) => (
                      <select
                        id="add-phone-cc"
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        data-testid="add-phone-cc"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </addForm.Field>
                </div>

                {/* Phone number input */}
                <addForm.Field
                  name="number"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value) return 'Phone number is required';
                      if (!validatePhone(value)) return merged.errors.INVALID_PHONE;
                      return undefined;
                    }
                  }}
                >
                  {(field) => (
                    <FormField
                      field={field}
                      label={merged.phoneLabel}
                      placeholder={merged.phonePlaceholder}
                      type="tel"
                      testId="add-phone-number"
                    />
                  )}
                </addForm.Field>

                <DialogFooter variant="bare">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setAddStep(0);
                      setAddError(null);
                    }}
                    data-testid="add-phone-cancel"
                  >
                    {merged.deleteCancelButton}
                  </Button>
                  <AuthLoadingButton
                    type="submit"
                    isLoading={isAddPending}
                    loadingText={merged.addPhoneSubmitting}
                    data-testid="add-phone-submit"
                  >
                    {merged.addPhoneSubmit}
                  </AuthLoadingButton>
                </DialogFooter>
              </form>
            </div>
          )}

          {addStep === 2 && (
            <div className="px-6 pb-2 space-y-4">
              {pendingPhone && (
                <p className="text-sm text-muted-foreground">
                  {merged.phoneAddedMessage}
                </p>
              )}

              <AuthErrorAlert error={otpError} />

              <form
                noValidate
                aria-busy={otpOverridePending}
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  otpForm.handleSubmit();
                }}
              >
                <otpForm.Field
                  name="otp"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value) return 'Code is required';
                      if (!/^\d{6}$/.test(value)) return 'Enter the 6-digit code';
                      return undefined;
                    }
                  }}
                >
                  {(field) => (
                    <FormField
                      field={field}
                      label={merged.otpLabel}
                      placeholder={merged.otpPlaceholder}
                      type="text"
                      testId="dialog-otp-input"
                    />
                  )}
                </otpForm.Field>

                <DialogFooter variant="bare">
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setAddStep(0);
                          setPendingPhone(null);
                          setOtpError(null);
                          otpForm.reset();
                        }}
                        data-testid="otp-dialog-cancel"
                      >
                        {merged.deleteCancelButton}
                      </Button>
                      <AuthLoadingButton
                        type="submit"
                        isLoading={otpOverridePending}
                        loadingText={merged.otpSubmitting}
                        data-testid="otp-dialog-submit"
                      >
                        {merged.otpSubmit}
                      </AuthLoadingButton>
                    </div>
                    <div aria-live="polite">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={resendCountdown > 0}
                        onClick={handleResendOtp}
                        data-testid="otp-dialog-resend"
                      >
                        {resendCountdown > 0
                          ? merged.otpResendCooldown.replace('{{seconds}}', String(resendCountdown))
                          : merged.resendButton}
                      </Button>
                    </div>
                  </div>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------
          Delete confirm dialog
      --------------------------------------------------------------- */}
      <Dialog
        open={deleteTargetId !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleteTargetId(null);
        }}
      >
        <DialogContent data-slot="delete-phone-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{merged.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{merged.deleteConfirmDescription}</DialogDescription>
          </DialogHeader>

          <DialogFooter variant="bare">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTargetId(null)}
              data-testid="delete-phone-cancel"
            >
              {merged.deleteCancelButton}
            </Button>
            <AuthLoadingButton
              type="button"
              variant="destructive"
              isLoading={isDeletePending}
              loadingText={merged.deleteConfirmButton}
              onClick={handleDeleteConfirm}
              data-testid="delete-phone-confirm"
            >
              {merged.deleteConfirmButton}
            </AuthLoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invisible element to expose deleteTarget for tests */}
      {deleteTarget && (
        <span data-testid="delete-target-phone" className="sr-only">
          {formatPhoneDisplay(deleteTarget)}
        </span>
      )}
    </>
  );
}
