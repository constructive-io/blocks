'use client';

/**
 * passkey-sign-in  (registry: auth-passkey-sign-in)
 *
 * WebAuthn assertion (sign-in) block. Orchestrates the begin/browser/finish
 * ceremony via the `use-passkey-sign-in` utility hook and renders a button
 * (full-width or icon-only) that triggers it.
 *
 * BACKEND-PENDING (CASE b):
 * The public-wrapper procedures `passkey_begin_sign_in` / `passkey_finish_sign_in`
 * are NOT YET deployed in constructive_auth_public. The generated SDK therefore
 * does NOT export `usePasskeyBeginSignInMutation` or `usePasskeyFinishSignInMutation`.
 * This block therefore does NOT import from @/generated/auth — the @/generated/auth
 * import would fail to type-check until the procedures deploy and codegen re-runs.
 *
 * Instead, the `onSubmit` override seam is the PRIMARY (required) path for the
 * default ceremony. The host wires the generated SDK binding after regenerating
 * the SDK once the procedures are deployed (see requires.json for the pending op
 * names; `check-sdk-fixtures.ts` will fail clearly until they land).
 *
 * Ceremony mechanics: begin endpoint → @simplewebauthn/browser → finish endpoint.
 * The utility hook `use-passkey-sign-in.ts` is shipped by this block.
 *
 * Accessibility:
 *   • aria-busy="true" on the button while isPending
 *   • Component renders null when isSupported === false
 *   • Conditional UI: pairs with an <input autocomplete="username webauthn"> in a sibling form
 */

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';
import { KeyRoundIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';

import { usePasskeySignIn, type PasskeySignInResult } from './hooks/use-passkey-sign-in';
import {
  defaultPasskeySignInMessages,
  type PasskeySignInMessageOverrides,
  type PasskeySignInMessages
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Variables the override `onSubmit` receives. */
export type PasskeySignInVars = {
  userId?: string | null;
};

export { type PasskeySignInResult } from './hooks/use-passkey-sign-in';

export type PasskeySignInProps = {
  /**
   * When provided, restricts the WebAuthn challenge to this user's credentials
   * (targeted flow). When null/undefined, a discoverable-credential (usernameless)
   * challenge is issued if allow_webauthn_usernameless is true.
   */
  userId?: string | null;
  /**
   * Enable conditional UI autofill. When true, the hook starts a WebAuthn
   * conditional request on mount — the browser populates passkey suggestions in
   * any sibling <input autocomplete="username webauthn">.
   * Default: false.
   */
  conditionalUI?: boolean;
  /**
   * Render as a full-width button or an icon-only compact button.
   * Default: 'button'.
   */
  variant?: 'button' | 'icon';
  /** When true, changes the button label to messages.signInButtonStepUp. */
  stepUpMode?: boolean;
  /**
   * Middleware URL for the WebAuthn begin-assertion endpoint.
   * Required when no onSubmit override is provided.
   */
  beginEndpoint?: string;
  /**
   * Middleware URL for the WebAuthn finish-assertion endpoint.
   * Required when no onSubmit override is provided.
   */
  finishEndpoint?: string;
  messages?: PasskeySignInMessageOverrides;
  /**
   * Adapter override — replaces the full begin/browser/finish ceremony.
   * When provided, beginEndpoint and finishEndpoint are not required.
   * Receives { userId? } and must return PasskeySignInResult.
   */
  onSubmit?: (vars: PasskeySignInVars) => Promise<PasskeySignInResult>;
  /** Fires after successful sign-in. Always fires. */
  onSuccess?: (result: PasskeySignInResult) => void;
  /** Fires after a mapped error (silent for USER_ABORTED by default). Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, errors, and info events. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PasskeySignIn({
  userId,
  conditionalUI = false,
  variant = 'button',
  stepUpMode = false,
  beginEndpoint = '',
  finishEndpoint = '',
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: PasskeySignInProps) {
  // Deep merge messages
  const merged: PasskeySignInMessages = {
    ...defaultPasskeySignInMessages,
    ...messageOverrides,
    errors: {
      ...defaultPasskeySignInMessages.errors,
      ...messageOverrides?.errors
    }
  };

  // Default utility hook — only active when no onSubmit override is provided.
  // beginEndpoint / finishEndpoint default to '' so the hook still initialises;
  // the host is expected to supply real URLs or use the onSubmit override seam.
  //
  // B3: When onSubmitOverride is set it replaces ALL three ceremony steps
  //     (spec §Default data hook — "Adapter override: replaces all three steps").
  //     Gate conditionalUI so the hook never fires a background ceremony when
  //     the consumer has provided their own submission handler.
  //
  // MINOR-2: userId + conditionalUI mutual exclusion (spec Notes/gotchas):
  //     "When userId is provided, conditional UI should be false."
  //     Enforce silently here so a targeted flow never runs a discoverable-
  //     credential conditional ceremony.
  const effectiveConditionalUI = conditionalUI && !onSubmitOverride && !userId;

  const hook = usePasskeySignIn({
    beginEndpoint,
    finishEndpoint,
    userId,
    conditionalUI: effectiveConditionalUI,
    // B2: emit the spec-mandated info event when conditional UI activates
    onConditionalActivated: () => {
      onMessage?.({ kind: 'info', key: 'conditional_ui_active' });
    },
    // B1: fire success callbacks when autofill picker ceremony completes
    onConditionalSuccess: (result) => {
      onMessage?.({ kind: 'success', key: 'passkey.signIn.success', message: merged.successToast });
      onSuccess?.(result);
    },
    // B1: fire error callback when conditional UI ceremony fails
    onConditionalError: (code) => {
      const message = merged.errors[code as keyof typeof merged.errors] ?? merged.errors.UNKNOWN_ERROR;
      onMessage?.({ kind: 'error', key: code, message });
      onError?.({ message, code });
    }
  });

  // Hybrid pending: the utility hook tracks its own; the override path tracks separately.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : hook.isPending;

  const [error, setError] = useState<string | null>(null);

  // MINOR-1: render accessible fallback when browser doesn't support WebAuthn.
  // Spec accessibility section says "renders null when isSupported === false",
  // but the messages catalog promises an `unsupportedBrowser` message that would
  // be unreachable if we return null — expose it in a visually-hidden-but-
  // accessible role="status" element so screen-reader users get feedback.
  if (!hook.isSupported) {
    return (
      <div
        data-slot="passkey-sign-in"
        className={cn('w-full max-w-sm mx-auto', className)}
        role="status"
        aria-label={merged.unsupportedBrowser}
      />
    );
  }

  async function handleClick() {
    setError(null);
    if (onSubmitOverride) setOverridePending(true);
    try {
      const result = await (onSubmitOverride
        ? onSubmitOverride({ userId })
        : hook.signIn());

      onMessage?.({ kind: 'success', key: 'passkey.signIn.success', message: merged.successToast });
      onSuccess?.(result);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';

      // USER_ABORTED is silent by default (native dialog dismissal)
      if (key !== 'USER_ABORTED') {
        setError(message);
      }

      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  const label = stepUpMode ? merged.signInButtonStepUp : merged.signInButton;
  const isIconOnly = variant === 'icon';

  return (
    <div
      data-slot="passkey-sign-in"
      className={cn('w-full max-w-sm mx-auto space-y-2', className)}
    >
      <AuthErrorAlert error={error} />

      <Button
        type="button"
        variant="outline"
        className={cn('gap-2', isIconOnly ? 'size-11 p-0 sm:size-10' : 'w-full')}
        aria-busy={isPending}
        aria-label={isIconOnly ? label : undefined}
        disabled={isPending}
        onClick={handleClick}
        data-testid="passkey-sign-in-btn"
      >
        <KeyRoundIcon className="size-4 shrink-0" aria-hidden="true" />
        {!isIconOnly && (isPending ? merged.signingInButton : label)}
      </Button>
    </div>
  );
}
