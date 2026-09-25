'use client';

import * as React from 'react';
import {
  BellIcon,
  Building2Icon,
  CircleAlertIcon,
  CreditCardIcon,
  DatabaseIcon,
  HardDriveIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon
} from 'lucide-react';

import type { AppLinkRenderProps } from '@constructive-io/ui/app-bar';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import { Skeleton } from '@constructive-io/ui/skeleton';

import { ConsoleShell, type ConsoleNavigationItem } from '@/blocks/console-kit/console-shell';
import { AuthEntryPanel } from '@/blocks/feature-packs/auth/auth-entry-panel';
import { ToneBadge, type Tone } from '@/components/ui/workspace-kit/primitives';
import { UsersFeaturePack } from '@/blocks/feature-packs/users/users-feature-pack';
import { FeaturePackDiagnosticPanel } from '@/blocks/feature-packs/shared/feature-pack-ui';
import { cn } from '@/lib/utils';

import {
  FEATURE_PACK_SHOWCASE_USERS
} from '../feature-pack-showcase/feature-pack-showcase-resources';

export type ConsoleKitShowcaseState =
  | 'signed-out'
  | 'discovering'
  | 'ready'
  | 'partial'
  | 'incompatible'
  | 'unavailable';

export type ConsoleKitShowcasePreset =
  | 'auth-hardened'
  | 'b2b-storage'
  | 'full';

const STATE_OPTIONS: readonly Readonly<{
  value: ConsoleKitShowcaseState;
  label: string;
}>[] = [
  { value: 'signed-out', label: 'Signed out' },
  { value: 'discovering', label: 'Discovering' },
  { value: 'ready', label: 'Ready' },
  { value: 'partial', label: 'Partial' },
  { value: 'incompatible', label: 'Incompatible' },
  { value: 'unavailable', label: 'Unavailable' }
];

const PRESET_OPTIONS: readonly Readonly<{
  value: ConsoleKitShowcasePreset;
  label: string;
  modules: string;
}>[] = [
  {
    value: 'auth-hardened',
    label: 'Auth hardened',
    modules: 'Data · Auth · App access'
  },
  {
    value: 'b2b-storage',
    label: 'B2B with Storage',
    modules: 'Data · Auth · App access · Orgs · Storage'
  },
  {
    value: 'full',
    label: 'Full',
    modules: 'All seven modules'
  }
];

const NAV_BY_PRESET: Record<ConsoleKitShowcasePreset, readonly string[]> = {
  'auth-hardened': ['Data', 'Auth', 'App access'],
  'b2b-storage': ['Data', 'Auth', 'App access', 'Organizations', 'Storage'],
  full: ['Data', 'Auth', 'App access', 'Organizations', 'Storage', 'Billing', 'Notifications']
};

function stateBadge(state: ConsoleKitShowcaseState) {
  if (state === 'ready') return { label: 'Ready', variant: 'default' as const };
  if (state === 'discovering') return { label: 'Discovering', variant: 'secondary' as const };
  if (state === 'partial') return { label: 'Partial', variant: 'outline' as const };
  if (state === 'signed-out') return { label: 'Signed out', variant: 'outline' as const };
  if (state === 'incompatible') return { label: 'Incompatible', variant: 'destructive' as const };
  return { label: 'Unavailable', variant: 'destructive' as const };
}

function showcaseNavigationState(
  item: string,
  activeNav: string,
  state: ConsoleKitShowcaseState
) {
  const setupTarget = state === 'unavailable' && item === activeNav;
  const signedOutLocked = state === 'signed-out' && item !== 'Auth';
  const partialTarget =
    state === 'partial'
    && (item === 'Storage' || item === 'Notifications' || item === activeNav);
  return {
    active: item === activeNav,
    muted: setupTarget || signedOutLocked || partialTarget,
    partialTarget,
    setupTarget,
    signedOutLocked
  };
}

const NAV_ICONS: Record<string, LucideIcon> = {
  Data: DatabaseIcon,
  Auth: ShieldCheckIcon,
  'App access': UsersIcon,
  Organizations: Building2Icon,
  Storage: HardDriveIcon,
  Billing: CreditCardIcon,
  Notifications: BellIcon
};

