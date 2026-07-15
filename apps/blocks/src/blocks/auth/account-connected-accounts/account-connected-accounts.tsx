'use client';

/**
 * account-connected-accounts  (registry: auth-account-connected-accounts)
 *
 * Settings card listing linked OAuth providers with a disconnect action.
 * Also renders "Connect [provider]" links for configured providers that are
 * not yet linked. The disconnect action is gated behind a step-up (tier:medium)
 * identity re-verification dialog.
 *
 * Binding doctrine (sdk-binding-contract.md, MASTER-PROMPT §5):
 *   • Data path = `useDisconnectAccountMutation` from `@/generated/auth`, called
 *     with a `selection` field-picker. No fetch, no GraphQL document string, no
 *     hardcoded URL, no `@constructive-io/data`.
 *   • NO client bootstrap: never calls `configure()`/`getClient()`, never mounts
 *     `<QueryClientProvider>`. The host's `@constructive/blocks-runtime` does that.
 *   • Override seam: `onSubmitDisconnect` fully replaces the generated-hook call.
 *   • Error mapping via `parseGraphQLError` from the `auth-errors` foundation lib.
 *   • Connected-account list and identity-provider list are CONDITIONAL: the spec
 *     confirms no public Connection types exist yet (sdk-binding-contract.md §10).
 *     The block accepts `connectedAccounts` and `providers` as props (static data
 *     supplied by the host) until the backend exposes Connection types. If the
 *     host omits them, the block renders an empty but valid state.
 *
 * Step-up flow:
 *   Disconnect button → confirmation dialog → step-up (tier: medium) → mutation.
 *   If step-up is cancelled, the confirmation dialog re-opens silently.
 */

import { useState } from 'react';

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
import { Avatar, AvatarFallback } from '@constructive-io/ui/avatar';

