'use client';

/**
 * Numbers-first credit balances (aligned with usage overview):
 * - Hero available figure; grant lots collapsed until opened
 * - Secondary numbers (percent, granted, dates) live on progress-bar tooltips
 * - Quality alone top-right; “Updated” sits with account meta
 * - Low remaining uses warning-foreground consistently (not solid destructive)
 */

import { useId, useRef, useState } from 'react';
import { CircleHelpIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
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
  getBillingUsageProgress,
  normalizeBillingError,
  type BillingAccountRef,
  type BillingCreditBalance,
  type BillingCreditLot,
  type BillingError,
  type BillingFormatOptions,
  type BillingMessageEvent,
  type BillingQuality,
  type BillingResource
} from '../billing-contracts/billing-contracts';
import {
  BillingQualityBadge,
  BillingQuantity,
  billingNumericClassName
} from '../billing-ui/billing-ui';
import { cn } from '@/lib/utils';

import {
  defaultBillingCreditsCardMessages,
  type BillingCreditsCardMessageOverrides,
  type BillingCreditsCardMessages
} from './messages';

export type BillingCreditsCardProps = {
  resource: BillingResource<BillingCreditBalance[]>;
  account: BillingAccountRef;
  formatOptions: BillingFormatOptions;
  messages?: BillingCreditsCardMessageOverrides;
  onError?: (error: BillingError) => void;
  onMessage?: (event: BillingMessageEvent) => void;
  /** Hide account identity when nested under BillingSettingsPage. */
  embedded?: boolean;
  className?: string;
};

/** Emil Kowalski strong ease-out — UI under 300ms, transform+opacity only. */
const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const;
const GRANTS_DURATION_S = 0.2;
const GRANTS_STAGGER_S = 0.04;
const GRANTS_ENTER_Y_PX = 6;
/** Remaining share at or below this → soft warning pressure on the lot figure/bar. */
const LOW_REMAINING_PERCENT = 20;

function mergeMessages(
  overrides: BillingCreditsCardMessageOverrides | undefined
): BillingCreditsCardMessages {
  return {
    ...defaultBillingCreditsCardMessages,
    ...overrides,
    accountKind: {
      ...defaultBillingCreditsCardMessages.accountKind,
      ...overrides?.accountKind
    },
    quality: {
      ...defaultBillingCreditsCardMessages.quality,
      ...overrides?.quality
    },
    qualityHelp: {
      ...defaultBillingCreditsCardMessages.qualityHelp,
      ...overrides?.qualityHelp
    },
    poolKind: {
      ...defaultBillingCreditsCardMessages.poolKind,
      ...overrides?.poolKind
    },
    lotKind: {
      ...defaultBillingCreditsCardMessages.lotKind,
      ...overrides?.lotKind
    },
    lotKindHelp: {
      ...defaultBillingCreditsCardMessages.lotKindHelp,
      ...overrides?.lotKindHelp
    },
    errors: {
      ...defaultBillingCreditsCardMessages.errors,
      ...overrides?.errors
    }
  };
}

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return values[key] ?? `{{${key}}}`;
  });
}

/**
 * Header mirrors usage overview:
 * quality alone top-right; account + Updated in one meta cluster; help copy in tooltip.
 */
