'use client';

import * as React from 'react';
import {
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  DatabaseIcon
} from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIcon,
  CollapsibleTrigger
} from '@constructive-io/ui/collapsible';
import { Field } from '@constructive-io/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';

import type { ConstructiveTenantDatabase } from '@/blocks/console-kit/constructive/constructive-console-kit';
import { AuthHardenedConsoleKit } from '@/blocks/presets/auth-hardened-console-kit';
import { B2BStorageConsoleKit } from '@/blocks/presets/b2b-storage-console-kit';
import { FullConsoleKit } from '@/blocks/presets/full-console-kit';

export type ConsoleKitProofProfile =
  | 'auth-hardened'
  | 'b2b-storage'
  | 'full'
  | 'storage-routed';

export type ConsoleKitProofTenant = Readonly<{
  profile: ConsoleKitProofProfile;
  preset: 'auth:hardened' | 'b2b:storage' | 'full';
  database: ConstructiveTenantDatabase;
  endpointSummary: string;
}>;

type ConsoleKitProofEmailVerification = Readonly<{
  databaseId: string;
  emailId: string;
  token: string;
}>;

const ENDPOINT_KINDS = [
  'data',
  'auth',
  'admin',
  'billing',
  'storage',
  'notifications'
] as const;

function tenantLabel(tenant: ConsoleKitProofTenant): string {
  return `${tenant.profile} · ${tenant.preset}`;
}

function endpointUrl(
  endpoint: ConstructiveTenantDatabase['endpoints'][typeof ENDPOINT_KINDS[number]]
): string | null {
  if (typeof endpoint === 'string') return endpoint;
  return endpoint?.url ?? null;
}

function CopyValueButton({ label, value }: Readonly<{ label: string; value: string }>) {
  const [copied, setCopied] = React.useState(false);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  return (
    <Button
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value)
          .then(() => {
            setCopied(true);
            if (resetTimer.current) clearTimeout(resetTimer.current);
            resetTimer.current = setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => setCopied(false));
      }}
      size='icon'
      type='button'
      variant='ghost'
    >
      {copied
        ? <CheckIcon aria-hidden='true' />
        : <CopyIcon aria-hidden='true' />}
    </Button>
  );
}

function PresetConsoleKit({
  tenant,
  verification
}: Readonly<{
  tenant: ConsoleKitProofTenant;
  verification?: ConsoleKitProofEmailVerification;
}>) {
  const props = {
    className: 'min-h-svh',
    database: tenant.database,
    showUnavailable: true,
    verificationEmailId: verification?.databaseId === tenant.database.id
      ? verification.emailId
      : undefined,
    verificationToken: verification?.databaseId === tenant.database.id
      ? verification.token
      : undefined
  } as const;

  switch (tenant.profile) {
    case 'auth-hardened':
      return <AuthHardenedConsoleKit {...props} />;
    case 'b2b-storage':
    case 'storage-routed':
      return <B2BStorageConsoleKit {...props} />;
    case 'full':
      return <FullConsoleKit {...props} />;
  }
}

