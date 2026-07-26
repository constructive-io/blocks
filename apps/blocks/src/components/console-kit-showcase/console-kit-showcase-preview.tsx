'use client';

import * as React from 'react';
import {
  CircleAlertIcon,
  DatabaseIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  ShieldAlertIcon
} from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import { Skeleton } from '@constructive-io/ui/skeleton';

import { AuthEntryPanel } from '@/blocks/feature-packs/auth/auth-entry-panel';
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
  const nav = NAV_BY_PRESET[preset];
  const badge = stateBadge(state);
  const mobileNavRef = React.useRef<HTMLElement | null>(null);
  const activeMobileItemRef = React.useRef<HTMLLIElement | null>(null);
  const [mobileOverflow, setMobileOverflow] = React.useState({
    start: false,
    end: false
  });

  const measureMobileOverflow = React.useCallback(() => {
    const scroller = mobileNavRef.current;
    if (!scroller) return;
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const start = scroller.scrollLeft > 2;
    const end = scroller.scrollLeft < maxScrollLeft - 2;
    setMobileOverflow((previous) => {
      if (previous.start === start && previous.end === end) return previous;
      return { start, end };
    });
  }, []);

  React.useEffect(() => {
    const scroller = mobileNavRef.current;
    if (!scroller) return;
    measureMobileOverflow();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measureMobileOverflow);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [measureMobileOverflow, nav]);

  React.useEffect(() => {
    activeMobileItemRef.current?.scrollIntoView?.({
      block: 'nearest',
      inline: 'center'
    });
    measureMobileOverflow();
  }, [activeNav, measureMobileOverflow, nav]);

  return (
    <div className="shadow-card bg-background grid min-h-[32rem] overflow-hidden rounded-xl sm:min-h-[34rem] sm:grid-cols-[15rem_minmax(0,1fr)]">
      {/* Platform Kit-style left rail: quiet label + full-width manager links */}
      <aside className="bg-sidebar text-sidebar-foreground hidden flex-col border-r border-border/60 px-3 py-6 pb-3 sm:flex">
        <div className="mb-4 px-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
              <DatabaseIcon aria-hidden="true" className="size-3.5" />
            </div>
            <p className="truncate text-sm font-semibold">Application</p>
          </div>
          <h2 className="text-muted-foreground text-sm font-semibold">
            Manage application
          </h2>
        </div>
        <nav aria-label="Showcase features" className="flex grow flex-col gap-0.5">
          {nav.map((item) => {
            const itemState = showcaseNavigationState(item, activeNav, state);
            return (
              <div
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm',
                  itemState.active && 'bg-secondary font-medium text-secondary-foreground',
                  !itemState.active && 'text-foreground',
                  itemState.muted && !itemState.active && 'text-muted-foreground'
                )}
                key={item}
              >
                <span className="truncate">{item}</span>
                {itemState.signedOutLocked ? (
                  <Badge className="text-[10px]" size="sm" variant="outline">
                    Sign in
                  </Badge>
                ) : null}
                {itemState.setupTarget ? (
                  <Badge className="text-[10px]" size="sm" variant="outline">
                    Setup
                  </Badge>
                ) : null}
                {itemState.partialTarget && item === activeNav ? (
                  <Badge className="text-[10px]" size="sm" variant="secondary">
                    Partial
                  </Badge>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Quiet content chrome — no endpoint/connection dump; state badge is docs-only. */}
        <div className="relative flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <p className="text-muted-foreground min-w-0 truncate text-sm">
            Documentation preview
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Badge size="sm" variant={badge.variant}>{badge.label}</Badge>
          </div>
        </div>
        <div className="relative border-b sm:hidden">
          <nav
            aria-label="Showcase features"
            className="scrollbar-hide snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth scroll-px-3 px-2 py-1.5 motion-reduce:scroll-auto"
            onScroll={measureMobileOverflow}
            ref={mobileNavRef}
          >
            <ul className="flex min-w-max gap-1">
              {nav.map((item) => {
                const itemState = showcaseNavigationState(item, activeNav, state);
                const status = itemState.signedOutLocked
                  ? 'Sign in'
                  : itemState.setupTarget
                    ? 'Setup'
                    : itemState.partialTarget
                      ? 'Partial'
                      : undefined;
                return (
                  <li
                    className="snap-center"
                    key={item}
                    ref={itemState.active ? activeMobileItemRef : undefined}
                  >
                    <span
                      aria-current={itemState.active ? 'page' : undefined}
                      aria-label={status ? `${item} (${status})` : item}
                      className={cn(
                        'relative flex min-h-9 items-center rounded-md px-3 text-xs font-medium',
                        itemState.active
                          ? 'bg-secondary text-secondary-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item}
                      {status ? (
                        <span
                          aria-hidden="true"
                          className="bg-primary ms-2 size-1.5 rounded-full"
                        />
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div
            aria-hidden="true"
            className={cn(
              'from-background pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r to-transparent transition-opacity motion-reduce:transition-none',
              mobileOverflow.start ? 'opacity-100' : 'opacity-0'
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              'from-background pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l to-transparent transition-opacity motion-reduce:transition-none',
              mobileOverflow.end ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
        <div className="bg-background min-h-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function DiscoveringState() {
  return (
    <Card aria-busy="true" aria-label="Discovering features" variant="flat">
      <CardHeader>
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
          <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
          Checking tenant contracts…
        </div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-11 w-full" key={index} />
        ))}
      </CardContent>
    </Card>
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
      <div className="flex flex-col gap-4">
        {hasOrganizations ? (
          <Card variant="flat">
            <CardHeader>
              <CardTitle className="text-base">Organizations (partial)</CardTitle>
              <CardDescription>
                Membership reads work. Invite writes stay hidden until the public
                contract exposes them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3 text-sm">
                <ShieldAlertIcon aria-hidden="true" className="text-warning-foreground" />
                <span className="text-pretty">
                  Capability discovery returned partial evidence for{' '}
                  <code className="rounded bg-muted px-1 font-mono text-xs">{preset}</code>.
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card variant="flat">
            <CardHeader>
              <CardTitle className="text-base">App access (partial)</CardTitle>
              <CardDescription>
                Member reads work. Invite writes stay hidden until the public
                contract exposes them.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
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
                <SelectValue />
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
                <SelectValue />
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
