'use client';

/**
 * mfa-totp-challenge  (registry: auth-mfa-totp-challenge)
 *
 * Presents a 6-digit TOTP code input when `sign_in` returns
 * `mfa_required=true` with a non-null `mfa_challenge_token`.
 *
 * BACKEND-PENDING CASE (b): `complete_mfa_challenge` is not yet deployed in
 * `constructive_auth_public`, so `useCompleteMfaChallengeMutation` does NOT
 * exist in the generated `auth` SDK. To keep tsc clean the import from
 * `@/generated/auth` is OMITTED here. The `onSubmit` override seam is the
 * primary call path (the host wires the generated binding after they
 * regenerate the SDK). Until then PROCEDURE_NOT_FOUND surfaces at runtime.
 * See: sdk-binding-contract.md §10, planning/blocks/auth/auth-mfa-totp-challenge.md
 *
 * Data-binding contract (sdk-binding-contract.md §5):
 *   Hook: useCompleteMfaChallengeMutation (pending — not in SDK yet)
 *   Namespace: auth
 *   Import (when deployed): import { useCompleteMfaChallengeMutation } from '@/generated/auth'
 *   Op: completeMfaChallenge
 *   Payload key: d.completeMfaChallenge
 */

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Checkbox } from '@constructive-io/ui/checkbox';

import { Input } from '@constructive-io/ui/input';
import { FormControl } from '@constructive-io/ui/form-control';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';

import { defaultMfaTotpChallengeMessages, type MfaTotpChallengeMessages } from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The session/user payload returned after a successful MFA challenge. */
export type MfaChallengeResult = {
  session: { id: string; accessToken: string; expiresAt: string };
  user: { id: string; [key: string]: unknown };
  redirectTo?: string;
};

/** Vars the submit call receives. The override `onSubmit` gets these verbatim. */
export type MfaTotpChallengeVars = {
  totpValue: string;
  trustDevice: boolean;
  challengeToken: string;
  mfaMethod: string;
  credentialKind: string;
  deviceToken?: string;
  rememberMe?: boolean;
};

/**
 * Deep-partial message override type: top-level keys are shallow-partial;
 * `errors` is itself partial so a host can localize a single error code without
 * restating the whole map.
 */
export type MfaTotpChallengeMessageOverrides = Partial<Omit<MfaTotpChallengeMessages, 'errors'>> & {
  errors?: Partial<MfaTotpChallengeMessages['errors']>;
};

// ---------------------------------------------------------------------------
// Internal form values shape
// ---------------------------------------------------------------------------

