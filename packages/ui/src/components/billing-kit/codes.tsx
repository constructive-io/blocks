'use client';

import { Check, Gift, Ticket } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from '../dialog';
import { Input } from '../input';
import { enterClass } from '../workspace-kit/primitives';
import { useBillingFormat } from './context';
import { CREDIT_TYPE, humanize, REDEEM_REFUSAL } from './format';
import { dashedRule, EmptyState, IconTile } from './surface';
import type { CodeRedemption, CreditCode, CreditCodeItem, CreditTarget, LimitCounter, Meter, RedeemRefusal, RedeemResult } from './types';

/* ------------------------------------------------------------------ *
 * Codes and targets
 * ------------------------------------------------------------------ */

/** Codes are case-insensitive and ignore spaces, so people can paste them however they were shared. */
export function normalizeCode(value: string) {
	return value.replace(/\s+/g, '').toUpperCase();
}

/** Upper-case letters, digits, and dashes, 3 to 32 characters. */
export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

// No 0/O or 1/I, so codes read unambiguously when typed from a screen or a slide.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A random code in groups of four, e.g. `LAUNCH-7KQM-X3TP`. Call it from an event handler, not during render. */
export function generateCode(prefix = '', length = 8) {
	const bytes = new Uint32Array(length);
	globalThis.crypto.getRandomValues(bytes);
	const body = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
		.join('')
		.replace(/(.{4})(?=.)/g, '$1-');
	const head = normalizeCode(prefix).replace(/-+$/, '');
	return head ? `${head}-${body}` : body;
}

export type CodeStatus = 'active' | 'paused' | 'expired' | 'used_up';

export const CODE_STATUS: Record<CodeStatus, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
	active: { label: 'Active', tone: 'success' },
	paused: { label: 'Paused', tone: 'warning' },
	expired: { label: 'Expired', tone: 'neutral' },
	used_up: { label: 'Used up', tone: 'neutral' },
};

export function codeStatus(code: Pick<CreditCode, 'active' | 'expiresAt' | 'maxRedemptions' | 'redemptions'>, now: string): CodeStatus {
	if (code.expiresAt && new Date(code.expiresAt).getTime() < new Date(now).getTime()) return 'expired';
	if (code.maxRedemptions !== null && code.redemptions >= code.maxRedemptions) return 'used_up';
	return code.active ? 'active' : 'paused';
}

export type TargetDescription = { label: string; unit?: string };
export type DescribeTarget = (target: CreditTarget) => TargetDescription;

/** Names code targets from the meters and limits on screen, falling back to the raw key. */
export function targetDescriber(meters: Meter[] = [], limits: (Pick<LimitCounter, 'name' | 'label'> & { unit?: string })[] = []): DescribeTarget {
	const meterBySlug = new Map(meters.map((meter) => [meter.slug, meter]));
	const limitByName = new Map(limits.map((limit) => [limit.name, limit]));
	return (target) => {
		if (target.kind === 'meter') {
			const meter = meterBySlug.get(target.key);
			return { label: meter?.displayName ?? humanize(target.key), unit: meter?.meterType === 'usage_pool' ? 'credits' : meter?.unit };
		}
		const limit = limitByName.get(target.key);
		return { label: limit?.label ?? humanize(target.key), unit: limit?.unit };
	};
}

const targetKey = (target: CreditTarget) => `${target.kind}:${target.key}`;

/* ------------------------------------------------------------------ *
 * What a code grants
 * ------------------------------------------------------------------ */

type CodeGrantListProps = {
	items: (CreditCodeItem & { expiresAt?: string })[];
	describe: DescribeTarget;
	/** One line per item, for tables. */
	compact?: boolean;
	className?: string;
};

/** "+36,000 Function time", with its credit type and how long it lasts. */
export function CodeGrantList({ items, describe, compact = false, className }: CodeGrantListProps) {
	const f = useBillingFormat();
	const lifetime = (item: CodeGrantListProps['items'][number]) =>
		item.expiresAt ? `expires ${f.date(item.expiresAt)}` : item.expiresAfterDays ? `lasts ${item.expiresAfterDays} days` : item.creditType === 'period' ? 'resets each period' : 'never expires';
	if (compact) {
		return (
			<ul className={cn('flex flex-col gap-0.5', className)}>
				{items.map((item) => {
					const target = describe(item.target);
					return (
						<li key={targetKey(item.target)} className="tabular-nums">
							<span className="text-foreground">+{f.quantity(item.amount)}</span> <span className="text-muted-foreground">{target.label}</span>
						</li>
					);
				})}
			</ul>
		);
	}
	return (
		<ul className={cn('flex flex-col', className)}>
			{items.map((item, index) => {
				const target = describe(item.target);
				return (
					<li key={targetKey(item.target)} className={cn('flex items-center gap-3 py-2.5', index > 0 && cn('border-t', dashedRule))}>
						<IconTile icon={Gift} tone="primary" />
						<span className="min-w-0 flex-1">
							<span className="block text-[13px] text-foreground">{target.label}</span>
							<span className="block text-xs text-muted-foreground">
								{CREDIT_TYPE[item.creditType].label} · {lifetime(item)}
							</span>
						</span>
						<span className="text-right tabular-nums">
							<span className="block text-sm font-semibold text-foreground">+{f.quantity(item.amount)}</span>
							{target.unit ? <span className="block text-xs text-muted-foreground">{target.unit}</span> : null}
						</span>
					</li>
				);
			})}
		</ul>
	);
}

