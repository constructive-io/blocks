'use client';

/**
 * domain-verification-step  (registry: auth-domain-verification-step)
 *
 * v2 STUB — Phase 3 (deferred SSO backend).
 *
 * Displays the DNS TXT record an admin must add to prove domain ownership for
 * an SSO provider configuration. In production it will poll the server until
 * the record is detected or a timeout is reached. The stub renders the static
 * UI skeleton and surfaces a clear "deferred" notice so operators understand
 * what must be deployed before the block becomes functional.
 *
 * No generated hook, no @/generated import, no requires.json, no blocks-runtime
 * dependency — this block is purely presentational at this stage.
 *
 * When the SSO backend ships (`constructive_auth_public.get_domain_verification_record`
 * + `check_domain_verification`), replace the stub states with live hook calls
 * imported from `@/generated/auth` and add `auth-domain-verification-step.requires.json`.
 *
 * Spec: planning/blocks/auth/auth-domain-verification-step.md
 * SDK prerequisite (future): constructive_auth_public.get_domain_verification_record +
 *   check_domain_verification (backend-spec/v2-sso-scim.md)
 */

import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Button } from '@constructive-io/ui/button';
import { Badge } from '@constructive-io/ui/badge';
import { Alert, AlertDescription } from '@constructive-io/ui/alert';

import { cn } from '@/lib/utils';

import {
  defaultAuthDomainVerificationStepMessages,
  type AuthDomainVerificationStepMessages
} from './messages';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Verification state machine — mirrors what the live poll implementation will use. */
export type DomainVerificationStatus = 'waiting' | 'verified' | 'timeout' | 'error';

export type AuthDomainVerificationStepMessageOverrides = Partial<AuthDomainVerificationStepMessages>;

export type AuthDomainVerificationStepProps = {
  /** The SSO provider UUID this domain is being claimed for (required). */
  ssoProviderId: string;
  /** The domain being verified (e.g. "acme.com"). */
  domain: string;
  /** Polling interval in ms (default 5000 — unused in stub). */
  pollIntervalMs?: number;
  /** Max poll duration in ms (default 300_000 — unused in stub). */
  pollTimeoutMs?: number;
  messages?: AuthDomainVerificationStepMessageOverrides;
  /** Fires when the domain is verified. */
  onVerified?: (ssoProviderId: string) => void;
  /** Fires when polling exceeds `pollTimeoutMs`. */
  onTimeout?: () => void;
  /** Fires after an error during the verification check. */
  onError?: (err: { message: string; code: string }) => void;
  /** Fires to surface a notification to the host application. */
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
  className?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * AuthDomainVerificationStep
 *
 * v2 stub — renders the DNS TXT-record verification UI skeleton with a
 * "backend deferred" notice. Drop the notice and wire the two generated hooks
 * once the SSO procedures ship.
 */
export function AuthDomainVerificationStep({
  ssoProviderId,
  domain,
  messages: messageOverrides,
  onVerified: _onVerified,
  onTimeout: _onTimeout,
  onError: _onError,
  onMessage: _onMessage,
  className
}: AuthDomainVerificationStepProps) {
  // Deep-merge messages (same pattern as sign-in-card).
  const merged: AuthDomainVerificationStepMessages = {
    ...defaultAuthDomainVerificationStepMessages,
    ...messageOverrides
  };

  // In the live implementation these will be driven by the poll hook.
  // The stub always starts in 'waiting' so the skeleton is visible.
  const [status] = useState<DomainVerificationStatus>('waiting');
  const [copiedField, setCopiedField] = useState<'name' | 'value' | null>(null);

  // Stable placeholder TXT values — replaced by the real hook response in v2.
  const txtRecordName = `_constructive-verify.${domain}`;
  const txtRecordValue = `constructive-domain-verification=${ssoProviderId}`;

  function handleCopy(field: 'name' | 'value', value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  // The "Check now" button will invoke the check_domain_verification hook in v2.
  // In the stub it does nothing (the button is present for layout fidelity).
  function handleCheckNow() {
    // TODO (v2): call `useCheckDomainVerificationMutation` from `@/generated/auth`
  }

  return (
    <Card data-slot="domain-verification-step" className={cn('w-full max-w-sm mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{merged.title}</CardTitle>
          <StatusBadge status={status} merged={merged} />
        </div>
        <CardDescription>{merged.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Deferred-backend notice — remove once procedures ship */}
        <Alert aria-live="polite">
          <AlertDescription className="text-muted-foreground text-sm">
            {merged.deferredNotice}
          </AlertDescription>
        </Alert>

        {/* TXT record name */}
        <TxtRecordField
          label={merged.txtRecordNameLabel}
          value={txtRecordName}
          copyLabel={copiedField === 'name' ? merged.copiedLabel : merged.copyLabel}
          onCopy={() => handleCopy('name', txtRecordName)}
        />

        {/* TXT record value */}
        <TxtRecordField
          label={merged.txtRecordValueLabel}
          value={txtRecordValue}
          copyLabel={copiedField === 'value' ? merged.copiedLabel : merged.copyLabel}
          onCopy={() => handleCopy('value', txtRecordValue)}
        />

        {/* Propagation note */}
        <p className="text-pretty text-muted-foreground text-xs">{merged.propagationNote}</p>

        {/* Manual check trigger */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleCheckNow}
          disabled={status === 'verified'}
          data-testid="domain-verification-check-now"
        >
          {merged.checkNowLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({
  status,
  merged
}: {
  status: DomainVerificationStatus;
  merged: AuthDomainVerificationStepMessages;
}) {
  if (status === 'verified') return <Badge variant="default">{merged.statusVerified}</Badge>;
  if (status === 'timeout') return <Badge variant="destructive">{merged.statusTimeout}</Badge>;
  if (status === 'error') return <Badge variant="destructive">{merged.statusError}</Badge>;
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      {merged.statusWaiting}
    </Badge>
  );
}

function TxtRecordField({
  label,
  value,
  copyLabel,
  onCopy
}: {
  label: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-pretty text-sm font-medium">{label}</p>
      <div className="bg-muted flex items-center gap-2 rounded-md px-3 py-2">
        <code className="text-muted-foreground min-w-0 flex-1 truncate text-xs">{value}</code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto shrink-0 px-2 py-1 text-xs"
          onClick={onCopy}
          data-testid={`copy-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {copyLabel}
        </Button>
      </div>
    </div>
  );
}
