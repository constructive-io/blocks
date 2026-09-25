'use client';

import { Package, Plus } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { CreditPackTable, EntitlementMatrix, entitlementKey, MeterCatalogTable, PlanPriceTable } from '../billing-kit/catalog';
import type { EntitlementRow } from '../billing-kit/plan';
import { SectionHeading } from '../billing-kit/surface';
import type { Plan } from '../billing-kit/types';
import { FilterGroup, ViewFrame } from '../workspace-kit/primitives';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';
import { useBillingConsole } from './billing-console-context';
import { ConsoleCodesTab } from './codes-tab';
import type { EntitlementChange } from './types';

type Tab = 'plans' | 'entitlements' | 'meters' | 'packs' | 'codes';

/** Applies unsaved entitlement edits on top of the saved plans. */
function applyChanges(plans: Plan[], changes: ReadonlyMap<string, EntitlementChange>): Plan[] {
	if (changes.size === 0) return plans;
	return plans.map((plan) => {
		let next = plan;
		for (const change of changes.values()) {
			if (change.planId !== plan.id) continue;
			const field = change.kind === 'limit' ? 'limits' : change.kind === 'meter' ? 'meterLimits' : 'caps';
			next = { ...next, [field]: { ...next[field], [change.key]: change.value } };
		}
		return next;
	});
}

function readSaved(plan: Plan | undefined, row: EntitlementRow) {
	return plan ? (row.kind === 'limit' ? plan.limits : row.kind === 'meter' ? plan.meterLimits : plan.caps)[row.key] : undefined;
}

type SaveState = { kind: 'idle' | 'saving' | 'saved' } | { kind: 'error'; message: string };

type EntitlementsTabProps = {
	/** Unsaved edits, owned by the catalog so switching tabs keeps them. */
	changes: ReadonlyMap<string, EntitlementChange>;
	onChangesChange: (changes: Map<string, EntitlementChange>) => void;
};

