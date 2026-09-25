'use client';

import { ArrowLeftRight, PlugZap, Power } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Switch } from '../switch';
import { useBillingFormat } from '../billing-kit/context';
import { isHealthFresh } from '../billing-kit/format';
import { ExternalRef, FEATURE_LABEL, ProviderCard, ProviderMark, ReadinessChecklist } from '../billing-kit/provider';
import { Bezel, dashedRule, KeyValueList, Panel, SectionHeading } from '../billing-kit/surface';
import { ToneBadge, ViewFrame } from '../workspace-kit/primitives';
import { useBillingConsole } from './billing-console-context';

function BillingSwitch() {
	const { settings, health, setBillingEnabled } = useBillingConsole();
	const f = useBillingFormat();
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const allowed = settings.enableBilling || (health.ready && isHealthFresh(health, f.now));
	const switchId = React.useId();
	const helpId = React.useId();

	return (
		<Panel
			title="Billing switch"
			description="Off means no checkout, no subscription sync, and no usage reports. Turning it off is always allowed."
			footer={
				settings.enableBilling ? (
					<span>Live since the last readiness pass. Turning it off stops new charges; existing subscriptions keep their provider schedule.</span>
				) : allowed ? (
					<span>The latest check passed {health.checkedAt ? f.relative(health.checkedAt) : ''}. You can turn billing on.</span>
				) : (
					<span>
						Needs a passing readiness check from the last 24 hours{health.checkedAt ? `; the latest ran ${f.date(health.checkedAt, 'medium', true)}` : ''}.
					</span>
				)
			}
		>
			<div className="flex items-center gap-3">
				<span className={cn('grid size-8 place-items-center rounded-lg', settings.enableBilling ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
					<Power aria-hidden="true" className="size-4" />
				</span>
				<label htmlFor={switchId} className="min-w-0 flex-1">
					<span className="block text-sm font-medium text-foreground">{settings.enableBilling ? 'Billing is on' : 'Billing is off'}</span>
					<span id={helpId} className="block text-xs text-muted-foreground">
						{settings.enableBilling ? 'Customers can check out and are charged.' : allowed ? 'Ready when you are.' : 'Locked until readiness passes.'}
					</span>
				</label>
				<Switch
					id={switchId}
					aria-describedby={helpId}
					checked={settings.enableBilling}
					disabled={busy || !allowed}
					onCheckedChange={async (enabled) => {
						setBusy(true);
						setError(null);
						try {
							await setBillingEnabled(enabled);
						} catch (reason) {
							setError(reason instanceof Error ? reason.message : 'The switch was refused.');
						} finally {
							setBusy(false);
						}
					}}
				/>
			</div>
			{error ? (
				<p role="alert" className="mt-3 text-xs text-destructive">
					{error}
				</p>
			) : null}
		</Panel>
	);
}

function CreditRate() {
	const { settings, setCreditRate } = useBillingConsole();
	const f = useBillingFormat();
	const [value, setValue] = React.useState(String(settings.creditsPerCent));
	const [state, setState] = React.useState<'idle' | 'busy' | 'saved'>('idle');
	const [error, setError] = React.useState<string | null>(null);
	const parsed = Number(value);
	const valid = Number.isInteger(parsed) && parsed > 0;
	const inputId = React.useId();
	// Follow the saved rate when it changes elsewhere, during render rather than in an effect.
	const [saved, setSaved] = React.useState(settings.creditsPerCent);
	if (saved !== settings.creditsPerCent) {
		setSaved(settings.creditsPerCent);
		setValue(String(settings.creditsPerCent));
	}

	return (
		<Panel title="Credit rate" description="How many universal credits one cent buys. It prices packs, overage, and plan allowances at once; the ledger stays in credits.">
			<form
				className="flex flex-wrap items-end gap-3"
				onSubmit={async (event) => {
					event.preventDefault();
					if (!valid || parsed === settings.creditsPerCent) return;
					setState('busy');
					setError(null);
					try {
						await setCreditRate(parsed);
						setState('saved');
					} catch (reason) {
						setError(reason instanceof Error ? reason.message : 'The rate could not be saved.');
						setState('idle');
					}
				}}
			>
				<label htmlFor={inputId} className="flex flex-col gap-1 text-xs text-muted-foreground">
					Credits per cent
					<input
						id={inputId}
						inputMode="numeric"
						value={value}
						onChange={(event) => {
							setValue(event.target.value.replace(/\D/g, ''));
							setState('idle');
						}}
						aria-invalid={!valid || undefined}
						className="h-8 w-28 rounded-md border border-border bg-card px-2 text-[13px] text-foreground tabular-nums shadow-2xs outline-none focus:ring-[3px] focus:ring-ring/50"
					/>
				</label>
				<p className="flex-1 pb-1.5 text-[13px] text-muted-foreground tabular-nums">
					{valid ? (
						<>
							{f.quantity(1_000)} credits = <span className="text-foreground">{f.money({ amountMinor: 1_000 / parsed, currency: settings.currency }, { precise: true })}</span>
						</>
					) : (
						'Enter a whole number above zero.'
					)}
				</p>
				<Button type="submit" size="sm" variant="outline" disabled={!valid || parsed === settings.creditsPerCent || state === 'busy'}>
					{state === 'busy' ? 'Saving…' : 'Save rate'}
				</Button>
			</form>
			{error ? (
				<p role="alert" className="mt-2 text-xs text-destructive">
					{error}
				</p>
			) : state === 'saved' ? (
				<p role="status" className="mt-2 text-xs text-success">
					Saved. Future checkouts use the new rate; past purchases keep theirs.
				</p>
			) : null}
		</Panel>
	);
}

/**
 * The payment provider: which one is active and how it is connected,
 * readiness, the billing switch, the credit rate, usage sync, and the other
 * providers a host can switch to.
 */
export function ConsoleProviderView() {
	const { data, plans, connection, provider, health, checking, runCheck, openConnect } = useBillingConsole();
	const f = useBillingFormat();

	const others = data.providers.filter((candidate) => candidate.id !== provider?.id);

	return (
		<ViewFrame icon={PlugZap} title="Provider">
			{provider && connection ? (
				<Bezel innerClassName="flex flex-col">
					<div className="flex flex-wrap items-start gap-4 p-4">
						<ProviderMark provider={provider} size="lg" />
						<div className="min-w-0 flex-1 basis-56">
							<p className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight text-foreground">
								{provider.name}
								<ToneBadge tone="success">Active</ToneBadge>
								<ToneBadge tone={connection.mode === 'live' ? 'primary' : 'amber'}>{connection.mode === 'live' ? 'Live mode' : 'Test mode'}</ToneBadge>
							</p>
							<p className="mt-0.5 text-[13px] text-muted-foreground">
								{connection.accountLabel ?? 'Connected account'}
								{connection.connectedAt ? ` · connected ${f.date(connection.connectedAt)}` : ''}
							</p>
							<div className="mt-3 flex flex-wrap gap-1">
								{provider.features.map((feature) => (
									<span key={feature} className="rounded-[4px] bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
										{FEATURE_LABEL[feature]}
									</span>
								))}
							</div>
						</div>
						<div className="flex gap-2">
							<Button size="xs" variant="outline" onClick={() => openConnect(provider.id)}>
								Update keys
							</Button>
							{others.some((candidate) => candidate.availability === 'available') ? (
								<Button size="xs" variant="ghost" onClick={() => openConnect()}>
									<ArrowLeftRight aria-hidden="true" />
									Switch
								</Button>
							) : null}
						</div>
					</div>
					<div className={cn('grid gap-x-6 border-t bg-muted/40 px-4 py-2 @3xl/view:grid-cols-2', dashedRule)}>
						<KeyValueList
							items={provider.credentials
								.filter((field) => field.kind === 'secret')
								.map((field) => ({
									key: field.name,
									label: field.label,
									value: connection.credentials[field.name]?.set ? (
										<span className="text-foreground">Stored{connection.credentials[field.name]?.updatedAt ? ` · ${f.date(connection.credentials[field.name]!.updatedAt!)}` : ''}</span>
									) : (
										<span className="text-destructive">Missing</span>
									),
								}))}
						/>
						<KeyValueList
							items={[
								{ label: 'Account', value: connection.accountId ? <ExternalRef provider={provider} kind="account" id={connection.accountId} mode={connection.mode} /> : '—' },
								{ label: 'Plans mirrored', value: `${plans.filter((plan) => plan.externalId).length} of ${plans.length}` },
							]}
						/>
					</div>
				</Bezel>
			) : (
				<Panel title="No provider connected" description="Connect one to sell plans, credit packs, and usage. Billing stays off until readiness passes.">
					<Button size="sm" onClick={() => openConnect()}>
						Connect a provider
					</Button>
				</Panel>
			)}

			<div className="grid gap-4 @4xl/view:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				<Panel title="Readiness" description="The daily check, or on demand. It runs as a background job.">
					<ReadinessChecklist provider={provider} health={health} onRunCheck={runCheck} running={checking} />
				</Panel>
				<div className="flex flex-col gap-4">
					<BillingSwitch />
					<CreditRate />
					<Panel title="Usage sync" description="Credits used past the allowance are reported to the provider hourly.">
						<KeyValueList
							items={[
								{ label: 'Last run', value: data.usageSync.lastRunAt ? f.date(data.usageSync.lastRunAt, 'medium', true) : 'Never' },
								{ label: 'Reported', value: f.quantity(data.usageSync.reported) },
								{ label: 'Pending', value: f.quantity(data.usageSync.pending) },
								{
									label: 'Failed',
									value: data.usageSync.failed > 0 ? <span className="font-medium text-destructive">{f.quantity(data.usageSync.failed)} · retried next run</span> : '0',
								},
							]}
						/>
					</Panel>
				</div>
			</div>

			{others.length > 0 ? (
				<section aria-labelledby="other-providers" className="flex flex-col gap-3">
					<SectionHeading
						id="other-providers"
						title="Other providers"
						description="One provider is active at a time. Switching keeps existing subscriptions on the old provider until each customer is moved."
					/>
					<ul className="grid gap-2 @3xl/view:grid-cols-2">
						{others.map((candidate) => (
							<li key={candidate.id}>
								<ProviderCard provider={candidate} onSelect={() => openConnect(candidate.id)} />
							</li>
						))}
					</ul>
				</section>
			) : null}
		</ViewFrame>
	);
}
