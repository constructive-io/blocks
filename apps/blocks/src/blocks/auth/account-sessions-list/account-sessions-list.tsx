'use client';

/**
 * account-sessions-list  (registry: auth-account-sessions-list)
 *
 * Displays the signed-in user's active sessions and provides revoke actions.
 * Because `user_sessions` is a `constructive_auth_private` view with NO public
 * API, there is no generated list hook — the list is supplied by the host via the
 * `sessions` adapter prop (default: empty array, renders the empty state).
 * Only the `revokeSession` mutation is bindable today via `useRevokeSessionMutation`
 * from `@/generated/auth`.
 *
 * SDK gap: no `useUserSessionsQuery` hook exists (sdk-binding-contract.md §10).
 * When a `UserSessionsConnection` ships, add `useUserSessionsQuery` from
 * `@/generated/auth` and update `requires.json` with `"queries":["userSessions"]`.
 *
 * Step-up tiers (step-up-contract.md §6):
 *   - Single revoke   → `tier: 'medium'` (password)
 *   - Revoke all others → `tier: 'high'` (MFA if enrolled, else password)
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
import { useRevokeSessionMutation } from '@/generated/auth';
import { parseGraphQLError } from '@/blocks/lib/auth-errors';
import { AuthErrorAlert } from '@/blocks/primitives/auth-error-alert';
import { AuthLoadingButton } from '@/blocks/primitives/auth-loading-button';
import { useStepUp, StepUpError } from '@/blocks/auth/use-step-up/use-step-up';

import {
  defaultAccountSessionsListMessages,
  type AccountSessionsListMessages,
  type AccountSessionsListMessageOverrides
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ParsedDevice = {
  browser: string | null;
  os: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
};

export type SessionRow = {
  id: string;
  isCurrent: boolean;
  authMethod: 'password' | 'identity' | 'magic_link' | 'email_otp' | 'sms_otp' | 'anonymous' | string;
  userAgent: string | null;
  parsedDevice: ParsedDevice | null;
  ip: string | null;
  origin: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string;
};

/** Variables passed to the `onRevokeSubmit` override. */
export type RevokeSessionVars = {
  sessionId: string;
};

/** Result shape; mirrors the `revokeSession` payload fields this block selects. */
export type RevokeSessionResult = {
  result: boolean | null;
};

