'use client';

/**
 * passkey-management-list  (registry: auth-passkey-management-list)
 *
 * Lists all webauthn_credentials rows for the current user. Allows inline
 * renaming (no step-up) and deletion (step-up tier: 'high').
 *
 * Data path: generated React Query hooks from @/generated/auth (via the
 * use-passkey-management utility hook). No fetch, no GraphQL document strings,
 * no configure()/getClient(), no QueryClientProvider.
 */

import { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@constructive-io/ui/dialog';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { cn } from '@/lib/utils';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { useStepUp } from '@/blocks/auth/use-step-up/use-step-up';
import { StepUpError } from './hooks/use-passkey-management';
import { usePasskeyManagement, type WebAuthnCredential } from './hooks/use-passkey-management';
import {
  defaultPasskeyManagementListMessages,
  type PasskeyManagementListMessageOverrides,
  type PasskeyManagementListMessages
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PasskeyManagementEvent =
  | { type: 'renamed'; credentialId: string; name: string }
  | { type: 'deleted'; credentialId: string };

export type PasskeyManagementListProps = {
  /** Adapter override for fetching the credential list. Replaces the default query. */
  queryCredentials?: () => Promise<WebAuthnCredential[]>;
  /** Adapter override for renaming a credential. Step-up is NOT called before this. */
  onRename?: (input: { credentialId: string; name: string }) => Promise<void>;
  /**
   * Adapter override for deleting a credential.
   * Step-up is called BEFORE this adapter, so the adapter receives a post-step-up call.
   */
  onDelete?: (input: { credentialId: string }) => Promise<void>;
  messages?: PasskeyManagementListMessageOverrides;
  onSuccess?: (event: PasskeyManagementEvent) => void;
  onError?: (err: { message: string; code: string }) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Transport label map
// ---------------------------------------------------------------------------

const TRANSPORT_LABELS: Record<string, string> = {
  internal: 'Built-in',
  usb: 'USB key',
  nfc: 'NFC',
  ble: 'Bluetooth',
  cable: 'Bluetooth',
  hybrid: 'Cross-device',
  'smart-card': 'Smart card'
};

function transportLabel(transport: string): string {
  return TRANSPORT_LABELS[transport] ?? transport;
}

// ---------------------------------------------------------------------------
// Date formatting helper (uses Intl to avoid date-fns dep)
// ---------------------------------------------------------------------------

function formatRelative(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    const mo = Math.floor(day / 30);
    const yr = Math.floor(day / 365);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (yr >= 1) return rtf.format(-yr, 'year');
    if (mo >= 1) return rtf.format(-mo, 'month');
    if (day >= 1) return rtf.format(-day, 'day');
    if (hr >= 1) return rtf.format(-hr, 'hour');
    if (min >= 1) return rtf.format(-min, 'minute');
    return 'just now';
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Inner credential row
// ---------------------------------------------------------------------------

type CredentialRowProps = {
  credential: WebAuthnCredential;
  merged: PasskeyManagementListMessages;
  onRenameStart: (id: string, current: string) => void;
  onDeleteRequest: (id: string, name: string) => void;
};

function CredentialRow({ credential, merged, onRenameStart, onDeleteRequest }: CredentialRowProps) {
  const isPlatform = credential.credentialDeviceType === 'platform';
  const lastUsed = formatRelative(credential.lastUsedAt);
  const created = formatRelative(credential.createdAt);

  return (
    <div
      aria-label={`Passkey: ${credential.name ?? 'Unnamed'}`}
      className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{credential.name ?? 'Unnamed passkey'}</span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {isPlatform ? merged.platformBadge : merged.crossPlatformBadge}
          </Badge>
        </div>

        {credential.transports.length > 0 && (
          <p className="text-pretty text-muted-foreground text-xs">
            {merged.transportsLabel}: {credential.transports.map(transportLabel).join(', ')}
          </p>
        )}

        <p className="text-pretty text-muted-foreground text-xs">
          {merged.createdAtLabel}: {created ?? '—'}
        </p>
        <p className="text-pretty text-muted-foreground text-xs">
          {lastUsed ? `${merged.lastUsedLabel}: ${lastUsed}` : merged.lastUsedNever}
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="outline"
          size="sm"
          data-testid={`rename-btn-${credential.id}`}
          onClick={() => onRenameStart(credential.id, credential.name ?? '')}
        >
          {merged.renameButton}
        </Button>
        <Button
          variant="destructive-outline"
          size="sm"
          data-testid={`delete-btn-${credential.id}`}
          onClick={() => onDeleteRequest(credential.id, credential.name ?? 'Unnamed passkey')}
        >
          {merged.deleteButton}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PasskeyManagementList({
  queryCredentials: queryCredentialsOverride,
  onRename: onRenameOverride,
  onDelete: onDeleteOverride,
  messages: messageOverrides,
  onSuccess,
  onError,
  onMessage,
  className
}: PasskeyManagementListProps) {
  // Deep merge messages
  const merged: PasskeyManagementListMessages = {
    ...defaultPasskeyManagementListMessages,
    ...messageOverrides,
    errors: {
      ...defaultPasskeyManagementListMessages.errors,
      ...messageOverrides?.errors
    }
  };

  const stepUp = useStepUp();

  // Default data hook (utility) — only used when no override is provided
  const hook = usePasskeyManagement(merged);

  // Resolve the credential list: call override or fall back to generated hook
  const [overrideCredentials, setOverrideCredentials] = useState<WebAuthnCredential[] | null>(null);
  useEffect(() => {
    if (!queryCredentialsOverride) return;
    queryCredentialsOverride().then(setOverrideCredentials);
  }, [queryCredentialsOverride]);

  const credentials = queryCredentialsOverride ? (overrideCredentials ?? []) : hook.credentials;
  const isLoading = queryCredentialsOverride ? (overrideCredentials === null) : hook.isLoading;

  // Rename dialog state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');

  // Local pending state for adapter overrides (adapters don't drive hook.isRenaming / hook.isDeleting)
  const [overrideRenamePending, setOverrideRenamePending] = useState(false);
  const [overrideDeletePending, setOverrideDeletePending] = useState(false);

  // Inline error for the list-level (query errors)
  const [listError, setListError] = useState<string | null>(null);

  // Keep listError in sync with query errors (in an effect to avoid render-phase setState)
  useEffect(() => {
    if (hook.queryError) setListError(hook.queryError);
  }, [hook.queryError]);

  // -------------------------------------------------------------------------
  // Rename handlers
  // -------------------------------------------------------------------------

  function handleRenameStart(id: string, current: string) {
    setEditingId(id);
    setEditingName(current);
    setRenameError(null);
  }

  function handleRenameCancel() {
    setEditingId(null);
    setEditingName('');
    setRenameError(null);
  }

  async function handleRenameSave() {
    if (!editingId) return;
    const name = editingName.trim();
    setRenameError(null);
    try {
      if (onRenameOverride) {
        setOverrideRenamePending(true);
        await onRenameOverride({ credentialId: editingId, name });
        setOverrideRenamePending(false);
      } else {
        await hook.rename({ credentialId: editingId, name });
      }
      setEditingId(null);
      setEditingName('');
      onSuccess?.({ type: 'renamed', credentialId: editingId, name });
      onMessage?.({ kind: 'success', key: 'passkey.renamed', message: merged.renameSuccessToast });
    } catch (err) {
      setOverrideRenamePending(false);
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.RENAME_FAILED
      });
      const key = code ?? 'RENAME_FAILED';
      setRenameError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    }
  }

  // -------------------------------------------------------------------------
  // Delete handlers
  // -------------------------------------------------------------------------

  function handleDeleteRequest(id: string, name: string) {
    setDeletingId(id);
    setDeletingName(name);
  }

  function handleDeleteCancel() {
    setDeletingId(null);
    setDeletingName('');
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    const credentialId = deletingId;
    setDeletingId(null);
    setDeletingName('');
    try {
      // Step-up gate fires BEFORE either the adapter or the default mutation
      await stepUp({ tier: 'high' });
      if (onDeleteOverride) {
        setOverrideDeletePending(true);
        await onDeleteOverride({ credentialId });
        setOverrideDeletePending(false);
      } else {
        await hook.deleteCredential({ credentialId });
      }
      onSuccess?.({ type: 'deleted', credentialId });
      onMessage?.({ kind: 'success', key: 'passkey.deleted', message: merged.deleteSuccessToast });
    } catch (err) {
      setOverrideDeletePending(false);
      // Step-up cancelled: silent return per step-up-contract.md §3
      if (err instanceof StepUpError && err.reason === 'cancelled') return;
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.DELETE_FAILED
      });
      const key = code ?? 'DELETE_FAILED';
      setListError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Card data-slot="passkey-management-list" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <AuthErrorAlert error={listError} />

        {isLoading && (
          <p className="text-pretty text-muted-foreground text-sm" aria-live="polite">
            Loading…
          </p>
        )}

        {!isLoading && credentials.length === 0 && (
          <div className="space-y-2">
            <p className="text-pretty text-muted-foreground text-sm">{merged.emptyState}</p>
            <Button variant="outline" size="sm" data-testid="add-passkey-btn">
              {merged.addPasskeyButton}
            </Button>
          </div>
        )}

        {!isLoading &&
          credentials.map((cred) => (
            <CredentialRow
              key={cred.id}
              credential={cred}
              merged={merged}
              onRenameStart={handleRenameStart}
              onDeleteRequest={handleDeleteRequest}
            />
          ))}

        {/* Inline rename dialog */}
        <Dialog
          open={editingId !== null}
          onOpenChange={(open) => {
            if (!open) handleRenameCancel();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{merged.renameInputLabel}</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <AuthErrorAlert error={renameError} />
              <Label htmlFor="passkey-rename-input">{merged.renameInputLabel}</Label>
              <Input
                id="passkey-rename-input"
                data-testid="rename-input"
                aria-label={merged.renameInputLabel}
                placeholder={merged.renameInputPlaceholder}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSave();
                  if (e.key === 'Escape') handleRenameCancel();
                }}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleRenameCancel} disabled={hook.isRenaming || overrideRenamePending}>
                {merged.renameCancelButton}
              </Button>
              <Button
                onClick={handleRenameSave}
                disabled={hook.isRenaming || overrideRenamePending || !editingName.trim()}
                data-testid="rename-save-btn"
              >
                {merged.renameSaveButton}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog
          open={deletingId !== null}
          onOpenChange={(open) => {
            if (!open) handleDeleteCancel();
          }}
        >
          <DialogContent role="alertdialog" aria-live="assertive">
            <DialogHeader>
              <DialogTitle>{merged.deleteConfirmTitle}</DialogTitle>
              <DialogDescription>
                {merged.deleteConfirmDescription}
                {deletingName ? ` "${deletingName}"` : ''}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={hook.isDeleting || overrideDeletePending}
                data-testid="delete-cancel-btn"
              >
                {merged.deleteCancelButton}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={hook.isDeleting || overrideDeletePending}
                data-testid="delete-confirm-btn"
              >
                {merged.deleteConfirmButton}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
