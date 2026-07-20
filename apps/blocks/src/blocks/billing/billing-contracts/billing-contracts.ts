// Provider-neutral contracts shared by the Constructive billing blocks.
// These DTOs keep display data, formatting, and actions consistent across
// individual blocks and composed billing surfaces.

export type BillingQuality = 'authoritative' | 'estimated' | 'stale';

export type BillingError = {
  message: string;
  code?: string;
  retryable?: boolean;
};

export function normalizeBillingError(
  error: unknown,
  fallback: string
): BillingError {
  if (error && typeof error === 'object' && 'message' in error) {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      retryable?: unknown;
    };

    return {
      message:
        typeof candidate.message === 'string' && candidate.message.length > 0
          ? candidate.message
          : fallback,
      code: typeof candidate.code === 'string' ? candidate.code : undefined,
      retryable:
        typeof candidate.retryable === 'boolean'
          ? candidate.retryable
          : undefined
    };
  }

  return { message: fallback };
}

export type BillingResource<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: BillingError; retry?: () => void }
  | {
      status: 'ready';
      data: T;
      quality?: BillingQuality;
      asOf?: string;
    };

export type BillingAccountRef = {
  entityId: string;
  kind: 'personal' | 'organization';
  label?: string;
};

export type BillingMoney = {
  // An integer amount in the currency's smallest unit.
  amountMinor: string;
  currency: string;
};

export type BillingPrice =
  | {
      kind: 'fixed';
      id: string;
      interval: string;
      money: BillingMoney;
      intervalCount?: string;
    }
  | {
      kind: 'contact_sales';
      id: string;
      interval?: string;
    };

export type BillingAllowance =
  | { kind: 'limited'; limit: string; remaining?: string }
  | { kind: 'unlimited' }
  | { kind: 'uninitialized' };

type BillingEntitlementBase = {
  id: string;
  label: string;
  description?: string;
};

export type BillingFeatureEntitlement = BillingEntitlementBase & {
  kind: 'feature';
  enabled: boolean;
};

export type BillingCapEntitlement = BillingEntitlementBase & {
  kind: 'cap';
  value: string;
  unit?: string;
};

export type BillingQuotaEntitlement = BillingEntitlementBase & {
  kind: 'quota';
  allowance: BillingAllowance;
  unit?: string;
};

export type BillingMeterEntitlement = BillingEntitlementBase & {
  kind: 'meter';
  meterSlug: string;
  allowance: BillingAllowance;
  unit?: string;
};

export type BillingUnknownEntitlement = BillingEntitlementBase & {
  kind: 'unknown';
  rawKind?: string;
  value?: string;
};

export type BillingEntitlement =
  | BillingFeatureEntitlement
  | BillingCapEntitlement
  | BillingQuotaEntitlement
  | BillingMeterEntitlement
  | BillingUnknownEntitlement;

export type BillingPlan = {
  id: string;
  name: string;
  description?: string;
  prices: BillingPrice[];
  entitlements?: BillingEntitlement[];
  featured?: boolean;
  current?: boolean;
};

export type BillingProviderState = {
  label: string;
  status?: string;
};

export type BillingSubscription = {
  id: string;
  planId: string;
  planName: string;
  status: string;
  price?: BillingPrice;
  paymentStatus?: string;
  provider?: BillingProviderState;
  startedAt?: string;
  trialEndsAt?: string;
  renewsAt?: string;
  endsAt?: string;
  canceledAt?: string;
};

export type BillingUsagePeriodRef = {
  startsAt: string;
  endsAt: string;
  label?: string;
};

export type BillingMeterUsageKind =
  | 'quota'
  | 'boolean'
  | 'category_pool'
  | 'universal_pool'
  | 'unknown';

export type BillingMeterUsage = {
  meterSlug: string;
  label: string;
  unit?: string;
  kind: BillingMeterUsageKind;
  allowance: BillingAllowance;
  used?: string;
  enabled?: boolean;
  creditsAvailable?: string;
  overage?: string;
  children?: BillingMeterUsage[];
  description?: string;
};

export type BillingUsageSnapshot = {
  period: BillingUsagePeriodRef;
  meters: BillingMeterUsage[];
};