type TotpFormData = {
  totpCode: string;
  trustDevice: boolean;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type MfaTotpChallengeProps = {
  /** The mfa_challenge_token from the sign_in result. Required. */
  challengeToken: string;
  /** The mfa_method to pass to complete_mfa_challenge. Default: 'totp'. */
  mfaMethod?: string;
  /** The credential_kind to use for session creation. Default: 'bearer'. */
  credentialKind?: string;
  /** Whether the "Trust this device for 30 days" checkbox is shown. Default: true. */
  showTrustDevice?: boolean;
  /**
   * Backup-code path affordance — locked false in v1; enable when
   * verify_backup_code lands. See: backend-spec/future-procedures.md
   */
  allowBackupCode?: false;
  messages?: MfaTotpChallengeMessageOverrides;
  /**
   * Replace the default `useCompleteMfaChallengeMutation` call (backend-pending).
   * In v1 this is the PRIMARY path — the host provides a custom implementation
   * until `complete_mfa_challenge` is deployed.
   */
  onSubmit?: (vars: MfaTotpChallengeVars) => Promise<MfaChallengeResult>;
  /** Fires after MFA challenge completed and session is active. Always fires. */
  onSuccess?: (result: MfaChallengeResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and mapped errors. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MfaTotpChallenge({
  challengeToken,
  mfaMethod = 'totp',
  credentialKind = 'bearer',
  showTrustDevice = true,
  // allowBackupCode is locked false in v1 (backup-code feature is backend-pending)
  allowBackupCode: _allowBackupCode = false,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: MfaTotpChallengeProps) {
  // Deep merge: top-level copy + the errors map merged separately.
  const merged: MfaTotpChallengeMessages = {
    ...defaultMfaTotpChallengeMessages,
    ...messageOverrides,
    errors: { ...defaultMfaTotpChallengeMessages.errors, ...messageOverrides?.errors }
  };

  /**
   * BACKEND-PENDING CASE (b): the generated hook does not exist yet.
   * When `complete_mfa_challenge` is deployed and codegen regenerated:
   *   1. Add: import { useCompleteMfaChallengeMutation } from '@/generated/auth';
   *   2. Instantiate: const defaultMutation = useCompleteMfaChallengeMutation({ selection: ... });
   *   3. Wire hybrid isPending: onSubmitOverride ? overridePending : defaultMutation.isPending
   *   4. The `if (onSubmitOverride) setOverridePending(true/false)` guards in handleVerify
   *      MUST stay — they prevent double-pending when both the override and the default
   *      hook are present (matches gold-standard sign-in-card pattern).
   */
  const [overridePending, setOverridePending] = useState(false);
  // When the generated hook lands, this becomes:
  //   onSubmitOverride ? overridePending : defaultMutation.isPending
  const isPending = overridePending;

  const [error, setError] = useState<string | null>(null);

  async function runChallenge(vars: MfaTotpChallengeVars): Promise<MfaChallengeResult> {
    if (onSubmitOverride) {
      return onSubmitOverride(vars);
    }
    // PROCEDURE_NOT_FOUND: complete_mfa_challenge is not yet deployed.
    // The generated hook will be wired here once the procedure ships.
    const procedureErr = Object.assign(new Error('complete_mfa_challenge is not yet deployed'), {
      extensions: { code: 'PROCEDURE_NOT_FOUND' }
    });
    throw procedureErr;
  }

  async function handleVerify(values: TotpFormData) {
    setError(null);
    if (onSubmitOverride) setOverridePending(true);
    try {
      const vars: MfaTotpChallengeVars = {
        totpValue: values.totpCode.replace(/[\s-]/g, ''),
        trustDevice: values.trustDevice,
        challengeToken,
        mfaMethod,
        credentialKind,
        rememberMe: values.trustDevice
      };
      const result = await runChallenge(vars);
      onMessage?.({ kind: 'success', key: 'completeMfaChallenge.success', message: merged.successToast });
      onSuccess?.(result);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  const form = useForm({
    defaultValues: {
      totpCode: '',
      trustDevice: false
    } as TotpFormData,
    onSubmit: async ({ value }) => {
      await handleVerify(value);
    }
  });

  return (
    <Card data-slot="mfa-totp-challenge" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <AuthErrorAlert error={error} />

        <form
          noValidate
          aria-busy={isPending}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="totpCode"
            validators={{
              onChange: ({ value }) => {
                if (!value) return 'Authentication code is required';
                const digits = value.replace(/[\s-]/g, '');
                if (!/^\d{6}$/.test(digits)) return 'Enter a 6-digit code';
                return undefined;
              }
            }}
          >
            {(field) => {
              const errors = field.state.meta.errors?.filter(Boolean) ?? [];
              const hasError = errors.length > 0;
              const errorMessage = errors[0] as string | undefined;
              return (
                <FormControl
                  label={merged.codeLabel}
                  id={field.name}
                  layout="floating"
                  error={hasError ? errorMessage : undefined}
                >
                  <Input
                    name={field.name}
                    data-testid="totp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder={merged.codePlaceholder}
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value.replace(/[\s-]/g, '').slice(0, 6))}
                    onBlur={field.handleBlur}
                  />
                </FormControl>
              );
            }}
          </form.Field>

          {showTrustDevice && (
            <form.Field name="trustDevice">
              {(field) => (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mfa-trust-device"
                      checked={field.state.value ?? false}
                      onCheckedChange={(checked) => field.handleChange(checked === true)}
                    />
                    <label htmlFor="mfa-trust-device" className="text-sm leading-none font-medium cursor-pointer">
                      {merged.trustDeviceLabel}
                    </label>
                  </div>
                  <p className="text-muted-foreground text-xs pl-6">{merged.trustDeviceHint}</p>
                </div>
              )}
            </form.Field>
          )}

          <AuthLoadingButton
            type="submit"
            className="w-full"
            isLoading={isPending}
            loadingText={merged.loadingLabel}
            data-testid="mfa-totp-submit"
          >
            {merged.submitButton}
          </AuthLoadingButton>
        </form>
      </CardContent>

      {/* allowBackupCode is locked false in v1 — the backup-code affordance is a
          v1.1 feature gated on verify_backup_code procedure. The backupCodeLink
          message key is in the catalog now to avoid a breaking change later. */}
      {false && (
        <CardFooter className="border-border/40 justify-center border-t pt-4">
          <button type="button" className="text-muted-foreground hover:text-foreground text-sm">
            {merged.backupCodeLink}
          </button>
        </CardFooter>
      )}
    </Card>
  );
}
