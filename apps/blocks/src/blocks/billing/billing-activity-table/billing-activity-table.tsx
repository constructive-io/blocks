'use client';

import { useId, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
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
  PaginationItem
} from '@constructive-io/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import { Separator } from '@constructive-io/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@constructive-io/ui/sheet';
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

import {
  formatBillingDate,
  formatBillingQuantity,
  normalizeBillingError,
  resolveBillingLedgerPresentation,
  type BillingAccountRef,
  type BillingActivityEntry,
  type BillingError,
  type BillingFormatOptions,
  type BillingMessageEvent,
  type BillingPage,
  type BillingQuality,
  type BillingResource
} from '@/blocks/billing/billing-contracts/billing-contracts';
import {
  BillingQualityBadge,
  BillingQuantity,
  BillingToolbar,
  billingNumericClassName,
  billingTableContainerClassName
} from '@/blocks/billing/billing-ui/billing-ui';
import { cn } from '@/lib/utils';

import {
  defaultBillingActivityTableMessages,
  type BillingActivityTableMessageOverrides,
  type BillingActivityTableMessages
} from './messages';

export type BillingFilterOption = {
  value: string;
  label: string;
};

export type BillingActivityTableProps = {
  resource: BillingResource<BillingPage<BillingActivityEntry>>;
  account: BillingAccountRef;
  formatOptions: BillingFormatOptions;
  meterOptions?: BillingFilterOption[];
  entryTypeOptions?: BillingFilterOption[];
  meterSlug?: string;
  entryType?: string;
  onMeterChange?: (value: string) => void | Promise<void>;
  onEntryTypeChange?: (value: string) => void | Promise<void>;
  onPageChange?: (page: number) => void | Promise<void>;
  messages?: BillingActivityTableMessageOverrides;
  onError?: (error: BillingError) => void;
  onMessage?: (event: BillingMessageEvent) => void;
  className?: string;
};

type InteractionError = {
  scope: 'filters' | 'pagination' | 'retry';
  error: BillingError;
};

function mergeMessages(
  overrides: BillingActivityTableMessageOverrides | undefined
): BillingActivityTableMessages {
  return {
    ...defaultBillingActivityTableMessages,
    ...overrides,
    accountKind: {
      ...defaultBillingActivityTableMessages.accountKind,
      ...overrides?.accountKind
    },
    quality: {
      ...defaultBillingActivityTableMessages.quality,
      ...overrides?.quality
    },
    errors: {
      ...defaultBillingActivityTableMessages.errors,
      ...overrides?.errors
    }
  };
}

function hasMetadata(entry: BillingActivityEntry) {
  return Boolean(entry.metadata && Object.keys(entry.metadata).length > 0);
}

