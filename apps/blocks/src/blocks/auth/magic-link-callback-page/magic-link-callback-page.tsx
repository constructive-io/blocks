'use client';

/**
 * magic-link-callback-page  (registry: auth-magic-link-callback-page)
 *
 * Handles the /auth/magic-link?token=... URL that users land on from their
 * email client. On mount, calls `constructive_auth_public.sign_in_magic_link`
 * via the generated `useSignInMagicLinkMutation` hook and transitions through:
 * loading → success (redirect) | expired | invalid | missing-token.
 *
 * BACKEND-PENDING — CASE (b):
 *   `sign_in_magic_link` is not yet deployed in `constructive_auth_public`, so
 *   `useSignInMagicLinkMutation` is not present in the generated auth SDK at the
 *   time this block was authored. The import is therefore OMITTED so that
 *   `tsc --noEmit` passes. The `onSubmit` override is the primary/required path;
 *   the host wires the generated binding after regenerating the SDK once the proc
 *   ships. `requires.json` names `signInMagicLink` so `check-sdk-fixtures.ts` will fail
 *   with a precise message until the host SDK exports it.
 *
 * DATA PATH (after proc ships):
 *   import { useSignInMagicLinkMutation } from '@/generated/auth';
 *   const defaultMutation = useSignInMagicLinkMutation({
 *     selection: {
 *       fields: {
 *         result: {
 *           select: {
 *             id: true, userId: true, accessToken: true, accessTokenExpiresAt: true,
 *             isVerified: true, mfaRequired: true, mfaChallengeToken: true,
 *           }
 *         }
 *       }
 *     }
 *   });
 *   const result = await defaultMutation.mutateAsync({ input: { token, credentialKind } })
 *     .then((d) => d.signInMagicLink?.result ?? null);
 *
 * No fetch, no GraphQL document, no client bootstrap in this file.
 * Pages may use next/navigation (block-contract.md §2, §6).
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';

import {
  defaultMagicLinkCallbackPageMessages,
  type MagicLinkCallbackPageMessageOverrides,
  type MagicLinkCallbackPageMessages
} from './messages';

// ─── Configurable constants (edit after installing) ─────────────────────────
const DEFAULT_REDIRECT = '/dashboard';
const SIGN_IN_PATH = '/auth/sign-in';
const MAGIC_LINK_REQUEST_PATH = '/auth/magic-link-request';
const MFA_PATH = '/auth/mfa/totp';
const CREDENTIAL_KIND = 'bearer';
// ────────────────────────────────────────────────────────────────────────────

/** Internal page state machine */
type PageState = 'loading' | 'success' | 'expired' | 'invalid' | 'missing-token';

/**
 * The sign-in result shape this page consumes. Mirrors the auth SDK's
 * `SignInMagicLinkPayload` (the fields this page selects); declared here so
 * the `onSubmit` override contract does not depend on a generated type name.
 */
export type MagicLinkSignInResult = {
  id: string | null;
  userId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  isVerified: boolean | null;
  mfaRequired: boolean | null;
  mfaChallengeToken: string | null;
};

// ─── Inner implementation (needs useSearchParams + useRouter) ────────────────

