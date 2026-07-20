'use client';

import { useId, useRef, useState, type MouseEvent } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon
} from 'lucide-react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import { Field } from '@constructive-io/ui/field';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink
} from '@constructive-io/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import { Separator } from '@constructive-io/ui/separator';
import { Skeleton } from '@constructive-io/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';

import { cn } from '@/lib/utils';
import {
  formatBillingDate,
  formatBillingQuantity,
  humanizeBillingToken,
  normalizeBillingError,
  type BillingAccountRef,
  type BillingAllowance,
  type BillingError,
  type BillingFormatOptions,
  type BillingMessageEvent,
  type BillingPage,
  type BillingQuality,
  type BillingResource,
  type BillingUsagePeriod
} from '@/blocks/billing/billing-contracts/billing-contracts';
import {
  BillingQualityBadge,
  BillingQuantity,
  BillingToolbar,
  billingNumericClassName,
  billingTableContainerClassName
} from '@/blocks/billing/billing-ui/billing-ui';

import {
  defaultBillingUsageHistoryMessages,
  type BillingUsageHistoryMessageOverrides,
  type BillingUsageHistoryMessages
} from './messages';

export type BillingFilterOption = {
  value: string;
  label: string;
};

export type BillingUsageHistoryProps = {
  resource: BillingResource<BillingPage<BillingUsagePeriod>>;
  account: BillingAccountRef;
  formatOptions: BillingFormatOptions;
  meterOptions?: BillingFilterOption[];
  periodOptions?: BillingFilterOption[];
  meterSlug?: string;
  period?: string;
  onMeterChange?: (value: string) => void | Promise<void>;
  onPeriodChange?: (value: string) => void | Promise<void>;
  onPageChange?: (page: number) => void | Promise<void>;
  messages?: BillingUsageHistoryMessageOverrides;
  onError?: (error: BillingError) => void;
  onMessage?: (event: BillingMessageEvent) => void;
  className?: string;
};

type PageItem = number | 'start-ellipsis' | 'end-ellipsis';

function mergeMessages(
  overrides: BillingUsageHistoryMessageOverrides | undefined
): BillingUsageHistoryMessages {
  return {
    ...defaultBillingUsageHistoryMessages,
    ...overrides,
    quality: {
      ...defaultBillingUsageHistoryMessages.quality,
      ...overrides?.quality
    },
    errors: {
      ...defaultBillingUsageHistoryMessages.errors,
      ...overrides?.errors
    }
  };
}

function QualityBadge({
  quality,
  messages
}: {
  quality: BillingQuality | undefined;
  messages: BillingUsageHistoryMessages;
}) {
  if (!quality) {
    return <Badge variant="outline">{messages.quality.unknown}</Badge>;
  }

  return (
    <BillingQualityBadge quality={quality} labels={messages.quality} />
  );
}

function Quantity({
  value,
  unit,
  formatOptions
}: {
  value: string;
  unit?: string;
  formatOptions: BillingFormatOptions;
}) {
  return (
    <BillingQuantity
      value={value}
      unit={unit}
      formatOptions={formatOptions}
    />
  );
}

function AllowanceValue({
  allowance,
  unit,
  messages,
  formatOptions
}: {
  allowance: BillingAllowance | undefined;
  unit?: string;
  messages: BillingUsageHistoryMessages;
  formatOptions: BillingFormatOptions;
}) {
  if (!allowance) {
    return <Badge variant="outline">{messages.unknownAllowance}</Badge>;
  }
  if (allowance.kind === 'unlimited') {
    return <Badge variant="secondary">{messages.unlimited}</Badge>;
  }
  if (allowance.kind === 'uninitialized') {
    return <Badge variant="outline">{messages.uninitialized}</Badge>;
  }
  return (
    <Quantity
      value={allowance.limit}
      unit={unit}
      formatOptions={formatOptions}
    />
  );
}

function AuthoritativeValue({
  authoritative,
  value,
  unit,
  messages,
  formatOptions
}: {
  authoritative: boolean | undefined;
  value: string | undefined;
  unit?: string;
  messages: BillingUsageHistoryMessages;
  formatOptions: BillingFormatOptions;
}) {
  if (authoritative !== true) {
    return (
      <span className="text-pretty text-muted-foreground">
        {messages.notAuthoritative}
      </span>
    );
  }
  if (value === undefined) {
    return (
      <span className="text-pretty text-muted-foreground">
        {messages.notAvailable}
      </span>
    );
  }
  return <Quantity value={value} unit={unit} formatOptions={formatOptions} />;
}

