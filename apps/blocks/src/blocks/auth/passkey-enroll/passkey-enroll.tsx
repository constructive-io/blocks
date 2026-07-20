'use client';

/**
 * passkey-enroll  (registry: auth-passkey-enroll)
 *
 * Registers a new WebAuthn credential (passkey) for the current authenticated
 * user. Orchestrates the two-step ceremony:
 *   1. POST begin-registration middleware → get WebAuthn options
 *   2. Browser native dialog (startRegistration from @simplewebauthn/browser)
 *   3. POST finish-registration middleware → credential persisted
 *
 * BACKEND-PENDING (CASE b): The public-schema wrappers
 * `passkey_begin_registration` / `passkey_finish_registration` are not yet
 * deployed, so no generated hooks (`usePasskeyBeginRegistrationMutation` /
 * `usePasskeyFinishRegistrationMutation`) exist in @/generated/auth. The block
 * compiles without those imports. The `onSubmit` override seam is the primary
 * integration path; the host wires the ceremony after regenerating the SDK.
 * `requires.json` names the pending ops so `check-sdk-fixtures.ts` fails clearly.
 *
 * This block imports NO @/generated/auth hook because the ceremony procs are
 * undeployed (CASE b). It does NOT import @constructive-io/data either.
 * It is a data block (uses middleware fetch inside the utility hook, owns
 * `requires.json`); it declares `blocks-runtime` as a registryDependency for
 * the QueryClient it uses transitively (via usePasskeyEnroll's owned state).
 *
 * Data slot: "passkey-enroll" (SHORT name, no category prefix).
 * Max-width: w-full max-w-sm mx-auto.
 */

import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { FormField } from '@/blocks/primitives/form-field';

import { defaultPasskeyEnrollMessages, type PasskeyEnrollMessageOverrides } from './messages';
import {
  usePasskeyEnroll,
  type PasskeyEnrollInput,
  type PasskeyEnrollResult
} from './hooks/use-passkey-enroll';

export type { PasskeyEnrollInput, PasskeyEnrollResult };

export type PasskeyEnrollProps = {
  /** The current authenticated user's ID. Required for begin_registration. */
  userId: string;
  /**
   * If false the block renders nothing — consumer should gate on the
   * `allow_webauthn_sign_up` feature flag. Defaults to auto-detect via
   * window.PublicKeyCredential.
   */
  enabled?: boolean;
  /**
   * Middleware endpoint for begin-registration (default:
   * /api/auth/passkey/begin-registration). Only used when onSubmit is not set.
   */
  beginEndpoint?: string;
  /**
   * Middleware endpoint for finish-registration (default:
   * /api/auth/passkey/finish-registration). Only used when onSubmit is not set.
   */
  finishEndpoint?: string;
  messages?: PasskeyEnrollMessageOverrides;
  /**
   * Replace the full begin/browser/finish orchestration. Receives
   * `{ credentialName, userId }`. The override is responsible for the WebAuthn
   * protocol itself. When provided, `beginEndpoint`/`finishEndpoint` are ignored.
   */
  onSubmit?: (input: PasskeyEnrollInput) => Promise<PasskeyEnrollResult>;
  /** Fires after the credential is registered. Always fires on success. */
  onSuccess?: (result: PasskeyEnrollResult) => void;
  /** Fires after error mapping. Always fires on error (including browser abort). */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, errors, and info events. Always fires. */
  onMessage?: (event: {
    kind: 'success' | 'error' | 'info' | 'warning';
    key: string;
    message?: string;
  }) => void;
  className?: string;
};

type EnrollFormData = {
  credentialName: string;
};

export function PasskeyEnroll({
  userId,
  enabled,
  beginEndpoint,
  finishEndpoint,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: PasskeyEnrollProps) {
  // Deep merge: top-level copy + the errors map merged separately.
  const merged = {
    ...defaultPasskeyEnrollMessages,
    ...messageOverrides,
    errors: {
      ...defaultPasskeyEnrollMessages.errors,
      ...messageOverrides?.errors
    }
  };

  const { enroll, isPending, isSupported } = usePasskeyEnroll({
    beginEndpoint,
    finishEndpoint,
    onSubmitOverride
  });

  // Component owns the inline error display state (independent from hook).
  const [error, setError] = useState<string | null>(null);

  // Focus the credential name input on mount for accessibility.
  const credentialNameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    credentialNameRef.current?.focus();
  }, []);

  // If consumer explicitly disabled or browser doesn't support passkeys: hide.
  const isEnabled = enabled !== undefined ? enabled : isSupported;

  async function handleEnroll(values: EnrollFormData) {
    setError(null);
    try {
      // Inform the host that the browser prompt is about to appear.
      onMessage?.({ kind: 'info', key: 'browser_prompt_shown' });

      const result = await enroll({ credentialName: values.credentialName.trim(), userId });

      onMessage?.({ kind: 'success', key: 'passkeyEnroll.success', message: merged.successToast });
      onSuccess?.(result);
    } catch (err) {
      // Browser abort (user cancelled the native dialog) is a special case:
      // surface it silently — no error banner, but still fire onError/onMessage.
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.name === 'NotAllowedError' || err.message?.includes('abort'));

      if (isAbort) {
        const abortMessage = 'Passkey registration was cancelled.';
        onMessage?.({ kind: 'error', key: 'BROWSER_ABORT', message: abortMessage });
        onError?.({ message: abortMessage, code: 'BROWSER_ABORT' });
        return;
      }

      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    }
  }

  const form = useForm({
    defaultValues: {
      credentialName: ''
    } as EnrollFormData,
    onSubmit: async ({ value }) => {
      await handleEnroll(value);
    }
  });

  if (!isEnabled) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="text-pretty text-muted-foreground text-sm"
      >
        {merged.unsupportedBrowser}
      </p>
    );
  }

  return (
    <Card data-slot="passkey-enroll" className={cn('w-full max-w-sm mx-auto', className)}>
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
            name="credentialName"
            validators={{
              onChange: ({ value }) => {
                if (!value || !value.trim()) return merged.credentialNameRequired;
                if (value.trim().length > 100) return merged.credentialNameTooLong;
                return undefined;
              }
            }}
          >
            {(field) => (
              <FormField
                field={field}
                label={merged.credentialNameLabel}
                placeholder={merged.credentialNamePlaceholder}
                type="text"
                inputRef={credentialNameRef}
                testId="passkey-credential-name"
              />
            )}
          </form.Field>

          {!isPending && (
            <p className="text-pretty text-muted-foreground text-xs">{merged.credentialNameHint}</p>
          )}
          {isPending && (
            <p aria-live="polite" className="text-pretty text-muted-foreground text-xs italic">
              {merged.browserPromptHint}
            </p>
          )}

          <AuthLoadingButton
            type="submit"
            className="w-full"
            isLoading={isPending}
            loadingText={merged.enrollingButton}
            data-testid="passkey-enroll-submit"
          >
            {merged.enrollButton}
          </AuthLoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