import { cn } from '@/lib/utils';
import { useDisconnectAccountMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

import {
  defaultAccountConnectedAccountsMessages,
  type AccountConnectedAccountsMessageOverrides,
  type AccountConnectedAccountsMessages
} from './messages';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A linked OAuth account row. */
export type ConnectedAccountRow = {
  /** Internal record id (uuid). */
  id: string;
  /** Provider slug, e.g. 'google', 'github', 'apple'. */
  service: string;
  /** Display name for the linked identity (email or username). */
  identifier: string;
  /** Whether the OAuth identity has been verified. */
  isVerified: boolean;
  /** ISO timestamp when the link was created. */
  createdAt: string;
};

/**
 * An identity provider that is configured but may not be linked.
 * Coordinate this shape with auth-social-providers-grid.
 */
export type IdentityProvider = {
  id: string;
  /** Provider slug, e.g. 'google', 'github'. */
  slug: string;
  /** Human-readable display name shown in the UI. */
  displayName: string;
  kind: 'oidc' | 'oauth2';
  enabled: boolean;
};

/**
 * Variables the disconnect call receives.
 * The override `onSubmitDisconnect` gets these verbatim.
 */
export type DisconnectAccountVars = {
  accountId: string;
};

/** Result returned by the disconnect call. */
export type DisconnectAccountResult = {
  success: boolean;
};

export type AccountConnectedAccountsProps = {
  /**
   * Pre-fetched connected account rows.
   * When omitted, the block renders an empty connected list (no Connection query
   * exists yet — sdk-binding-contract.md §10 FLAG). The host supplies these from
   * its own query until a public ConnectedAccountsConnection type is confirmed.
   */
  connectedAccounts?: ConnectedAccountRow[];
  /**
   * Static list of identity providers to render "Connect" links for.
   * Providers already in `connectedAccounts` are shown as connected; others as
   * "not connected". When omitted, falls back to an empty list.
   */
  providers?: IdentityProvider[];
  /**
   * Base URL for initiating an OAuth connection flow.
   * The block appends `?provider=<slug>&action=connect` to this URL.
   * Default: '/auth/social'.
   */
  oauthRedirectBase?: string;
  messages?: AccountConnectedAccountsMessageOverrides;
  /** Replace the default `useDisconnectAccountMutation` call. */
  onSubmitDisconnect?: (vars: DisconnectAccountVars) => Promise<DisconnectAccountResult>;
  /** Fires after a successful disconnect. Always fires. */
  onAccountDisconnected?: (accountId: string, provider: string) => void;
  /** Fires when the host signals a successful OAuth connection back to the block. */
  onAccountConnected?: (provider: string) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and mapped errors. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Provider initials fallback for the avatar. */
function providerInitials(slug: string): string {
  return slug.slice(0, 2).toUpperCase();
}

/** Build an OAuth connect URL from the base + provider slug. */
function connectUrl(base: string, slug: string): string {
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}provider=${encodeURIComponent(slug)}&action=connect`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountConnectedAccounts({
  connectedAccounts = [],
  providers = [],
  oauthRedirectBase = '/auth/social',
  messages: messageOverrides,
  onSubmitDisconnect: onSubmitDisconnectOverride,
  onAccountDisconnected,
  onAccountConnected: _onAccountConnected,
  onError,
  onMessage,
  className
}: AccountConnectedAccountsProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: AccountConnectedAccountsMessages = {
    ...defaultAccountConnectedAccountsMessages,
    ...messageOverrides,
    errors: { ...defaultAccountConnectedAccountsMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hook from the host's `auth` SDK.
  // Payload shape (verified from DisconnectAccountPayload):
  //   { disconnectAccount: { clientMutationId?: string|null; result?: boolean|null } | null }
  const defaultMutation = useDisconnectAccountMutation({
    selection: { fields: { result: true } }
  });

  // Hybrid pending: generated hook tracks its own; the override path does not.
  const [overridePending, setOverridePending] = useState(false);
  // Step-up pending: prevents double-clicking confirm while step-up is awaiting user input.
  const [stepUpPending, setStepUpPending] = useState(false);
  const isPending = stepUpPending || (onSubmitDisconnectOverride ? overridePending : defaultMutation.isPending);

  // Step-up hook (tier: medium — password re-verification, per step-up-contract §6).
  const stepUp = useStepUp();

  // Row-level error state — shown inline above the list.
  const [rowError, setRowError] = useState<string | null>(null);

  // Disconnect confirmation state.
  const [confirmTarget, setConfirmTarget] = useState<ConnectedAccountRow | null>(null);

  // ---------------------------------------------------------------------------
  // Derived data — build a unified provider list sorted: connected first,
  // then unconnected; each group alphabetical by service/slug.
  // ---------------------------------------------------------------------------

  const connectedIds = new Set(connectedAccounts.map((a) => a.service));

  // Rows for connected accounts that have provider metadata.
  const connectedRows = connectedAccounts
    .map((account) => {
      const meta = providers.find((p) => p.slug === account.service);
      return { account, meta };
    })
    .sort((a, b) => a.account.service.localeCompare(b.account.service));

  // Providers not yet connected.
  const unconnectedProviders = providers
    .filter((p) => p.enabled && !connectedIds.has(p.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const isEmpty = connectedRows.length === 0 && unconnectedProviders.length === 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Called after the confirmation dialog is confirmed — gates on step-up. */
  async function handleDisconnectConfirm() {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setRowError(null);

    try {
      // Step-up: tier medium → password re-verification (step-up-contract.md §6).
      // setStepUpPending guards against double-click during the step-up modal.
      setStepUpPending(true);
      await stepUp({ tier: 'medium' });
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') {
        // User cancelled step-up — re-show the confirmation dialog silently.
        setConfirmTarget(target);
        return;
      }
      // Unexpected step-up failure — surface as error.
      const message = merged.errors.UNKNOWN_ERROR;
      const code = 'UNKNOWN_ERROR';
      setRowError(message);
      onMessage?.({ kind: 'error', key: code, message });
      onError?.({ message, code });
      return;
    } finally {
      // Always clear step-up pending (runs before any early return too).
      setStepUpPending(false);
    }

    // Step-up passed — execute the disconnect.
    if (onSubmitDisconnectOverride) setOverridePending(true);
    try {
      const vars: DisconnectAccountVars = { accountId: target.id };

      if (onSubmitDisconnectOverride) {
        await onSubmitDisconnectOverride(vars);
      } else {
        const data = await defaultMutation.mutateAsync({ input: vars });
        const success = data.disconnectAccount?.result ?? false;
        if (!success) {
          throw Object.assign(new Error('Disconnect returned false'), {
            extensions: { code: 'UNKNOWN_ERROR' }
          });
        }
      }

      setConfirmTarget(null);
      onMessage?.({ kind: 'success', key: 'disconnectAccount.success', message: merged.disconnectedToast });
      onAccountDisconnected?.(target.id, target.service);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setRowError(message);
      setConfirmTarget(null);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    } finally {
      if (onSubmitDisconnectOverride) setOverridePending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Card data-slot="account-connected-accounts" className={cn('w-full max-w-sm mx-auto', className)}>
        <CardHeader>
          <CardTitle>{merged.title}</CardTitle>
          <CardDescription>{merged.description}</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {rowError && (
            <div className="px-6 pb-2" aria-live="polite">
              <AuthErrorAlert error={rowError} />
            </div>
          )}

          {isEmpty ? (
            <p className="px-6 pb-4 text-sm text-muted-foreground" data-testid="no-providers-message">
              {merged.noProvidersMessage}
            </p>
          ) : (
            <ul role="list" className="list-none" aria-label={merged.title}>
              {/* Connected accounts */}
              {connectedRows.map(({ account, meta }, idx) => {
                const displayName = meta?.displayName ?? account.service;
                return (
                  <li key={account.id} data-testid={`connected-row-${account.id}`}>
                    {idx > 0 && <Separator />}
                    <div className="flex items-center gap-3 px-6 py-4">
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback aria-label={displayName}>
                          {providerInitials(account.service)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-medium" data-testid={`provider-name-${account.id}`}>
                          {displayName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground" data-testid={`provider-identifier-${account.id}`}>
                          {account.identifier}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {account.isVerified ? (
                          <Badge variant="success" data-testid={`badge-verified-${account.id}`}>
                            {merged.verifiedBadge}
                          </Badge>
                        ) : (
                          <Badge variant="outline" data-testid={`connected-label-${account.id}`}>
                            {merged.connectedLabel}
                          </Badge>
                        )}
                        <Button
                          variant="destructive-outline"
                          size="sm"
                          onClick={() => {
                            setRowError(null);
                            setConfirmTarget(account);
                          }}
                          aria-label={`Disconnect ${displayName} account`}
                          data-testid={`disconnect-button-${account.id}`}
                        >
                          {merged.disconnectButton}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}

              {/* Unconnected providers */}
              {unconnectedProviders.map((provider, idx) => (
                <li key={provider.id} data-testid={`unconnected-row-${provider.id}`}>
                  {(connectedRows.length > 0 || idx > 0) && <Separator />}
                  <div className="flex items-center gap-3 px-6 py-4">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback aria-label={provider.displayName}>
                        {providerInitials(provider.slug)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-medium" data-testid={`provider-name-${provider.id}`}>
                        {provider.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {merged.notConnectedLabel}
                      </span>
                    </div>

                    <Button asChild variant="outline" size="sm">
                      <a
                        href={connectUrl(oauthRedirectBase, provider.slug)}
                        data-testid={`connect-button-${provider.id}`}
                      >
                        {merged.connectButton(provider.displayName)}
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Disconnect confirmation dialog */}
      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setConfirmTarget(null);
        }}
      >
        <DialogContent data-slot="disconnect-confirm-dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{merged.disconnectConfirmTitle}</DialogTitle>
            <DialogDescription>{merged.disconnectConfirmDescription}</DialogDescription>
          </DialogHeader>

          <DialogFooter variant="bare">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmTarget(null)}
              data-testid="disconnect-cancel"
            >
              {merged.disconnectCancelButton}
            </Button>
            <AuthLoadingButton
              type="button"
              variant="destructive"
              isLoading={isPending}
              loadingText={merged.disconnectConfirmButton}
              onClick={handleDisconnectConfirm}
              data-testid="disconnect-confirm"
            >
              {merged.disconnectConfirmButton}
            </AuthLoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