function metadataJson(
  metadata: Record<string, unknown>,
  fallback: string
): string {
  try {
    return JSON.stringify(metadata, null, 2) ?? fallback;
  } catch {
    return fallback;
  }
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

function ActivityHeader({
  titleId,
  account,
  messages,
  quality,
  asOf,
  formatOptions
}: {
  titleId: string;
  account: BillingAccountRef;
  messages: BillingActivityTableMessages;
  quality?: BillingQuality;
  asOf?: string;
  formatOptions: BillingFormatOptions;
}) {
  return (
    <CardHeader className="gap-4">
      <div className="flex min-w-0 flex-col gap-3 @min-[640px]/billing-activity-table:flex-row @min-[640px]/billing-activity-table:items-start @min-[640px]/billing-activity-table:justify-between">
        <div className="grid min-w-0 gap-1.5">
          <CardTitle id={titleId} role="heading" aria-level={2}>
            {messages.title}
          </CardTitle>
          <CardDescription className="max-w-2xl">{messages.description}</CardDescription>
        </div>
        {quality || asOf ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {quality ? (
              <BillingQualityBadge
                quality={quality}
                labels={messages.quality}
                ariaPrefix={messages.qualityLabel}
              />
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
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        <span className="min-w-0 break-words font-medium">
          {account.label ?? account.entityId}
        </span>
        <Badge variant="outline">{messages.accountKind[account.kind]}</Badge>
      </div>
    </CardHeader>
  );
}

function LoadingState({
  account,
  formatOptions,
  messages,
  titleId,
  className
}: {
  account: BillingAccountRef;
  formatOptions: BillingFormatOptions;
  messages: BillingActivityTableMessages;
  titleId: string;
  className?: string;
}) {
  return (
    <Card
      className={cn('@container/billing-activity-table w-full', className)}
      aria-labelledby={titleId}
      aria-busy="true"
      data-slot="billing-activity-table"
    >
      <ActivityHeader
        titleId={titleId}
        account={account}
        messages={messages}
        formatOptions={formatOptions}
      />
      <div aria-hidden="true">
        <CardContent className="grid gap-4">
          <div className="grid gap-3 @min-[640px]/billing-activity-table:grid-cols-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Separator />
          <Skeleton className="h-11 w-full" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="h-16 w-full" key={index} />
          ))}
        </CardContent>
        <CardFooter className="justify-between gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-56" />
        </CardFooter>
      </div>
      <p className="sr-only" role="status">
        {messages.loadingAriaLabel}
      </p>
    </Card>
  );
}

function InteractionErrorAlert({
  interactionError,
  messages
}: {
  interactionError: InteractionError | null;
  messages: BillingActivityTableMessages;
}) {
  if (!interactionError) return null;

  return (
    <Alert variant="destructive">
      <AlertTitle className="text-balance" role="heading" aria-level={3}>
        {messages.interactionErrorTitle}
      </AlertTitle>
      <AlertDescription>{interactionError.error.message}</AlertDescription>
    </Alert>
  );
}

function FilterControls({
  meterId,
  entryTypeId,
  meterOptions,
  entryTypeOptions,
  meterSlug,
  entryType,
  onMeterChange,
  onEntryTypeChange,
  pendingControl,
  messages
}: {
  meterId: string;
  entryTypeId: string;
  meterOptions?: BillingFilterOption[];
  entryTypeOptions?: BillingFilterOption[];
  meterSlug?: string;
  entryType?: string;
  onMeterChange?: (value: string) => void;
  onEntryTypeChange?: (value: string) => void;
  pendingControl: string | null;
  messages: BillingActivityTableMessages;
}) {
  const showMeter = Boolean(meterOptions?.length && onMeterChange);
  const showEntryType = Boolean(entryTypeOptions?.length && onEntryTypeChange);

  if (!showMeter && !showEntryType) return null;

  return (
    <BillingToolbar className="grid gap-3 @min-[640px]/billing-activity-table:grid-cols-2 @min-[640px]:flex-row">
      {showMeter && meterOptions && onMeterChange ? (
        <Field htmlFor={meterId} label={messages.meterFilterLabel}>
          <Select
            value={meterSlug}
            disabled={pendingControl !== null}
            onValueChange={onMeterChange}
          >
            <SelectTrigger
              id={meterId}
              size="lg"
              className="min-h-11"
              aria-busy={pendingControl === 'billingActivity.meterFilter'}
            >
              <SelectValue>
                {(value: string | null) =>
                  meterOptions.find((option) => option.value === value)?.label ??
                  messages.meterFilterPlaceholder
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectGroupLabel>{messages.meterFilterGroupLabel}</SelectGroupLabel>
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

      {showEntryType && entryTypeOptions && onEntryTypeChange ? (
        <Field htmlFor={entryTypeId} label={messages.entryTypeFilterLabel}>
          <Select
            value={entryType}
            disabled={pendingControl !== null}
            onValueChange={onEntryTypeChange}
          >
            <SelectTrigger
              id={entryTypeId}
              size="lg"
              className="min-h-11"
              aria-busy={pendingControl === 'billingActivity.entryTypeFilter'}
            >
              <SelectValue>
                {(value: string | null) =>
                  entryTypeOptions.find((option) => option.value === value)?.label ??
                  messages.entryTypeFilterPlaceholder
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectGroupLabel>
                  {messages.entryTypeFilterGroupLabel}
                </SelectGroupLabel>
                {entryTypeOptions.map((option) => (
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

function PageControls({
  page,
  formatOptions,
  messages,
  pendingControl,
  onPageChange
}: {
  page: BillingPage<BillingActivityEntry>;
  formatOptions: BillingFormatOptions;
  messages: BillingActivityTableMessages;
  pendingControl: string | null;
  onPageChange: (page: number) => void;
}) {
  return (
    <Pagination aria-label={messages.paginationLabel} className="mx-0 w-auto">
      <PaginationContent className="gap-2">
        <PaginationItem>
          <Button
            size="lg"
            variant="outline"
            disabled={!page.hasPreviousPage || pendingControl !== null}
            aria-busy={pendingControl === 'billingActivity.pagination'}
            onClick={() => onPageChange(page.page - 1)}
          >
            {messages.previousPage}
          </Button>
        </PaginationItem>
        <PaginationItem>
          <span
            className="inline-flex min-h-11 items-center px-2 text-sm tabular-nums"
            aria-current="page"
          >
            {messages.pageLabel}{' '}
            {formatBillingQuantity(String(page.page), formatOptions)}
            {page.totalPages !== undefined ? (
              <>
                {' '}
                {messages.ofLabel}{' '}
                {formatBillingQuantity(String(page.totalPages), formatOptions)}
              </>
            ) : null}
          </span>
        </PaginationItem>
        <PaginationItem>
          <Button
            size="lg"
            variant="outline"
            disabled={!page.hasNextPage || pendingControl !== null}
            aria-busy={pendingControl === 'billingActivity.pagination'}
            onClick={() => onPageChange(page.page + 1)}
          >
            {messages.nextPage}
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function MetadataSheet({
  entry,
  open,
  onOpenChange,
  formatOptions,
  messages
}: {
  entry: BillingActivityEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatOptions: BillingFormatOptions;
  messages: BillingActivityTableMessages;
}) {
  const metadataTitleId = useId();
  const presentation = entry
    ? resolveBillingLedgerPresentation(entry.ledgerClass, entry.entryType)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showClose={false}
        className="@container/billing-activity-sheet w-full overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader className="gap-2 text-start">
          <SheetTitle className="text-balance">{messages.detailsTitle}</SheetTitle>
          <SheetDescription className="max-w-xl text-pretty">
            {messages.detailsDescription}
          </SheetDescription>
        </SheetHeader>

        {entry && presentation ? (
          <div className="grid gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={presentation.tone}>{presentation.label}</Badge>
              <span className="break-words font-mono text-xs text-muted-foreground">
                {entry.id}
              </span>
            </div>

            {entry.description ? (
              <p className="max-w-xl text-pretty text-sm">{entry.description}</p>
            ) : null}

            <dl className="grid gap-4 @min-[448px]/billing-activity-sheet:grid-cols-2">
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">{messages.occurredAtLabel}</dt>
                <dd className="text-sm font-medium tabular-nums">
                  <time dateTime={entry.occurredAt}>
                    {formatBillingDate(entry.occurredAt, formatOptions)}
                  </time>
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">{messages.meterSlugLabel}</dt>
                <dd className="break-words font-mono text-sm">{entry.meterSlug}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">{messages.ledgerClassLabel}</dt>
                <dd className="break-words font-mono text-sm">{entry.ledgerClass}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">{messages.entryTypeLabel}</dt>
                <dd className="break-words font-mono text-sm">{entry.entryType}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">{messages.deltaLabel}</dt>
                <dd className="text-sm font-medium">
                  <Quantity
                    value={entry.delta}
                    unit={entry.unit}
                    formatOptions={formatOptions}
                  />
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">{messages.balanceAfterLabel}</dt>
                <dd className="text-sm font-medium">
                  {entry.balanceAfter === undefined ? (
                    messages.noBalance
                  ) : (
                    <Quantity
                      value={entry.balanceAfter}
                      unit={entry.unit}
                      formatOptions={formatOptions}
                    />
                  )}
                </dd>
              </div>
            </dl>

            <Separator />

            <section className="grid gap-3" aria-labelledby={metadataTitleId}>
              <div className="grid gap-1">
                <h3
                  className="text-balance font-semibold"
                  id={metadataTitleId}
                >
                  {messages.metadataTitle}
                </h3>
                <p className="max-w-xl text-pretty text-sm text-muted-foreground">
                  {messages.metadataDescription}
                </p>
              </div>
              <pre className="max-w-full overflow-x-auto rounded-lg bg-muted/40 p-4 text-xs leading-relaxed">
                <code className="font-mono">
                  {metadataJson(entry.metadata ?? {}, messages.metadataUnavailable)}
                </code>
              </pre>
            </section>
          </div>
        ) : null}

        <SheetFooter className="gap-2">
          <SheetClose asChild>
            <Button size="lg" variant="outline">
              {messages.closeButton}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function BillingActivityTable({
  resource,
  account,
  formatOptions,
  meterOptions,
  entryTypeOptions,
  meterSlug,
  entryType,
  onMeterChange,
  onEntryTypeChange,
  onPageChange,
  messages: messageOverrides,
  onError,
  onMessage,
  className
}: BillingActivityTableProps) {
  const titleId = useId();
  const meterId = useId();
  const entryTypeId = useId();
  const messages = mergeMessages(messageOverrides);
  const retryRef = useRef(false);
  const pendingControlRef = useRef<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [pendingControl, setPendingControl] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<InteractionError | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<BillingActivityEntry | null>(null);

  function reportInteractionError(
    scope: InteractionError['scope'],
    key: string,
    error: unknown
  ) {
    const billingError = normalizeBillingError(
      error,
      messages.errors.UNKNOWN_ERROR
    );
    setInteractionError({ scope, error: billingError });
    onError?.(billingError);
    onMessage?.({
      kind: 'error',
      key,
      message: billingError.message
    });
  }

  async function runControlledChange<T>(
    scope: 'filters' | 'pagination',
    key: string,
    callback: (value: T) => void | Promise<void>,
    value: T
  ) {
    if (pendingControlRef.current) return;

    pendingControlRef.current = key;
    setPendingControl(key);
    setInteractionError(null);
    try {
      await callback(value);
    } catch (error) {
      reportInteractionError(scope, `${key}.error`, error);
    } finally {
      pendingControlRef.current = null;
      setPendingControl(null);
    }
  }

  async function handleRetry(retry: () => void) {
    if (retryRef.current) return;

    retryRef.current = true;
    setRetryPending(true);
    setInteractionError(null);
    try {
      await retry();
    } catch (error) {
      reportInteractionError('retry', 'billingActivity.retry.error', error);
    } finally {
      retryRef.current = false;
      setRetryPending(false);
    }
  }

  if (resource.status === 'loading') {
    return (
      <LoadingState
        account={account}
        formatOptions={formatOptions}
        messages={messages}
        titleId={titleId}
        className={className}
      />
    );
  }

  if (resource.status === 'error') {
    return (
      <Card
        className={cn('@container/billing-activity-table w-full', className)}
        aria-labelledby={titleId}
        data-slot="billing-activity-table"
      >
        <ActivityHeader
          titleId={titleId}
          account={account}
          messages={messages}
          formatOptions={formatOptions}
        />
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle className="text-balance" role="heading" aria-level={3}>
              {messages.errorTitle}
            </AlertTitle>
            <AlertDescription>{resource.error.message}</AlertDescription>
          </Alert>
        </CardContent>
        {resource.retry ? (
          <CardFooter className="flex-col items-start gap-3">
            {interactionError?.scope === 'retry' ? (
              <InteractionErrorAlert interactionError={interactionError} messages={messages} />
            ) : null}
            <Button
              size="lg"
              variant="outline"
              disabled={retryPending}
              aria-busy={retryPending}
              onClick={() => void handleRetry(resource.retry!)}
            >
              {retryPending ? messages.retryingButton : messages.retryButton}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    );
  }

  const isReady = resource.status === 'ready';
  const page = isReady ? resource.data : null;
  const hasMeterFilter = Boolean(meterOptions?.length && onMeterChange);
  const hasEntryTypeFilter = Boolean(entryTypeOptions?.length && onEntryTypeChange);
  const hasFilters = hasMeterFilter || hasEntryTypeFilter;

  const filters = (
    <FilterControls
      meterId={meterId}
      entryTypeId={entryTypeId}
      meterOptions={meterOptions}
      entryTypeOptions={entryTypeOptions}
      meterSlug={meterSlug}
      entryType={entryType}
      pendingControl={pendingControl}
      onMeterChange={
        onMeterChange
          ? (value) =>
              void runControlledChange(
                'filters',
                'billingActivity.meterFilter',
                onMeterChange,
                value
              )
          : undefined
      }
      onEntryTypeChange={
        onEntryTypeChange
          ? (value) =>
              void runControlledChange(
                'filters',
                'billingActivity.entryTypeFilter',
                onEntryTypeChange,
                value
              )
          : undefined
      }
      messages={messages}
    />
  );

  if (!page || page.items.length === 0) {
    return (
      <Card
        className={cn('@container/billing-activity-table w-full', className)}
        aria-labelledby={titleId}
        data-slot="billing-activity-table"
      >
        <ActivityHeader
          titleId={titleId}
          account={account}
          messages={messages}
          quality={isReady ? resource.quality : undefined}
          asOf={isReady ? resource.asOf : undefined}
          formatOptions={formatOptions}
        />
        <CardContent className="grid gap-4">
          {hasFilters ? filters : null}
          {interactionError?.scope === 'filters' ? (
            <InteractionErrorAlert interactionError={interactionError} messages={messages} />
          ) : null}
          {hasFilters ? (
            <div className="border-t border-border/40" aria-hidden="true" />
          ) : null}
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

  const showBalance = page.items.some((entry) => entry.balanceAfter !== undefined);

  return (
    <>
      <Card
        className={cn('@container/billing-activity-table w-full', className)}
        aria-labelledby={titleId}
        data-slot="billing-activity-table"
      >
        <ActivityHeader
          titleId={titleId}
          account={account}
          messages={messages}
          quality={resource.status === 'ready' ? resource.quality : undefined}
          asOf={resource.status === 'ready' ? resource.asOf : undefined}
          formatOptions={formatOptions}
        />

        <CardContent className="grid gap-4">
          {hasFilters ? filters : null}
          {interactionError?.scope === 'filters' ? (
            <InteractionErrorAlert interactionError={interactionError} messages={messages} />
          ) : null}
          {hasFilters ? (
            <div className="border-t border-border/40" aria-hidden="true" />
          ) : null}

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
                <TableHead scope="col">{messages.dateColumn}</TableHead>
                <TableHead scope="col">{messages.activityColumn}</TableHead>
                <TableHead scope="col">{messages.meterColumn}</TableHead>
                <TableHead className="text-end" scope="col">
                  {messages.deltaColumn}
                </TableHead>
                {showBalance ? (
                  <TableHead className="text-end" scope="col">
                    {messages.balanceColumn}
                  </TableHead>
                ) : null}
                <TableHead scope="col">{messages.detailsColumn}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((entry) => {
                const presentation = resolveBillingLedgerPresentation(
                  entry.ledgerClass,
                  entry.entryType
                );
                const metadataAvailable = hasMetadata(entry);

                return (
                  <TableRow key={entry.id} data-entry-id={entry.id}>
                    <TableCell className="font-medium tabular-nums">
                      <time dateTime={entry.occurredAt}>
                        {formatBillingDate(entry.occurredAt, formatOptions)}
                      </time>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={presentation.tone}
                        data-activity-label={presentation.label}
                        data-tone={presentation.tone}
                      >
                        {presentation.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-44 whitespace-normal">
                      <div className="grid max-w-xs gap-0.5">
                        <span className="break-words font-medium">
                          {entry.meterLabel ?? entry.meterSlug}
                        </span>
                        {entry.meterLabel ? (
                          <span className="break-words font-mono text-xs text-muted-foreground">
                            {entry.meterSlug}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'max-w-[10rem] whitespace-normal text-end font-medium',
                        billingNumericClassName
                      )}
                    >
                      <Quantity
                        value={entry.delta}
                        unit={entry.unit}
                        formatOptions={formatOptions}
                      />
                    </TableCell>
                    {showBalance ? (
                      <TableCell
                        className={cn(
                          'max-w-[10rem] whitespace-normal text-end',
                          billingNumericClassName
                        )}
                      >
                        {entry.balanceAfter === undefined ? (
                          <span className="text-muted-foreground">
                            {messages.noBalance}
                          </span>
                        ) : (
                          <Quantity
                            value={entry.balanceAfter}
                            unit={entry.unit}
                            formatOptions={formatOptions}
                          />
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="min-w-64 whitespace-normal">
                      <div className="grid max-w-sm gap-2">
                        <p className="text-pretty text-sm text-muted-foreground">
                          {entry.description ?? messages.noDescription}
                        </p>
                        {metadataAvailable ? (
                          <Button
                            className="w-fit"
                            size="lg"
                            variant="outline"
                            aria-label={`${messages.detailsButton}: ${presentation.label}`}
                            onClick={() => setSelectedEntry(entry)}
                          >
                            {messages.detailsButton}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="flex-col items-start justify-between gap-4 @min-[640px]/billing-activity-table:flex-row @min-[640px]/billing-activity-table:items-center">
          <p className="text-sm tabular-nums text-muted-foreground">
            {messages.pageLabel}{' '}
            {formatBillingQuantity(String(page.page), formatOptions)}
            {page.totalItems !== undefined ? (
              <>
                {' · '}
                {formatBillingQuantity(page.totalItems, formatOptions)}{' '}
                {messages.resultsLabel}
              </>
            ) : null}
          </p>
          <div className="grid gap-3">
            {interactionError?.scope === 'pagination' ? (
              <InteractionErrorAlert interactionError={interactionError} messages={messages} />
            ) : null}
            {onPageChange ? (
              <PageControls
                page={page}
                formatOptions={formatOptions}
                messages={messages}
                pendingControl={pendingControl}
                onPageChange={(nextPage) =>
                  void runControlledChange(
                    'pagination',
                    'billingActivity.pagination',
                    onPageChange,
                    nextPage
                  )
                }
              />
            ) : null}
          </div>
        </CardFooter>
      </Card>

      <MetadataSheet
        entry={selectedEntry}
        open={selectedEntry !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
        formatOptions={formatOptions}
        messages={messages}
      />
    </>
  );
}
