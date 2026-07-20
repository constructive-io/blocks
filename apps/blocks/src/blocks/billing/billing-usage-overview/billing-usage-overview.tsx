'use client';

/**
 * Numbers-first usage overview (Refactoring UI):
 * - Size creates hierarchy: the figure is large; labels stay quiet or absent
 * - One primary metric per meter; secondary values are a single muted line
 * - Help copy lives in tooltips, not wall-of-text banners
 * - Nested meters stay collapsed until opened
 */

import { useId, useRef, useState } from 'react';
import { CircleHelpIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIcon,
  CollapsibleTrigger
} from '@constructive-io/ui/collapsible';
import { Progress } from '@constructive-io/ui/progress';
import { Skeleton } from '@constructive-io/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@constructive-io/ui/tooltip';

import {
  formatBillingDate,
  formatBillingQuantity,
  getBillingUsageProgress,
  normalizeBillingError,
  type BillingAccountRef,
  type BillingError,
  type BillingFormatOptions,
  type BillingMessageEvent,
  type BillingMeterUsage,
  type BillingQuality,
  type BillingResource,
  type BillingUsageSnapshot
} from '@/blocks/billing/billing-contracts/billing-contracts';
import {
  BillingQualityBadge,
  BillingQuantity,
  billingNumericClassName
} from '@/blocks/billing/billing-ui/billing-ui';
import { cn } from '@/lib/utils';

import {
  defaultBillingUsageOverviewMessages,
  type BillingUsageOverviewMessageOverrides,
  type BillingUsageOverviewMessages
} from './messages';

export type BillingUsageOverviewProps = {
  resource: BillingResource<BillingUsageSnapshot>;
  account: BillingAccountRef;
  formatOptions: BillingFormatOptions;
  messages?: BillingUsageOverviewMessageOverrides;
  onViewHistory?: (meterSlug: string) => void | Promise<void>;
  onBuyCredits?: (meterSlug: string) => void | Promise<void>;
  onError?: (error: BillingError) => void;
  onMessage?: (event: BillingMessageEvent) => void;
  /**
   * When true (e.g. inside BillingSettingsPage), hide account/as-of meta —
   * the host page already shows identity; keep title + quality only.
   */
  embedded?: boolean;
  className?: string;
};

type ActionError = {
  title: string;
  message: string;
  meterSlug?: string;
};

type MeterAction = 'history' | 'credits';

function mergeMessages(
  overrides: BillingUsageOverviewMessageOverrides | undefined
): BillingUsageOverviewMessages {
  return {
    ...defaultBillingUsageOverviewMessages,
    ...overrides,
    accountKind: {
      ...defaultBillingUsageOverviewMessages.accountKind,
      ...overrides?.accountKind
    },
    quality: {
      ...defaultBillingUsageOverviewMessages.quality,
      ...overrides?.quality
    },
    qualityHelp: {
      ...defaultBillingUsageOverviewMessages.qualityHelp,
      ...overrides?.qualityHelp
    },
    meterKind: {
      ...defaultBillingUsageOverviewMessages.meterKind,
      ...overrides?.meterKind
    },
    errors: {
      ...defaultBillingUsageOverviewMessages.errors,
      ...overrides?.errors
    }
  };
}

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return values[key] ?? `{{${key}}}`;
  });
}

function qty(
  value: string,
  unit: string | undefined,
  formatOptions: BillingFormatOptions
) {
  const n = formatBillingQuantity(value, formatOptions);
  return unit ? `${n} ${unit}` : n;
}

/**
 * One temporal cluster for the header:
 * - billing period (window) is primary
 * - snapshot freshness (`asOf`) sits beside it as “Updated …”
 * Quality stays alone in the top-right — it is not a second date.
 * Meta uses whitespace hierarchy, not middot-joined run-on text.
 */