function EntitlementsTab({ changes, onChangesChange }: EntitlementsTabProps) {
	const { plans, setPlans, data, saveEntitlements } = useBillingConsole();
	const [state, setState] = React.useState<SaveState>({ kind: 'idle' });
	const shown = React.useMemo(() => applyChanges(plans, changes).filter((plan) => plan.active), [changes, plans]);
	const dirty = React.useMemo(() => new Set(changes.keys()), [changes]);

	const save = async () => {
		setState({ kind: 'saving' });
		try {
			await saveEntitlements([...changes.values()]);
			setPlans((current) => applyChanges(current, changes));
			onChangesChange(new Map());
			setState({ kind: 'saved' });
		} catch (reason) {
			setState({ kind: 'error', message: reason instanceof Error ? reason.message : 'Saving failed.' });
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<SectionHeading
				title="Entitlements"
				description="What each plan grants. Saving applies to new subscriptions right away and to existing ones through the plan cascade."
			/>
			<EntitlementMatrix
				plans={shown}
				groups={data.entitlementGroups}
				dirty={dirty}
				onChange={(planId, row, value) => {
					const next = new Map(changes);
					const key = entitlementKey(planId, row);
					if (readSaved(plans.find((plan) => plan.id === planId), row) === value) next.delete(key);
					else next.set(key, { planId, kind: row.kind, key: row.key, value });
					onChangesChange(next);
					setState({ kind: 'idle' });
				}}
			/>
			<div
				role="region"
				aria-label="Unsaved changes"
				aria-live="polite"
				className={cn(
					'sticky bottom-3 z-20 flex flex-wrap items-center gap-3 self-center rounded-xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm',
					changes.size === 0 && state.kind !== 'saved' && 'invisible',
				)}
			>
				<span className="text-[13px] text-foreground tabular-nums">
					{state.kind === 'saved' && changes.size === 0 ? 'Entitlements saved' : `${changes.size} unsaved ${changes.size === 1 ? 'change' : 'changes'}`}
				</span>
				{state.kind === 'error' ? <span className="text-xs text-destructive">{state.message}</span> : null}
				{changes.size > 0 ? (
					<>
						<Button
							size="xs"
							variant="ghost"
							disabled={state.kind === 'saving'}
							onClick={() => {
								onChangesChange(new Map());
								setState({ kind: 'idle' });
							}}
						>
							Discard
						</Button>
						<Button size="xs" disabled={state.kind === 'saving'} aria-busy={state.kind === 'saving' || undefined} onClick={save}>
							{state.kind === 'saving' ? 'Saving…' : 'Save changes'}
						</Button>
					</>
				) : null}
			</div>
		</div>
	);
}

/**
 * The catalog an operator sells from: plans and their prices (mirrored to
 * the provider), the entitlement matrix, the meter catalog, and credit packs
 * and promo codes.
 */
export function ConsoleCatalogView() {
	const { data, connection, plans, setPlans, meters, setMeters, packs, setPacks, codes, emit, provider, settings } = useBillingConsole();
	const [tab, setTab] = React.useState<Tab>('plans');
	const [changes, setChanges] = React.useState<Map<string, EntitlementChange>>(() => new Map());
	const subscribers = React.useMemo(() => {
		const counts: Record<string, number> = {};
		for (const customer of data.customers) counts[customer.planId] = (counts[customer.planId] ?? 0) + 1;
		return counts;
	}, [data.customers]);

	const actions =
		tab === 'plans' ? (
			<Button size="xs" variant="outline" onClick={() => emit({ type: 'new-plan' })}>
				<Plus aria-hidden="true" />
				New plan
			</Button>
		) : tab === 'packs' ? (
			<Button size="xs" variant="outline" onClick={() => emit({ type: 'new-pack' })}>
				<Plus aria-hidden="true" />
				New pack
			</Button>
		) : null;

	return (
		<ViewFrame icon={Package} title="Catalog" actions={actions}>
			<FilterGroup
				label="Catalog section"
				value={tab}
				onChange={(next) => startViewTransition(() => setTab(next))}
				options={[
					{ value: 'plans', label: 'Plans & prices', count: plans.length },
					{ value: 'entitlements', label: 'Entitlements' },
					{ value: 'meters', label: 'Meters', count: meters.filter((meter) => meter.meterType !== 'usage_pool').length },
					{ value: 'packs', label: 'Credit packs', count: packs.length },
					{ value: 'codes', label: 'Gift codes', count: codes.length },
				]}
			/>
			<ViewAnimation>
				<div key={tab} className="flex flex-col gap-6">
					{tab === 'plans' ? (
						<div className="flex flex-col gap-3">
							<SectionHeading
								title="Plans and prices"
								description={`Prices are immutable once ${provider?.name ?? 'the provider'} has them: add a new price and retire the old one instead of editing it.`}
							/>
							<PlanPriceTable
								plans={plans}
								provider={provider}
								mode={connection?.mode}
								subscribers={subscribers}
								onTogglePlan={(plan, active) => {
									setPlans((current) => current.map((candidate) => (candidate.id === plan.id ? { ...candidate, active, syncState: 'pending' } : candidate)));
									emit({ type: 'toggle-plan', planId: plan.id, active });
								}}
								onTogglePrice={(plan, price, active) => {
									setPlans((current) =>
										current.map((candidate) =>
											candidate.id === plan.id
												? { ...candidate, prices: candidate.prices.map((row) => (row.id === price.id ? { ...row, active, syncState: 'pending' } : row)) }
												: candidate,
										),
									);
									emit({ type: 'toggle-price', planId: plan.id, priceId: price.id, active });
								}}
								onAddPrice={(plan) => emit({ type: 'add-price', planId: plan.id })}
							/>
						</div>
					) : null}
					{tab === 'entitlements' ? <EntitlementsTab changes={changes} onChangesChange={setChanges} /> : null}
					{tab === 'meters' ? (
						<div className="flex flex-col gap-3">
							<SectionHeading title="Meters" description="Every billable dimension, grouped by the pool it falls back to. Credit cost is what one unit costs once its own allowance is gone." />
							<MeterCatalogTable
								meters={meters}
								onToggle={(meter, active) => {
									setMeters((current) => current.map((candidate) => (candidate.slug === meter.slug ? { ...candidate, active } : candidate)));
									emit({ type: 'toggle-meter', meterSlug: meter.slug, active });
								}}
							/>
						</div>
					) : null}
					{tab === 'codes' ? <ConsoleCodesTab /> : null}
					{tab === 'packs' ? (
						<>
							<div className="flex flex-col gap-3">
								<SectionHeading
									title="Credit packs"
									description={`One-off purchases. The charge follows the credit rate (${settings.creditsPerCent} ${settings.creditsPerCent === 1 ? 'credit' : 'credits'} per cent), so a pack advertised below it is refused at checkout.`}
								/>
								<CreditPackTable
									packs={packs}
									creditsPerCent={settings.creditsPerCent}
									onToggle={(pack, active) => {
										setPacks((current) => current.map((candidate) => (candidate.id === pack.id ? { ...candidate, active } : candidate)));
										emit({ type: 'toggle-pack', packId: pack.id, active });
									}}
								/>
							</div>
						</>
					) : null}
				</div>
			</ViewAnimation>
		</ViewFrame>
	);
}
