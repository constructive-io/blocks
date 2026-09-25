'use client';

import * as React from 'react';

import { useControllableState } from '../../lib/use-controllable-state';
import { BillingFormatProvider } from '../billing-kit/context';
import { CustomerDetailSheet, type GrantCreditsRequest } from '../billing-kit/customers';
import { DAY, humanize, isHealthFresh } from '../billing-kit/format';
import { ProviderConnectDialog } from '../billing-kit/provider';
import { modeFromCredential } from '../billing-kit/providers';
import type { BillingHealth, CreditCode, CreditCodeDraft, CreditPack, CustomerSummary, DatabaseStanding, Meter, Plan, ProviderConnection } from '../billing-kit/types';
import { WorkspaceShell } from '../workspace-kit/shell';
import { useLatest } from '../workspace-kit/use-latest';
import { BillingConsoleContext, type BillingConsoleContextValue } from './billing-console-context';
import { ConsoleCatalogView } from './catalog-view';
import { ConsoleCustomersView } from './customers-view';
import { ConsoleOverviewView } from './overview-view';
import { ConsoleProviderView } from './provider-view';
import { BillingConsoleSidebar } from './sidebar';
import { ConsoleStandingView } from './standing-view';
import type { BillingConsoleAction, BillingConsoleData, BillingConsoleSettings, BillingConsoleTheme, BillingConsoleView, EntitlementChange } from './types';


type BillingConsoleProps = {
	data: BillingConsoleData;
	view?: BillingConsoleView;
	defaultView?: BillingConsoleView;
	onViewChange?: (view: BillingConsoleView) => void;
	/** Views the host can back. Defaults to all; `standing` only ever shows at platform scope. */
	views?: BillingConsoleView[];
	/** Persists entitlement edits (plan limits, meter limits, caps). Reject to keep them unsaved. */
	onSaveEntitlements?: (changes: EntitlementChange[]) => Promise<void> | void;
	/** Stores credentials and makes the provider active. Values are write-only. */
	onConnectProvider?: (providerId: string, values: Record<string, string>) => Promise<void> | void;
	/** Enqueues the readiness job. Resolve with the new verdict to show it. */
	onRunReadinessCheck?: () => Promise<BillingHealth | void>;
	/** Flips `enable_billing`. Reject with the gate's error to show it. */
	onToggleBilling?: (enabled: boolean) => Promise<void> | void;
	onCreditRateChange?: (creditsPerCent: number) => Promise<void> | void;
	onGrantCredits?: (request: GrantCreditsRequest) => Promise<void> | void;
	/**
	 * Creates a code, or saves an existing one (passed second). Resolve with the
	 * stored code to show its server id; reject to keep the dialog open.
	 */
	onSaveCode?: (draft: CreditCodeDraft, existing?: CreditCode) => Promise<CreditCode | void> | void;
	/** Creates a bulk batch of single-use codes. */
	onCreateCodes?: (drafts: CreditCodeDraft[]) => Promise<void> | void;
	/** Platform scope: places an admin hold. */
	onHoldDatabase?: (database: DatabaseStanding, note: string) => Promise<void> | void;
	/** Platform scope: lifts a suspension or hold. */
	onReleaseDatabase?: (database: DatabaseStanding) => Promise<void> | void;
	onAction?: (action: BillingConsoleAction) => void;
	theme?: BillingConsoleTheme;
	onThemeChange?: (theme: BillingConsoleTheme) => void;
	locale?: string;
	timeZone?: string;
	now?: string;
	defaultSidebarCollapsed?: boolean;
	className?: string;
};

const normalizeId = (code: string) => code.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const ALL_VIEWS: BillingConsoleView[] = ['overview', 'catalog', 'customers', 'provider', 'standing'];

type LocalState = {
	plans: Plan[];
	meters: Meter[];
	packs: CreditPack[];
	codes: CreditCode[];
	settings: BillingConsoleSettings;
	health: BillingHealth;
	connection?: ProviderConnection;
	customers: CustomerSummary[];
	standing: DatabaseStanding[];
};