function CreditsHeader({
  titleId,
  account,
  messages,
  quality,
  asOf,
  formatOptions,
  embedded = false
}: {
  titleId: string;
  account: BillingAccountRef;
  messages: BillingCreditsCardMessages;
  quality?: BillingQuality;
  asOf?: string;
  formatOptions: BillingFormatOptions;
  embedded?: boolean;
}) {
  return (
    <CardHeader className="gap-3 pb-2">
      <div className="flex min-w-0 flex-col gap-2 @min-[640px]/billing-credits:flex-row @min-[640px]/billing-credits:items-start @min-[640px]/billing-credits:justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle id={titleId} role="heading" aria-level={2}>
            {messages.title}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={messages.auditTitle}
              >
                <CircleHelpIcon className="size-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-pretty">
              <p className="font-medium">{messages.auditTitle}</p>
              <p className="mt-1">{messages.auditDescription}</p>
              <p className="mt-2 opacity-80">{messages.description}</p>
            </TooltipContent>
          </Tooltip>
          <span className="sr-only" role="note">
            {messages.auditTitle}. {messages.auditDescription}
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
          {asOf ? (
            <div className="text-muted-foreground">
              <span className="tabular-nums">
                {messages.asOfLabel}{' '}
                <time dateTime={asOf}>
                  {formatBillingDate(asOf, formatOptions)}
                </time>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </CardHeader>
  );
}

function CreditLotRow({
  lot,
  unit,
  formatOptions,
  messages
}: {
  lot: BillingCreditLot;
  unit: string;
  formatOptions: BillingFormatOptions;
  messages: BillingCreditsCardMessages;
}) {
  // Progress models remaining as share of original grant (bar full = more left).
  const remainingProgress = getBillingUsageProgress(lot.remaining, {
    kind: 'limited',
    limit: lot.amount
  });
  const remainingPercent =
    remainingProgress.exactPercent === undefined
      ? undefined
      : Number(remainingProgress.exactPercent);
  const isLowRemaining =
    remainingPercent !== undefined && remainingPercent <= LOW_REMAINING_PERCENT;
  const pressureFigureClass = isLowRemaining
    ? 'text-warning-foreground'
    : undefined;
  const pressureTrackClass = isLowRemaining
    ? 'bg-warning-foreground/12 [&_[data-slot=progress-indicator]]:bg-warning-foreground'
    : undefined;

  const dates = [
    lot.grantedAt
      ? { label: messages.grantedLabel, value: lot.grantedAt }
      : null,
    lot.startsAt ? { label: messages.startsLabel, value: lot.startsAt } : null,
    lot.expiresAt
      ? { label: messages.expiresLabel, value: lot.expiresAt }
      : null,
    lot.periodEndsAt
      ? { label: messages.periodEndsLabel, value: lot.periodEndsAt }
      : null
  ].filter((date): date is { label: string; value: string } => date !== null);

  const percentLabel =
    remainingProgress.exactPercent === undefined
      ? null
      : `${remainingProgress.exactPercent}%`;

  const progressAriaText = `${messages.rawValuesLabel}: ${lot.remaining} / ${lot.amount}${
    percentLabel
      ? `; ${percentLabel} ${messages.percentRemainingLabel}`
      : ''
  }${dates
    .map(
      (d) =>
        `; ${d.label}: ${formatBillingDate(d.value, formatOptions)}`
    )
    .join('')}`;

  const description = lot.description?.trim();
  const kindLabel = messages.lotKind[lot.kind];
  const title = description || kindLabel || lot.id;

  return (
    <article
      className="grid min-w-0 max-w-full gap-2.5"
      data-credit-lot-id={lot.id}
    >
      <div className="grid min-w-0 gap-0.5">
        {description ? (
          <p className="min-w-0 text-balance text-sm font-medium text-foreground [overflow-wrap:anywhere]">
            {description}
          </p>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <p
                className="min-w-0 cursor-default text-balance text-sm font-medium text-foreground underline decoration-border/50 decoration-dotted underline-offset-4 [overflow-wrap:anywhere]"
                tabIndex={0}
              >
                {title}
              </p>
            </TooltipTrigger>
            <TooltipContent>{messages.lotKindHelp[lot.kind]}</TooltipContent>
          </Tooltip>
        )}
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {description ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="cursor-default underline decoration-border/50 decoration-dotted underline-offset-2"
                  tabIndex={0}
                >
                  {kindLabel}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {messages.lotKindHelp[lot.kind]}
              </TooltipContent>
            </Tooltip>
          ) : null}
          <span className="font-mono text-[0.6875rem] opacity-80">
            {lot.id}
          </span>
        </p>
      </div>

      {/* Hero: remaining / granted — percent + dates live on the bar tooltip */}
      <p
        className={cn(
          'text-2xl font-semibold tracking-tight @min-[640px]/billing-credits:text-3xl',
          billingNumericClassName,
          pressureFigureClass
        )}
      >
        <span className="sr-only">{messages.remainingLabel}: </span>
        <BillingQuantity
          value={lot.remaining}
          unit={undefined}
          formatOptions={formatOptions}
        />
        <span className="mx-1.5 font-normal text-muted-foreground/40">/</span>
        <span className="sr-only">{messages.originalAmountLabel}: </span>
        <span className="font-medium text-muted-foreground">
          <BillingQuantity
            value={lot.amount}
            unit={unit}
            formatOptions={formatOptions}
          />
        </span>
      </p>

      <Tooltip trackCursorAxis="x">
        <TooltipTrigger asChild>
          <div
            className={cn(
              'group/credit-progress min-w-0 cursor-help py-2 outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
            tabIndex={0}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={remainingProgress.visualPercent}
            aria-valuetext={progressAriaText}
            aria-label={`${title} ${messages.percentRemainingLabel}`}
          >
            <Progress
              value={remainingProgress.visualPercent}
              className={cn('h-1.5 min-w-0', pressureTrackClass)}
              aria-hidden="true"
              data-visual-percent={remainingProgress.visualPercent}
            />
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
                {lot.remaining} / {lot.amount}
                {unit ? ` ${unit}` : ''}
              </p>
              <p
                className={cn(
                  'shrink-0 text-xs font-semibold tabular-nums',
                  isLowRemaining
                    ? 'text-warning-foreground'
                    : 'text-popover-foreground'
                )}
              >
                {percentLabel ?? messages.percentUnavailable}
                {percentLabel ? (
                  <span className="sr-only">
                    {' '}
                    {messages.percentRemainingLabel}
                  </span>
                ) : null}
              </p>
            </div>
            <dl className="grid gap-1.5 border-t border-border/60 pt-2">
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-[0.6875rem] text-muted-foreground">
                  {messages.remainingLabel}
                </dt>
                <dd
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    billingNumericClassName
                  )}
                >
                  <BillingQuantity
                    value={lot.remaining}
                    unit={unit}
                    formatOptions={formatOptions}
                  />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-[0.6875rem] text-muted-foreground">
                  {messages.originalAmountLabel}
                </dt>
                <dd
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    billingNumericClassName
                  )}
                >
                  <BillingQuantity
                    value={lot.amount}
                    unit={unit}
                    formatOptions={formatOptions}
                  />
                </dd>
              </div>
              {dates.map((date) => (
                <div
                  key={`${date.label}:${date.value}`}
                  className="flex items-baseline justify-between gap-6"
                >
                  <dt className="text-[0.6875rem] text-muted-foreground">
                    {date.label}
                  </dt>
                  <dd className="text-xs font-medium tabular-nums">
                    <time dateTime={date.value}>
                      {formatBillingDate(date.value, formatOptions)}
                    </time>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </TooltipContent>
      </Tooltip>
    </article>
  );
}

function BalanceGrants({
  balance,
  formatOptions,
  messages
}: {
  balance: BillingCreditBalance;
  formatOptions: BillingFormatOptions;
  messages: BillingCreditsCardMessages;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const count = balance.lots.length;
  const triggerLabel = interpolate(messages.showGrantsLabel, {
    count: String(count)
  });

  if (count === 0) {
    return (
      <p className="text-pretty text-sm text-muted-foreground">{messages.noLots}</p>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0">
      <CollapsibleTrigger
        className={cn(
          'min-h-10 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground',
          'transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'hover:bg-muted/50 hover:text-foreground',
          '[&_[data-slot=collapsible-icon]]:duration-200',
          '[&_[data-slot=collapsible-icon]]:ease-[cubic-bezier(0.23,1,0.32,1)]',
          'motion-reduce:transition-none'
        )}
        aria-label={`${balance.label}: ${triggerLabel}`}
      >
        <span>{triggerLabel}</span>
        <CollapsibleIcon aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          'min-w-0 origin-top',
          'duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
          'data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0',
          'data-[ending-style]:-translate-y-1 data-[ending-style]:opacity-0',
          'motion-reduce:transition-[opacity] motion-reduce:duration-150',
          'motion-reduce:data-[starting-style]:translate-y-0',
          'motion-reduce:data-[ending-style]:translate-y-0'
        )}
        innerClassName="space-y-0 py-2 ps-0 pe-0"
      >
        <div
          className="flex min-w-0 flex-col gap-5 rounded-lg bg-muted/50 p-3 @min-[640px]/billing-credits:p-4"
          aria-label={`${balance.label} grants`}
        >
          {balance.lots.map((lot, index) => (
            <motion.div
              key={`${lot.id}:${index}`}
              className="min-w-0"
              initial={false}
              animate={
                open
                  ? { opacity: 1, transform: 'translateY(0px)' }
                  : {
                      opacity: reduceMotion ? 1 : 0,
                      transform: reduceMotion
                        ? 'translateY(0px)'
                        : `translateY(${GRANTS_ENTER_Y_PX}px)`
                    }
              }
              transition={{
                duration: reduceMotion ? 0.12 : GRANTS_DURATION_S,
                ease: [...EASE_OUT_STRONG],
                delay: open && !reduceMotion ? index * GRANTS_STAGGER_S : 0
              }}
            >
              <CreditLotRow
                lot={lot}
                unit={balance.unit}
                formatOptions={formatOptions}
                messages={messages}
              />
            </motion.div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function BalanceSection({
  balance,
  index,
  formatOptions,
  messages
}: {
  balance: BillingCreditBalance;
  index: number;
  formatOptions: BillingFormatOptions;
  messages: BillingCreditsCardMessages;
}) {
  const poolKind = balance.poolKind ?? 'unspecified';
  const kindLabel = messages.poolKind[poolKind];

  return (
    <section
      className="grid min-w-0 max-w-full gap-3"
      data-balance-group={`${balance.meterSlug}:${balance.unit}:${poolKind}:${index}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <div
            className="min-w-0 text-balance text-sm font-medium text-foreground [overflow-wrap:anywhere]"
            role="heading"
            aria-level={3}
          >
            {balance.label}
          </div>
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{kindLabel}</span>
            {balance.meterSlug ? (
              <span className="font-mono text-[0.6875rem] opacity-80">
                {balance.meterSlug}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-0.5">
        <p
          className={cn(
            'text-2xl font-semibold tracking-tight @min-[640px]/billing-credits:text-3xl',
            billingNumericClassName
          )}
        >
          <span className="sr-only">{messages.availableLabel}: </span>
          <BillingQuantity
            value={balance.available}
            unit={balance.unit}
            formatOptions={formatOptions}
          />
        </p>
      </div>

      <BalanceGrants
        balance={balance}
        formatOptions={formatOptions}
        messages={messages}
      />
    </section>
  );
}

export function BillingCreditsCard({
  resource,
  account,
  formatOptions,
  messages: messageOverrides,
  onError,
  onMessage,
  embedded = false,
  className
}: BillingCreditsCardProps) {
  const titleId = useId();
  const messages = mergeMessages(messageOverrides);
  const retryRef = useRef(false);
  const [retryPending, setRetryPending] = useState(false);
  const [retryError, setRetryError] = useState(false);

  async function handleRetry(retry: () => void) {
    if (retryRef.current) return;

    retryRef.current = true;
    setRetryPending(true);
    setRetryError(false);

    try {
      await retry();
    } catch (error) {
      const message = messages.errors.UNKNOWN_ERROR;
      setRetryError(true);
      onMessage?.({ kind: 'error', key: 'billingCredits.retry.error', message });
      onError?.(normalizeBillingError(error, message));
    } finally {
      retryRef.current = false;
      setRetryPending(false);
    }
  }

  if (resource.status === 'loading') {
    return (
      <Card
        className={cn('@container/billing-credits w-full', className)}
        aria-labelledby={titleId}
        aria-busy="true"
        data-slot="billing-credits-card"
      >
        <CreditsHeader
          titleId={titleId}
          account={account}
          messages={messages}
          formatOptions={formatOptions}
          embedded={embedded}
        />
        <CardContent>
          <div className="grid gap-4" aria-hidden="true">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <p className="sr-only" role="status">
            {messages.loadingAriaLabel}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (
    resource.status === 'empty' ||
    (resource.status === 'ready' && resource.data.length === 0)
  ) {
    const quality = resource.status === 'ready' ? resource.quality : undefined;
    const asOf = resource.status === 'ready' ? resource.asOf : undefined;

    return (
      <TooltipProvider>
        <Card
          className={cn('@container/billing-credits w-full', className)}
          aria-labelledby={titleId}
          data-slot="billing-credits-card"
        >
          <CreditsHeader
            titleId={titleId}
            account={account}
            messages={messages}
            quality={quality}
            asOf={asOf}
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
      </TooltipProvider>
    );
  }

  if (resource.status === 'error') {
    return (
      <Card
        className={cn('@container/billing-credits w-full', className)}
        aria-labelledby={titleId}
        data-slot="billing-credits-card"
      >
        <CreditsHeader
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
            <AlertDescription>{resource.error.message}</AlertDescription>
          </Alert>
          {retryError ? (
            <Alert variant="destructive">
              <AlertTitle className="text-balance" role="heading" aria-level={3}>
                {messages.actionErrorTitle}
              </AlertTitle>
              <AlertDescription>
                {messages.errors.UNKNOWN_ERROR}
              </AlertDescription>
            </Alert>
          ) : null}
          {resource.retry ? (
            <div>
              <Button
                size="lg"
                variant="outline"
                disabled={retryPending}
                aria-busy={retryPending}
                onClick={() => void handleRetry(resource.retry!)}
              >
                {retryPending ? messages.retryingButton : messages.retryButton}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card
        className={cn('@container/billing-credits w-full', className)}
        aria-labelledby={titleId}
        data-slot="billing-credits-card"
      >
        <CreditsHeader
          titleId={titleId}
          account={account}
          messages={messages}
          quality={resource.quality}
          asOf={resource.asOf}
          formatOptions={formatOptions}
          embedded={embedded}
        />
        <CardContent className="pt-2">
          <div className="flex flex-col divide-y divide-border/40">
            {resource.data.map((balance, index) => (
              <div
                key={`${balance.meterSlug}:${balance.unit}:${balance.poolKind ?? 'unspecified'}:${index}`}
                className={cn(index === 0 ? 'pb-5' : 'py-5 last:pb-0')}
              >
                <BalanceSection
                  balance={balance}
                  index={index}
                  formatOptions={formatOptions}
                  messages={messages}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
