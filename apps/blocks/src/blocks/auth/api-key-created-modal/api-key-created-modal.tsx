'use client';

/**
 * api-key-created-modal  (registry: auth-api-key-created-modal)
 *
 * Presentational block — one-time display of a freshly-created raw API key
 * (cnc_live_sk_...). The raw key is unrecoverable after this view; the DB
 * stores only the SHA-256 hash. The modal enforces an explicit
 * "I have saved this key" acknowledgement before allowing dismiss.
 *
 * NO data operation, NO generated hook, NO blocks-runtime dependency.
 * The raw key is passed in as a prop by auth-account-api-keys-list after
 * auth-api-key-create-dialog succeeds (spec §Pairing).
 *
 * Safety rails (Base UI Dialog API):
 *   • `disablePointerDismissal` on Dialog root: blocks overlay click when unacknowledged.
 *   • `onOpenChange` intercept: blocks Escape close (reason === 'escapeKey') when unacknowledged.
 *   • "Done" button uses aria-disabled (not native disabled) to remain in tab order.
 *   • Copy feedback reverts automatically after 2 s.
 *
 * (sdk-binding-contract.md §7 — presentational blocks ship no requires.json.)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TriangleAlertIcon, CopyIcon, CheckIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@constructive-io/ui/dialog';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';

import { cn } from '@/lib/utils';

import {
  defaultApiKeyCreatedModalMessages,
  type ApiKeyCreatedModalMessages
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ApiKeyCreatedModalMessageOverrides = Partial<ApiKeyCreatedModalMessages>;

export type ApiKeyCreatedModalProps = {
  /** Whether the dialog is open. */
  open: boolean;
  /** Called when the dialog requests a state change (open/close). */
  onOpenChange: (open: boolean) => void;
  /** The raw API key (cnc_live_sk_...) — exists only in React state, never stored here. */
  apiKey: string;
  /** Human-readable name of the key, shown in the modal title. */
  keyName: string;
  /** Optional ISO-8601 expiry timestamp for display only. */
  expiresAt?: string | null;
  /** BCP 47 locale used to format the expiry date. Default: en-US. */
  locale?: string;
  /** IANA time-zone name used to format the expiry date. Default: UTC. */
  timeZone?: string;
  /** Called when the user checks the acknowledgement and clicks "Done". */
  onDismissed?: () => void;
  messages?: ApiKeyCreatedModalMessageOverrides;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApiKeyCreatedModal({
  open,
  onOpenChange,
  apiKey,
  keyName,
  expiresAt,
  locale = 'en-US',
  timeZone = 'UTC',
  onDismissed,
  messages: messageOverrides,
  className
}: ApiKeyCreatedModalProps) {
  // Deep merge (flat catalog — no nested errors map for this block).
  const merged: ApiKeyCreatedModalMessages = {
    ...defaultApiKeyCreatedModalMessages,
    ...messageOverrides
  };

  const [hasCopied, setHasCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Use a ref so the onOpenChange interceptor always has the current value
  // without a stale closure (avoids re-creating the handler on every state tick).
  const acknowledgedRef = useRef(hasAcknowledged);
  useEffect(() => {
    acknowledgedRef.current = hasAcknowledged;
  }, [hasAcknowledged]);

  // Reset local state when the modal opens.
  useEffect(() => {
    if (open) {
      setHasCopied(false);
      setCopyError(null);
      setHasAcknowledged(false);
      acknowledgedRef.current = false;
    }
  }, [open]);

  // Copy-button timeout ref for cleanup on unmount.
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const copyErrorMessage = merged.copyErrorMessage;
  const handleCopy = useCallback(async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(apiKey);
      setHasCopied(true);
      copyTimeoutRef.current = setTimeout(() => setHasCopied(false), 2000);
    } catch {
      setCopyError(copyErrorMessage);
    }
  }, [apiKey, copyErrorMessage]);

  // Base UI onOpenChange intercept — block Escape + any programmatic close
  // when the user has not acknowledged they saved the key.
  // The signature is (open: boolean, eventDetails: DialogRoot.ChangeEventDetails).
  const handleOpenChange = useCallback(
    (nextOpen: boolean, eventDetails?: { reason?: string }) => {
      if (!nextOpen && !acknowledgedRef.current) {
        // Block Escape key and outside-press dismissal; Done button is the only exit.
        // Base UI REASONS constants use hyphenated strings: 'escape-key' and 'outside-press'.
        if (
          eventDetails?.reason === 'escape-key' ||
          eventDetails?.reason === 'outside-press'
        ) {
          return; // Do not propagate — keep the dialog open.
        }
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  function handleDone() {
    if (!hasAcknowledged) return;
    onDismissed?.();
    onOpenChange(false);
  }

  // Format expiry for display.
  const expiryDisplay = useMemo(
    () =>
      expiresAt
        ? new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone
          }).format(new Date(expiresAt))
        : merged.noExpiry,
    [expiresAt, locale, merged.noExpiry, timeZone]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange as (open: boolean, eventDetails: { reason?: string }) => void}
      disablePointerDismissal={!hasAcknowledged}
    >
      <DialogContent
        data-slot="api-key-created-modal"
        role="alertdialog"
        className={cn('w-full max-w-sm mx-auto', className)}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{merged.title}</DialogTitle>
          <DialogDescription className="sr-only">
            One-time display of your new API key for {keyName}. Save it before closing.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Warning banner */}
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-md px-3 py-2.5',
              'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50'
            )}
          >
            <TriangleAlertIcon
              className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {merged.warningHeading}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 text-pretty leading-snug">
                {merged.warningBody}
              </p>
            </div>
          </div>

          {/* Key display area */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{merged.keyLabel}</p>
            <div
              className={cn(
                'relative flex items-center gap-2 rounded-md',
                'bg-muted/60 border border-border px-3 py-2.5'
              )}
            >
              <code
                role="textbox"
                aria-label="API key"
                aria-readonly="true"
                className={cn(
                  'flex-1 min-w-0 break-all text-xs font-mono leading-relaxed',
                  'text-foreground select-all'
                )}
              >
                {apiKey}
              </code>
              <div
                className="shrink-0"
                aria-live="polite"
                aria-atomic="true"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1.5"
                  onClick={handleCopy}
                  aria-label={hasCopied ? merged.copiedButton : merged.copyButton}
                  data-testid="copy-button"
                >
                  {hasCopied ? (
                    <CheckIcon className="size-3.5 text-green-600" aria-hidden="true" />
                  ) : (
                    <CopyIcon className="size-3.5" aria-hidden="true" />
                  )}
                  <span className="text-xs">
                    {hasCopied ? merged.copiedButton : merged.copyButton}
                  </span>
                </Button>
              </div>
            </div>
            {copyError && (
              <p role="alert" aria-live="polite" className="text-destructive text-xs mt-1">
                {copyError}
              </p>
            )}
          </div>

          {/* Expiry line */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{merged.expiresLabel}:</span>
            {expiresAt ? (
              <Badge variant="secondary" className="text-xs font-normal">
                {expiryDisplay}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-normal">
                {expiryDisplay}
              </Badge>
            )}
          </div>

          {/* Separator */}
          <hr className="border-border/60" />

          {/* Acknowledgement checkbox */}
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="api-key-acknowledge"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              aria-required="true"
              className="mt-0.5 size-4 accent-primary cursor-pointer"
              data-testid="acknowledge-checkbox"
            />
            <label
              htmlFor="api-key-acknowledge"
              className="text-sm text-foreground leading-snug cursor-pointer select-none"
            >
              {merged.acknowledgementLabel}
            </label>
          </div>

          {/* Dismiss button */}
          <Button
            type="button"
            className="w-full"
            onClick={handleDone}
            aria-disabled={!hasAcknowledged}
            data-testid="done-button"
          >
            {merged.dismissButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