const STATE_TONE: Record<ConsoleKitShowcaseState, Tone> = {
  'signed-out': 'neutral',
  discovering: 'info',
  ready: 'success',
  partial: 'warning',
  incompatible: 'danger',
  unavailable: 'warning'
};

/** Keeps preview links on the page while still running the row's own click handling. */
function previewLink(props: AppLinkRenderProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        props.onClick?.(event);
      }}
    />
  );
}

function ShowcaseShell({
  preset,
  state,
  children,
  activeNav = 'App access'
}: Readonly<{
  preset: ConsoleKitShowcasePreset;
  state: ConsoleKitShowcaseState;
  children: React.ReactNode;
  activeNav?: string;
}>) {
  const items = NAV_BY_PRESET[preset].map((item): ConsoleNavigationItem => {
    const view = showcaseNavigationState(item, activeNav, state);
    const status = state === 'discovering' && !view.active
      ? 'checking'
      : view.signedOutLocked
        ? 'locked'
        : view.setupTarget
          ? 'setup'
          : view.partialTarget
            ? 'partial'
            : undefined;
    return {
      id: item,
      label: item,
      href: `#console-${item}`,
      icon: NAV_ICONS[item],
      isActive: view.active,
      disabled: view.signedOutLocked,
      status,
      badge: status === 'checking'
        ? 'Checking'
        : status === 'locked'
          ? 'Sign in'
          : status === 'setup'
            ? 'Needs setup'
            : status === 'partial'
              ? 'Partial'
              : undefined
    };
  });

  return (
    <div className="h-[44rem] overflow-hidden rounded-xl border border-border">
      <ConsoleShell
        account={state === 'signed-out' ? undefined : {
          name: 'Ada Lovelace',
          secondaryLabel: 'ada@northstar.example',
          actionGroups: [{ id: 'session', actions: [{ id: 'sign-out', label: 'Sign out', onSelect: () => undefined }] }]
        }}
        barActions={<ToneBadge tone={STATE_TONE[state]}>{stateBadge(state).label}</ToneBadge>}
        brand={{ name: 'Northstar Labs', logo: <DatabaseIcon aria-hidden="true" /> }}
        breadcrumbs={[{ id: 'feature', label: activeNav, current: true }]}
        className="h-full"
        navigation={[{ id: 'features', label: 'Manage application', items }]}
        renderLink={previewLink}
      >
        {children}
      </ConsoleShell>
    </div>
  );
}

