'use client';

import { ArrowLeft, Check, CircleDashed, Copy, ExternalLink, KeyRound, Minus, RefreshCw, TriangleAlert, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { TextShimmer } from '../ai/text-shimmer';
import { Button } from '../button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from '../dialog';
import { Input } from '../input';
import { focusRingClass, pressClass, ToneBadge, TooltipIconButton } from '../workspace-kit/primitives';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';
import { useBillingFormat } from './context';
import { isHealthFresh, SYNC_STATE } from './format';
import {
	type BillingProviderDescriptor,
	checkCopy,
	credentialError,
	modeFromCredential,
	PLATFORM_CHECKS,
	type ProviderFeature,
	type ProviderObjectKind,
} from './providers';
import { dashedRule, StatusBadge } from './surface';
import type { BillingHealth, ProviderConnection, ProviderMode, ReadinessCheck, SyncState } from './types';

const SIZE = {
	sm: 'size-5 rounded-[5px] text-[10px]',
	md: 'size-7 rounded-[7px] text-xs',
	lg: 'size-9 rounded-[9px] text-sm',
} as const;

/** Monogram tile in the provider's colour, with a faint inner outline so it holds its shape on any surface. */
export function ProviderMark({ provider, size = 'md', className }: { provider: BillingProviderDescriptor; size?: keyof typeof SIZE; className?: string }) {
	return (
		<span
			aria-hidden="true"
			className={cn('grid shrink-0 place-items-center font-semibold text-white outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10', SIZE[size], className)}
			style={{ backgroundColor: provider.brandColor }}
		>
			{provider.monogram}
		</span>
	);
}

export const FEATURE_LABEL: Record<ProviderFeature, string> = {
	hostedCheckout: 'Hosted checkout',
	customerPortal: 'Customer portal',
	scheduledChanges: 'Scheduled changes',
	meteredUsage: 'Usage billing',
	invoices: 'Invoices',
	refunds: 'Refunds',
	disputes: 'Disputes',
	testMode: 'Test mode',
};

type ExternalRefProps = {
	provider?: BillingProviderDescriptor;
	kind: ProviderObjectKind;
	id: string;
	mode?: ProviderMode;
	className?: string;
};

/** A provider object id (`cus_…`, `price_…`) with copy and open-in-dashboard controls. */
export function ExternalRef({ provider, kind, id, mode = 'live', className }: ExternalRefProps) {
	const [copied, setCopied] = React.useState(false);
	const href = provider?.dashboardUrl?.(kind, id, mode);
	React.useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), 1400);
		return () => window.clearTimeout(timer);
	}, [copied]);
	return (
		<span className={cn('inline-flex h-6 max-w-full items-center gap-0.5 rounded-md border border-border bg-muted/50 pr-0.5 pl-1.5', className)}>
			{provider ? <ProviderMark provider={provider} size="sm" className="mr-1 size-3.5 rounded-[3px] text-[8px]" /> : null}
			<code className="truncate font-mono text-[11px] text-muted-foreground">{id}</code>
			<TooltipIconButton
				label={copied ? 'Copied' : `Copy ${kind} id`}
				size="sm"
				extendHitArea={false}
				className="size-5"
				onClick={() => {
					navigator.clipboard?.writeText(id).then(
						() => setCopied(true),
						() => {},
					);
				}}
			>
				{copied ? <Check aria-hidden="true" className="size-3" /> : <Copy aria-hidden="true" className="size-3" />}
			</TooltipIconButton>
			{href ? (
				<a
					href={href}
					target="_blank"
					rel="noreferrer"
					aria-label={`Open ${kind} in ${provider?.name}`}
					className={cn('grid size-5 place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground', focusRingClass)}
				>
					<ExternalLink aria-hidden="true" className="size-3" />
				</a>
			) : null}
		</span>
	);
}

export function SyncBadge({ state, className }: { state: SyncState; className?: string }) {
	const presentation = SYNC_STATE[state];
	return state === 'pending' ? (
		<StatusBadge presentation={{ ...presentation, label: '' }} className={className}>
			<TextShimmer className="font-normal">{presentation.label}</TextShimmer>
		</StatusBadge>
	) : (
		<StatusBadge presentation={presentation} className={className} />
	);
}

const CHECK_ICON = {
	pass: { icon: Check, className: 'bg-success/15 text-success' },
	fail: { icon: X, className: 'bg-destructive/15 text-destructive' },
	pending: { icon: CircleDashed, className: 'bg-info/15 text-info motion-safe:animate-spin' },
	skipped: { icon: Minus, className: 'bg-muted text-muted-foreground' },
} as const;