export type AccountSessionsListProps = {
  /**
   * The list of sessions to display. There is NO generated list hook for
   * `user_sessions` (it is in `constructive_auth_private`, no public API →
   * no `*Connection` type). The host must supply rows; the default is `[]`
   * which renders the empty state.
   *
   * sdk-binding-contract.md §10 documents this gap.
   */
  sessions?: SessionRow[];
  /** Override the `useRevokeSessionMutation` call for a single revoke. */
  onRevokeSubmit?: (vars: RevokeSessionVars) => Promise<RevokeSessionResult | null>;
  /** Fires after a single session is successfully revoked. */
  onSessionRevoked?: (sessionId: string) => void;
  /** Fires after all other sessions are successfully revoked. */
  onAllOtherSessionsRevoked?: () => void;
  /** Fires after a mapped error. Always fires. */
  onError?: (err: { message: string; code: string }) => void;
  /** Notification seam — fires for success, mapped errors, and step-up events. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  messages?: AccountSessionsListMessageOverrides;
  className?: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Lightweight user-agent parser. Returns basic device/browser labels without
 * shipping a heavy UA-parser library. Good enough for "Chrome on macOS" level.
 */
function parseUserAgent(ua: string | null): ParsedDevice {
  if (!ua) return { browser: null, os: null, deviceType: 'unknown' };

  // Device type
  let deviceType: ParsedDevice['deviceType'] = 'desktop';
  if (/mobile/i.test(ua)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

  // Browser
  let browser: string | null = null;
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opr\//i.test(ua)) browser = 'Opera';

  // OS
  let os: string | null = null;
  if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  return { browser, os, deviceType };
}

/** Relative-time label for `lastUsedAt`. Uses Intl.RelativeTimeFormat. */
function formatRelativeTime(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffSecs = Math.round(diffMs / 1000);
  if (Math.abs(diffSecs) < 60) return rtf.format(-diffSecs, 'second');
  const diffMins = Math.round(diffSecs / 60);
  if (Math.abs(diffMins) < 60) return rtf.format(-diffMins, 'minute');
  const diffHours = Math.round(diffMins / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(-diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(-diffDays, 'day');
}

/** Device icon text by device type (placeholder — hosts can style with SVG icons). */
function deviceLabel(device: ParsedDevice | null): string {
  if (!device) return '?';
  if (device.deviceType === 'mobile') return '📱';
  if (device.deviceType === 'tablet') return '📱';
  return '💻';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AccountSessionsList({
  sessions = [],
  onRevokeSubmit: onRevokeSubmitOverride,
  onSessionRevoked,
  onAllOtherSessionsRevoked,
  onError,
  onMessage,
  messages: messageOverrides,
  className
}: AccountSessionsListProps) {
  // Deep merge: top-level copy + errors map merged separately.
  const merged: AccountSessionsListMessages = {
    ...defaultAccountSessionsListMessages,
    ...messageOverrides,
    errors: { ...defaultAccountSessionsListMessages.errors, ...messageOverrides?.errors }
  };

  // Generated hook — `revokeSession` takes `{ input: { sessionId } }`.
  // Payload: `{ revokeSession: { result: boolean | null } | null }`.
  const defaultRevokeMutation = useRevokeSessionMutation({
    selection: {
      fields: { result: true }
    }
  });

  // Hybrid pending: override path tracks its own pending state.
  const [overridePending, setOverridePending] = useState(false);
  const isRevokePending = onRevokeSubmitOverride ? overridePending : defaultRevokeMutation.isPending;

  // Dialog state
  const [confirmSession, setConfirmSession] = useState<SessionRow | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // step-up hook
  const stepUp = useStepUp();

  async function runRevoke(sessionId: string): Promise<RevokeSessionResult | null> {
    if (onRevokeSubmitOverride) return onRevokeSubmitOverride({ sessionId });
    const data = await defaultRevokeMutation.mutateAsync({ input: { sessionId } });
    if (!data.revokeSession) return null;
    return { result: data.revokeSession.result ?? null };
  }

  async function handleRevokeSingle(session: SessionRow) {
    setError(null);
    if (onRevokeSubmitOverride) setOverridePending(true);
    try {
      // Step-up: medium tier (password) for single revoke.
      await stepUp({ tier: 'medium' });
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') {
        onMessage?.({ kind: 'warning', key: 'STEP_UP_CANCELLED', message: merged.stepUpCancelled });
        setConfirmSession(null);
        if (onRevokeSubmitOverride) setOverridePending(false);
        return;
      }
      // Step-up infrastructure failure — surface as error.
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
      if (onRevokeSubmitOverride) setOverridePending(false);
      return;
    }

    try {
      await runRevoke(session.id);
      setConfirmSession(null);
      onMessage?.({ kind: 'success', key: 'revokeSession.success', message: merged.sessionRevokedMessage });
      onSessionRevoked?.(session.id);
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
      if (onRevokeSubmitOverride) setOverridePending(false);
    }
  }

  async function handleRevokeAllOthers() {
    setError(null);
    if (onRevokeSubmitOverride) setOverridePending(true);
    try {
      // Step-up: high tier (MFA if enrolled, else password) for revoke-all-others.
      await stepUp({ tier: 'high' });
    } catch (err) {
      if (err instanceof StepUpError && err.reason === 'cancelled') {
        onMessage?.({ kind: 'warning', key: 'STEP_UP_CANCELLED', message: merged.stepUpCancelled });
        setConfirmRevokeAll(false);
        if (onRevokeSubmitOverride) setOverridePending(false);
        return;
      }
      const { code, message } = parseGraphQLError(err, {
        customMessages: merged.errors,
        defaultMessage: merged.errors.UNKNOWN_ERROR
      });
      const key = code ?? 'UNKNOWN_ERROR';
      setError(message);
      onMessage?.({ kind: 'error', key, message });
      onError?.({ message, code: key });
      if (onRevokeSubmitOverride) setOverridePending(false);
      return;
    }

    // No bulk procedure: iterate non-current sessions client-side.
    // backend-spec/future-procedures.md: bulk_revoke_sessions is backend-pending.
    const others = sessions.filter((s) => !s.isCurrent);
    try {
      await Promise.all(others.map((s) => runRevoke(s.id)));
      setConfirmRevokeAll(false);
      onMessage?.({ kind: 'success', key: 'revokeAllOthers.success', message: merged.allOtherRevokedMessage });
      onAllOtherSessionsRevoked?.();
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
      if (onRevokeSubmitOverride) setOverridePending(false);
    }
  }

  const otherSessionCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <Card data-slot="account-sessions-list" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <CardTitle>{merged.title}</CardTitle>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AuthErrorAlert error={error} />

        {sessions.length === 0 ? (
          <p className="text-pretty text-muted-foreground text-sm">{merged.noSessionsDescription}</p>
        ) : (
          <ul role="list" className="space-y-0 list-none">
            {sessions.map((session, idx) => {
              const device = session.parsedDevice ?? parseUserAgent(session.userAgent);
              const relativeTime = formatRelativeTime(session.lastUsedAt);
              const label = [device.browser, device.os].filter(Boolean).join(' on ') || merged.unknownDevice;

              return (
                <li key={session.id} role="listitem" aria-current={session.isCurrent ? 'true' : undefined}>
                  {idx > 0 && <Separator className="my-3" />}
                  <div className="flex items-start justify-between gap-3 py-1">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true" className="text-base leading-none">
                          {deviceLabel(device)}
                        </span>
                        <span className="text-sm font-medium leading-none truncate">{label}</span>
                        {session.isCurrent && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {merged.currentSessionBadge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 pt-1 text-xs">
                        {relativeTime && (
                          <span>
                            {merged.lastUsedLabel}: {relativeTime}
                          </span>
                        )}
                        {session.ip ? (
                          <span>
                            {merged.ipLabel}: {session.ip}
                          </span>
                        ) : (
                          <span>{merged.unknownLocation}</span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="destructive-outline"
                      size="sm"
                      disabled={session.isCurrent || isRevokePending}
                      aria-describedby={session.isCurrent ? `current-session-note-${session.id}` : undefined}
                      onClick={() => setConfirmSession(session)}
                      className="shrink-0"
                    >
                      {merged.revokeButton}
                    </Button>
                  </div>
                  {session.isCurrent && (
                    <p
                      id={`current-session-note-${session.id}`}
                      className="text-muted-foreground sr-only text-xs"
                    >
                      {merged.currentSessionBadge}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {otherSessionCount > 0 && (
          <>
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isRevokePending}
              onClick={() => setConfirmRevokeAll(true)}
              data-testid="revoke-all-button"
            >
              {merged.revokeAllOtherButton}
            </Button>
          </>
        )}
      </CardContent>

      {/* Single-session revoke confirmation dialog */}
      <Dialog open={confirmSession !== null} onOpenChange={(open) => { if (!open) setConfirmSession(null); }}>
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
              onClick={() => { if (confirmSession) handleRevokeSingle(confirmSession); }}
              data-testid="revoke-confirm-button"
            >
              {merged.revokeConfirmButton}
            </AuthLoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke-all-others confirmation dialog */}
      <Dialog open={confirmRevokeAll} onOpenChange={(open) => { if (!open) setConfirmRevokeAll(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{merged.revokeAllConfirmTitle}</DialogTitle>
            <DialogDescription>{merged.revokeAllConfirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{merged.revokeAllCancelButton}</Button>
            </DialogClose>
            <AuthLoadingButton
              variant="destructive"
              isLoading={isRevokePending}
              loadingText={merged.revokeAllConfirmButton}
              onClick={handleRevokeAllOthers}
              data-testid="revoke-all-confirm-button"
            >
              {merged.revokeAllConfirmButton}
            </AuthLoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