export type BillingCreditLotKind =
  | 'permanent'
  | 'period'
  | 'rollover'
  | 'expiring'
  | 'unknown';

export type BillingCreditLot = {
  id: string;
  kind: BillingCreditLotKind;
  amount: string;
  remaining: string;
  grantedAt?: string;
  startsAt?: string;
  expiresAt?: string;
  periodEndsAt?: string;
  description?: string;
};

export type BillingCreditBalance = {
  meterSlug: string;
  label: string;
  unit: string;
  available: string;
  poolKind?: 'meter' | 'category' | 'universal';
  lots: BillingCreditLot[];
};

export type BillingUsagePeriod = {
  id: string;
  meterSlug: string;
  meterLabel?: string;
  unit?: string;
  startsAt: string;
  endsAt: string;
  used: string;
  allowance?: BillingAllowance;
  quality?: BillingQuality;
  credits?: string;
  creditsAuthoritative?: boolean;
  overage?: string;
  overageAuthoritative?: boolean;
};

export type BillingActivityEntry = {
  id: string;
  occurredAt: string;
  meterSlug: string;
  meterLabel?: string;
  unit?: string;
  delta: string;
  balanceAfter?: string;
  ledgerClass: string;
  entryType: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type BillingPage<T> = {
  items: T[];
  // One-based page number.
  page: number;
  pageSize: number;
  totalItems?: string;
  totalPages?: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type BillingFormatOptions = {
  locale: string;
  timeZone: string;
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
};

export type BillingMessageEvent = {
  kind: 'success' | 'error' | 'info' | 'warning';
  key: string;
  message?: string;
};

export type BillingPresentationTone =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline';

export type BillingStatusPresentation = {
  label: string;
  tone: BillingPresentationTone;
};

export const billingSubscriptionStatusPresentations: Readonly<
  Record<string, BillingStatusPresentation>
> = {
  active: { label: 'Active', tone: 'default' },
  trialing: { label: 'Trial', tone: 'secondary' },
  paused: { label: 'Paused', tone: 'secondary' },
  canceled: { label: 'Canceled', tone: 'outline' },
  past_due: { label: 'Past due', tone: 'destructive' },
  unpaid: { label: 'Unpaid', tone: 'destructive' },
  incomplete: { label: 'Incomplete', tone: 'outline' }
};

export const billingPaymentStatusPresentations: Readonly<
  Record<string, BillingStatusPresentation>
> = {
  current: { label: 'Current', tone: 'default' },
  paid: { label: 'Paid', tone: 'default' },
  pending: { label: 'Pending', tone: 'secondary' },
  action_required: { label: 'Action required', tone: 'destructive' },
  past_due: { label: 'Past due', tone: 'destructive' },
  failed: { label: 'Failed', tone: 'destructive' }
};

export const billingProviderStatusPresentations: Readonly<
  Record<string, BillingStatusPresentation>
> = {
  active: { label: 'Active', tone: 'default' },
  trialing: { label: 'Trial', tone: 'secondary' },
  paused: { label: 'Paused', tone: 'secondary' },
  canceled: { label: 'Canceled', tone: 'outline' },
  past_due: { label: 'Past due', tone: 'destructive' },
  incomplete: { label: 'Incomplete', tone: 'outline' },
  pending: { label: 'Pending', tone: 'secondary' }
};

export const billingLedgerClassPresentations: Readonly<
  Record<string, BillingStatusPresentation>
> = {
  consumption: { label: 'Usage', tone: 'secondary' },
  grant: { label: 'Credit grant', tone: 'default' },
  adjustment: { label: 'Adjustment', tone: 'outline' },
  rollover: { label: 'Rollover', tone: 'secondary' },
  expiration: { label: 'Expired', tone: 'destructive' },
  reset: { label: 'Period reset', tone: 'outline' }
};

export const billingLedgerEntryPresentations: Readonly<
  Record<string, BillingStatusPresentation>
> = {
  usage_recorded: { label: 'Usage recorded', tone: 'secondary' },
  credits_granted: { label: 'Credits granted', tone: 'default' },
  credits_expired: { label: 'Credits expired', tone: 'destructive' },
  credits_rolled_over: { label: 'Credits rolled over', tone: 'secondary' },
  manual_adjustment: { label: 'Manual adjustment', tone: 'outline' },
  period_reset: { label: 'Period reset', tone: 'outline' }
};

const DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const INTEGER_PATTERN = /^([+-]?)(\d+)$/;
const BIGINT_ZERO = BigInt(0);
const BIGINT_NEGATIVE_ONE = BigInt(-1);
const BIGINT_TEN = BigInt(10);
const BIGINT_HUNDRED = BigInt(100);
const BIGINT_TEN_THOUSAND = BigInt(10_000);

function normalizeToken(value: string) {
  return value.trim().toLocaleLowerCase('en-US');
}

export function humanizeBillingToken(value: string): string {
  const normalized = value.trim().replace(/[-_]+/g, ' ');
  if (!normalized) return 'Unknown';
  return normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1);
}

export function resolveBillingStatus(
  status: string,
  presentations: Readonly<Record<string, BillingStatusPresentation>>
): BillingStatusPresentation {
  const normalized = normalizeToken(status);
  return (
    presentations[normalized] ?? {
      label: humanizeBillingToken(status),
      tone: 'outline'
    }
  );
}

export function resolveBillingLedgerPresentation(
  ledgerClass: string,
  entryType: string
): BillingStatusPresentation {
  const entryPresentation =
    billingLedgerEntryPresentations[normalizeToken(entryType)];
  if (entryPresentation) return entryPresentation;

  const classPresentation =
    billingLedgerClassPresentations[normalizeToken(ledgerClass)];
  if (classPresentation) return classPresentation;

  return {
    label: humanizeBillingToken(entryType || ledgerClass),
    tone: 'outline'
  };
}

function localizedDigitMap(locale: string): string[] {
  const formatter = new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 0
  });
  return Array.from({ length: 10 }, (_, digit) => formatter.format(digit));
}