type ReadinessChecklistProps = {
	provider?: BillingProviderDescriptor;
	health: BillingHealth;
	/** Enqueues the readiness job; the checklist shows it running until `health` changes. */
	onRunCheck?: () => void;
	running?: boolean;
	className?: string;
};

/**
 * The latest readiness verdict as a checklist: shared checks first, then the
 * provider's own. A verdict older than 24 hours cannot switch billing on,
 * so the header says when it ran and whether it still counts.
 */
export function ReadinessChecklist({ provider, health, onRunCheck, running, className }: ReadinessChecklistProps) {
	const f = useBillingFormat();
	const rank = new Map([...Object.keys(provider?.checks ?? {}), ...Object.keys(PLATFORM_CHECKS)].map((id, index) => [id, index]));
	const checks = [...health.checks].sort((a, b) => (rank.get(a.id) ?? rank.size) - (rank.get(b.id) ?? rank.size));
	const stale = !isHealthFresh(health, f.now);
	const passed = checks.filter((check) => check.status === 'pass').length;
	const shown: ReadinessCheck[] = running ? checks.map((check) => ({ ...check, status: 'pending' })) : checks;
	return (
		<div className={cn('flex flex-col', className)}>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3">
				<div className="min-w-0 flex-1">
					<p className="flex items-center gap-2 text-sm font-medium text-foreground">
						{running ? <TextShimmer className="font-medium">Checking readiness</TextShimmer> : health.ready && !stale ? 'Ready to bill' : 'Not ready yet'}
						{!running ? (
							<span className="text-xs font-normal text-muted-foreground tabular-nums">
								{passed} of {checks.length} passed
							</span>
						) : null}
					</p>
					<p className="text-xs text-muted-foreground">
						{health.checkedAt ? `Checked ${f.date(health.checkedAt, 'medium', true)}` : 'Never checked'}
						{stale && health.checkedAt ? ' · older than 24 hours, run it again before turning billing on' : ''}
					</p>
				</div>
				{onRunCheck ? (
					<Button size="xs" variant="outline" disabled={running} onClick={onRunCheck}>
						<RefreshCw aria-hidden="true" className={cn(running && 'motion-safe:animate-spin')} />
						Check now
					</Button>
				) : null}
			</div>
			<ol className="flex flex-col" aria-busy={running || undefined}>
				{shown.map((check) => {
					const copy = checkCopy(provider, check.id);
					const { icon: Icon, className: iconClass } = CHECK_ICON[check.status];
					return (
						<li key={check.id} className={cn('flex items-start gap-3 border-t py-2.5', dashedRule)}>
							<span className={cn('mt-px grid size-5 shrink-0 place-items-center rounded-full', iconClass)}>
								<Icon aria-hidden="true" className="size-3" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="block text-[13px] text-foreground">
									{copy.label}
									<span className="sr-only">, {check.status}</span>
								</span>
								{check.detail || copy.help ? (
									<span className={cn('block text-xs', check.status === 'fail' ? 'text-destructive' : 'text-muted-foreground')}>{check.detail ?? copy.help}</span>
								) : null}
							</span>
						</li>
					);
				})}
			</ol>
			{health.nextStep && !health.ready && !running ? (
				<p className={cn('mt-1 flex gap-2 rounded-lg bg-warning/10 px-3 py-2 text-[13px] text-foreground')}>
					<TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
					{health.nextStep}
				</p>
			) : null}
		</div>
	);
}

type ProviderCredentialFormProps = {
	provider: BillingProviderDescriptor;
	connection?: ProviderConnection;
	/** Stores the values; reject with an Error to show it. Values are never read back. */
	onSave: (values: Record<string, string>) => Promise<void> | void;
	submitLabel?: string;
	className?: string;
};

/**
 * Write-only credential form driven by the provider descriptor. A stored
 * secret shows as set, with its last update, and is only replaced when a new
 * value is typed. Prefixes are checked before anything is sent.
 */
