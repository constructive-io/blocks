'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';

import { BillingConsole } from '@/components/ui/billing-console/billing-console';
import { BILLING_CONSOLE_DEMO, BILLING_CONSOLE_TENANT_DEMO, DEMO_NOW } from '@/components/ui/billing-console/fixtures';
import type { BillingConsoleTheme } from '@/components/ui/billing-console/types';

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const SCOPES = [
  { id: 'platform', label: 'Platform', description: 'Constructive’s own billing: Stripe live, billing on, a few customers to chase.' },
  { id: 'tenant', label: 'Tenant app', description: 'A tenant app setting up billing for its customers: test keys stored, webhook secret missing.' }
] as const;

export function BillingConsolePreview() {
  const { theme, setTheme } = useTheme();
  const [scope, setScope] = useState<(typeof SCOPES)[number]['id']>('platform');
  const [message, setMessage] = useState<string>(SCOPES[0].description);
  const data = scope === 'platform' ? BILLING_CONSOLE_DEMO : BILLING_CONSOLE_TENANT_DEMO;

  return (
    <div className="flex h-dvh min-h-[640px] w-full flex-col" data-slot="application-block-showcase-canvas">
      <div role="radiogroup" aria-label="Scope" className="flex shrink-0 gap-1 border-b border-border bg-background px-3 py-2">
        {SCOPES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={scope === entry.id}
            onClick={() => {
              setScope(entry.id);
              setMessage(entry.description);
            }}
            className="cursor-pointer rounded-md px-2 py-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-checked:bg-card aria-checked:font-medium aria-checked:text-foreground aria-checked:shadow-card"
          >
            {entry.label}
          </button>
        ))}
      </div>
      <BillingConsole
        key={scope}
        className="min-h-0 flex-1"
        data={data}
        now={DEMO_NOW}
        theme={(theme as BillingConsoleTheme | undefined) ?? 'system'}
        onThemeChange={setTheme}
        onSaveEntitlements={async (changes) => {
          await wait(700);
          setMessage(`The host would save ${changes.length} entitlement ${changes.length === 1 ? 'change' : 'changes'} and re-apply the plan cascade.`);
        }}
        onConnectProvider={async (providerId) => {
          await wait(800);
          setMessage(`The host would store the ${providerId} credentials as write-only secrets.`);
        }}
        onRunReadinessCheck={async () => {
          await wait(1800);
          setMessage('The host would enqueue billing:doctor and show its verdict.');
          return scope === 'tenant'
            ? {
                checkedAt: DEMO_NOW,
                ready: true,
                checks: BILLING_CONSOLE_TENANT_DEMO.health.checks.map((check) => ({ ...check, status: 'pass' as const, detail: undefined }))
              }
            : undefined;
        }}
        onToggleBilling={async (enabled) => {
          await wait(500);
          setMessage(`The host would set enable_billing to ${enabled}.`);
        }}
        onCreditRateChange={async (rate) => {
          await wait(500);
          setMessage(`The host would set credits_per_cent to ${rate}.`);
        }}
        onGrantCredits={async (request) => {
          await wait(600);
          setMessage(`The host would grant ${request.amount} ${request.meterSlug} credits: “${request.reason}”.`);
        }}
        onSaveCode={async (draft, existing) => {
          await wait(600);
          setMessage(`The host would ${existing ? 'update' : 'create'} code ${draft.code}.`);
        }}
        onCreateCodes={async (drafts) => {
          await wait(800);
          setMessage(`The host would create ${drafts.length} single-use codes.`);
        }}
        onHoldDatabase={async (database, note) => {
          await wait(600);
          setMessage(`The host would call suspend_database for ${database.name} (${note}).`);
        }}
        onReleaseDatabase={async (database) => {
          await wait(600);
          setMessage(`The host would call unsuspend_database for ${database.name}.`);
        }}
        onAction={(action) => setMessage(`The host received ${action.type}.`)}
      />
      <p aria-live="polite" role="status" className="shrink-0 truncate border-t border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