/** The refusal copy for a result: the host's message when it sent one, else the standard line. */
export function refusalMessage(reason: RedeemRefusal, message?: string) {
	return message ?? REDEEM_REFUSAL[reason].description ?? REDEEM_REFUSAL[reason].label;
}

/* ------------------------------------------------------------------ *
 * Redeeming
 * ------------------------------------------------------------------ */

type RedeemPhase = { kind: 'form' | 'busy' } | { kind: 'refused'; reason: RedeemRefusal; message?: string } | { kind: 'redeemed'; redemption: CodeRedemption };

/** Shared state machine for the dialog and the inline field. */
function useRedeem(onRedeem: (code: string) => Promise<RedeemResult>) {
	const [phase, setPhase] = React.useState<RedeemPhase>({ kind: 'form' });
	const redeem = async (raw: string) => {
		const code = normalizeCode(raw);
		if (!code) return;
		setPhase({ kind: 'busy' });
		try {
			const result = await onRedeem(code);
			setPhase(result.status === 'redeemed' ? { kind: 'redeemed', redemption: result.redemption } : { kind: 'refused', reason: result.reason, message: result.message });
		} catch (reason) {
			setPhase({ kind: 'refused', reason: 'not_eligible', message: reason instanceof Error ? reason.message : 'That code could not be redeemed. Try again.' });
		}
	};
	return { phase, setPhase, redeem };
}

type RedeemCodeDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Redeems a normalised code. Resolve with the result; a rejection reads as a failed attempt. */
	onRedeem: (code: string) => Promise<RedeemResult>;
	describe: DescribeTarget;
	/** Prefills the field, e.g. from a `?code=` promo link. */
	initialCode?: string;
	/** Who receives the credits, for the copy. */
	accountName?: string;
	/** Shown on success, e.g. to jump to the credits view. */
	onViewCredits?: () => void;
};

/**
 * Enter a code, then see exactly what it added. Refusals stay on the form
 * with the reason; success swaps to a summary of every grant.
 */
export function RedeemCodeDialog({ open, onOpenChange, onRedeem, describe, initialCode, accountName, onViewCredits }: RedeemCodeDialogProps) {
	const [code, setCode] = React.useState(initialCode ?? '');
	const { phase, setPhase, redeem } = useRedeem(onRedeem);
	const inputId = React.useId();
	const messageId = React.useId();

	// Each opening starts on a fresh form with the latest prefill, set during render so the old result never flashes.
	const [wasOpen, setWasOpen] = React.useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setCode(initialCode ?? '');
			setPhase({ kind: 'form' });
		}
	}

	const busy = phase.kind === 'busy';
	const refused = phase.kind === 'refused' ? phase : null;

	return (
		<Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
			<DialogPopup className="max-w-md" initialFocus={() => document.getElementById(inputId)}>
				{phase.kind === 'redeemed' ? (
					<>
						<DialogHeader className="items-center gap-2 pb-3 text-center">
							<span className={cn('grid size-11 place-items-center rounded-full bg-primary/10 text-primary', enterClass)}>
								<Check aria-hidden="true" className="size-5" />
							</span>
							<DialogTitle className="text-base font-medium">Credits added</DialogTitle>
							<DialogDescription className="text-[13px]">
								<span className="font-mono text-foreground">{phase.redemption.code}</span> is redeemed{accountName ? ` on ${accountName}` : ''}.
							</DialogDescription>
						</DialogHeader>
						<div role="status" className="px-6 pb-5">
							<CodeGrantList items={phase.redemption.items} describe={describe} className="rounded-lg border border-border px-3" />
						</div>
						<DialogFooter>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => {
									setCode('');
									setPhase({ kind: 'form' });
								}}
							>
								Redeem another
							</Button>
							<Button
								size="sm"
								onClick={() => {
									onOpenChange(false);
									onViewCredits?.();
								}}
							>
								{onViewCredits ? 'View credits' : 'Done'}
							</Button>
						</DialogFooter>
					</>
				) : (
					<form
						onSubmit={(event) => {
							event.preventDefault();
							void redeem(code);
						}}
					>
						<DialogHeader className="gap-1.5 pb-3">
							<DialogTitle className="flex items-center gap-2 text-base font-medium">
								<Ticket aria-hidden="true" className="size-4 text-muted-foreground" />
								Redeem a code
							</DialogTitle>
							<DialogDescription className="text-[13px]">
								Codes add credits{accountName ? ` to ${accountName}` : ''} right away. Each account can use a code once.
							</DialogDescription>
						</DialogHeader>
						<div className="flex flex-col gap-2 px-6 pb-5">
							<label htmlFor={inputId} className="text-xs text-muted-foreground">
								Code
							</label>
							<Input
								id={inputId}
								value={code}
								onChange={(event) => {
									setCode(event.target.value);
									if (refused) setPhase({ kind: 'form' });
								}}
								placeholder="XXXX-XXXX"
								autoComplete="off"
								autoCapitalize="characters"
								spellCheck={false}
								aria-invalid={refused ? true : undefined}
								aria-describedby={refused ? messageId : undefined}
								className="h-10 font-mono text-base tracking-wider uppercase placeholder:tracking-normal"
							/>
							{refused ? (
								<p id={messageId} role="alert" className="text-[13px] text-destructive">
									{refusalMessage(refused.reason, refused.message)}
								</p>
							) : null}
						</div>
						<DialogFooter>
							<Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button type="submit" size="sm" disabled={!normalizeCode(code) || busy} aria-busy={busy || undefined}>
								{busy ? 'Checking…' : 'Redeem'}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogPopup>
		</Dialog>
	);
}

