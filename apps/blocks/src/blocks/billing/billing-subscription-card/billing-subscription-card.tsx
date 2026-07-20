'use client';

import { useRef, useState, type ReactNode } from 'react';
import { CircleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import { Skeleton } from '@constructive-io/ui/skeleton';

import { cn } from '@/lib/utils';
import {
  billingPaymentStatusPresentations,
  billingProviderStatusPresentations,
  billingSubscriptionStatusPresentations,
  formatBillingDate,
  formatBillingQuantity,
  humanizeBillingToken,
  normalizeBillingError,
  resolveBillingStatus,
  type BillingAccountRef,
  type BillingError,
  type BillingFormatOptions,
  type BillingMessageEvent,
  type BillingPrice,
  type BillingResource,
  type BillingStatusPresentation,
  type BillingSubscription
} from '../billing-contracts/billing-contracts';
import {
  BillingMetaItem,
  BillingMoneyText,
  BillingQualityBadge
} from '../billing-ui/billing-ui';

import {
  defaultBillingSubscriptionCardMessages,
  type BillingSubscriptionCardMessageOverrides,
  type BillingSubscriptionCardMessages
} from './messages';

export type BillingSubscriptionActionInput = {
  subscriptionId: string;
  planId: string;
  account: BillingAccountRef;
};

export type BillingSubscriptionCardProps = {
  resource: BillingResource<BillingSubscription>;
  account: BillingAccountRef;
  formatOptions: BillingFormatOptions;
  onManageSubscription?: (
    input: BillingSubscriptionActionInput
  ) => void | Promise<void>;
  onChangePlan?: (
    input: BillingSubscriptionActionInput
  ) => void | Promise<void>;
  onResolvePayment?: (
    input: BillingSubscriptionActionInput
  ) => void | Promise<void>;
  messages?: BillingSubscriptionCardMessageOverrides;
  onError?: (error: BillingError) => void;
  onMessage?: (event: BillingMessageEvent) => void;
  /** Hide account label when nested under BillingSettingsPage. */
  embedded?: boolean;
  className?: string;
};

type SubscriptionActionKind = 'manage' | 'change' | 'resolve';

function mergeMessages(
  overrides: BillingSubscriptionCardMessageOverrides | undefined
): BillingSubscriptionCardMessages {
  return {
    ...defaultBillingSubscriptionCardMessages,
    ...overrides,
    quality: {
      ...defaultBillingSubscriptionCardMessages.quality,
      ...overrides?.quality
    },
    errors: {
      ...defaultBillingSubscriptionCardMessages.errors,
      ...overrides?.errors
    }
  };
}

function StatusBadge({
  presentation,
  ariaLabel
}: {
  presentation: BillingStatusPresentation;
  ariaLabel: string;
}) {
  return (
    <Badge
      aria-label={`${ariaLabel}: ${presentation.label}`}
      variant={presentation.tone}
    >
      {presentation.label}
    </Badge>
  );
}

function SubscriptionPrice({
  price,
  messages,
  formatOptions
}: {
  price: BillingPrice;
  messages: BillingSubscriptionCardMessages;
  formatOptions: BillingFormatOptions;
}) {
  if (price.kind === 'contact_sales') {
    return (
      <span className="text-pretty text-base font-medium text-muted-foreground">
        {messages.contactSalesPrice}
      </span>
    );
  }

  const count =
    price.intervalCount && price.intervalCount.trim() !== '1'
      ? formatBillingQuantity(price.intervalCount, formatOptions)
      : undefined;

  return (
    <span className="flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <BillingMoneyText
        money={price.money}
        formatOptions={formatOptions}
        className="text-lg font-semibold"
      />
      <span className="text-sm text-muted-foreground">
        {messages.perLabel} {count ? `${count} ` : ''}
        {humanizeBillingToken(price.interval)}
      </span>
    </span>
  );
}

function SubscriptionLoading({
  messages,
  className
}: {
  messages: BillingSubscriptionCardMessages;
  className?: string;
}) {
  return (
    <Card
      aria-busy="true"
      aria-label={messages.loadingAriaLabel}
      className={cn('@container/billing-subscription-card w-full', className)}
      data-slot="billing-subscription-card"
    >
      <div aria-hidden="true">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid gap-4 border-t border-border/40 pt-5 @min-[640px]/billing-subscription-card:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="flex flex-col gap-1.5" key={index}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </CardFooter>
      </div>
    </Card>
  );
}

function SubscriptionStateCard({
  title,
  description,
  onRetry,
  retryPending = false,
  retryError = null,
  messages,
  className,
  destructive = false
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  retryPending?: boolean;
  retryError?: string | null;
  messages: BillingSubscriptionCardMessages;
  className?: string;
  destructive?: boolean;
}) {
  return (
    <Card
      aria-busy={retryPending}
      className={cn('@container/billing-subscription-card w-full', className)}
      data-slot="billing-subscription-card"
    >
      <CardHeader>
        <CardTitle>
          <h2 className="text-balance">{title}</h2>
        </CardTitle>
        {!destructive ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {destructive ? (
        <CardContent className="flex flex-col gap-3">
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>{description}</AlertDescription>
          </Alert>
          {retryPending ? (
            <p className="sr-only" role="status">
              {messages.retryingButton}
            </p>
          ) : null}
          {retryError ? (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertDescription>{retryError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      ) : null}
      {onRetry ? (
        <CardFooter>
          <Button
            aria-busy={retryPending}
            disabled={retryPending}
            onClick={onRetry}
          >
            {retryPending ? messages.retryingButton : messages.retryButton}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function BillingSubscriptionCard({
  resource,
  account,
  formatOptions,
  onManageSubscription,
  onChangePlan,
  onResolvePayment,
  messages: messageOverrides,
  onError,
  onMessage,
  embedded = false,
  className
}: BillingSubscriptionCardProps) {
  const messages = mergeMessages(messageOverrides);
  const [pendingAction, setPendingAction] =
    useState<SubscriptionActionKind | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const actionLock = useRef(false);
  const isBusy = pendingAction !== null || retryPending;

  async function runRetry(callback: () => void | Promise<void>) {
    if (actionLock.current) return;

    actionLock.current = true;
    setRetryPending(true);
    setRetryError(null);
    try {
      const result = callback();
      if (result) await result;
    } catch (error) {
      const billingError = normalizeBillingError(
        error,
        messages.errors.UNKNOWN_ERROR
      );
      setRetryError(billingError.message);
      onError?.(billingError);
      onMessage?.({
        kind: 'error',
        key: 'billingSubscriptionCard.retry.error',
        message: billingError.message
      });
    } finally {
      actionLock.current = false;
      setRetryPending(false);
    }
  }

  if (resource.status === 'loading') {
    return <SubscriptionLoading messages={messages} className={className} />;
  }

  if (resource.status === 'empty') {
    return (
      <SubscriptionStateCard
        title={messages.emptyTitle}
        description={messages.emptyDescription}
        messages={messages}
        className={className}
      />
    );
  }

  if (resource.status === 'error') {
    const retry = resource.retry;
    return (
      <SubscriptionStateCard
        title={messages.errorTitle}
        description={resource.error.message}
        onRetry={retry ? () => void runRetry(retry) : undefined}
        retryPending={retryPending}
        retryError={retryError}
        messages={messages}
        className={className}
        destructive
      />
    );
  }

  const subscription = resource.data;
  const status = resolveBillingStatus(
    subscription.status,
    billingSubscriptionStatusPresentations
  );
  const paymentStatus = subscription.paymentStatus
    ? resolveBillingStatus(
        subscription.paymentStatus,
        billingPaymentStatusPresentations
      )
    : undefined;
  const providerStatus = subscription.provider?.status
    ? resolveBillingStatus(
        subscription.provider.status,
        billingProviderStatusPresentations
      )
    : undefined;
  const actionInput: BillingSubscriptionActionInput = {
    subscriptionId: subscription.id,
    planId: subscription.planId,
    account
  };
  const dateRows = [
    subscription.startedAt
      ? { label: messages.startedLabel, value: subscription.startedAt }
      : null,
    subscription.trialEndsAt
      ? { label: messages.trialEndsLabel, value: subscription.trialEndsAt }
      : null,
    subscription.renewsAt
      ? { label: messages.renewsLabel, value: subscription.renewsAt }
      : null,
    subscription.endsAt
      ? { label: messages.endsLabel, value: subscription.endsAt }
      : null,
    subscription.canceledAt
      ? { label: messages.canceledLabel, value: subscription.canceledAt }
      : null
  ].filter((row): row is { label: string; value: string } => row !== null);
  const hasActions = Boolean(
    onManageSubscription || onChangePlan || onResolvePayment
  );

  async function runAction(
    kind: SubscriptionActionKind,
    callback: () => void | Promise<void>
  ) {
    if (actionLock.current) return;

    actionLock.current = true;
    setPendingAction(kind);
    setActionError(null);
    try {
      await callback();
    } catch (error) {
      const billingError = normalizeBillingError(
        error,
        messages.errors.UNKNOWN_ERROR
      );
      setActionError(billingError.message);
      onError?.(billingError);
      onMessage?.({
        kind: 'error',
        key: `billingSubscriptionCard.${kind}.error`,
        message: billingError.message
      });
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  }

  const metaRows: Array<{ label: string; content: ReactNode }> = [];
  if (paymentStatus) {
    metaRows.push({
      label: messages.paymentStatusLabel,
      content: (
        <StatusBadge
          presentation={paymentStatus}
          ariaLabel={messages.paymentStatusLabel}
        />
      )
    });
  }
  if (subscription.provider) {
    metaRows.push({
      label: messages.providerLabel,
      content: subscription.provider.label
    });
  }
  if (providerStatus) {
    metaRows.push({
      label: messages.providerStatusLabel,
      content: (
        <StatusBadge
          presentation={providerStatus}
          ariaLabel={messages.providerStatusLabel}
        />
      )
    });
  }
  for (const row of dateRows) {
    metaRows.push({
      label: row.label,
      content: (
        <span className="tabular-nums">
          {formatBillingDate(row.value, formatOptions)}
        </span>
      )
    });
  }
  if (resource.asOf) {
    metaRows.push({
      label: messages.asOfLabel,
      content: (
        <span className="tabular-nums">
          {formatBillingDate(resource.asOf, formatOptions)}
        </span>
      )
    });
  }

  return (
    <Card
      aria-busy={isBusy}
      className={cn('@container/billing-subscription-card w-full', className)}
      data-account-kind={account.kind}
      data-slot="billing-subscription-card"
    >
      <CardHeader className="has-data-[slot=card-action]:grid-cols-1 @min-[640px]/billing-subscription-card:has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]">
        <CardTitle className="min-w-0">
          <h2 className="text-balance">{messages.title}</h2>
        </CardTitle>
        <CardDescription className="min-w-0 break-words text-pretty">
          {embedded || !account.label ? (
            messages.description
          ) : (
            <>
              <span className="font-medium text-foreground">
                {account.label}
              </span>
              <span className="text-muted-foreground">
                {' '}
                {messages.description}
              </span>
            </>
          )}
        </CardDescription>
        <CardAction className="col-start-1 row-span-1 row-start-3 w-full justify-self-start @min-[640px]/billing-subscription-card:col-start-2 @min-[640px]/billing-subscription-card:row-span-2 @min-[640px]/billing-subscription-card:row-start-1 @min-[640px]/billing-subscription-card:w-auto @min-[640px]/billing-subscription-card:justify-self-end">
          <div className="flex max-w-full flex-wrap justify-start gap-1.5 @min-[640px]/billing-subscription-card:justify-end">
            <StatusBadge
              presentation={status}
              ariaLabel={messages.subscriptionStatusLabel}
            />
            {resource.quality ? (
              <BillingQualityBadge
                quality={resource.quality}
                labels={messages.quality}
                ariaPrefix={messages.qualityLabel}
              />
            ) : null}
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex min-w-0 max-w-full flex-col gap-1">
          <p className="text-xs text-muted-foreground">{messages.planLabel}</p>
          <p className="min-w-0 text-balance text-2xl font-semibold [overflow-wrap:anywhere]">
            {subscription.planName}
          </p>
          {subscription.price ? (
            <div className="min-w-0 max-w-full pt-0.5">
              <span className="sr-only">{messages.priceLabel}: </span>
              <SubscriptionPrice
                price={subscription.price}
                messages={messages}
                formatOptions={formatOptions}
              />
            </div>
          ) : null}
        </div>

        {metaRows.length > 0 ? (
          <dl className="grid min-w-0 gap-x-6 gap-y-4 border-t border-border/40 pt-5 @min-[640px]/billing-subscription-card:grid-cols-2">
            {metaRows.map((row) => (
              <BillingMetaItem key={row.label} label={row.label}>
                {row.content}
              </BillingMetaItem>
            ))}
          </dl>
        ) : null}
      </CardContent>

      {hasActions ? (
        <CardFooter className="flex-col items-stretch gap-3 border-t border-border/40">
          {actionError ? (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2 @min-[640px]/billing-subscription-card:flex-row @min-[640px]/billing-subscription-card:flex-wrap">
            {onResolvePayment ? (
              <Button
                disabled={isBusy}
                onClick={() =>
                  void runAction('resolve', () =>
                    onResolvePayment(actionInput)
                  )
                }
              >
                {pendingAction === 'resolve'
                  ? messages.resolvingPaymentButton
                  : messages.resolvePaymentButton}
              </Button>
            ) : null}
            {onManageSubscription ? (
              <Button
                disabled={isBusy}
                onClick={() =>
                  void runAction('manage', () =>
                    onManageSubscription(actionInput)
                  )
                }
                variant="outline"
              >
                {pendingAction === 'manage'
                  ? messages.managingButton
                  : messages.manageButton}
              </Button>
            ) : null}
            {onChangePlan ? (
              <Button
                disabled={isBusy}
                onClick={() =>
                  void runAction('change', () => onChangePlan(actionInput))
                }
                variant="outline"
              >
                {pendingAction === 'change'
                  ? messages.changingPlanButton
                  : messages.changePlanButton}
              </Button>
            ) : null}
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