interface MagicLinkCallbackInnerProps {
  messages?: MagicLinkCallbackPageMessageOverrides;
  /**
   * Replace the default `useSignInMagicLinkMutation` call. Receives the same
   * vars ({ token, credentialKind }) the default hook would send.
   *
   * REQUIRED while the backend procedure is pending (CASE b). Once the proc is
   * deployed and the host SDK regenerated, this becomes optional — the host can
   * remove the override and the generated hook takes over.
   */
  onSubmit?: (vars: { token: string; credentialKind: string }) => Promise<MagicLinkSignInResult | null>;
  /** Fires after a successful sign-in. Always fires. */
  onSuccess?: (result: MagicLinkSignInResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, warnings, and errors. Always fires. */
  onMessage?: (event: {
    kind: 'success' | 'error' | 'info' | 'warning';
    key: string;
    message?: string;
  }) => void;
  className?: string;
}

function MagicLinkCallbackInner({
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: MagicLinkCallbackInnerProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: MagicLinkCallbackPageMessages = {
    ...defaultMagicLinkCallbackPageMessages,
    ...messageOverrides,
    errors: {
      ...defaultMagicLinkCallbackPageMessages.errors,
      ...messageOverrides?.errors
    }
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const redirectParam = searchParams.get('redirect');

  // Validate redirect is same-origin to prevent open-redirect attacks.
  function safeRedirect(raw: string | null): string {
    if (!raw) return DEFAULT_REDIRECT;
    try {
      const url = new URL(raw, window.location.origin);
      return url.origin === window.location.origin ? url.pathname + url.search : DEFAULT_REDIRECT;
    } catch {
      return DEFAULT_REDIRECT;
    }
  }

  const [pageState, setPageState] = useState<PageState>(() =>
    !token ? 'missing-token' : 'loading'
  );

  // Hybrid pending: the generated hook tracks its own; the override path does not.
  const [overridePending, setOverridePending] = useState(false);

  // ── BACKEND-PENDING (CASE b): defaultMutation is unavailable until the proc
  //    ships and the host regenerates the SDK. The block uses the onSubmit
  //    override seam as its sole execution path right now.
  //
  //    After the proc ships, restore the generated hook binding:
  //
  //      import { useSignInMagicLinkMutation } from '@/generated/auth';
  //      const defaultMutation = useSignInMagicLinkMutation({
  //        selection: {
  //          fields: {
  //            result: {
  //              select: {
  //                id: true, userId: true, accessToken: true,
  //                accessTokenExpiresAt: true, isVerified: true,
  //                mfaRequired: true, mfaChallengeToken: true,
  //              }
  //            }
  //          }
  //        }
  //      });
  //
  //    And replace `runSignIn` with the hybrid pattern (see sign-in-card.tsx).
  // ────────────────────────────────────────────────────────────────────────────

  async function runSignIn(vars: {
    token: string;
    credentialKind: string;
  }): Promise<MagicLinkSignInResult | null> {
    if (onSubmitOverride) {
      return onSubmitOverride(vars);
    }
    // PROCEDURE_NOT_FOUND guard: if no override and no generated hook yet,
    // surface the backend-pending error message rather than crashing.
    throw Object.assign(
      new Error(merged.errors.PROCEDURE_NOT_FOUND),
      { extensions: { code: 'PROCEDURE_NOT_FOUND' } }
    );
  }

  // Fire on mount when token param is present.
  useEffect(() => {
    if (!token) return;

    async function runCallback() {
      if (onSubmitOverride) setOverridePending(true);
      try {
        const result = await runSignIn({ token: token!, credentialKind: CREDENTIAL_KIND });

        if (!result) {
          // Null result without an exception → treat as invalid token.
          const message = merged.errors.INVALID_TOKEN;
          setPageState('invalid');
          onError?.({ message, code: 'INVALID_TOKEN' });
          onMessage?.({ kind: 'error', key: 'INVALID_TOKEN', message });
          return;
        }

        if (result.mfaRequired && result.mfaChallengeToken) {
          // MFA required: route to TOTP challenge page.
          const redirect = safeRedirect(redirectParam);
          onMessage?.({ kind: 'warning', key: 'mfaRequired' });
          onSuccess?.(result);
          router.push(
            `${MFA_PATH}?token=${encodeURIComponent(result.mfaChallengeToken)}&redirect=${encodeURIComponent(redirect)}`
          );
          return;
        }

        // Full success: transition to success state then redirect.
        setPageState('success');
        onMessage?.({ kind: 'success', key: 'signInMagicLink.success', message: merged.successDescription });
        onSuccess?.(result);
        router.push(safeRedirect(redirectParam));
      } catch (err) {
        const { code, message } = parseGraphQLError(err, {
          customMessages: merged.errors,
          defaultMessage: merged.errors.UNKNOWN_ERROR
        });
        const key = code ?? 'UNKNOWN_ERROR';

        if (code === 'EXPIRED_TOKEN') {
          setPageState('expired');
          onError?.({ message, code: key });
          onMessage?.({ kind: 'error', key, message });
        } else {
          setPageState('invalid');
          onError?.({ message, code: key });
          onMessage?.({ kind: 'error', key, message });
        }
      } finally {
        if (onSubmitOverride) setOverridePending(false);
      }
    }

    runCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = pageState === 'loading' && overridePending;

  return (
    <div
      data-slot="magic-link-callback-page"
      className={cn('flex min-h-dvh items-center justify-center px-4 py-12', className)}
    >
      <div className="w-full max-w-sm">
      {pageState === 'loading' && (
        <Card aria-busy={isLoading}>
          <CardHeader>
            <CardTitle>{merged.loadingTitle}</CardTitle>
            <CardDescription>{merged.loadingDescription}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {pageState === 'success' && (
        <Card>
          <CardHeader>
            <CardTitle>{merged.successTitle}</CardTitle>
            <CardDescription>{merged.successDescription}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {pageState === 'expired' && (
        <Card>
          <CardHeader>
            <CardTitle>{merged.expiredTitle}</CardTitle>
            <CardDescription>{merged.expiredDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={MAGIC_LINK_REQUEST_PATH}>{merged.expiredRequestNewLink}</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {pageState === 'invalid' && (
        <Card>
          <CardHeader>
            <CardTitle role="alert">{merged.invalidTitle}</CardTitle>
            <CardDescription>{merged.invalidDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <a href={SIGN_IN_PATH}>{merged.invalidSignInLink}</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {pageState === 'missing-token' && (
        <Card>
          <CardHeader>
            <CardTitle role="alert">{merged.missingTokenTitle}</CardTitle>
            <CardDescription>{merged.missingTokenDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <a href={SIGN_IN_PATH}>{merged.missingTokenSignInLink}</a>
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

// ─── Public page export ──────────────────────────────────────────────────────

/**
 * Props for the magic-link callback page. Because this is a `registry:page`,
 * the host typically wires these at the page file level rather than via the
 * registry entry. The `onSubmit` prop is the primary seam while the backend
 * procedure `sign_in_magic_link` is pending (sdk-binding-contract.md §10,
 * CASE b).
 */
export interface MagicLinkCallbackPageProps {
  messages?: MagicLinkCallbackPageMessageOverrides;
  onSubmit?: (vars: { token: string; credentialKind: string }) => Promise<MagicLinkSignInResult | null>;
  onSuccess?: (result: MagicLinkSignInResult) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: {
    kind: 'success' | 'error' | 'info' | 'warning';
    key: string;
    message?: string;
  }) => void;
  className?: string;
}

/**
 * Next.js page component for the magic-link sign-in callback.
 * Mount at `/auth/magic-link` (the URL embedded in magic-link emails).
 * Wrap with `<Suspense>` at the page level per Next.js 15 requirements.
 *
 * @example
 * ```tsx
 * // app/auth/magic-link/page.tsx
 * import { Suspense } from 'react';
 * import MagicLinkCallbackPage from '@/blocks/auth/magic-link-callback-page/magic-link-callback-page';
 *
 * export default function Page() {
 *   return (
 *     <Suspense>
 *       <MagicLinkCallbackPage
 *         onSubmit={async ({ token, credentialKind }) => {
 *           // Host wires the generated hook here until the proc ships.
 *           return null;
 *         }}
 *       />
 *     </Suspense>
 *   );
 * }
 * ```
 */
export default function MagicLinkCallbackPage({
  messages,
  onSubmit,
  onSuccess,
  onError,
  onMessage,
  className
}: MagicLinkCallbackPageProps) {
  return (
    <Suspense
      fallback={
        <div
          data-slot="magic-link-callback-page"
          className={cn('flex min-h-dvh items-center justify-center px-4 py-12', className)}
        >
          <div className="w-full max-w-sm">
            <Card aria-busy>
              <CardHeader>
                <CardTitle>{defaultMagicLinkCallbackPageMessages.loadingTitle}</CardTitle>
                <CardDescription>
                  {defaultMagicLinkCallbackPageMessages.loadingDescription}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      }
    >
      <MagicLinkCallbackInner
        messages={messages}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        onError={onError}
        onMessage={onMessage}
        className={className}
      />
    </Suspense>
  );
}