export function ProviderCredentialForm({ provider, connection, onSave, submitLabel = 'Save credentials', className }: ProviderCredentialFormProps) {
	const f = useBillingFormat();
	const [values, setValues] = React.useState<Record<string, string>>({});
	const [errors, setErrors] = React.useState<Record<string, string>>({});
	const [state, setState] = React.useState<'idle' | 'busy' | 'saved'>('idle');
	const [failure, setFailure] = React.useState<string | null>(null);
	const formId = React.useId();

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const next: Record<string, string> = {};
		for (const field of provider.credentials) {
			const value = values[field.name] ?? '';
			const stored = connection?.credentials[field.name]?.set;
			if (!value && stored) continue;
			const error = credentialError(field, value);
			if (error) next[field.name] = error;
		}
		setErrors(next);
		if (Object.keys(next).length > 0) return;
		setState('busy');
		setFailure(null);
		try {
			await onSave(Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim())));
			setValues({});
			setState('saved');
		} catch (reason) {
			setFailure(reason instanceof Error ? reason.message : 'The credentials could not be saved.');
			setState('idle');
		}
	};

	const secret = values[provider.credentials[0]?.name ?? ''] ?? '';
	const detected = secret ? modeFromCredential(secret) : null;

	return (
		<form onSubmit={submit} noValidate className={cn('flex flex-col gap-4', className)}>
			{provider.credentials.map((field) => {
				const id = `${formId}-${field.name}`;
				const stored = connection?.credentials[field.name];
				const error = errors[field.name];
				return (
					<div key={field.name} className="flex flex-col gap-1.5">
						<label htmlFor={id} className="flex items-center justify-between gap-2 text-[13px] font-medium text-foreground">
							<span className="flex items-center gap-1.5">
								{field.kind === 'secret' ? <KeyRound aria-hidden="true" className="size-3.5 text-muted-foreground" /> : null}
								{field.label}
								{field.optional ? <span className="font-normal text-muted-foreground">Optional</span> : null}
							</span>
							{stored?.set ? (
								<span className="text-xs font-normal text-muted-foreground">Stored{stored.updatedAt ? ` · ${f.date(stored.updatedAt)}` : ''}</span>
							) : null}
						</label>
						<Input
							id={id}
							type={field.kind === 'secret' ? 'password' : 'text'}
							size="sm"
							autoComplete="off"
							spellCheck={false}
							value={values[field.name] ?? ''}
							placeholder={stored?.set ? '•••••••• replace the stored value' : field.placeholder}
							aria-invalid={error ? true : undefined}
							aria-describedby={`${id}-help`}
							onChange={(event) => {
								setValues((current) => ({ ...current, [field.name]: event.target.value }));
								if (errors[field.name]) setErrors(({ [field.name]: _, ...rest }) => rest);
								setState('idle');
							}}
							className="font-mono text-[13px]"
						/>
						<p id={`${id}-help`} className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
							{error ?? field.help}
						</p>
					</div>
				);
			})}
			{detected ? (
				<p className="text-xs text-muted-foreground">
					Detected <span className="font-medium text-foreground">{detected}</span> mode from the key.
				</p>
			) : null}
			{failure ? (
				<p role="alert" className="text-[13px] text-destructive">
					{failure}
				</p>
			) : null}
			<div className="flex items-center gap-3">
				<Button type="submit" size="sm" disabled={state === 'busy'} aria-busy={state === 'busy' || undefined}>
					{state === 'busy' ? 'Saving…' : submitLabel}
				</Button>
				{state === 'saved' ? (
					<span role="status" className="text-xs text-success">
						Saved. Run the readiness check to confirm.
					</span>
				) : null}
			</div>
		</form>
	);
}

type ProviderCardProps = {
	provider: BillingProviderDescriptor;
	connection?: ProviderConnection;
	active?: boolean;
	onSelect?: () => void;
	className?: string;
};

/** One provider in a picker or directory: mark, name, what it supports, and its state. */
export function ProviderCard({ provider, connection, active, onSelect, className }: ProviderCardProps) {
	const soon = provider.availability === 'coming_soon';
	const body = (
		<>
			<ProviderMark provider={provider} size="lg" />
			<span className="min-w-0 flex-1">
				<span className="flex flex-wrap items-center gap-2">
					<span className="text-sm font-medium text-foreground">{provider.name}</span>
					{active ? <ToneBadge tone="success">Active</ToneBadge> : soon ? <ToneBadge tone="neutral">Coming soon</ToneBadge> : null}
					{active && connection ? <ToneBadge tone={connection.mode === 'live' ? 'primary' : 'amber'}>{connection.mode === 'live' ? 'Live' : 'Test mode'}</ToneBadge> : null}
				</span>
				<span className="mt-0.5 block text-pretty text-xs text-muted-foreground">{provider.description}</span>
				<span className="mt-2 flex flex-wrap gap-1">
					{provider.features.slice(0, 5).map((feature) => (
						<span key={feature} className="rounded-[4px] bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
							{FEATURE_LABEL[feature]}
						</span>
					))}
				</span>
			</span>
		</>
	);
	const classes = cn('flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left', active ? 'border-primary/30 bg-primary/[0.04]' : 'border-border bg-card', className);
	return onSelect && !soon ? (
		<button type="button" onClick={onSelect} className={cn(classes, 'cursor-pointer hover:bg-muted/40', pressClass, focusRingClass)}>
			{body}
		</button>
	) : (
		<div className={cn(classes, soon && 'opacity-70')} aria-disabled={soon || undefined}>
			{body}
		</div>
	);
}

