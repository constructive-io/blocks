'use client';

import * as React from 'react';
import {
  CircleHelpIcon,
  GaugeIcon,
  HashIcon,
  LayersIcon,
  ToggleLeftIcon
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import { Skeleton } from '@constructive-io/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@constructive-io/ui/tooltip';

import { cn } from '@/lib/utils';
import {
  formatBillingDate,
  formatBillingQuantity,
  normalizeBillingError,
  type BillingAccountRef,
  type BillingAllowance,
  type BillingEntitlement,
  type BillingError,
  type BillingFormatOptions,
  type BillingMessageEvent,
  type BillingQuality,
  type BillingResource
} from '@/blocks/billing/billing-contracts/billing-contracts';
import {
  BillingQualityBadge,
  billingNumericClassName
} from '@/blocks/billing/billing-ui/billing-ui';

import {
  defaultBillingEntitlementsListMessages,
  type BillingEntitlementsListMessageOverrides,
  type BillingEntitlementsListMessages
} from './messages';

export type BillingEntitlementsListProps = {
  resource: BillingResource<BillingEntitlement[]>;
  account: BillingAccountRef;
  formatOptions: BillingFormatOptions;
  messages?: BillingEntitlementsListMessageOverrides;
  onError?: (error: BillingError) => void;
  onMessage?: (event: BillingMessageEvent) => void;
  /** Hide account identity line when nested under BillingSettingsPage. */
  embedded?: boolean;
  className?: string;
};

type EntitlementSection = {
  id: string;
  title: string;
  description: string;
  items: BillingEntitlement[];
};

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return values[key] ?? `{{${key}}}`;
  });
}

function accountLabel(
  account: BillingAccountRef,
  messages: BillingEntitlementsListMessages
) {
  if (account.label) return account.label;
  return account.kind === 'personal'
    ? messages.personalAccountLabel
    : messages.organizationAccountLabel;
}

function quantityWithUnit(
  value: string,
  unit: string | undefined,
  formatOptions: BillingFormatOptions
) {
  const quantity = formatBillingQuantity(value, formatOptions);
  return unit ? `${quantity}\u00a0${unit}` : quantity;
}

function sectionIcon(sectionId: string) {
  switch (sectionId) {
    case 'features':
      return ToggleLeftIcon;
    case 'caps':
      return HashIcon;
    case 'quotas':
      return LayersIcon;
    case 'meters':
      return GaugeIcon;
    default:
      return CircleHelpIcon;
  }
}