function localizeDigits(value: string, locale: string): string {
  const digits = localizedDigitMap(locale);
  return value.replace(/\d/g, (digit) => digits[Number(digit)] ?? digit);
}

function decimalSeparator(locale: string): string {
  return (
    new Intl.NumberFormat(locale, {
      useGrouping: false,
      minimumFractionDigits: 1
    })
      .formatToParts(1.1)
      .find((part) => part.type === 'decimal')?.value ?? '.'
  );
}

// Formats an arbitrary-size decimal without coercing the value to Number.
// The exact fractional digits supplied by the value are preserved.
export function formatBillingQuantity(
  value: string,
  options: Pick<BillingFormatOptions, 'locale'>
): string {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return value;

  const [, sign, rawInteger, rawFraction] = match;
  const integer = BigInt(rawInteger);
  const groupedInteger = new Intl.NumberFormat(options.locale, {
    useGrouping: true,
    maximumFractionDigits: 0
  }).format(integer);
  const minus =
    sign === '-'
      ? new Intl.NumberFormat(options.locale)
          .formatToParts(-1)
          .find((part) => part.type === 'minusSign')?.value ?? '-'
      : sign === '+'
        ? '+'
        : '';

  if (!rawFraction) return `${minus}${groupedInteger}`;

  return `${minus}${groupedInteger}${decimalSeparator(options.locale)}${localizeDigits(
    rawFraction,
    options.locale
  )}`;
}

function fallbackMoney(
  money: BillingMoney,
  options: Pick<BillingFormatOptions, 'locale'>
): string {
  return `${money.currency} ${formatBillingQuantity(money.amountMinor, options)}`;
}