function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  const items: PageItem[] = [1];

  if (start > 2) items.push('start-ellipsis');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push('end-ellipsis');
  items.push(total);

  return items;
}

function HistoryHeader({
  account,
  quality,
  asOf,
  messages,
  formatOptions
}: {
  account: BillingAccountRef;
  quality?: BillingQuality;
  asOf?: string;
  messages: BillingUsageHistoryMessages;
  formatOptions: BillingFormatOptions;
}) {
  return (
    <CardHeader>
      <CardTitle>
        <h2 className="text-balance">{messages.title}</h2>
      </CardTitle>
      <CardDescription>
        {account.label ? (
          <>
            <span className="font-medium text-foreground">{account.label}</span>
            {' — '}
          </>
        ) : null}
        {messages.description}
      </CardDescription>
      {quality || asOf ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {quality ? (
            <BillingQualityBadge
              quality={quality}
              labels={messages.quality}
              ariaPrefix={messages.qualityLabel}
            />
          ) : null}
          {asOf ? (
            <p className="text-pretty text-xs text-muted-foreground tabular-nums">
              {messages.asOfLabel} {formatBillingDate(asOf, formatOptions)}
            </p>
          ) : null}
        </div>
      ) : null}
    </CardHeader>
  );
}

function FilterControls({
  meterId,
  periodId,
  meterOptions,
  periodOptions,
  meterSlug,
  period,
  onMeterChange,
  onPeriodChange,
  disabled,
  messages
}: {
  meterId: string;
  periodId: string;
  meterOptions?: BillingFilterOption[];
  periodOptions?: BillingFilterOption[];
  meterSlug?: string;
  period?: string;
  onMeterChange?: (value: string) => void | Promise<void>;
  onPeriodChange?: (value: string) => void | Promise<void>;
  disabled: boolean;
  messages: BillingUsageHistoryMessages;
}) {
  const showMeter = Boolean(meterOptions?.length && onMeterChange);
  const showPeriod = Boolean(periodOptions?.length && onPeriodChange);

  if (!showMeter && !showPeriod) return null;

  return (
    <BillingToolbar className="@min-[640px]/billing-usage-history:flex-row">
      {showMeter && meterOptions && onMeterChange ? (
        <Field
          className="w-full @min-[640px]/billing-usage-history:w-52"
          htmlFor={meterId}
          label={messages.meterFilterLabel}
        >
          <Select
            disabled={disabled}
            value={meterSlug}
            onValueChange={onMeterChange}
          >
            <SelectTrigger id={meterId} size="lg">
              <SelectValue>
                {(value: string | null) =>
                  meterOptions.find((option) => option.value === value)?.label ??
                  value ??
                  messages.meterFilterPlaceholder
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {meterOptions.map((option) => (
                  <SelectItem
                    className="min-h-11"
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {showPeriod && periodOptions && onPeriodChange ? (
        <Field
          className="w-full @min-[640px]/billing-usage-history:w-52"
          htmlFor={periodId}
          label={messages.periodFilterLabel}
        >
          <Select
            disabled={disabled}
            value={period}
            onValueChange={onPeriodChange}
          >
            <SelectTrigger id={periodId} size="lg">
              <SelectValue>
                {(value: string | null) =>
                  periodOptions.find((option) => option.value === value)?.label ??
                  value ??
                  messages.periodFilterPlaceholder
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {periodOptions.map((option) => (
                  <SelectItem
                    className="min-h-11"
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      ) : null}
    </BillingToolbar>
  );
}

function InteractionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function InteractionPending({
  pending,
  message
}: {
  pending: boolean;
  message: string;
}) {
  if (!pending) return null;
  return (
    <p className="sr-only" role="status">
      {message}
    </p>
  );
}

function UsageHistoryLoading({
  messages,
  className
}: {
  messages: BillingUsageHistoryMessages;
  className?: string;
}) {
  return (
    <Card
      aria-busy="true"
      aria-label={messages.loadingAriaLabel}
      className={cn('@container/billing-usage-history w-full', className)}
      data-slot="billing-usage-history"
    >
      <div aria-hidden="true">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 @min-[640px]/billing-usage-history:flex-row">
            <div className="flex w-full flex-col gap-2 @min-[640px]/billing-usage-history:w-52">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex w-full flex-col gap-2 @min-[640px]/billing-usage-history:w-52">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton className="h-4 w-full" key={index} />
              ))}
            </div>
            {Array.from({ length: 4 }, (_, row) => (
              <div className="grid grid-cols-5 gap-4" key={row}>
                {Array.from({ length: 5 }, (_, column) => (
                  <Skeleton className="h-4 w-full" key={column} />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-52" />
        </CardFooter>
      </div>
    </Card>
  );
}

function UsageHistoryError({
  error,
  onRetry,
  retryPending,
  retryError,
  account,
  messages,
  formatOptions,
  className
}: {
  error: BillingError;
  onRetry?: () => void;
  retryPending: boolean;
  retryError: string | null;
  account: BillingAccountRef;
  messages: BillingUsageHistoryMessages;
  formatOptions: BillingFormatOptions;
  className?: string;
}) {
  return (
    <Card
      aria-busy={retryPending}
      className={cn('@container/billing-usage-history w-full', className)}
      data-account-kind={account.kind}
      data-slot="billing-usage-history"
    >
      <HistoryHeader
        account={account}
        messages={{ ...messages, title: messages.errorTitle }}
        formatOptions={formatOptions}
      />
      <CardContent className="flex flex-col gap-3">
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <InteractionPending
          pending={retryPending}
          message={messages.updatingStatus}
        />
        <InteractionError message={retryError} />
      </CardContent>
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

function UsageHistoryPagination({
  page,
  messages,
  formatOptions,
  pending,
  onPageChange
}: {
  page: BillingPage<BillingUsagePeriod>;
  messages: BillingUsageHistoryMessages;
  formatOptions: BillingFormatOptions;
  pending: boolean;
  onPageChange: (page: number) => void | Promise<void>;
}) {
  const shouldRender =
    page.hasPreviousPage ||
    page.hasNextPage ||
    (page.totalPages !== undefined && page.totalPages > 1);
  if (!shouldRender) return null;

  const totalPages = page.totalPages;
  const items = totalPages ? pageItems(page.page, totalPages) : [page.page];

  function goTo(target: number) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (target < 1 || target === page.page) return;
      if (totalPages !== undefined && target > totalPages) return;
      if (pending) return;
      void onPageChange(target);
    };
  }

  return (
    <Pagination
      aria-label={messages.paginationAriaLabel}
      aria-busy={pending}
      className="mx-0 w-auto"
    >
      <PaginationContent>
        <PaginationItem>
          <PaginationLink
            aria-label={messages.previousPage}
            href="#"
            isDisabled={pending || !page.hasPreviousPage}
            onClick={goTo(page.page - 1)}
            size="default"
          >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="hidden @min-[640px]/billing-usage-history:inline">
              {messages.previousPage}
            </span>
          </PaginationLink>
        </PaginationItem>

        {items.map((item) =>
          typeof item === 'string' ? (
            <PaginationItem key={item}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                aria-label={`${messages.pageLabel} ${formatBillingQuantity(String(item), formatOptions)}`}
                href="#"
                isActive={item === page.page}
                isDisabled={pending}
                onClick={goTo(item)}
              >
                {formatBillingQuantity(String(item), formatOptions)}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationLink
            aria-label={messages.nextPage}
            href="#"
            isDisabled={pending || !page.hasNextPage}
            onClick={goTo(page.page + 1)}
            size="default"
          >
            <span className="hidden @min-[640px]/billing-usage-history:inline">
              {messages.nextPage}
            </span>
            <ChevronRightIcon data-icon="inline-end" />
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export function BillingUsageHistory({
  resource,
  account,
  formatOptions,
  meterOptions,
  periodOptions,
  meterSlug,
  period,
  onMeterChange,
  onPeriodChange,
  onPageChange,
  messages: messageOverrides,
  onError,
  onMessage,
  className
}: BillingUsageHistoryProps) {
  const messages = mergeMessages(messageOverrides);
  const meterId = useId();
  const periodId = useId();
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [pendingInteraction, setPendingInteraction] = useState<string | null>(
    null
  );
  const pendingInteractionRef = useRef<string | null>(null);

  async function runInteraction(
    key: string,
    callback: () => void | Promise<void>
  ) {
    if (pendingInteractionRef.current) return;
    pendingInteractionRef.current = key;
    setPendingInteraction(key);
    setInteractionError(null);
    try {
      const result = callback();
      if (result) await result;
    } catch (error) {
      const billingError = normalizeBillingError(
        error,
        messages.errors.UNKNOWN_ERROR
      );
      setInteractionError(billingError.message);
      onError?.(billingError);
      onMessage?.({
        kind: 'error',
        key,
        message: billingError.message
      });
    } finally {
      if (pendingInteractionRef.current === key) {
        pendingInteractionRef.current = null;
        setPendingInteraction(null);
      }
    }
  }

  const handleMeterChange = onMeterChange
    ? (value: string) =>
        runInteraction(
          'billingUsageHistory.meterChange.error',
          () => onMeterChange(value)
        )
    : undefined;
  const handlePeriodChange = onPeriodChange
    ? (value: string) =>
        runInteraction(
          'billingUsageHistory.periodChange.error',
          () => onPeriodChange(value)
        )
    : undefined;
  const handlePageChange = onPageChange
    ? (value: number) =>
        runInteraction(
          'billingUsageHistory.pageChange.error',
          () => onPageChange(value)
        )
    : undefined;

  if (resource.status === 'loading') {
    return <UsageHistoryLoading messages={messages} className={className} />;
  }

  if (resource.status === 'error') {
    const retry = resource.retry;
    const handleRetry = retry
      ? () =>
          runInteraction(
            'billingUsageHistory.retry.error',
            retry
          )
      : undefined;
    return (
      <UsageHistoryError
        error={resource.error}
        onRetry={handleRetry}
        retryPending={pendingInteraction !== null}
        retryError={interactionError}
        account={account}
        messages={messages}
        formatOptions={formatOptions}
        className={className}
      />
    );
  }

  const filters = (
    <FilterControls
      meterId={meterId}
      periodId={periodId}
      meterOptions={meterOptions}
      periodOptions={periodOptions}
      meterSlug={meterSlug}
      period={period}
      onMeterChange={handleMeterChange}
      onPeriodChange={handlePeriodChange}
      disabled={pendingInteraction !== null}
      messages={messages}
    />
  );
  const hasFilters = Boolean(
    (meterOptions?.length && handleMeterChange) ||
      (periodOptions?.length && handlePeriodChange)
  );

  if (resource.status === 'empty') {
    return (
      <Card
        aria-busy={pendingInteraction !== null}
        className={cn('@container/billing-usage-history w-full', className)}
        data-account-kind={account.kind}
        data-slot="billing-usage-history"
      >
        <HistoryHeader
          account={account}
          messages={messages}
          formatOptions={formatOptions}
        />
        <CardContent className="flex flex-col gap-4">
          {filters}
          <InteractionPending
            pending={pendingInteraction !== null}
            message={messages.updatingStatus}
          />
          <InteractionError message={interactionError} />
          {hasFilters || interactionError ? <Separator /> : null}
          <div className="flex flex-col gap-1.5">
            <h3 className="text-balance font-medium">{messages.emptyTitle}</h3>
            <p className="max-w-xl text-pretty text-sm text-muted-foreground">
              {messages.emptyDescription}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const page = resource.data;
  const showCredits = page.items.some(
    (row) => row.creditsAuthoritative === true
  );
  const showOverage = page.items.some(
    (row) => row.overageAuthoritative === true
  );
  const visibleMeterSlugs = new Set(page.items.map((row) => row.meterSlug));
  const hasVisibleSelectedMeterContext = Boolean(
    handleMeterChange &&
      meterSlug &&
      meterOptions?.some((option) => option.value === meterSlug) &&
      visibleMeterSlugs.has(meterSlug)
  );
  const showMeter =
    visibleMeterSlugs.size > 1 || !hasVisibleSelectedMeterContext;

  return (
    <Card
      aria-busy={pendingInteraction !== null}
      className={cn('@container/billing-usage-history w-full', className)}
      data-account-kind={account.kind}
      data-slot="billing-usage-history"
    >
      <HistoryHeader
        account={account}
        quality={resource.quality}
        asOf={resource.asOf}
        messages={messages}
        formatOptions={formatOptions}
      />

      <CardContent className="flex flex-col gap-4">
        {filters}
        <InteractionPending
          pending={pendingInteraction !== null}
          message={messages.updatingStatus}
        />
        <InteractionError message={interactionError} />
        {hasFilters || interactionError ? <Separator /> : null}

        {page.items.length === 0 ? (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-balance font-medium">{messages.emptyTitle}</h3>
            <p className="max-w-xl text-pretty text-sm text-muted-foreground">
              {messages.emptyDescription}
            </p>
          </div>
        ) : (
          <Table
            containerClassName={billingTableContainerClassName}
            containerProps={{
              tabIndex: 0,
              'aria-label': messages.caption
            }}
          >
            <TableCaption className="sr-only">{messages.caption}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">{messages.periodColumn}</TableHead>
                {showMeter ? (
                  <TableHead scope="col">{messages.meterColumn}</TableHead>
                ) : null}
                <TableHead className="text-end" scope="col">
                  {messages.usedColumn}
                </TableHead>
                <TableHead className="text-end" scope="col">
                  {messages.allowanceColumn}
                </TableHead>
                {showCredits ? (
                  <TableHead className="text-end" scope="col">
                    {messages.creditsColumn}
                  </TableHead>
                ) : null}
                {showOverage ? (
                  <TableHead className="text-end" scope="col">
                    {messages.overageColumn}
                  </TableHead>
                ) : null}
                <TableHead scope="col">{messages.qualityColumn}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((row) => (
                <TableRow data-quality={row.quality ?? 'unknown'} key={row.id}>
                  <TableCell className="font-medium tabular-nums">
                    {formatBillingDate(row.startsAt, formatOptions)}
                    {' – '}
                    {formatBillingDate(row.endsAt, formatOptions)}
                  </TableCell>
                  {showMeter ? (
                    <TableCell className="whitespace-normal">
                      <div className="flex max-w-xs flex-col gap-0.5">
                        <span className="break-words font-medium">
                          {row.meterLabel ?? humanizeBillingToken(row.meterSlug)}
                        </span>
                        {row.meterLabel ? (
                          <span className="break-words text-xs text-muted-foreground">
                            {row.meterSlug}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell
                    className={cn(
                      'max-w-[12rem] whitespace-normal text-end',
                      billingNumericClassName
                    )}
                  >
                    <Quantity
                      value={row.used}
                      unit={row.unit}
                      formatOptions={formatOptions}
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      'max-w-[12rem] whitespace-normal text-end',
                      billingNumericClassName
                    )}
                  >
                    <AllowanceValue
                      allowance={row.allowance}
                      unit={row.unit}
                      messages={messages}
                      formatOptions={formatOptions}
                    />
                  </TableCell>
                  {showCredits ? (
                    <TableCell
                      className={cn(
                        'max-w-[12rem] whitespace-normal text-end',
                        billingNumericClassName
                      )}
                    >
                      <AuthoritativeValue
                        authoritative={row.creditsAuthoritative}
                        value={row.credits}
                        unit={row.unit}
                        messages={messages}
                        formatOptions={formatOptions}
                      />
                    </TableCell>
                  ) : null}
                  {showOverage ? (
                    <TableCell
                      className={cn(
                        'max-w-[12rem] whitespace-normal text-end',
                        billingNumericClassName
                      )}
                    >
                      <AuthoritativeValue
                        authoritative={row.overageAuthoritative}
                        value={row.overage}
                        unit={row.unit}
                        messages={messages}
                        formatOptions={formatOptions}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <QualityBadge quality={row.quality} messages={messages} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {page.totalItems ||
      page.totalPages !== undefined ||
      page.page > 1 ||
      handlePageChange ? (
        <CardFooter className="flex-col items-stretch justify-between gap-4 @min-[1024px]/billing-usage-history:flex-row @min-[1024px]/billing-usage-history:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
            {page.totalItems ? (
              <span>
                {messages.totalItemsLabel}:{' '}
                {formatBillingQuantity(page.totalItems, formatOptions)}
              </span>
            ) : null}
            <span>
              {messages.pageLabel}{' '}
              {formatBillingQuantity(String(page.page), formatOptions)}
              {page.totalPages !== undefined
                ? ` / ${formatBillingQuantity(String(page.totalPages), formatOptions)}`
                : ''}
            </span>
          </div>
          {handlePageChange ? (
            <UsageHistoryPagination
              page={page}
              messages={messages}
              formatOptions={formatOptions}
              pending={pendingInteraction !== null}
              onPageChange={handlePageChange}
            />
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
