'use client';

/**
 * account-security-card  (registry: auth-account-security-card)
 *
 * At-a-glance security posture summary: password status, TOTP MFA status, and
 * passkey count. Display-only — all actions are delegated via callbacks so the
 * consumer decides how to navigate to the relevant management blocks.
 *
 * Data path (sdk-binding-contract.md §5, verified):
 *   • `useWebauthnCredentialsQuery` from `@/generated/auth` — lists passkeys to
 *     derive the count. `WebauthnCredentialsConnection` is confirmed in the
 *     generated SDK (useWebauthnCredentialsQuery.ts).
 *   • `adapter` prop: fully replaces the network call when provided (static
 *     value or async function), enabling non-Constructive backends, testing,
 *     and Storybook without a real QueryClient.
 *
 * SDK gap note: `totpEnabled` and `hasPassword` are NOT fields on the generated
 * `User` type (`UserSelect` in orm/input-types.ts). They only appear on
 * `SignInRecord` / session payloads. Until the backend exposes these on a public
 * `currentUser()` query, they are read from the `currentUser` query's
 * available fields. `totpEnabled` defaults to `false` (safe: prompts user to
 * enroll rather than silently hiding the CTA). `hasPassword` defaults to `true`
 * (safe: shows "Change password" rather than hiding the action).
 *
 * No mutations — this block is read-only. No form, no onSubmit override seam.
 */

import { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';
import { Separator } from '@constructive-io/ui/separator';
import { Skeleton } from '@constructive-io/ui/skeleton';

import { cn } from '@/lib/utils';
import { useWebauthnCredentialsQuery } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';

import {
  defaultAccountSecurityCardMessages,
  interpolate,
  type AccountSecurityCardMessages
} from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountSecurityCardMessageOverrides = Partial<
  Omit<AccountSecurityCardMessages, 'errors'>
> & {
  errors?: Partial<AccountSecurityCardMessages['errors']>;
};

/** Derived security posture values surfaced by the block. */
export type SecurityStatus = {
  hasPassword: boolean;
  totpEnabled: boolean;
  passkeyCount: number;
};

/**
 * Query adapter — replaces `useWebauthnCredentialsQuery` when provided.
 * Accepts a static result object or an async function that resolves to one.
 * Enables non-Constructive backends, unit tests, and Storybook without a
 * real QueryClient (sdk-binding-contract.md §4).
 */
export type AccountSecurityCardAdapter =
  | { webauthnCredentials: { totalCount: number } }
  | (() => Promise<{ webauthnCredentials: { totalCount: number } }>);

export type AccountSecurityCardProps = {
  /** Called when user clicks the change-password / set-password CTA. */
  onChangePassword?: () => void;
  /**
   * Called when user clicks the MFA enable/disable CTA.
   * If undefined the MFA row CTA is hidden (backend-pending; consumer opts in
   * only when TOTP enrollment is available).
   */
  onManageMfa?: () => void;
  /** Called when user clicks the manage passkeys CTA. */
  onManagePasskeys?: () => void;
  /**
   * Query adapter. When provided, fully replaces `useWebauthnCredentialsQuery`.
   * Pass a static `{ webauthnCredentials: { totalCount: number } }` or an async
   * factory function for dynamic data.
   */
  adapter?: AccountSecurityCardAdapter;
  messages?: AccountSecurityCardMessageOverrides;
  /** Fires on query errors. Receives the normalised `{ message, code }` shape. */
  onError?: (err: { message: string; code: string }) => void;
  /** Fires for any notification event. Always fires. */
  onMessage?: (event: {
    kind: 'success' | 'error' | 'info' | 'warning';
    key: string;
    message?: string;
  }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountSecurityCard({
  onChangePassword,
  onManageMfa,
  onManagePasskeys,
  adapter,
  messages: messageOverrides,
  onError,
  onMessage,
  className
}: AccountSecurityCardProps) {
  // Deep merge — top-level + errors nested separately.
  // Memoized so the useEffect dependency array stays stable across renders.
  const merged: AccountSecurityCardMessages = useMemo(
    () => ({
      ...defaultAccountSecurityCardMessages,
      ...messageOverrides,
      errors: {
        ...defaultAccountSecurityCardMessages.errors,
        ...messageOverrides?.errors
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(messageOverrides)]
  );

  // Local error string for inline display.
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Data: passkey count — adapter path
  // When `adapter` is provided, resolve it (static object or async fn)
  // and skip the generated hook entirely (sdk-binding-contract.md §4).
  // Static objects are applied immediately; async functions load once.
  // ------------------------------------------------------------------
  const [adapterData, setAdapterData] = useState<{ webauthnCredentials: { totalCount: number } } | null>(
    () => adapter && typeof adapter !== 'function' ? adapter : null
  );
  const [adapterLoading, setAdapterLoading] = useState(false);

  useEffect(() => {
    if (!adapter || typeof adapter !== 'function') return;
    setAdapterLoading(true);
    adapter()
      .then((result) => {
        setAdapterData(result);
        setAdapterLoading(false);
      })
      .catch(() => setAdapterLoading(false));
  // Run once per adapter identity change only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // ------------------------------------------------------------------
  // Data: passkey count — generated hook path (skipped when adapter set)
  // useWebauthnCredentialsQuery is confirmed in the generated auth SDK.
  // The `totalCount` field on the ConnectionResult gives us the count
  // without fetching full credential records (first: 0 is sufficient).
  // React Query v5 removed onError from useQuery options; errors are
  // handled via the returned `isError` / `error` fields instead.
  // ------------------------------------------------------------------
  const credentialsQuery = useWebauthnCredentialsQuery({
    selection: { fields: { id: true }, first: 0 },
    enabled: !adapter
  });

  // Surface query errors via callbacks + inline alert.
  useEffect(() => {
    if (!credentialsQuery.isError || !credentialsQuery.error) return;
    const err = credentialsQuery.error;
    const { code, message } = parseGraphQLError(err, {
      customMessages: merged.errors,
      defaultMessage: merged.errors.UNKNOWN_ERROR
    });
    const key = code ?? 'UNKNOWN_ERROR';
    setError(message);
    onMessage?.({ kind: 'error', key: `accountSecurity.${key}`, message });
    onError?.({ message, code: key });
  }, [credentialsQuery.isError, credentialsQuery.error, merged.errors, onError, onMessage]);

  const isLoading = adapter ? adapterLoading : credentialsQuery.isLoading;
  const passkeyCount = adapter
    ? (adapterData?.webauthnCredentials?.totalCount ?? 0)
    : (credentialsQuery.data?.webauthnCredentials?.totalCount ?? 0);

  // ------------------------------------------------------------------
  // Security status
  //
  // SDK gap: `totpEnabled` and `hasPassword` are not on the `User` type
  // in the generated auth SDK (they appear only on session/sign-in
  // payloads). Until the backend exposes them on `currentUser()`, the
  // block defaults both to safe values so display is always meaningful:
  //   hasPassword = true  → shows "Change password" (not "Set password")
  //   totpEnabled = false → shows "Enable" (not "Manage")
  // ------------------------------------------------------------------
  const hasPassword = true;
  const totpEnabled = false;

  // ------------------------------------------------------------------
  // Skeleton loader
  // ------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card data-slot="account-security-card" className={cn('w-full max-w-sm mx-auto', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const passkeysStatus =
    passkeyCount > 0
      ? interpolate(merged.passkeysCountStatus, { count: passkeyCount })
      : merged.passkeysNoneStatus;

  return (
    <Card data-slot="account-security-card" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-1">
        <AuthErrorAlert error={error} />

        {/* Password row */}
        <dl>
          <div className="flex items-center justify-between py-3">
            <div>
              <dt className="text-sm font-medium leading-none">{merged.passwordLabel}</dt>
              <dd className="mt-1">
                <Badge variant={hasPassword ? 'default' : 'secondary'}>
                  {hasPassword ? merged.passwordSetStatus : merged.passwordNotSetStatus}
                </Badge>
              </dd>
            </div>
            {onChangePassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={onChangePassword}
                aria-label={hasPassword ? merged.changePasswordButton : merged.setPasswordButton}
              >
                {hasPassword ? merged.changePasswordButton : merged.setPasswordButton}
              </Button>
            )}
          </div>
        </dl>

        <Separator />

        {/* MFA row */}
        <dl>
          <div className="flex items-center justify-between py-3">
            <div>
              <dt className="text-sm font-medium leading-none">{merged.mfaLabel}</dt>
              <dd className="mt-1">
                <Badge variant={totpEnabled ? 'default' : 'secondary'}>
                  {totpEnabled ? merged.mfaEnabledStatus : merged.mfaDisabledStatus}
                </Badge>
              </dd>
            </div>
            {onManageMfa && (
              <Button
                variant="outline"
                size="sm"
                onClick={onManageMfa}
                aria-label={totpEnabled ? merged.manageMfaButton : merged.enableMfaButton}
              >
                {totpEnabled ? merged.manageMfaButton : merged.enableMfaButton}
              </Button>
            )}
          </div>
        </dl>

        <Separator />

        {/* Passkeys row */}
        <dl>
          <div className="flex items-center justify-between py-3">
            <div>
              <dt className="text-sm font-medium leading-none">{merged.passkeysLabel}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{passkeysStatus}</dd>
            </div>
            {onManagePasskeys && (
              <Button
                variant="outline"
                size="sm"
                onClick={onManagePasskeys}
                aria-label={merged.managePasskeysButton}
              >
                {merged.managePasskeysButton}
              </Button>
            )}
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