export function ConsoleKitProofClient({
  initialProfile,
  membershipFixtureMode,
  runId,
  tenants
}: Readonly<{
  initialProfile?: ConsoleKitProofProfile;
  membershipFixtureMode: 'auto-approved-and-verified';
  runId: string;
  tenants: readonly ConsoleKitProofTenant[];
}>) {
  const initialTenant = tenants.find((tenant) => tenant.profile === initialProfile) ?? tenants[0];
  const [databaseId, setDatabaseId] = React.useState(initialTenant?.database.id ?? '');
  const [emailVerification, setEmailVerification] =
    React.useState<ConsoleKitProofEmailVerification>();
  const [fragmentReady, setFragmentReady] = React.useState(false);
  const [controlsOpen, setControlsOpen] = React.useState(false);

  React.useEffect(() => {
    const consumeVerificationFragment = () => {
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/u, ''));
      const hasSensitiveValue = fragment.has('email_id') || fragment.has('verification_token');
      const verification = {
        databaseId: fragment.get('verification_database_id') ?? '',
        emailId: fragment.get('email_id') ?? '',
        token: fragment.get('verification_token') ?? ''
      };
      if (hasSensitiveValue) {
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}${window.location.search}`
        );
      }
      if (
        verification.databaseId &&
        verification.emailId &&
        verification.token &&
        tenants.some((candidate) => candidate.database.id === verification.databaseId)
      ) {
        setDatabaseId(verification.databaseId);
        setEmailVerification(verification);
        window.removeEventListener('hashchange', consumeVerificationFragment);
      }
    };
    window.addEventListener('hashchange', consumeVerificationFragment);
    consumeVerificationFragment();
    setFragmentReady(true);
    return () => window.removeEventListener('hashchange', consumeVerificationFragment);
  }, [tenants]);

  if (!fragmentReady) {
    return (
      <div className='flex min-h-dvh items-center justify-center p-8'>
        <p className='text-muted-foreground text-sm'>Preparing the tenant console…</p>
      </div>
    );
  }

  const tenant = tenants.find((candidate) => candidate.database.id === databaseId) ?? tenants[0];

  if (!tenant) {
    return (
      <div className='flex min-h-dvh items-center justify-center p-8'>
        <p className='text-muted-foreground text-sm'>The native fixture does not contain a tenant database.</p>
      </div>
    );
  }

  return (
    <div
      className='min-h-svh bg-background'
      data-database-id={tenant.database.id}
      data-membership-fixture-mode={membershipFixtureMode}
      data-preset={tenant.preset}
      data-profile={tenant.profile}
      data-proof-status='ready'
      data-testid='console-kit-proof-root'
    >
      <aside
        aria-label='Tenant proof controls'
        className='fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 ml-auto max-w-[30rem] rounded-xl border bg-card p-3 shadow-lg sm:left-auto'
      >
        <Collapsible onOpenChange={setControlsOpen} open={controlsOpen}>
          <div className='flex min-w-0 items-center gap-2'>
            <Badge className='shrink-0' variant='secondary'>Native fixture</Badge>
            <Badge className='shrink-0' variant='success'>
              <CheckCircle2Icon aria-hidden='true' data-icon='inline-start' />
              ready
            </Badge>
            <span className='text-muted-foreground truncate text-xs' title={tenantLabel(tenant)}>
              {tenantLabel(tenant)}
            </span>
            <CollapsibleTrigger
              aria-label={controlsOpen ? 'Hide tenant proof controls' : 'Show tenant proof controls'}
              className='ml-auto w-auto'
              render={<Button size='icon' variant='ghost' />}
            >
              <CollapsibleIcon />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent innerClassName='flex flex-col gap-3 pb-0 pt-3'>
            <Field label='Tenant database'>
              <Select onValueChange={setDatabaseId} value={tenant.database.id}>
                <SelectTrigger aria-label='Tenant database'>
                  <DatabaseIcon data-icon='inline-start' />
                  <SelectValue>{() => tenantLabel(tenant)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {tenants.map((candidate) => (
                      <SelectItem key={candidate.database.id} value={candidate.database.id}>
                        {tenantLabel(candidate)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className='rounded-lg border p-2'>
              <div className='flex min-w-0 items-center gap-2'>
                <div className='min-w-0 flex-1'>
                  <p className='text-xs font-medium'>Database ID</p>
                  <p className='text-muted-foreground truncate font-mono text-xs' title={tenant.database.id}>
                    {tenant.database.id}
                  </p>
                </div>
                <CopyValueButton label='database ID' value={tenant.database.id} />
              </div>
            </div>
            <div className='flex flex-col gap-2'>
              <p className='text-xs font-medium'>GraphQL endpoints</p>
              {ENDPOINT_KINDS.flatMap((kind) => {
                const url = endpointUrl(tenant.database.endpoints[kind]);
                if (!url) return [];
                return [
                  <div className='flex min-w-0 items-center gap-2 rounded-lg border p-2' key={kind}>
                    <Badge className='shrink-0' variant='outline'>{kind}</Badge>
                    <span className='text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs' title={url}>
                      {url}
                    </span>
                    <CopyValueButton label={`${kind} endpoint`} value={url} />
                  </div>
                ];
              })}
              <p className='text-muted-foreground text-xs'>{tenant.endpointSummary}</p>
            </div>
            <p className='text-muted-foreground truncate font-mono text-[0.6875rem]' title={runId}>Run {runId}</p>
            <p className='text-muted-foreground text-pretty text-[0.6875rem] leading-4'>
              Memberships are auto-approved and auto-verified in this proof fixture so the suite isolates Console Kit sessions and tenant RLS from mail delivery.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </aside>
      <PresetConsoleKit tenant={tenant} verification={emailVerification} />
    </div>
  );
}