type ProviderConnectDialogProps = {
	providers: BillingProviderDescriptor[];
	/** The provider billing currently runs on, if any. */
	activeProviderId?: string;
	connection?: ProviderConnection;
	/** Opens straight on a provider's credentials step. */
	initialProviderId?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Stores the credentials and makes the provider active. Reject with an Error to stay on the form. */
	onConnect: (providerId: string, values: Record<string, string>) => Promise<void> | void;
};

/**
 * Two steps: choose a provider, then enter its credentials. Choosing a
 * provider other than the active one explains the switch: new checkouts use
 * the new provider, existing subscriptions stay where they are until moved.
 */
export function ProviderConnectDialog({ providers, activeProviderId, connection, initialProviderId, open, onOpenChange, onConnect }: ProviderConnectDialogProps) {
	const [chosen, setChosen] = React.useState<string | undefined>(initialProviderId);
	// Reset to the requested step each time the dialog opens, during render so the old step never flashes.
	const [wasOpen, setWasOpen] = React.useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) setChosen(initialProviderId);
	}
	const provider = providers.find((candidate) => candidate.id === chosen);
	const active = providers.find((candidate) => candidate.id === activeProviderId);
	const switching = Boolean(provider && active && provider.id !== active.id);
	const bodyRef = React.useRef<HTMLDivElement>(null);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup
				className="max-w-lg"
				// Land on the first field or provider, not the back button, so its tooltip does not open on arrival.
				initialFocus={() => bodyRef.current?.querySelector<HTMLElement>('input, button') ?? true}
			>
				<ViewAnimation>
					<div key={provider?.id ?? 'pick'}>
						<DialogHeader className="gap-1.5 pb-3">
							<div className="flex items-center gap-2">
								{provider ? (
									<TooltipIconButton label="Back to providers" size="sm" onClick={() => startViewTransition(() => setChosen(undefined))}>
										<ArrowLeft aria-hidden="true" className="size-3.5" />
									</TooltipIconButton>
								) : null}
								<DialogTitle className="text-base font-medium">{provider ? `Connect ${provider.name}` : 'Choose a payment provider'}</DialogTitle>
							</div>
							<DialogDescription className="text-[13px]">
								{provider
									? 'Keys are stored as write-only secrets for this database and are never shown again.'
									: 'One provider handles checkout, subscriptions, and invoices at a time. You can switch later.'}
							</DialogDescription>
						</DialogHeader>
						<div ref={bodyRef} className="px-6 pb-6">
							{provider ? (
								<div className="flex flex-col gap-4">
									{switching ? (
										<div role="note" className="flex gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-[13px] text-foreground">
											<TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
											<span className="text-pretty">
												New checkouts will use {provider.name}. Existing subscriptions stay on {active!.name} until each customer is moved, so keep{' '}
												{active!.name} connected until then.
											</span>
										</div>
									) : null}
									<ProviderCredentialForm
										provider={provider}
										connection={provider.id === connection?.providerId ? connection : undefined}
										submitLabel={switching ? `Switch to ${provider.name}` : `Connect ${provider.name}`}
										onSave={async (values) => {
											await onConnect(provider.id, values);
											onOpenChange(false);
										}}
									/>
								</div>
							) : (
								<ul className="flex flex-col gap-2">
									{providers.map((candidate) => (
										<li key={candidate.id}>
											<ProviderCard
												provider={candidate}
												connection={candidate.id === connection?.providerId ? connection : undefined}
												active={candidate.id === activeProviderId}
												onSelect={() => startViewTransition(() => setChosen(candidate.id))}
											/>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</ViewAnimation>
				{provider ? null : (
					<DialogFooter variant="bare" className="pt-0">
						<Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
							Close
						</Button>
					</DialogFooter>
				)}
			</DialogPopup>
		</Dialog>
	);
}
