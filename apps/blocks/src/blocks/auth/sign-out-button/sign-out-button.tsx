'use client';

/**
 * sign-out-button  (registry: auth-sign-out-button)
 *
 * Single-click sign-out button bound to the host's GENERATED `useSignOutMutation`
 * hook. On click: runs the mutation (or `onSubmit` override), clears the
 * React Query cache via `queryClient.clear()`, then fires `onSuccess`.
 *
 * Data path = generated hook from `@/generated/auth`. No fetch, no GraphQL doc
 * string, no `@constructive-io/data`, no hardcoded URL. `QueryClient` is
 * supplied by `blocks-runtime` (the single wiring point).
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { useSignOutMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';

import { defaultSignOutButtonMessages, type SignOutButtonMessages } from './messages';

export type SignOutButtonMessageOverrides = Partial<Omit<SignOutButtonMessages, 'errors'>> & {
  errors?: Partial<SignOutButtonMessages['errors']>;
};

export type SignOutButtonProps = {
  /** Content rendered inside the button. Default: messages.buttonText */
  children?: React.ReactNode;
  /** Pass-through to the underlying Button component. Default: 'ghost' */
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive';
  /** Pass-through to the underlying Button component. */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  messages?: SignOutButtonMessageOverrides;
  /** Replace the default `useSignOutMutation` call. Cache clear still fires after resolution. */
  onSubmit?: () => Promise<void>;
  /** Fires after successful sign-out and cache clear. Navigate here. */
  onSuccess?: () => void;
  /** Fires after a mapped error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and errors. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

export function SignOutButton({
  children,
  variant = 'ghost',
  size,
  className,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage
}: SignOutButtonProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: SignOutButtonMessages = {
    ...defaultSignOutButtonMessages,
    ...messageOverrides,
    errors: { ...defaultSignOutButtonMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hook from the host's `auth` SDK. The PostGraphile mutation
  // payload is composite, so select clientMutationId even though sign_out()
  // itself returns void.
  const defaultMutation = useSignOutMutation({
    selection: {
      fields: { clientMutationId: true }
    }
  });

  // Hybrid pending: the generated hook tracks its own; the override path does not.
  const [overridePending, setOverridePending] = useState(false);
  const isPending = onSubmitOverride ? overridePending : defaultMutation.isPending;

  const queryClient = useQueryClient();

  async function handleSignOut() {
    if (onSubmitOverride) setOverridePending(true);
    try {
      if (onSubmitOverride) {
        await onSubmitOverride();
      } else {
        await defaultMutation.mutateAsync({ input: {} });
      }
      // Clear all cached query data to prevent stale auth state post-sign-out.
      queryClient.clear();
      onMessage?.({ kind: 'success', key: 'signOut.success', message: merged.successMessage });
      onSuccess?.();
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitOverride) setOverridePending(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      aria-busy={isPending}
      disabled={isPending}
      data-testid="sign-out-button"
      onClick={handleSignOut}
    >
      {isPending ? merged.buttonPending : (children ?? merged.buttonText)}
    </Button>
  );
}