function UsageHeader({
  titleId,
  account,
  messages,
  quality,
  asOf,
  formatOptions,
  period,
  embedded = false
}: {
  titleId: string;
  account: BillingAccountRef;
  messages: BillingUsageOverviewMessages;
  quality?: BillingQuality;
  asOf?: string;
  formatOptions: BillingFormatOptions;
  period?: { label?: string; startsAt: string; endsAt: string };
  embedded?: boolean;
}) {
  const periodRange =
    period !== undefined ? (
      <span className="min-w-0 tabular-nums">
        <time dateTime={period.startsAt}>
          {formatBillingDate(period.startsAt, formatOptions)}
        </time>
        <span className="mx-1 opacity-50">–</span>
        <time dateTime={period.endsAt}>
          {formatBillingDate(period.endsAt, formatOptions)}
        </time>
      </span>
    ) : null;

  return (
    <CardHeader className="gap-3 pb-2">
      <div className="flex min-w-0 flex-col gap-2 @min-[640px]/billing-usage:flex-row @min-[640px]/billing-usage:items-start @min-[640px]/billing-usage:justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle id={titleId} role="heading" aria-level={2}>
            {messages.title}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={messages.waterfallTitle}
              >
                <CircleHelpIcon className="size-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-pretty">
              <p className="font-medium">{messages.waterfallTitle}</p>
              <p className="mt-1">{messages.waterfallDescription}</p>
              <p className="mt-2 opacity-80">{messages.description}</p>
            </TooltipContent>
          </Tooltip>
          <span className="sr-only" role="note">
            {messages.waterfallTitle}. {messages.waterfallDescription}
          </span>
        </div>

        {quality ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex min-h-9 items-center" tabIndex={0}>
                <BillingQualityBadge
                  quality={quality}
                  labels={messages.quality}
                  ariaPrefix={messages.qualityLabel}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>{messages.qualityHelp[quality]}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {/* Host pages (settings) already show account identity — skip the repeat. */}
      {!embedded ? (
        <div className="grid min-w-0 gap-1 text-sm">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-medium text-foreground">
              {account.label ?? account.entityId}
            </span>
            <span className="text-muted-foreground">
              {messages.accountKind[account.kind]}
            </span>
          </div>
          {period || asOf ? (
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 text-muted-foreground">
              {period ? (
                <span className="min-w-0">
                  <span className="sr-only">{messages.periodLabel}: </span>
                  {period.label ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="cursor-default font-medium text-foreground underline decoration-border/60 decoration-dotted underline-offset-4"
                          tabIndex={0}
                        >
                          {period.label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="tabular-nums">
                        {periodRange}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    periodRange
                  )}
                  {period.label ? (
                    <span className="sr-only">
                      {' '}
                      (
                      <time dateTime={period.startsAt}>
                        {formatBillingDate(period.startsAt, formatOptions)}
                      </time>
                      {' – '}
                      <time dateTime={period.endsAt}>
                        {formatBillingDate(period.endsAt, formatOptions)}
                      </time>
                      )
                    </span>
                  ) : null}
                </span>
              ) : null}
              {asOf ? (
                <span className="tabular-nums">
                  {messages.asOfLabel}{' '}
                  <time dateTime={asOf}>
                    {formatBillingDate(asOf, formatOptions)}
                  </time>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : period ? (
        <div className="text-sm text-muted-foreground">
          <span className="sr-only">{messages.periodLabel}: </span>
          {period.label ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="cursor-default font-medium text-foreground underline decoration-border/60 decoration-dotted underline-offset-4"
                  tabIndex={0}
                >
                  {period.label}
                </span>
              </TooltipTrigger>
              <TooltipContent className="tabular-nums">
                {periodRange}
              </TooltipContent>
            </Tooltip>
          ) : (
            periodRange
          )}
        </div>
      ) : null}
    </CardHeader>
  );
}

function MeterFigure({
  meter,
  formatOptions,
  messages
}: {
  meter: BillingMeterUsage;
  formatOptions: BillingFormatOptions;
  messages: BillingUsageOverviewMessages;
}) {
  if (meter.kind === 'boolean') {
    const label =
      meter.enabled === undefined
        ? messages.unknownValue
        : meter.enabled
          ? messages.enabled
          : messages.disabled;
    return (
      <Badge
        variant={meter.enabled === true ? 'success' : 'outline'}
        className="w-fit text-sm"
      >
        {label}
      </Badge>
    );
  }

  if (meter.allowance.kind === 'unlimited') {
    return (
      <div className="grid min-w-0 gap-1">
        <p className="text-2xl font-semibold tracking-tight">
          {messages.unlimited}
        </p>
        {meter.used !== undefined ? (
          <p
            className={cn(
              'text-sm text-muted-foreground',
              billingNumericClassName
            )}
          >
            <span className="sr-only">{messages.usedLabel}: </span>
            <BillingQuantity
              value={meter.used}
              unit={meter.unit}
              formatOptions={formatOptions}
            />
          </p>
        ) : null}
      </div>
    );
  }

  if (meter.allowance.kind === 'uninitialized') {
    return (
      <p className="text-sm font-medium text-muted-foreground">
        {messages.uninitialized}
      </p>
    );
  }

  if (meter.used === undefined && meter.allowance.kind === 'limited') {
    return (
      <p
        className={cn(
          'text-2xl font-semibold tracking-tight',
          billingNumericClassName
        )}
      >
        <span className="sr-only">{messages.limitLabel}: </span>
        <BillingQuantity
          value={meter.allowance.limit}
          unit={meter.unit}
          formatOptions={formatOptions}
        />
      </p>
    );
  }

  if (meter.used === undefined) {
    return (
      <p className="text-sm text-muted-foreground">{messages.unknownValue}</p>
    );
  }

  const progress = getBillingUsageProgress(meter.used, meter.allowance);
  const isReportedOverage = meter.overage !== undefined || progress.overage;
  const limited = meter.allowance.kind === 'limited';

  // Detail stats live in the progress-bar tooltip — only the hero figure stays on-canvas.
  const detailStats: { label: string; value: string }[] = [];
  if (limited && meter.allowance.remaining !== undefined) {
    detailStats.push({
      label: messages.remainingLabel,
      value: qty(meter.allowance.remaining, meter.unit, formatOptions)
    });
  }
  if (meter.creditsAvailable !== undefined) {
    detailStats.push({
      label: messages.creditsAvailableLabel,
      value: qty(meter.creditsAvailable, meter.unit, formatOptions)
    });
  }
  if (meter.overage !== undefined) {
    detailStats.push({
      label: messages.overageLabel,
      value: qty(meter.overage, meter.unit, formatOptions)
    });
  }
  const percentLabel =
    progress.exactPercent === undefined
      ? null
      : `${progress.exactPercent}%`;

  // One pressure accent for figure + track: warning-foreground only.
  const pressureFigureClass = isReportedOverage
    ? 'text-warning-foreground'
    : undefined;
  const pressureTrackClass = isReportedOverage
    ? 'bg-warning-foreground/12 [&_[data-slot=progress-indicator]]:bg-warning-foreground'
    : undefined;

  const progressAriaText = limited
    ? `${messages.rawValuesLabel}: ${meter.used} / ${meter.allowance.limit}${
        percentLabel ? `; ${percentLabel} ${messages.percentUsedLabel}` : ''
      }${detailStats.map((s) => `; ${s.label}: ${s.value}`).join('')}`
    : undefined;

  return (
    <div className="grid min-w-0 max-w-full gap-2">
      <p
        className={cn(
          'min-w-0 text-2xl font-semibold tracking-tight @min-[640px]/billing-usage:text-3xl',
          billingNumericClassName,
          pressureFigureClass
        )}
      >
        <span className="sr-only">{messages.usedLabel}: </span>
        <BillingQuantity
          value={meter.used}
          unit={limited ? undefined : meter.unit}
          formatOptions={formatOptions}
        />
        {limited ? (
          <>
            <span className="mx-1.5 font-normal text-muted-foreground/40">
              /
            </span>
            <span className="sr-only">{messages.limitLabel}: </span>
            <span className="font-medium text-muted-foreground">
              <BillingQuantity
                value={meter.allowance.limit}
                unit={meter.unit}
                formatOptions={formatOptions}
              />
            </span>
          </>
        ) : null}
      </p>

      {limited ? (
        // trackCursorAxis: Base UI anchors to the pointer while hovering the bar
        // (default is static trigger-center — wrong for a long progress track).
        <Tooltip trackCursorAxis="x">
          <TooltipTrigger asChild>
            {/*
              Tall hit target around the thin bar so hover/focus is reliable.
              Details (percent, remaining, credits, overage) only in the tooltip.
            */}
            <div
              className={cn(
                'group/meter-progress min-w-0 cursor-help py-2 outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              )}
              tabIndex={0}
              aria-label={`${meter.label} ${messages.percentUsedLabel}`}
            >
              <Progress
                value={progress.visualPercent}
                className={cn('h-1.5 min-w-0', pressureTrackClass)}
                aria-hidden="true"
                data-visual-percent={progress.visualPercent}
              />
              <span className="sr-only">{progressAriaText}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            sideOffset={8}
            className="max-w-xs gap-0 p-0"
          >
            <div className="grid min-w-[12rem] gap-2 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <p
                  className={cn(
                    'min-w-0 text-xs font-medium tabular-nums text-popover-foreground [overflow-wrap:anywhere]',
                    billingNumericClassName
                  )}
                >
                  <span className="text-muted-foreground">
                    {messages.rawValuesLabel}:{' '}
                  </span>
                  {meter.used} / {meter.allowance.limit}
                  {meter.unit ? ` ${meter.unit}` : ''}
                </p>
                {percentLabel ? (
                  <p
                    className={cn(
                      'shrink-0 text-xs font-semibold tabular-nums',
                      isReportedOverage
                        ? 'text-warning-foreground'
                        : 'text-popover-foreground'
                    )}
                  >
                    {percentLabel}
                    <span className="sr-only">
                      {' '}
                      {messages.percentUsedLabel}
                    </span>
                  </p>
                ) : null}
              </div>
              {detailStats.length > 0 ? (
                <dl className="grid gap-1.5 border-t border-border/60 pt-2">
                  {detailStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-baseline justify-between gap-6"
                    >
                      <dt className="text-[0.6875rem] text-muted-foreground">
                        {stat.label}
                      </dt>
                      <dd
                        className={cn(
                          'text-xs font-medium tabular-nums text-popover-foreground',
                          billingNumericClassName
                        )}
                      >
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

/**
 * Motion tokens from Emil Kowalski’s animation guidelines:
 * strong ease-out, UI under 300ms, stagger 30–80ms, transform+opacity only.
 * @see https://github.com/emilkowalski/skills/blob/main/skills/improve-animations/AUDIT.md
 */
const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const;
const NESTED_DURATION_S = 0.2;
const NESTED_STAGGER_S = 0.04;
const NESTED_ENTER_Y_PX = 6;

type MeterRowSharedProps = {
  formatOptions: BillingFormatOptions;
  messages: BillingUsageOverviewMessages;
  pendingAction: string | null;
  actionError: ActionError | null;
  onRunAction: (
    kind: MeterAction,
    meter: BillingMeterUsage,
    callback: (meterSlug: string) => void | Promise<void>
  ) => void;
  onViewHistory?: (meterSlug: string) => void | Promise<void>;
  onBuyCredits?: (meterSlug: string) => void | Promise<void>;
};

/**
 * Nested meter group: height from Base UI collapsible (compositor-safe),
 * enter/exit ease-out on the panel, staggered child reveals on open.
 * CSS transitions + Motion retarget mid-flight (interruptible).
 */
function NestedMeters({
  parentLabel,
  nestedLabel,
  meters,
  depth,
  ...rowProps
}: MeterRowSharedProps & {
  parentLabel: string;
  nestedLabel: string;
  meters: BillingMeterUsage[];
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="min-w-0"
    >
      <CollapsibleTrigger
        className={cn(
          'min-h-10 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground',
          // Color only — no scale/translate on press (no tactile displacement)
          'transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'hover:bg-muted/50 hover:text-foreground',
          // Icon: interruptible rotate, strong ease-out (not default ease)
          '[&_[data-slot=collapsible-icon]]:duration-200',
          '[&_[data-slot=collapsible-icon]]:ease-[cubic-bezier(0.23,1,0.32,1)]',
          'motion-reduce:transition-none'
        )}
        aria-label={`${parentLabel}: ${nestedLabel}`}
      >
        <span>{nestedLabel}</span>
        <CollapsibleIcon aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          'min-w-0 origin-top',
          // Override panel defaults: strong ease-out, slight slide from under trigger
          'duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0',
          'data-[ending-style]:-translate-y-1 data-[ending-style]:opacity-0',
          // Reduced motion: keep brief opacity, drop movement (AUDIT §6)
          'motion-reduce:transition-[opacity] motion-reduce:duration-150',
          'motion-reduce:data-[starting-style]:translate-y-0',
          'motion-reduce:data-[ending-style]:translate-y-0'
        )}
        innerClassName="space-y-0 py-2 ps-0 pe-0"
      >
        <div
          className="flex min-w-0 flex-col gap-5 rounded-lg bg-muted/50 p-3 @min-[640px]/billing-usage:p-4"
          aria-label={`${parentLabel} meters`}
        >
          {meters.map((child, index) => (
            <motion.div
              key={`${child.meterSlug}:${index}`}
              className="min-w-0"
              initial={false}
              animate={
                open
                  ? {
                      opacity: 1,
                      // Full transform string — Motion x/y shorthands are main-thread (AUDIT §5)
                      transform: 'translateY(0px)'
                    }
                  : {
                      opacity: reduceMotion ? 1 : 0,
                      transform: reduceMotion
                        ? 'translateY(0px)'
                        : `translateY(${NESTED_ENTER_Y_PX}px)`
                    }
              }
              transition={{
                duration: reduceMotion ? 0.12 : NESTED_DURATION_S,
                ease: [...EASE_OUT_STRONG],
                // Stagger only on open; close snaps delays so the panel can collapse cleanly
                delay:
                  open && !reduceMotion ? index * NESTED_STAGGER_S : 0
              }}
            >
              <MeterRow
                meter={child}
                depth={depth + 1}
                {...rowProps}
              />
            </motion.div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MeterRow({
  meter,
  depth,
  formatOptions,
  messages,
  pendingAction,
  actionError,
  onRunAction,
  onViewHistory,
  onBuyCredits
}: MeterRowSharedProps & {
  meter: BillingMeterUsage;
  depth: number;
}) {
  const historyKey = `billingUsage.history:${meter.meterSlug}`;
  const creditsKey = `billingUsage.credits:${meter.meterSlug}`;
  const showBuyCredits = Boolean(onBuyCredits) && meter.kind !== 'boolean';
  const hasActions = Boolean(onViewHistory) || showBuyCredits;
  const headingLevel = Math.min(3 + depth, 6);
  const childCount = meter.children?.length ?? 0;
  const nestedLabel = interpolate(messages.nestedMetersLabel, {
    count: String(childCount)
  });
  const kindLabel = messages.meterKind[meter.kind];
  const titleHint = [kindLabel, meter.meterSlug, meter.description]
    .filter(Boolean)
    .join(' — ');

  return (
    <section
      className="grid min-w-0 max-w-full gap-3"
      data-meter-slug={meter.meterSlug}
      data-meter-depth={depth}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <div
            className="min-w-0 text-balance text-sm font-medium text-foreground [overflow-wrap:anywhere]"
            role="heading"
            aria-level={headingLevel}
            title={titleHint}
          >
            {meter.label}
          </div>
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{kindLabel}</span>
            {meter.meterSlug ? (
              <span className="font-mono text-[0.6875rem] opacity-80">
                {meter.meterSlug}
              </span>
            ) : null}
            {meter.description ? (
              <span className="sr-only">. {meter.description}</span>
            ) : null}
          </p>
        </div>
        {hasActions ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            {onViewHistory ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={pendingAction !== null}
                aria-busy={pendingAction === historyKey}
                aria-label={`${meter.label}: ${messages.viewHistoryButton}`}
                onClick={() => onRunAction('history', meter, onViewHistory)}
              >
                {pendingAction === historyKey
                  ? messages.viewingHistoryButton
                  : messages.viewHistoryButton}
              </Button>
            ) : null}
            {showBuyCredits && onBuyCredits ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pendingAction !== null}
                aria-busy={pendingAction === creditsKey}
                aria-label={`${meter.label}: ${messages.buyCreditsButton}`}
                onClick={() => onRunAction('credits', meter, onBuyCredits)}
              >
                {pendingAction === creditsKey
                  ? messages.buyingCreditsButton
                  : messages.buyCreditsButton}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <MeterFigure
        meter={meter}
        formatOptions={formatOptions}
        messages={messages}
      />

      {actionError?.meterSlug === meter.meterSlug ? (
        <Alert variant="destructive">
          <AlertTitle
            className="text-balance"
            role="heading"
            aria-level={Math.min(headingLevel + 1, 6)}
          >
            {actionError.title}
          </AlertTitle>
          <AlertDescription>{actionError.message}</AlertDescription>
        </Alert>
      ) : null}

      {childCount > 0 ? (
        <NestedMeters
          parentLabel={meter.label}
          nestedLabel={nestedLabel}
          meters={meter.children!}
          depth={depth}
          formatOptions={formatOptions}
          messages={messages}
          pendingAction={pendingAction}
          actionError={actionError}
          onRunAction={onRunAction}
          onViewHistory={onViewHistory}
          onBuyCredits={onBuyCredits}
        />
      ) : null}
    </section>
  );
}

export function BillingUsageOverview({
  resource: usage,
  account,
  formatOptions,
  messages: messageOverrides,
  onViewHistory,
  onBuyCredits,
  onError,
  onMessage,
  embedded = false,
  className
}: BillingUsageOverviewProps) {
  const titleId = useId();
  const messages = mergeMessages(messageOverrides);
  const pendingRef = useRef<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ActionError | null>(null);

  async function runExclusive(
    key: string,
    callback: () => void | Promise<void>,
    meterSlug?: string
  ) {
    if (pendingRef.current) return false;

    pendingRef.current = key;
    setPendingAction(key);
    setActionError(null);

    try {
      await callback();
      return true;
    } catch (error) {
      const message = messages.errors.UNKNOWN_ERROR;
      setActionError({ title: messages.actionErrorTitle, message, meterSlug });
      onMessage?.({ kind: 'error', key: `${key}.error`, message });
      onError?.(normalizeBillingError(error, message));
      return false;
    } finally {
      pendingRef.current = null;
      setPendingAction(null);
    }
  }

  async function handleMeterAction(
    kind: MeterAction,
    meter: BillingMeterUsage,
    callback: (meterSlug: string) => void | Promise<void>
  ) {
    const key = `billingUsage.${kind}:${meter.meterSlug}`;
    const succeeded = await runExclusive(
      key,
      () => callback(meter.meterSlug),
      meter.meterSlug
    );
    if (succeeded) {
      onMessage?.({
        kind: 'info',
        key: `billingUsage.${kind}.delegated`,
        message: meter.label
      });
    }
  }

  async function handleRetry(retry: () => void) {
    const succeeded = await runExclusive('billingUsage.retry', () => retry());
    if (succeeded) {
      onMessage?.({ kind: 'info', key: 'billingUsage.retry.requested' });
    }
  }

  if (usage.status === 'loading') {
    return (
      <Card
        className={cn('@container/billing-usage w-full', className)}
        aria-labelledby={titleId}
        aria-busy="true"
        data-slot="billing-usage-overview"
      >
        <UsageHeader
          titleId={titleId}
          account={account}
          messages={messages}
          formatOptions={formatOptions}
          embedded={embedded}
        />
        <CardContent>
          <div className="grid gap-4" aria-hidden="true">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <p className="sr-only" role="status">
            {messages.loadingAriaLabel}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (usage.status === 'empty') {
    return (
      <Card
        className={cn('@container/billing-usage w-full', className)}
        aria-labelledby={titleId}
        data-slot="billing-usage-overview"
      >
        <UsageHeader
          titleId={titleId}
          account={account}
          messages={messages}
          formatOptions={formatOptions}
          embedded={embedded}
        />
        <CardContent>
          <Alert role="status">
            <AlertTitle className="text-balance" role="heading" aria-level={3}>
              {messages.emptyTitle}
            </AlertTitle>
            <AlertDescription>{messages.emptyDescription}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (usage.status === 'error') {
    return (
      <Card
        className={cn('@container/billing-usage w-full', className)}
        aria-labelledby={titleId}
        data-slot="billing-usage-overview"
      >
        <UsageHeader
          titleId={titleId}
          account={account}
          messages={messages}
          formatOptions={formatOptions}
          embedded={embedded}
        />
        <CardContent className="grid gap-4">
          <Alert variant="destructive">
            <AlertTitle className="text-balance" role="heading" aria-level={3}>
              {messages.errorTitle}
            </AlertTitle>
            <AlertDescription>{usage.error.message}</AlertDescription>
          </Alert>
          {actionError && actionError.meterSlug === undefined ? (
            <Alert variant="destructive">
              <AlertTitle className="text-balance" role="heading" aria-level={3}>
                {actionError.title}
              </AlertTitle>
              <AlertDescription>{actionError.message}</AlertDescription>
            </Alert>
          ) : null}
          {usage.retry ? (
            <div>
              <Button
                size="lg"
                variant="outline"
                disabled={pendingAction !== null}
                aria-busy={pendingAction === 'billingUsage.retry'}
                onClick={() => void handleRetry(usage.retry!)}
              >
                {pendingAction === 'billingUsage.retry'
                  ? messages.retryingButton
                  : messages.retryButton}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (usage.data.meters.length === 0) {
    return (
      <TooltipProvider>
        <Card
          className={cn('@container/billing-usage w-full', className)}
          aria-labelledby={titleId}
          data-slot="billing-usage-overview"
        >
          <UsageHeader
            titleId={titleId}
            account={account}
            messages={messages}
            quality={usage.quality}
            asOf={usage.asOf}
            formatOptions={formatOptions}
            period={usage.data.period}
            embedded={embedded}
          />
          <CardContent>
            <Alert role="status">
              <AlertTitle className="text-balance" role="heading" aria-level={3}>
                {messages.emptyTitle}
              </AlertTitle>
              <AlertDescription>{messages.emptyDescription}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Card
        className={cn('@container/billing-usage w-full', className)}
        aria-labelledby={titleId}
        data-slot="billing-usage-overview"
      >
        <UsageHeader
          titleId={titleId}
          account={account}
          messages={messages}
          quality={usage.quality}
          asOf={usage.asOf}
          formatOptions={formatOptions}
          period={usage.data.period}
          embedded={embedded}
        />
        <CardContent className="pt-2">
          <div className="flex flex-col divide-y divide-border/40">
            {usage.data.meters.map((meter, index) => (
              <div
                key={`${meter.meterSlug}:${index}`}
                className={cn(index === 0 ? 'pb-5' : 'py-5 last:pb-0')}
              >
                <MeterRow
                  meter={meter}
                  depth={0}
                  formatOptions={formatOptions}
                  messages={messages}
                  pendingAction={pendingAction}
                  actionError={actionError}
                  onRunAction={(kind, selectedMeter, callback) =>
                    void handleMeterAction(kind, selectedMeter, callback)
                  }
                  onViewHistory={onViewHistory}
                  onBuyCredits={onBuyCredits}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