function DiscoveringState() {
  return (
    <div aria-busy="true" aria-label="Discovering features" className="flex flex-col gap-5" role="status">
      <div className="text-muted-foreground flex items-center gap-2 text-[13px]">
        <LoaderCircleIcon aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
        Checking tenant contracts…
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-36 rounded-full" />
        <Skeleton className="h-3 w-64 max-w-full rounded-full" />
      </div>
      <div className="bg-card overflow-hidden rounded-xl shadow-card">
        <div className="bg-muted/60 h-8" />
        {Array.from({ length: 4 }, (_, index) => (
          <div className="flex items-center gap-3 border-t border-border px-4 py-3" key={index}>
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-3 rounded-full" style={{ width: `${36 + ((index * 13) % 30)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function unavailableFeatureFor(preset: ConsoleKitShowcasePreset): Readonly<{
  nav: string;
  feature: string;
  endpoint: string;
  title: string;
  description: string;
}> {
  if (preset === 'auth-hardened') {
    return {
      nav: 'App access',
      feature: 'users',
      endpoint: 'admin',
      title: 'App access is unavailable',
      description: 'The admin endpoint that backs membership reads is not configured or not publicly routable for this tenant.'
    };
  }

  return {
    nav: 'Storage',
    feature: 'storage',
    endpoint: 'storage',
    title: 'Storage is unavailable',
    description: 'The storage endpoint is not configured or not publicly routable for this tenant.'
  };
}

function ShowcaseBody({
  state,
  preset
}: Readonly<{ state: ConsoleKitShowcaseState; preset: ConsoleKitShowcasePreset }>) {
  if (state === 'signed-out') {
    return (
      <AuthEntryPanel
        actions={{
          signIn: async () => undefined,
          signUp: async () => undefined,
          recoverPassword: async () => undefined
        }}
        mode="sign-in"
        onModeChange={() => undefined}
        policy={{ signIn: true, signUp: true, recoverPassword: true }}
      />
    );
  }

  if (state === 'discovering') {
    return <DiscoveringState />;
  }

  if (state === 'ready') {
    return (
      <UsersFeaturePack
        policy={{ invite: true }}
        resource={{ status: 'ready', data: FEATURE_PACK_SHOWCASE_USERS }}
      />
    );
  }

  if (state === 'partial') {
    const hasOrganizations = NAV_BY_PRESET[preset].includes('Organizations');
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-warning/[0.06] ring-warning/20 flex items-start gap-3 rounded-xl px-4 py-3 ring-1 ring-inset">
          <ShieldAlertIcon aria-hidden="true" className="text-warning mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 text-[13px]">
            <p className="text-foreground font-medium">{hasOrganizations ? 'Organizations' : 'App access'} is partly available</p>
            <p className="text-muted-foreground mt-0.5 text-pretty">
              Member reads work. Invite writes stay hidden until the public contract exposes them.
              Capability discovery returned partial evidence for{' '}
              <code className="bg-muted rounded px-1 font-mono text-xs">{preset}</code>.
            </p>
          </div>
        </div>
        <UsersFeaturePack
          resource={{ status: 'ready', data: FEATURE_PACK_SHOWCASE_USERS }}
        />
      </div>
    );
  }

  if (state === 'incompatible') {
    return (
      <FeaturePackDiagnosticPanel
        description="This database answered, but its contract does not match what Data needs."
        guidance="Update the tenant’s public schema contract, then try again. Endpoint URLs stay in host configuration."
        icon={<CircleAlertIcon aria-hidden="true" />}
        title="Data is unavailable"
        tone="warning"
      />
    );
  }

  const unavailable = unavailableFeatureFor(preset);
  return (
    <FeaturePackDiagnosticPanel
      description={unavailable.description}
      guidance="This feature needs a routable public surface on the tenant. Configure it in the host, then try again."
      icon={<LockKeyholeIcon aria-hidden="true" />}
      title={unavailable.title}
      tone="muted"
    />
  );
}

export function ConsoleKitShowcasePreview({ className }: Readonly<{ className?: string }>) {
  const [preset, setPreset] = React.useState<ConsoleKitShowcasePreset>('auth-hardened');
  const [state, setState] = React.useState<ConsoleKitShowcaseState>('signed-out');
  const nav = NAV_BY_PRESET[preset];
  const activeNav =
    state === 'unavailable'
      ? unavailableFeatureFor(preset).nav
      : state === 'incompatible'
        ? 'Data'
        : state === 'partial'
          ? (nav.includes('Organizations') ? 'Organizations' : 'App access')
          : state === 'signed-out'
            ? 'Auth'
            : 'App access';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Live product states
          </p>
          <p className="mt-1 text-pretty text-sm leading-6 text-muted-foreground">
            Switch presets and runtime states without a live tenant. These previews
            reuse the same pack and diagnostic surfaces Console Kit renders in production.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
          <label className="grid gap-1">
            <span className="text-muted-foreground text-xs font-medium">Preset</span>
            <Select
              onValueChange={(value) => setPreset(value as ConsoleKitShowcasePreset)}
              value={preset}
            >
              <SelectTrigger aria-label="Showcase preset" className="w-full sm:w-44">
                <SelectValue>{(value: string | null) => PRESET_OPTIONS.find((option) => option.value === value)?.label ?? value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PRESET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1">
            <span className="text-muted-foreground text-xs font-medium">State</span>
            <Select
              onValueChange={(value) => setState(value as ConsoleKitShowcaseState)}
              value={state}
            >
              <SelectTrigger aria-label="Showcase state" className="w-full sm:w-40">
                <SelectValue>{(value: string | null) => STATE_OPTIONS.find((option) => option.value === value)?.label ?? value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        </div>
      </div>

      <ShowcaseShell activeNav={activeNav} preset={preset} state={state}>
        <ShowcaseBody preset={preset} state={state} />
      </ShowcaseShell>

      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        <KeyRoundIcon aria-hidden="true" className="size-3.5" />
        <span>
          {PRESET_OPTIONS.find((option) => option.value === preset)?.modules}
        </span>
        <span aria-hidden="true">·</span>
        <span>No live fixture required</span>
      </div>
    </div>
  );
}
