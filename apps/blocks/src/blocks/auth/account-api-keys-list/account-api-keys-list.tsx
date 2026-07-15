'use client';

/**
 * account-api-keys-list  (registry: auth-account-api-keys-list)
 *
 * Displays the signed-in user's API keys and provides revoke + create actions.
 * Because `user_api_keys` is a `constructive_auth_private` view with NO public
 * API, there is no generated list hook — the list is supplied by the host via the
 * `keys` adapter prop (default: empty array, renders the empty state).
 * Only the `revokeApiKey` mutation is bindable today via `useRevokeApiKeyMutation`
 * from `@/generated/auth`.
 *
 * SDK gap: no `useUserApiKeysQuery` hook exists (sdk-binding-contract.md §10).
 * When a `UserApiKeysConnection` ships, add `useUserApiKeysQuery` from
 * `@/generated/auth` and update `requires.json` with `"queries":["userApiKeys"]`.
 *
 * Key creation: delegated to `ApiKeyCreateDialog` (auth-api-key-create-dialog),
 * which enforces step-up tier:'high' internally. After creation, `ApiKeyCreatedModal`
 * (auth-api-key-created-modal) shows the one-time raw key.
 *
 * Revocation: single revoke uses a confirmation dialog (no step-up — spec §Step-up).
 *
 * Binding doctrine (sdk-binding-contract.md §3, §5):
 *   • Generated hook imported from `@/generated/auth` — never `@constructive-io/data`.
 *   • No `configure()`/`getClient()`, no `QueryClientProvider`. Host mounts blocks-runtime.
 *   • `onRevokeSubmit` override seam replaces the default hook call.
 */

import { useState } from 'react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@constructive-io/ui/dialog';
import { Separator } from '@constructive-io/ui/separator';