type RedeemCodeFieldProps = {
	onRedeem: (code: string) => Promise<RedeemResult>;
	describe: DescribeTarget;
	className?: string;
};

/** Inline code field that redeems and summarises the grant in place. */
export function RedeemCodeField({ onRedeem, describe, className }: RedeemCodeFieldProps) {
	const f = useBillingFormat();
	const [code, setCode] = React.useState('');
	const { phase, setPhase, redeem } = useRedeem(onRedeem);
	const inputId = React.useId();
	const messageId = React.useId();
	const busy = phase.kind === 'busy';
	const hasMessage = phase.kind === 'refused' || phase.kind === 'redeemed';

	return (
		<form
			onSubmit={async (event) => {
				event.preventDefault();
				await redeem(code);
			}}
			className={cn('flex flex-col gap-2', className)}
		>
			<label htmlFor={inputId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<Ticket aria-hidden="true" className="size-3.5" />
				Have a code?
			</label>
			<div className="flex gap-2">
				<Input
					id={inputId}
					value={code}
					onChange={(event) => {
						setCode(event.target.value);
						if (hasMessage) setPhase({ kind: 'form' });
					}}
					placeholder="XXXX-XXXX"
					autoComplete="off"
					spellCheck={false}
					size="sm"
					aria-describedby={hasMessage ? messageId : undefined}
					aria-invalid={phase.kind === 'refused' || undefined}
					className="font-mono uppercase placeholder:normal-case"
				/>
				<Button type="submit" size="sm" variant="outline" disabled={!normalizeCode(code) || busy} aria-busy={busy || undefined}>
					{busy ? 'Checking…' : 'Redeem'}
				</Button>
			</div>
			{phase.kind === 'refused' ? (
				<p id={messageId} role="alert" className="text-xs text-destructive">
					{refusalMessage(phase.reason, phase.message)}
				</p>
			) : phase.kind === 'redeemed' ? (
				<p id={messageId} role="status" className="text-xs text-success tabular-nums">
					{phase.redemption.code} added{' '}
					{phase.redemption.items.map((item) => `${f.quantity(item.amount)} ${describe(item.target).label}`).join(', ')}.
				</p>
			) : null}
		</form>
	);
}

type RedemptionListProps = {
	redemptions: CodeRedemption[];
	describe: DescribeTarget;
	/** Shows who redeemed each code, for operators. */
	showAccount?: boolean;
	className?: string;
};

/** Codes redeemed, newest first, with what each one granted. */
export function RedemptionList({ redemptions, describe, showAccount = false, className }: RedemptionListProps) {
	const f = useBillingFormat();
	if (redemptions.length === 0) {
		return <EmptyState icon={Ticket} title="No codes redeemed yet" description="Codes you redeem show up here with what they added." className={cn('py-6', className)} />;
	}
	return (
		<ol className={cn('flex flex-col', className)}>
			{[...redemptions]
				.sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt))
				.map((redemption, index) => (
					<li key={redemption.id} className={cn('flex flex-wrap items-start gap-x-4 gap-y-1 py-2.5', index > 0 && cn('border-t', dashedRule))}>
						<span className="min-w-0 flex-1 basis-40">
							<span className="block text-[13px] text-foreground">{showAccount ? (redemption.accountName ?? redemption.accountId) : <code className="font-mono">{redemption.code}</code>}</span>
							<span className="block text-xs text-muted-foreground tabular-nums">{f.date(redemption.redeemedAt, 'medium', true)}</span>
						</span>
						<CodeGrantList items={redemption.items} describe={describe} compact className="text-right text-xs" />
					</li>
				))}
		</ol>
	);
}