const initialState = (data: BillingConsoleData): LocalState => ({
	plans: data.plans,
	meters: data.meters,
	packs: data.packs,
	codes: data.codes,
	settings: data.settings,
	health: data.health,
	connection: data.connection,
	customers: data.customers,
	standing: data.standing ?? [],
});

/**
 * Billing Console template: the operator side of Constructive billing, for
 * the platform or a tenant database. Overview, catalog (plans and prices,
 * entitlements, meters, packs and codes), customers, the payment provider,
 * and (platform only) database standing. The host owns every write; the
 * console shows it optimistically once the host's promise resolves.
 */
function BillingConsole({
	data,
	view: viewProp,
	defaultView = 'overview',
	onViewChange,
	views: viewsProp,
	onSaveEntitlements,
	onConnectProvider,
	onRunReadinessCheck,
	onToggleBilling,
	onCreditRateChange,
	onGrantCredits,
	onSaveCode,
	onCreateCodes,
	onHoldDatabase,
	onReleaseDatabase,
	onAction,
	theme: themeProp,
	onThemeChange,
	locale,
	timeZone,
	now,
	defaultSidebarCollapsed,
	className,
}: BillingConsoleProps) {
	const viewsKey = (viewsProp ?? ALL_VIEWS).filter((candidate) => candidate !== 'standing' || data.scope === 'platform').join('|');
	// Hosts often pass `views` inline; key it by content so the context stays stable.
	const views = React.useMemo(() => viewsKey.split('|') as BillingConsoleView[], [viewsKey]);
	const [requestedView, setView] = useControllableState<BillingConsoleView>({ prop: viewProp, defaultProp: defaultView, onChange: onViewChange });
	const view = views.includes(requestedView) ? requestedView : (views[0] ?? 'overview');
	const [theme, setTheme] = useControllableState<BillingConsoleTheme>({ prop: themeProp, defaultProp: 'system', onChange: onThemeChange });
	const [local, setLocal] = React.useState<LocalState>(() => initialState(data));
	const [source, setSource] = React.useState(data);
	if (source !== data) {
		setSource(data);
		setLocal(initialState(data));
	}
	const [checking, setChecking] = React.useState(false);
	const [connect, setConnect] = React.useState<{ open: boolean; providerId?: string }>({ open: false });
	// The sheet keeps its last customer while closing so its exit animation has content.
	const [customerId, setCustomerId] = React.useState<string | null>(null);
	const [customerOpen, setCustomerOpen] = React.useState(false);

	const handlers = useLatest({ onAction, onSaveEntitlements, onRunReadinessCheck, onToggleBilling, onCreditRateChange, onHoldDatabase, onReleaseDatabase, onSaveCode, onCreateCodes });
	const canSaveCode = Boolean(onSaveCode);
	const canCreateCodes = Boolean(onCreateCodes);
	const canHold = Boolean(onHoldDatabase);
	const canRelease = Boolean(onReleaseDatabase);

	const clock = React.useCallback(() => now ?? new Date().toISOString(), [now]);
	const provider = data.providers.find((candidate) => candidate.id === local.connection?.providerId);

	const context = React.useMemo<BillingConsoleContextValue>(() => {
		const planNames = new Map(local.plans.map((plan) => [plan.id, plan.displayName]));
		const meterNames = new Map(data.meters.map((meter) => [meter.slug, meter.displayName]));
		const emit = (action: BillingConsoleAction) => handlers.current.onAction?.(action);
		const setter =
			<K extends 'plans' | 'meters' | 'packs' | 'codes'>(key: K): React.Dispatch<React.SetStateAction<LocalState[K]>> =>
			(next) =>
				setLocal((current) => ({ ...current, [key]: typeof next === 'function' ? next(current[key]) : next }));
		const setStanding = (database: DatabaseStanding, patch: Partial<DatabaseStanding>) =>
			setLocal((current) => ({
				...current,
				standing: current.standing.map((candidate) => (candidate.id === database.id ? { ...candidate, ...patch } : candidate)),
			}));
		return {
			data,
			connection: local.connection,
			view,
			views,
			setView,
			emit,
			theme,
			setTheme,
			provider,
			plans: local.plans,
			setPlans: setter('plans'),
			meters: local.meters,
			setMeters: setter('meters'),
			packs: local.packs,
			setPacks: setter('packs'),
			codes: local.codes,
			setCodes: setter('codes'),
			saveCode: canSaveCode
				? async (draft, existing) => {
						const stored = await handlers.current.onSaveCode?.(draft, existing);
						const next: CreditCode = stored ?? {
							...existing,
							...draft,
							id: existing?.id ?? `code-${normalizeId(draft.code)}`,
							redemptions: existing?.redemptions ?? 0,
							createdAt: existing?.createdAt ?? clock(),
						};
						setLocal((current) => ({
							...current,
							codes: existing ? current.codes.map((code) => (code.id === existing.id ? next : code)) : [next, ...current.codes],
						}));
					}
				: undefined,
			createCodes: canCreateCodes
				? async (drafts) => {
						await handlers.current.onCreateCodes?.(drafts);
						const createdAt = clock();
						setLocal((current) => ({
							...current,
							codes: [...drafts.map((draft) => ({ ...draft, id: `code-${normalizeId(draft.code)}`, redemptions: 0, createdAt })), ...current.codes],
						}));
					}
				: undefined,
			saveEntitlements: async (changes) => {
				await handlers.current.onSaveEntitlements?.(changes);
			},
			holdDatabase: canHold
				? async (database, note) => {
						await handlers.current.onHoldDatabase?.(database, note);
						setStanding(database, { suspendedReason: 'admin', suspendedAt: clock(), note });
					}
				: undefined,
			releaseDatabase: canRelease
				? async (database) => {
						await handlers.current.onReleaseDatabase?.(database);
						setStanding(database, { suspendedReason: null, suspendedAt: null, note: undefined });
					}
				: undefined,
			settings: local.settings,
			health: local.health,
			checking,
			runCheck: async () => {
				setChecking(true);
				try {
					const verdict = await handlers.current.onRunReadinessCheck?.();
					if (verdict) setLocal((current) => ({ ...current, health: verdict }));
				} finally {
					setChecking(false);
				}
			},
			setBillingEnabled: async (enabled) => {
				// Mirrors the database gate so the refusal reads the same without a round trip.
				if (enabled && !(local.health.ready && isHealthFresh(local.health, clock()))) {
					throw new Error('Billing is not ready: run the readiness check and fix what fails first.');
				}
				await handlers.current.onToggleBilling?.(enabled);
				setLocal((current) => ({ ...current, settings: { ...current.settings, enableBilling: enabled } }));
			},
			setCreditRate: async (creditsPerCent) => {
				await handlers.current.onCreditRateChange?.(creditsPerCent);
				setLocal((current) => ({ ...current, settings: { ...current.settings, creditsPerCent } }));
			},
			openConnect: (providerId) => setConnect({ open: true, providerId }),
			standing: local.standing,
			openCustomer: (customer) => {
				setCustomerId(customer.id);
				setCustomerOpen(true);
				emit({ type: 'open-customer', customerId: customer.id });
			},
			planName: (id) => planNames.get(id) ?? humanize(id),
			meterName: (slug) => meterNames.get(slug) ?? humanize(slug),
		};
	}, [canCreateCodes, canHold, canRelease, canSaveCode, checking, clock, data, handlers, local, provider, setTheme, setView, theme, view, views]);

	const customer = local.customers.find((candidate) => candidate.id === customerId);

	return (
		<BillingFormatProvider locale={locale} timeZone={timeZone} now={now}>
			<BillingConsoleContext.Provider value={context}>
				<WorkspaceShell
					slot="billing-console"
					className={className}
					defaultSidebarCollapsed={defaultSidebarCollapsed}
					sidebar={({ mode, collapsed, onCollapsedChange, onNavigate }) => (
						<BillingConsoleSidebar drawer={mode === 'drawer'} collapsed={collapsed} onCollapsedChange={onCollapsedChange} onNavigate={mode === 'drawer' ? onNavigate : undefined} />
					)}
				>
					{view === 'overview' ? <ConsoleOverviewView /> : null}
					{view === 'catalog' ? <ConsoleCatalogView /> : null}
					{view === 'customers' ? <ConsoleCustomersView /> : null}
					{view === 'provider' ? <ConsoleProviderView /> : null}
					{view === 'standing' ? <ConsoleStandingView /> : null}
				</WorkspaceShell>
				<ProviderConnectDialog
					providers={data.providers}
					activeProviderId={local.connection?.providerId}
					connection={local.connection}
					initialProviderId={connect.providerId}
					open={connect.open}
					onOpenChange={(open) => setConnect((current) => ({ ...current, open }))}
					onConnect={async (providerId, values) => {
						await onConnectProvider?.(providerId, values);
						const descriptor = data.providers.find((candidate) => candidate.id === providerId);
						const firstSecret = descriptor?.credentials.find((field) => field.kind === 'secret')?.name;
						setLocal((current) => {
							const same = current.connection?.providerId === providerId;
							const credentials = { ...(same ? current.connection?.credentials : {}) };
							for (const name of Object.keys(values)) credentials[name] = { set: true, updatedAt: clock() };
							return {
								...current,
								connection: {
									providerId,
									mode: (firstSecret && values[firstSecret] ? modeFromCredential(values[firstSecret]!) : null) ?? (same ? current.connection!.mode : 'test'),
									accountLabel: same ? current.connection?.accountLabel : undefined,
									accountId: same ? current.connection?.accountId : undefined,
									connectedAt: same ? current.connection?.connectedAt : clock(),
									credentials,
								},
								health: same ? current.health : { ...current.health, ready: false },
								settings: same ? current.settings : { ...current.settings, enableBilling: false },
							};
						});
					}}
				/>
				<CustomerDetailSheet
					open={customerOpen}
					onOpenChange={setCustomerOpen}
					customer={customer}
					plans={local.plans}
					meters={local.meters}
					provider={provider}
					mode={local.connection?.mode}
					onGrantCredits={
						onGrantCredits
							? async (request) => {
									await onGrantCredits(request);
									setLocal((current) => ({
										...current,
										customers: current.customers.map((candidate) =>
											candidate.id === request.customerId && candidate.detail
												? {
														...candidate,
														detail: {
															...candidate.detail,
															grants: [
																{
																	id: `grant-${candidate.detail.grants.length + 1}`,
																	meterSlug: request.meterSlug,
																	amount: request.amount,
																	remaining: request.amount,
																	creditType: request.creditType,
																	source: 'admin',
																	reason: request.reason,
																	createdAt: clock(),
																	expiresAt: request.expiresInDays ? new Date(new Date(clock()).getTime() + request.expiresInDays * DAY).toISOString() : undefined,
																},
																...candidate.detail.grants,
															],
														},
													}
												: candidate,
										),
									}));
								}
							: undefined
					}
					onRemoveOverride={(target, override) => {
						setLocal((current) => ({
							...current,
							customers: current.customers.map((candidate) =>
								candidate.id === target.id && candidate.detail ? { ...candidate, detail: { ...candidate.detail, overrides: candidate.detail.overrides.filter((row) => row.id !== override.id) } } : candidate,
							),
						}));
						onAction?.({ type: 'remove-override', customerId: target.id, overrideId: override.id });
					}}
					onCancelScheduledChange={(target) => {
						setLocal((current) => ({
							...current,
							customers: current.customers.map((candidate) => (candidate.id === target.id ? { ...candidate, scheduledChange: undefined } : candidate)),
						}));
						onAction?.({ type: 'cancel-scheduled-change', customerId: target.id });
					}}
				/>
			</BillingConsoleContext.Provider>
		</BillingFormatProvider>
	);
}

export { BillingConsole };
export type { BillingConsoleProps };
