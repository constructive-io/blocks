'use client';

import * as React from 'react';

import type { BillingProviderDescriptor } from '../billing-kit/providers';
import type { BillingHealth, CreditCode, CreditCodeDraft, CreditPack, CustomerSummary, DatabaseStanding, Meter, Plan, ProviderConnection } from '../billing-kit/types';
import type { BillingConsoleAction, BillingConsoleData, BillingConsoleSettings, BillingConsoleTheme, BillingConsoleView, EntitlementChange } from './types';

export type BillingConsoleContextValue = {
	data: BillingConsoleData;
	view: BillingConsoleView;
	views: BillingConsoleView[];
	setView: (view: BillingConsoleView) => void;
	emit: (action: BillingConsoleAction) => void;
	theme: BillingConsoleTheme;
	setTheme: (theme: BillingConsoleTheme) => void;
	/** The active provider's descriptor. */
	provider: BillingProviderDescriptor | undefined;
	/** The provider connection after any local connect or switch. */
	connection: ProviderConnection | undefined;
	/** Catalog after local toggles and saved entitlement edits; kept here so it survives view changes. */
	plans: Plan[];
	setPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
	meters: Meter[];
	setMeters: React.Dispatch<React.SetStateAction<Meter[]>>;
	packs: CreditPack[];
	setPacks: React.Dispatch<React.SetStateAction<CreditPack[]>>;
	codes: CreditCode[];
	setCodes: React.Dispatch<React.SetStateAction<CreditCode[]>>;
	/** Present when the host can store codes. */
	saveCode: ((draft: CreditCodeDraft, existing?: CreditCode) => Promise<void>) | undefined;
	createCodes: ((drafts: CreditCodeDraft[]) => Promise<void>) | undefined;
	/** Persists entitlement edits; the catalog view applies them once this resolves. */
	saveEntitlements: (changes: EntitlementChange[]) => Promise<void>;
	holdDatabase: ((database: DatabaseStanding, note: string) => Promise<void>) | undefined;
	releaseDatabase: ((database: DatabaseStanding) => Promise<void>) | undefined;
	settings: BillingConsoleSettings;
	health: BillingHealth;
	checking: boolean;
	runCheck: () => void;
	setBillingEnabled: (enabled: boolean) => Promise<void>;
	setCreditRate: (creditsPerCent: number) => Promise<void>;
	openConnect: (providerId?: string) => void;
	standing: DatabaseStanding[];
	openCustomer: (customer: CustomerSummary) => void;
	planName: (planId: string) => string;
	meterName: (slug: string) => string;
};

export const BillingConsoleContext = React.createContext<BillingConsoleContextValue | null>(null);

export function useBillingConsole() {
	const context = React.useContext(BillingConsoleContext);
	if (!context) throw new Error('Billing console parts must be rendered inside <BillingConsole>.');
	return context;
}