// Formats minor-unit money with BigInt-backed arithmetic. Invalid currencies
// fall back to the supplied currency code plus the untouched minor-unit amount;
// the helper never substitutes a default currency.
export function formatBillingMoney(
  money: BillingMoney,
  options: Pick<BillingFormatOptions, 'locale' | 'currencyDisplay'>
): string {
  const amountMatch = INTEGER_PATTERN.exec(money.amountMinor.trim());
  if (!amountMatch) return fallbackMoney(money, options);

  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(options.locale, {
      style: 'currency',
      currency: money.currency,
      currencyDisplay: options.currencyDisplay ?? 'symbol'
    });
  } catch {
    return fallbackMoney(money, options);
  }

  const [, sign, rawAmount] = amountMatch;
  const amount = BigInt(rawAmount);
  const fractionDigits =
    formatter.resolvedOptions().maximumFractionDigits ?? 0;
  const divisor = BIGINT_TEN ** BigInt(fractionDigits);
  const major = amount / divisor;
  const fraction =
    fractionDigits > 0
      ? (amount % divisor).toString().padStart(fractionDigits, '0')
      : '';
  const isNegative = sign === '-';
  const templateMajor =
    isNegative && major === BIGINT_ZERO
      ? BIGINT_NEGATIVE_ONE
      : isNegative
        ? -major
        : major;

  return formatter
    .formatToParts(templateMajor)
    .map((part) => {
      if (
        part.type === 'integer' &&
        isNegative &&
        major === BIGINT_ZERO
      ) {
        return localizeDigits('0', options.locale);
      }
      if (part.type === 'fraction') {
        return localizeDigits(fraction, options.locale);
      }
      return part.value;
    })
    .join('');
}

export function formatBillingDate(
  value: string,
  options: BillingFormatOptions
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: options.dateStyle ?? 'medium',
    timeZone: options.timeZone
  }).format(date);
}

type ParsedDecimal = {
  coefficient: bigint;
  scale: number;
};

function parseUnsignedDecimal(value: string): ParsedDecimal | null {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match || match[1] === '-') return null;
  const fraction = match[3] ?? '';
  return {
    coefficient: BigInt(`${match[2]}${fraction}`),
    scale: fraction.length
  };
}

function compareParsedDecimals(left: ParsedDecimal, right: ParsedDecimal) {
  const leftScaled =
    left.coefficient *
    BIGINT_TEN ** BigInt(Math.max(0, right.scale - left.scale));
  const rightScaled =
    right.coefficient *
    BIGINT_TEN ** BigInt(Math.max(0, left.scale - right.scale));
  if (leftScaled === rightScaled) return 0;
  return leftScaled > rightScaled ? 1 : -1;
}

function hundredthsToDecimal(value: bigint): string {
  const whole = value / BIGINT_HUNDRED;
  const fraction = (value % BIGINT_HUNDRED)
    .toString()
    .padStart(2, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export type BillingUsageProgress = {
  // A bounded number suitable for the visual progress primitive.
  visualPercent: number;
  // Exact, unbounded percentage text derived with integer arithmetic.
  exactPercent?: string;
  exhausted: boolean;
  overage: boolean;
};

export function getBillingUsageProgress(
  usedValue: string | undefined,
  allowance: BillingAllowance
): BillingUsageProgress {
  if (allowance.kind !== 'limited' || usedValue === undefined) {
    return {
      visualPercent: 0,
      exhausted: false,
      overage: false
    };
  }

  const used = parseUnsignedDecimal(usedValue);
  const limit = parseUnsignedDecimal(allowance.limit);
  if (!used || !limit) {
    return {
      visualPercent: 0,
      exhausted: false,
      overage: false
    };
  }

  const comparison = compareParsedDecimals(used, limit);
  if (limit.coefficient === BIGINT_ZERO) {
    const hasUsage = used.coefficient > BIGINT_ZERO;
    return {
      visualPercent: hasUsage ? 100 : 0,
      exactPercent: hasUsage ? undefined : '0',
      exhausted: true,
      overage: hasUsage
    };
  }

  const numerator =
    used.coefficient *
    BIGINT_TEN ** BigInt(limit.scale) *
    BIGINT_TEN_THOUSAND;
  const denominator =
    limit.coefficient * BIGINT_TEN ** BigInt(used.scale);
  const hundredths = numerator / denominator;
  const boundedHundredths =
    hundredths > BIGINT_TEN_THOUSAND
      ? BIGINT_TEN_THOUSAND
      : hundredths;

  return {
    visualPercent: Number(boundedHundredths) / 100,
    exactPercent: hundredthsToDecimal(hundredths),
    exhausted: comparison >= 0,
    overage: comparison > 0
  };
}
