'use client';

/**
 * cross-origin-link  (registry: auth-cross-origin-link)
 *
 * Generates a one-time cross-origin authentication token by calling
 * `constructive_auth_public.request_cross_origin_token(...)`, then navigates
 * to `${destinationOrigin}${destinationPath}?token=<token>` via
 * `window.location.href` (intentional cross-origin redirect).
 *
 * Binding doctrine (sdk-binding-contract.md §5):
 *   • Data path = `useRequestCrossOriginTokenMutation` from `@/generated/auth`.
 *     No fetch, no GraphQL document string, no `@constructive-io/data` import.
 *   • No client bootstrap: never calls `configure()`/`getClient()`, never mounts
 *     a `QueryClientProvider`. The host mounts `blocks-runtime` once at app root.
 *   • Override seam: `onSubmit` fully replaces the generated-hook call.
 *   • Error mapping via `auth-errors` foundation lib; inline alert via
 *     `auth-error-alert` primitive.
 *
 * The block does NOT ship a form with email/password inputs — it receives them
 * as props from a parent form context where the user already typed credentials.
 */

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { useRequestCrossOriginTokenMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';

import { defaultCrossOriginLinkMessages, type CrossOriginLinkMessages } from './messages';

/** Variables sent to the cross-origin token mutation. */
export type CrossOriginLinkInput = {
  email: string;
  password: string;
  origin: string;
  rememberMe: boolean;
};

/**
 * Deep-partial message overrides: top-level keys are shallow-partial;
 * `errors` is itself partial so a host can override a single error code.
 */
export type CrossOriginLinkMessageOverrides = Partial<Omit<CrossOriginLinkMessages, 'errors'>> & {
  errors?: Partial<CrossOriginLinkMessages['errors']>;
};

export type CrossOriginLinkProps = {
  /** Email for credential verification (passed from the parent form). */
  email: string;
  /** Password for credential verification (passed from the parent form). */
  password: string;
  /** Target origin, e.g. 'https://app.example.com'. Must be allowlisted server-side. */
  destinationOrigin: string;
  /**
   * Path on the destination to redirect to after token exchange.
   * The token is appended as ?token=<token>. Default: '/auth/cross-origin'.
   */
  destinationPath?: string;
  rememberMe?: boolean;
  /** Render as a button (default) or an anchor link. */
  renderAs?: 'button' | 'link';
  /** Content rendered inside the button/link. Falls back to messages.defaultButtonText. */
  children?: React.ReactNode;
  /** Visual variant passed through to the underlying Button. Default: 'default'. */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  messages?: CrossOriginLinkMessageOverrides;
  /** Replace the default `useRequestCrossOriginTokenMutation` call. Must return the token string. */
  onSubmit?: (input: CrossOriginLinkInput) => Promise<string>;
  /** Fires after token generation, before redirect. Always fires on success. */
  onSuccess?: (token: string, url: string) => void;
  /** Fires after a mapped error. Always fires on error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and all errors. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

export function CrossOriginLink({
  email,
  password,
  destinationOrigin,
  destinationPath = '/auth/cross-origin',
  rememberMe = false,
  renderAs = 'button',
  children,
  variant = 'default',
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: CrossOriginLinkProps) {
  // Deep merge: top-level keys + the errors map merged separately.
  const merged: CrossOriginLinkMessages = {
    ...defaultCrossOriginLinkMessages,
    ...messageOverrides,
    errors: { ...defaultCrossOriginLinkMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hook from the host's `auth` SDK (sdk-binding-contract.md §5).
  // `RequestCrossOriginTokenPayload.result` is a plain string (the token),
  // so the selection uses `{ result: true }` — a scalar boolean selector.
  const defaultMutation = useRequestCrossOriginTokenMutation({
    selection: {
      fields: {
        result: true
      }
    }
  });

  // Hybrid pending: the generated hook tracks its own; the override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);

    const vars: CrossOriginLinkInput = {
      email,
      password,
      origin: destinationOrigin,
      rememberMe
    };

    if (onSubmitOverride) setOverridePending(true);
    try {
      let token: string;

      if (onSubmitOverride) {
        token = await onSubmitOverride(vars);
      } else {
        // The generated hook takes `{ input }` and returns
        // `{ requestCrossOriginToken: { result: string | null } | null }`.
        const data = await defaultMutation.mutateAsync({ input: vars });
        const result = data.requestCrossOriginToken?.result ?? null;
        if (!result) {
          // A resolved mutation with no token is treated as a credential failure.
          throw Object.assign(new Error('Invalid email or password.'), {
            extensions: { code: 'INVALID_CREDENTIALS' }
          });
        }
        token = result;
      }

      const url = `${destinationOrigin}${destinationPath}?token=${encodeURIComponent(token)}`;

      onMessage?.({ kind: 'success', key: 'crossOriginLink.success', message: merged.successMessage });
      onSuccess?.(token, url);

      // Cross-origin navigation — cannot use router.push (block-contract.md §6).
      window.location.href = url;
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

  const label = children ?? merged.defaultButtonText;
  const loadingLabel = merged.pendingText;

  return (
    <div data-slot="cross-origin-link" className={cn('w-full max-w-sm mx-auto', className)}>
      <AuthErrorAlert error={error} />

      {renderAs === 'link' ? (
        <Button
          variant={variant}
          role="button"
          aria-busy={isPending}
          disabled={isPending}
          onClick={handleClick}
          className="w-full"
          data-testid="cross-origin-link-trigger"
        >
          {isPending ? loadingLabel : label}
        </Button>
      ) : (
        <AuthLoadingButton
          variant={variant}
          isLoading={isPending}
          loadingText={loadingLabel}
          onClick={handleClick}
          className="w-full"
          data-testid="cross-origin-link-trigger"
        >
          {label}
        </AuthLoadingButton>
      )}
    </div>
  );
}