import { cn } from '@/lib/utils';
import { useRevokeApiKeyMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { ApiKeyCreateDialog, type ApiKeyCreatedResult } from '@/blocks/auth/api-key-create-dialog/api-key-create-dialog';
import { ApiKeyCreatedModal } from '@/blocks/auth/api-key-created-modal/api-key-created-modal';

import {
  defaultAccountApiKeysListMessages,
  type AccountApiKeysListMessages,
  type AccountApiKeysListMessageOverrides
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type { ApiKeyCreatedResult };

/**
 * A single API key row. The host supplies rows from whatever list source it has.
 * There is NO generated list hook for `user_api_keys` (private view, no public API
 * → no `*Connection` type). sdk-binding-contract.md §10 documents this gap.
 */
export type ApiKeyRow = {
  id: string;
  name: string;
  /** First visible chars of the raw key, stored at creation time. */
  keyPrefix: string;
  accessLevel: string;
  mfaLevel: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

/** Variables passed to the `onRevokeSubmit` override. */
export type RevokeApiKeyVars = {
  keyId: string;
};

/** Result shape; mirrors the `revokeApiKey` payload fields this block selects. */
export type RevokeApiKeyResult = {
  result: boolean | null;
};

export type AccountApiKeysListProps = {
  /**
   * The list of API keys to display. There is NO generated list hook for
   * `user_api_keys` (it is in `constructive_auth_private`, no public API →
   * no `*Connection` type). The host must supply rows; the default is `[]`
   * which renders the empty state.
   *
   * sdk-binding-contract.md §10 documents this gap.
   */
  keys?: ApiKeyRow[];
  /** Maximum number of API keys allowed per user. Used to gate the create button. */
  maxKeys?: number;
  /** Override the `useRevokeApiKeyMutation` call. */
  onRevokeSubmit?: (vars: RevokeApiKeyVars) => Promise<RevokeApiKeyResult | null>;
  /** Fires after a key is successfully revoked. Always fires. */
  onKeyRevoked?: (keyId: string) => void;
  /** Fires after `auth-api-key-create-dialog` succeeds. Always fires. */
  onKeyCreated?: (result: ApiKeyCreatedResult) => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors. Always fires. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  messages?: AccountApiKeysListMessageOverrides;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format ISO date for display. */
function formatDate(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return fallback;
  }
}

/** Returns true if expiresAt is in the past. */
function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountApiKeysList({
  keys = [],
  maxKeys,
  onRevokeSubmit: onRevokeSubmitOverride,
  onKeyRevoked,
  onKeyCreated,
  onError,
  onMessage,
  messages: messageOverrides,
  className
}: AccountApiKeysListProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: AccountApiKeysListMessages = {
    ...defaultAccountApiKeysListMessages,
    ...messageOverrides,
    errors: { ...defaultAccountApiKeysListMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hook — `revokeApiKey` takes `{ input: { keyId } }`.
  // Payload: `{ revokeApiKey: { result: boolean | null } | null }`.
  const defaultRevokeMutation = useRevokeApiKeyMutation({
    selection: {
      fields: { result: true }
    }
  });

  // Hybrid pending: override path tracks its own pending state.
  const [overridePending, setOverridePending] = useState(false);
  const isRevokePending = onRevokeSubmitOverride ? overridePending : defaultRevokeMutation.isPending;

  // Confirmation dialog state
  const [confirmKey, setConfirmKey] = useState<ApiKeyRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);

  // Created modal state — holds the raw key after creation (shown once)
  const [pendingCreatedKey, setPendingCreatedKey] = useState<ApiKeyCreatedResult | null>(null);

  const isMaxReached = maxKeys !== undefined && keys.length >= maxKeys;

  async function runRevoke(keyId: string): Promise<RevokeApiKeyResult | null> {
    if (onRevokeSubmitOverride) return onRevokeSubmitOverride({ keyId });
    const data = await defaultRevokeMutation.mutateAsync({ input: { keyId } });
    if (!data.revokeApiKey) return null;
    return { result: data.revokeApiKey.result ?? null };
  }

  async function handleRevoke(key: ApiKeyRow) {
    setError(null);
    if (onRevokeSubmitOverride) setOverridePending(true);
    try {
      await runRevoke(key.id);
      setConfirmKey(null);
      onMessage?.({ kind: 'success', key: 'revokeApiKey.success', message: merged.keyRevokedMessage });
      onKeyRevoked?.(key.id);
    } catch (err) {
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const errKey = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key: errKey, message });
      onError?.({ message, code: errKey });
    } finally {
      if (onRevokeSubmitOverride) setOverridePending(false);
    }
  }

  function handleCreateSuccess(result: ApiKeyCreatedResult) {
    // Close create dialog and open created-modal with the raw key.
    setCreateOpen(false);
    setPendingCreatedKey(result);
    onKeyCreated?.(result);
    onMessage?.({ kind: 'success', key: 'createApiKey.success' });
  }

  function handleCreatedModalDismissed() {
    setPendingCreatedKey(null);
  }

  return (
    <Card data-slot="account-api-keys-list" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle>{merged.title}</CardTitle>
            <CardDescription className="mt-1">{merged.description}</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isMaxReached}
            onClick={() => setCreateOpen(true)}
            aria-disabled={isMaxReached}
            data-testid="create-key-button"
          >
            {merged.createButton}
          </Button>
        </div>
        {isMaxReached && (
          <p className="text-pretty text-muted-foreground text-xs mt-1" role="note">
            {merged.maxKeysReached}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <AuthErrorAlert error={error} />

        {keys.length === 0 ? (
          <p className="text-pretty text-muted-foreground text-sm">{merged.noKeysDescription}</p>
        ) : (
          <ul role="list" className="space-y-0 list-none">
            {keys.map((key, idx) => {
              const expired = isExpired(key.expiresAt);
              const expiryLabel = key.expiresAt
                ? expired
                  ? merged.expired
                  : formatDate(key.expiresAt, merged.noExpiry)
                : merged.noExpiry;
              const lastUsedLabel = formatDate(key.lastUsedAt, merged.neverUsed);

              return (
                <li key={key.id} role="listitem">
                  {idx > 0 && <Separator className="my-3" />}
                  <div className="flex items-start justify-between gap-3 py-1">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium leading-none truncate max-w-[140px]">
                          {key.name}
                        </span>
                        {expired && (
                          <Badge variant="destructive" className="text-xs shrink-0">
                            {merged.expired}
                          </Badge>
                        )}
                      </div>
                      <code className="text-muted-foreground text-xs font-mono block truncate">
                        {key.keyPrefix}&hellip;
                      </code>
                      <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                        <span>
                          {merged.accessLevelHeader}: {key.accessLevel}
                        </span>
                        <span>
                          {merged.lastUsedHeader}: {lastUsedLabel}
                        </span>
                        <span
                          aria-label={
                            expired
                              ? `${merged.expiresHeader}: ${merged.expired}`
                              : `${merged.expiresHeader}: ${expiryLabel}`
                          }
                        >
                          {merged.expiresHeader}: {expiryLabel}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="destructive-outline"
                      size="sm"
                      disabled={isRevokePending}
                      onClick={() => setConfirmKey(key)}
                      aria-label={`${merged.revokeButton} ${key.name}`}
                      className="shrink-0"
                      data-testid={`revoke-button-${key.id}`}
                    >
                      {merged.revokeButton}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      {/* Revoke confirmation dialog */}
      <Dialog
        open={confirmKey !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmKey(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{merged.revokeConfirmTitle}</DialogTitle>
            <DialogDescription>{merged.revokeConfirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{merged.revokeCancelButton}</Button>
            </DialogClose>
            <AuthLoadingButton
              variant="destructive"
              isLoading={isRevokePending}
              loadingText={merged.revokeConfirmButton}
              onClick={() => {
                if (confirmKey) handleRevoke(confirmKey);
              }}
              data-testid="revoke-confirm-button"
            >
              {merged.revokeConfirmButton}
            </AuthLoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create API key dialog (step-up is handled inside ApiKeyCreateDialog) */}
      <ApiKeyCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreateSuccess}
        onError={onError}
        onMessage={onMessage}
      />

      {/* Created-modal: shows the one-time raw key after creation */}
      {pendingCreatedKey && (
        <ApiKeyCreatedModal
          open={pendingCreatedKey !== null}
          onOpenChange={(open) => {
            if (!open) setPendingCreatedKey(null);
          }}
          apiKey={pendingCreatedKey.rawKey}
          keyName={pendingCreatedKey.name}
          expiresAt={pendingCreatedKey.expiresAt}
          onDismissed={handleCreatedModalDismissed}
        />
      )}
    </Card>
  );
}
