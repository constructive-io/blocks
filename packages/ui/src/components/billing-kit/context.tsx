'use client';

import * as React from 'react';

import {
	type BillingFormatOptions,
	DEFAULT_FORMAT,
	formatDate,
	formatList,
	formatMoney,
	formatPercent,
	formatQuantity,
	formatRelativeDays,
	formatTime,
} from './format';
import type { Money } from './types';

type BillingFormatContextValue = BillingFormatOptions & {
	/** The clock every relative date and period is measured from. Pass a fixed value for identical server and client output. */
	now: string;
};

const BillingFormatContext = React.createContext<BillingFormatContextValue>({ ...DEFAULT_FORMAT, now: '' });

type BillingFormatProviderProps = Partial<BillingFormatContextValue> & { children: React.ReactNode };

/**
 * Locale, time zone and clock for every billing component below it. Defaults
 * to `en-US` in UTC; set `now` from the server so relative dates hydrate
 * without a mismatch.
 */
function BillingFormatProvider({ locale, timeZone, now, children }: BillingFormatProviderProps) {
	const parent = React.useContext(BillingFormatContext);
	// Without an explicit clock, read it once on mount. Pass `now` for SSR so both sides agree.
	const [mounted] = React.useState(() => new Date().toISOString());
	const value = React.useMemo<BillingFormatContextValue>(
		() => ({ locale: locale ?? parent.locale, timeZone: timeZone ?? parent.timeZone, now: now ?? (parent.now || mounted) }),
		[locale, mounted, now, parent, timeZone],
	);
	return <BillingFormatContext.Provider value={value}>{children}</BillingFormatContext.Provider>;
}

/** Formatters bound to the nearest `BillingFormatProvider`. */
function useBillingFormat() {
	const context = React.useContext(BillingFormatContext);
	const [mounted] = React.useState(() => new Date().toISOString());
	const options = React.useMemo(() => (context.now ? context : { ...context, now: mounted }), [context, mounted]);
	return React.useMemo(
		() => ({
			...options,
			money: (money: Money, extra?: { precise?: boolean; compact?: boolean }) => formatMoney(money, { ...options, ...extra }),
			quantity: (value: number, compact = false) => formatQuantity(value, { locale: options.locale, compact }),
			percent: (ratio: number) => formatPercent(ratio, options.locale),
			date: (iso: string, style: 'short' | 'medium' | 'long' = 'medium', withTime = false) => formatDate(iso, { ...options, style, withTime }),
			relative: (iso: string) => formatRelativeDays(iso, options.now, options.locale),
			time: (iso: string) => formatTime(iso, options),
			list: (items: string[]) => formatList(items, options.locale),
		}),
		[options],
	);
}

export { BillingFormatProvider, useBillingFormat };
export type { BillingFormatContextValue, BillingFormatProviderProps };
