'use client';

/**
 * org-scim-token-generation-card  (registry: org-scim-token-generation-card)
 *
 * STUB — Phase 3 / deferred (spec: planning/blocks/org/org-scim-token-generation-card.md).
 *
 * The SCIM backend (`constructive_auth_private.scim_providers`, the
 * `generate_scim_token` and `revoke_scim_token` procedures) is not yet
 * designed. This block ships a presentational placeholder that:
 *   • Renders a "SCIM provisioning not yet available" deferred state by default.
 *   • Accepts the full intended prop surface so host code compiles today; the
 *     `onSubmit` / `onSuccess` / `onError` seams are wired and will fire when
 *     a caller passes `onSubmit` (the override path that bypasses the missing
 *     generated hook).
 *   • Has NO @/generated import, NO data binding, NO requires.json, NO
 *     blocks-runtime dependency — it is purely presentational.
 *
 * When the SCIM backend ships the block will be upgraded to a full data block:
 *   import { useGenerateScimTokenMutation, useRevokeScimTokenMutation }
 *     from '@/generated/admin';
 * and will ship org-scim-token-generation-card.requires.json:
 *   { "namespace": "admin", "mutations": ["generateScimToken", "revokeScimToken"], ... }
 *
 * UI primitives are installed as source alongside this block.
 */

import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Badge } from '@constructive-io/ui/badge';

import { cn } from '@/lib/utils';

import {
  defaultOrgScimTokenGenerationCardMessages,
  type OrgScimTokenGenerationCardMessageOverrides
} from './messages';

// ============================================================================
// Public types
// ============================================================================

export type ScimTokenResult = {
  token: string;
  expiresAt: string | null;
};

export type OrgScimTokenGenerationCardProps = {
  /** The org's UUID — passed through to the backend when the stub is upgraded. */
  orgId: string;
  messages?: OrgScimTokenGenerationCardMessageOverrides;
  /**
   * Override seam: replaces the (not-yet-generated) `useGenerateScimTokenMutation` call.
   * When provided, the block becomes interactive: it calls this function and surfaces
   * the returned token. When absent, the deferred-state UI is shown.
   */
  onSubmit?: (orgId: string) => Promise<ScimTokenResult>;
  /** Fires after a successful token generation. */
  onSuccess?: (result: ScimTokenResult) => void;
  /** Fires after a mapped error. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success and errors. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ============================================================================
// Component
// ============================================================================

export function OrgScimTokenGenerationCard({
  orgId,
  messages: messageOverrides,
  onSubmit: onSubmitOverride,
  onSuccess,
  onError,
  onMessage,
  className
}: OrgScimTokenGenerationCardProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged = {
    ...defaultOrgScimTokenGenerationCardMessages,
    ...messageOverrides,
    errors: {
      ...defaultOrgScimTokenGenerationCardMessages.errors,
      ...messageOverrides?.errors
    }
  };

  const [isPending, setIsPending] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<ScimTokenResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // ── Token generation ────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!onSubmitOverride) return;
    setError(null);
    setGeneratedToken(null);
    setIsPending(true);
    try {
      const result = await onSubmitOverride(orgId);
      setGeneratedToken(result);
      onMessage?.({ kind: 'success', key: 'scimToken.generated', message: merged.tokenShownOnceWarning });
      onSuccess?.(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : merged.errors.UNKNOWN_ERROR;
      const code = (err as { extensions?: { code?: string } })?.extensions?.code ?? 'UNKNOWN_ERROR';
      const resolvedMessage = merged.errors[code as keyof typeof merged.errors] ?? message;
      setError(resolvedMessage);
      onMessage?.({ kind: 'error', key: code, message: resolvedMessage });
      onError?.({ message: resolvedMessage, code });
    } finally {
      setIsPending(false);
    }
  }

  // ── Copy to clipboard ───────────────────────────────────────────────────
  async function handleCopy() {
    if (!generatedToken?.token) return;
    await navigator.clipboard.writeText(generatedToken.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Deferred state (no override provided — backend not shipped) ─────────
  const isDeferred = !onSubmitOverride;

  return (
    <Card data-slot="scim-token-generation-card" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{merged.title}</CardTitle>
            <CardDescription>{merged.description}</CardDescription>
          </div>
          {isDeferred && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              Coming soon
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Deferred state ── */}
        {isDeferred && (
          <Alert>
            <AlertTitle>{merged.deferredTitle}</AlertTitle>
            <AlertDescription>{merged.deferredDescription}</AlertDescription>
          </Alert>
        )}

        {/* ── Error state ── */}
        {error && (
          <Alert variant="destructive" aria-live="polite">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Generated token (shown once) ── */}
        {generatedToken && (
          <div className="space-y-3">
            <Alert>
              <AlertDescription className="font-medium">{merged.tokenShownOnceWarning}</AlertDescription>
            </Alert>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={generatedToken.token}
                aria-label="SCIM bearer token"
                className="font-mono text-xs bg-muted border border-border rounded-md px-3 py-2 flex-1 min-w-0 truncate"
              />
              <Button variant="outline" size="sm" onClick={handleCopy} data-testid="scim-copy">
                {copied ? merged.copiedLabel : merged.copyLabel}
              </Button>
            </div>
          </div>
        )}

        {/* ── Revoke confirmation ── */}
        {showRevokeConfirm && (
          <Alert variant="destructive" aria-live="polite">
            <AlertTitle>{merged.revokeConfirmTitle}</AlertTitle>
            <AlertDescription>{merged.revokeConfirmDescription}</AlertDescription>
            <div className="flex gap-2 mt-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowRevokeConfirm(false);
                  onMessage?.({ kind: 'warning', key: 'scimToken.revoked' });
                }}
                data-testid="scim-revoke-confirm"
              >
                {merged.revokeConfirmLabel}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRevokeConfirm(false)}
                data-testid="scim-revoke-cancel"
              >
                {merged.revokeCancelLabel}
              </Button>
            </div>
          </Alert>
        )}

        {/* ── Actions (only when override is provided / backend is available) ── */}
        {!isDeferred && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              disabled={isPending}
              onClick={handleGenerate}
              data-testid="scim-generate"
            >
              {isPending ? '...' : merged.generateLabel}
            </Button>
            {!showRevokeConfirm && (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => setShowRevokeConfirm(true)}
                data-testid="scim-revoke"
              >
                {merged.revokeLabel}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
