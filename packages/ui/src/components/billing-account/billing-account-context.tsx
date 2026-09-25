'use client';

import * as React from 'react';

import type { DescribeTarget } from '../billing-kit/codes';
import type { BillingLifecycle, CreditPack, Meter, Plan, RedeemResult, Subscription, UsageAlert } from '../billing-kit/types';
import type { BillingAccountAction, BillingAccountData, BillingAccountTheme, BillingAccountView } from './types';

export type BillingAccountContextValue = {
	data: BillingAccountData;
	view: BillingAccountView;
	/** Views this host can back, in navigation order. */
	views: BillingAccountView[];
	setView: (view: BillingAccountView) => void;
	emit: (action: BillingAccountAction) => void;
	theme: BillingAccountTheme;
	setTheme: (theme: BillingAccountTheme) => void;
	/** The plan the account is on, after any local change. */
	plan: Plan | undefined;
	subscription: Subscription | undefined;
	lifecycle: BillingLifecycle;
	alerts: UsageAlert[];
	setAlerts: (alerts: UsageAlert[]) => void;
	/** False for members who can see billing but not change it. */
	canManage: boolean;
	planName: (planId: string) => string;
	meterBySlug: ReadonlyMap<string, Meter>;
	meterName: (slug: string) => string;
	/** Opens the change preview for a plan (or asks the host to talk to sales). */
	choosePlan: (plan: Plan, interval?: 'month' | 'year') => void;
	buyPack: (pack: CreditPack) => void;
	pendingPackId: string | undefined;
	/** True when the host can redeem codes and the viewer may use them. */
	canRedeem: boolean;
	openRedeem: () => void;
	/** Redeems through the host and shows the grant locally once it resolves. */
	redeemCode: (code: string) => Promise<RedeemResult>;
	describeTarget: DescribeTarget;
	openMeter: (slug: string) => void;
};

export const BillingAccountContext = React.createContext<BillingAccountContextValue | null>(null);

export function useBillingAccount() {
	const context = React.useContext(BillingAccountContext);
	if (!context) throw new Error('Billing account parts must be rendered inside <BillingAccount>.');
	return context;
}