function QualityNotice({
  quality,
  asOf,
  formatOptions,
  messages
}: {
  quality?: BillingQuality;
  asOf?: string;
  formatOptions: BillingFormatOptions;
  messages: BillingEntitlementsListMessages;
}) {
  if (quality !== 'estimated' && quality !== 'stale') return null;

  const title =
    quality === 'estimated' ? messages.estimatedTitle : messages.staleTitle;
  const description =
    quality === 'estimated'
      ? messages.estimatedDescription
      : messages.staleDescription;

  return (
    <Alert variant={quality === 'estimated' ? 'info' : 'warning'}>
      <AlertTitle className="text-balance" role="heading" aria-level={3}>
        {title}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-1">
        <p>{description}</p>
        {asOf ? (
          <p className="tabular-nums">
            {messages.snapshotDateLabel}:{' '}
            {formatBillingDate(asOf, formatOptions)}
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function ExplainedBadge({
  label,
  tooltip,
  variant = 'outline'
}: {
  label: string;
  tooltip: string;
  variant?: React.ComponentProps<typeof Badge>['variant'];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={variant}
          tabIndex={0}
          aria-label={`${label}. ${tooltip}`}
          className="after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-1/2 pointer-coarse:after:size-11"
        >
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function AllowanceValue({
  allowance,
  unit,
  formatOptions,
  messages
}: {
  allowance: BillingAllowance;
  unit?: string;
  formatOptions: BillingFormatOptions;
  messages: BillingEntitlementsListMessages;
}) {
  if (allowance.kind === 'unlimited') {
    return <Badge variant="success">{messages.unlimitedLabel}</Badge>;
  }

  if (allowance.kind === 'uninitialized') {
    return (
      <ExplainedBadge
        label={messages.uninitializedLabel}
        tooltip={messages.uninitializedTooltip}
        variant="warning"
      />
    );
  }

  const limit = quantityWithUnit(allowance.limit, unit, formatOptions);
  const remaining = allowance.remaining
    ? quantityWithUnit(allowance.remaining, unit, formatOptions)
    : null;

  return (
    <div className="flex min-w-0 max-w-full flex-col items-start gap-0.5 @min-[640px]/billing-entitlements-list:items-end">
      <span
        className={cn(
          'text-start text-sm font-medium @min-[640px]/billing-entitlements-list:text-end',
          billingNumericClassName
        )}
        data-slot="billing-entitlement-limit"
      >
        <span className="font-normal text-muted-foreground">
          {messages.limitLabel}:{' '}
        </span>
        {limit}
      </span>
      {remaining ? (
        <span
          className={cn(
            'text-start text-xs text-muted-foreground @min-[640px]/billing-entitlements-list:text-end',
            billingNumericClassName
          )}
          data-slot="billing-entitlement-remaining"
        >
          {remaining} {messages.remainingLabel}
        </span>
      ) : null}
    </div>
  );
}

function EntitlementValue({
  entitlement,
  formatOptions,
  messages
}: {
  entitlement: BillingEntitlement;
  formatOptions: BillingFormatOptions;
  messages: BillingEntitlementsListMessages;
}) {
  if (entitlement.kind === 'feature') {
    return (
      <Badge variant={entitlement.enabled ? 'success' : 'outline'}>
        {entitlement.enabled
          ? messages.enabledLabel
          : messages.disabledLabel}
      </Badge>
    );
  }

  if (entitlement.kind === 'cap') {
    return (
      <span
        className={cn(
          'text-start text-sm font-medium @min-[640px]/billing-entitlements-list:text-end',
          billingNumericClassName
        )}
        data-slot="billing-entitlement-cap"
      >
        <span className="sr-only">{messages.capValueLabel}: </span>
        {quantityWithUnit(entitlement.value, entitlement.unit, formatOptions)}
      </span>
    );
  }

  if (entitlement.kind === 'quota' || entitlement.kind === 'meter') {
    return (
      <AllowanceValue
        allowance={entitlement.allowance}
        unit={entitlement.unit}
        formatOptions={formatOptions}
        messages={messages}
      />
    );
  }

  const rawKind = entitlement.rawKind?.trim();
  const tooltip = rawKind
    ? `${messages.unknownTooltip} (${rawKind})`
    : messages.unknownTooltip;

  return (
    <div className="flex min-w-0 max-w-full flex-col items-start gap-0.5 @min-[640px]/billing-entitlements-list:items-end">
      <ExplainedBadge
        label={messages.unknownLabel}
        tooltip={tooltip}
        variant="outline"
      />
      {entitlement.value ? (
        <span className="max-w-full break-words text-start text-xs text-muted-foreground tabular-nums @min-[640px]/billing-entitlements-list:max-w-64 @min-[640px]/billing-entitlements-list:text-end">
          {entitlement.value}
        </span>
      ) : null}
    </div>
  );
}

function EntitlementRow({
  entitlement,
  formatOptions,
  messages,
  Icon
}: {
  entitlement: BillingEntitlement;
  formatOptions: BillingFormatOptions;
  messages: BillingEntitlementsListMessages;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}) {
  return (
    <div className="grid min-w-0 max-w-full gap-3 py-3.5 @min-[640px]/billing-entitlements-list:grid-cols-[minmax(0,1fr)_minmax(0,auto)] @min-[640px]/billing-entitlements-list:items-center @min-[640px]/billing-entitlements-list:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground"
          aria-hidden="true"
        >
          <Icon className="size-4 opacity-80" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h4 className="text-balance text-sm font-medium leading-snug [overflow-wrap:anywhere]">
            {entitlement.label}
          </h4>
          {entitlement.description ? (
            <p className="mt-0.5 max-w-xl text-pretty text-sm leading-snug text-muted-foreground [overflow-wrap:anywhere]">
              {entitlement.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 max-w-full @min-[480px]:ps-12 @min-[640px]/billing-entitlements-list:max-w-[min(100%,18rem)] @min-[640px]/billing-entitlements-list:ps-0 @min-[640px]/billing-entitlements-list:text-end">
        <EntitlementValue
          entitlement={entitlement}
          formatOptions={formatOptions}
          messages={messages}
        />
      </div>
    </div>
  );
}

function EntitlementSectionView({
  section,
  formatOptions,
  messages
}: {
  section: EntitlementSection;
  formatOptions: BillingFormatOptions;
  messages: BillingEntitlementsListMessages;
}) {
  const instanceId = React.useId();
  const headingId = `${instanceId}-billing-entitlements-${section.id}`;
  const Icon = sectionIcon(section.id);

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 pb-1">
        <div className="min-w-0">
          <h3 id={headingId} className="text-balance text-sm font-semibold">
            {section.title}
          </h3>
          <p className="mt-0.5 max-w-2xl text-pretty text-xs text-muted-foreground">
            {section.description}
          </p>
        </div>
        <span
          className="shrink-0 text-xs tabular-nums text-muted-foreground"
          aria-label={`${section.items.length} ${section.title}`}
        >
          {section.items.length}
        </span>
      </div>

      <ul role="list" className="list-none">
        {section.items.map((entitlement, index) => (
          <li
            key={entitlement.id}
            className={cn(
              index > 0 && 'border-t border-border/40',
              'min-w-0'
            )}
          >
            <EntitlementRow
              entitlement={entitlement}
              formatOptions={formatOptions}
              messages={messages}
              Icon={Icon}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoadingContent({
  messages
}: {
  messages: BillingEntitlementsListMessages;
}) {
  return (
    <CardContent className="flex flex-col gap-8" aria-live="polite">
      <span className="sr-only">{messages.loadingLabel}</span>
      <Skeleton className="h-4 w-full max-w-md" />
      {Array.from({ length: 3 }, (_, sectionIndex) => (
        <div key={sectionIndex} className="flex flex-col gap-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-28 max-w-full" />
            <Skeleton className="h-3 w-5" />
          </div>
          {Array.from({ length: 2 }, (_, rowIndex) => (
            <div
              className="flex items-center gap-3 py-3.5"
              key={rowIndex}
            >
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-full max-w-sm" />
              </div>
              <Skeleton className="h-5 w-16 shrink-0" />
            </div>
          ))}
        </div>
      ))}
    </CardContent>
  );
}

function buildSections(
  entitlements: BillingEntitlement[],
  messages: BillingEntitlementsListMessages
): EntitlementSection[] {
  return [
    {
      id: 'features',
      title: messages.featuresTitle,
      description: messages.featuresDescription,
      items: entitlements.filter((item) => item.kind === 'feature')
    },
    {
      id: 'caps',
      title: messages.capsTitle,
      description: messages.capsDescription,
      items: entitlements.filter((item) => item.kind === 'cap')
    },
    {
      id: 'quotas',
      title: messages.quotasTitle,
      description: messages.quotasDescription,
      items: entitlements.filter((item) => item.kind === 'quota')
    },
    {
      id: 'meters',
      title: messages.metersTitle,
      description: messages.metersDescription,
      items: entitlements.filter((item) => item.kind === 'meter')
    },
    {
      id: 'unknown',
      title: messages.unknownTitle,
      description: messages.unknownDescription,
      items: entitlements.filter((item) => item.kind === 'unknown')
    }
  ].filter((section) => section.items.length > 0);
}

export function BillingEntitlementsList({
  resource,
  account,
  formatOptions,
  messages: messageOverrides,
  onError,
  onMessage,
  embedded = false,
  className
}: BillingEntitlementsListProps) {
  const retryRef = React.useRef(false);
  const [retryPending, setRetryPending] = React.useState(false);
  const [retryError, setRetryError] = React.useState<BillingError | null>(null);
  const messages: BillingEntitlementsListMessages = {
    ...defaultBillingEntitlementsListMessages,
    ...messageOverrides
  };

  async function handleRetry(retry: () => void) {
    if (retryRef.current) return;

    retryRef.current = true;
    setRetryPending(true);
    setRetryError(null);

    try {
      await retry();
    } catch (error) {
      const billingError = normalizeBillingError(
        error,
        messages.retryErrorDescription
      );
      setRetryError(billingError);
      onError?.(billingError);
      onMessage?.({
        kind: 'error',
        key: 'billingEntitlements.retry.error',
        message: billingError.message
      });
    } finally {
      retryRef.current = false;
      setRetryPending(false);
    }
  }

  const description = interpolate(messages.accountDescription, {
    account: accountLabel(account, messages)
  });
  const readyResource = resource.status === 'ready' ? resource : null;
  const sections = readyResource
    ? buildSections(readyResource.data, messages)
    : [];
  const showEmpty =
    resource.status === 'empty' ||
    (readyResource !== null && readyResource.data.length === 0);

  return (
    <TooltipProvider delay={300}>
      <Card
        data-slot="billing-entitlements-list"
        className={cn(
          '@container/billing-entitlements-list w-full',
          className
        )}
        aria-busy={resource.status === 'loading'}
      >
        <CardHeader className="has-data-[slot=card-action]:grid-cols-1 @min-[640px]/billing-entitlements-list:has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]">
          <CardTitle className="min-w-0" role="heading" aria-level={2}>
            {messages.title}
          </CardTitle>
          <CardDescription className="flex min-w-0 max-w-2xl flex-col gap-1 text-pretty break-words">
            <span>{messages.description}</span>
            {!embedded ? <span>{description}</span> : null}
          </CardDescription>
          {readyResource?.quality ? (
            <CardAction
              className="col-start-1 row-span-1 row-start-3 justify-self-start @min-[640px]/billing-entitlements-list:col-start-2 @min-[640px]/billing-entitlements-list:row-span-2 @min-[640px]/billing-entitlements-list:row-start-1 @min-[640px]/billing-entitlements-list:justify-self-end"
              data-testid="entitlements-quality"
            >
              <BillingQualityBadge
                quality={readyResource.quality}
                labels={{
                  authoritative: messages.authoritativeLabel,
                  estimated: messages.estimatedLabel,
                  stale: messages.staleLabel
                }}
                ariaPrefix={messages.qualityLabel}
              />
            </CardAction>
          ) : null}
        </CardHeader>

        {resource.status === 'loading' ? (
          <LoadingContent messages={messages} />
        ) : null}

        {resource.status === 'error' ? (
          <CardContent className="flex flex-col gap-3">
            <Alert variant="destructive">
              <AlertTitle
                className="text-balance"
                role="heading"
                aria-level={3}
              >
                {messages.errorTitle}
              </AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                <p>{resource.error.message}</p>
                {resource.retry ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={retryPending}
                    aria-busy={retryPending}
                    onClick={() => {
                      if (resource.retry) {
                        void handleRetry(resource.retry);
                      }
                    }}
                  >
                    {retryPending
                      ? messages.retryingLabel
                      : messages.retryLabel}
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>

            {retryError ? (
              <Alert variant="destructive">
                <AlertTitle
                  className="text-balance"
                  role="heading"
                  aria-level={3}
                >
                  {messages.retryErrorTitle}
                </AlertTitle>
                <AlertDescription>{retryError.message}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        ) : null}

        {showEmpty ? (
          <CardContent>
            <Alert variant="info">
              <AlertTitle
                className="text-balance"
                role="heading"
                aria-level={3}
              >
                {messages.emptyTitle}
              </AlertTitle>
              <AlertDescription>{messages.emptyDescription}</AlertDescription>
            </Alert>
          </CardContent>
        ) : null}

        {readyResource && readyResource.data.length > 0 ? (
          <CardContent className="flex flex-col gap-8">
            <QualityNotice
              quality={readyResource.quality}
              asOf={readyResource.asOf}
              formatOptions={formatOptions}
              messages={messages}
            />

            {/* Single flat note line — no nested panel */}
            <p className="max-w-2xl text-pretty text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {messages.configuredDataTitle}.{' '}
              </span>
              {messages.configuredDataDescription}
            </p>

            <div className="flex flex-col gap-8">
              {sections.map((section) => (
                <EntitlementSectionView
                  key={section.id}
                  section={section}
                  formatOptions={formatOptions}
                  messages={messages}
                />
              ))}
            </div>
          </CardContent>
        ) : null}
      </Card>
    </TooltipProvider>
  );
}
