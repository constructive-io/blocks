'use client';

import { Coins, Gift, Sparkles } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { ToneBadge } from '../workspace-kit/primitives';
import { useBillingFormat } from './context';
import { CREDIT_SOURCE, CREDIT_TYPE, daysUntil, isUnlimited } from './format';
import { Bezel, dashedRule, EmptyState, StatusBadge } from './surface';
import type { Balance, CreditGrant, CreditPack } from './types';

/**
 * Orders grants the way the waterfall spends permanent credit: soonest
 * expiring first, non-expiring last, oldest first within a tie. Period and
 * rollover credits are part of the allowance and listed after.
 */
export function drawOrder(grants: CreditGrant[]) {
	const time = (iso?: string) => (iso ? new Date(iso).getTime() : Infinity);
	const permanent = grants
		.filter((grant) => grant.creditType === 'permanent')
		.sort((a, b) => time(a.expiresAt) - time(b.expiresAt) || time(a.createdAt) - time(b.createdAt));
	return [...permanent, ...grants.filter((grant) => grant.creditType !== 'permanent')];
}

const SEGMENTS = [
	{ key: 'plan', label: 'Plan allowance', className: 'bg-foreground/55' },
	{ key: 'period', label: 'This period', className: 'bg-foreground/30' },
	{ key: 'rollover', label: 'Rolled over', className: 'bg-chart-3/80' },
	{ key: 'permanent', label: 'Credit packs', className: 'bg-primary/80' },
] as const;

type CreditWalletProps = {
	/** The universal pool's balance. */
	balance: Balance;
	grants: CreditGrant[];
	/** Universal credits one cent buys, for the value estimate. */
	creditsPerCent?: number;
	currency?: string;
	actions?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
};

/**
 * Universal credits at a glance: what is left, what it is worth, how the
 * allowance is built from the plan, period, rollover and pack credits, and
 * the next expiry.
 */
export function CreditWallet({ balance, grants, creditsPerCent = 1, currency = 'usd', actions, className, style }: CreditWalletProps) {
	const f = useBillingFormat();
	const unlimited = isUnlimited(balance.effectiveLimit);
	const available = unlimited ? null : Math.max(0, balance.effectiveLimit - balance.currentUsage);
	// Only grants on this balance's meter count here; a code's compute or token credits live on their own meters.
	const own = grants.filter((grant) => grant.meterSlug === balance.meterSlug);
	const permanent = own.filter((grant) => grant.creditType === 'permanent').reduce((total, grant) => total + grant.remaining, 0);
	const parts: Record<(typeof SEGMENTS)[number]['key'], number> = {
		plan: Math.max(0, balance.planLimit),
		period: balance.periodCredits,
		rollover: balance.rolloverCredits,
		permanent,
	};
	const total = Object.values(parts).reduce((sum, value) => sum + value, 0) || 1;
	const expiring = drawOrder(own).find((grant) => grant.expiresAt && grant.remaining > 0);
	return (
		<Bezel className={className} style={style} innerClassName="flex flex-col">
			<div className="flex flex-col gap-4 p-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Coins aria-hidden="true" className="size-3.5" />
							Universal credits left
						</p>
						<p className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{available === null ? 'Unlimited' : f.quantity(available)}</p>
						{available !== null ? (
							<p className="text-xs text-muted-foreground tabular-nums">
								≈ {f.money({ amountMinor: Math.floor(available / creditsPerCent), currency })} of usage · {f.quantity(balance.currentUsage)} used this period
							</p>
						) : null}
					</div>
					{actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
				</div>
				<div className="flex flex-col gap-2">
					<div role="img" aria-label="How your credits are made up" className="flex h-1.5 gap-px overflow-hidden rounded-full bg-foreground/[0.07]">
						{SEGMENTS.map((segment) =>
							parts[segment.key] > 0 ? <span key={segment.key} className={segment.className} style={{ width: `${(parts[segment.key] / total) * 100}%` }} /> : null,
						)}
					</div>
					<ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
						{SEGMENTS.filter((segment) => parts[segment.key] > 0).map((segment) => (
							<li key={segment.key} className="flex items-center gap-1.5 tabular-nums">
								<span aria-hidden="true" className={cn('size-2 rounded-[3px]', segment.className)} />
								{segment.label} <span className="text-foreground">{f.quantity(parts[segment.key], true)}</span>
							</li>
						))}
					</ul>
				</div>
			</div>
			{expiring?.expiresAt ? (
				<p className={cn('border-t bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground', dashedRule)}>
					<span className="font-medium text-foreground tabular-nums">{f.quantity(expiring.remaining)}</span> credits expire {f.relative(expiring.expiresAt)} (
					{f.date(expiring.expiresAt)}). They are spent first.
				</p>
			) : null}
		</Bezel>
	);
}

type CreditGrantListProps = {
	grants: CreditGrant[];
	/** Meter display names, for grants on meters other than universal. */
	meterName?: (slug: string) => string;
	className?: string;
};

/** Every grant in the order it is spent, with what remains and when it expires. */
export function CreditGrantList({ grants, meterName, className }: CreditGrantListProps) {
	const f = useBillingFormat();
	const ordered = drawOrder(grants);
	if (ordered.length === 0) {
		return <EmptyState icon={Gift} title="No credits yet" description="Credit packs, codes, and rollovers appear here, in the order they are spent." className={className} />;
	}
	const firstSpent = ordered.find((grant) => grant.creditType === 'permanent' && grant.remaining > 0)?.id;
	return (
		<ol className={cn('flex flex-col', className)}>
			{ordered.map((grant, index) => {
				const soon = grant.expiresAt ? daysUntil(grant.expiresAt, f.now) <= 14 : false;
				return (
					<li key={grant.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 py-3', index > 0 && cn('border-t', dashedRule))}>
						<div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
							<span className="flex flex-wrap items-center gap-2">
								<span className="text-[13px] font-medium text-foreground">{grant.reason ?? CREDIT_SOURCE[grant.source]}</span>
								<StatusBadge presentation={CREDIT_TYPE[grant.creditType]} />
								{grant.id === firstSpent ? <ToneBadge tone="neutral">Spent next</ToneBadge> : null}
							</span>
							<span className="text-xs text-muted-foreground">
								{CREDIT_SOURCE[grant.source]} · {f.date(grant.createdAt)}
								{grant.meterSlug !== 'universal' && meterName ? ` · ${meterName(grant.meterSlug)}` : ''}
							</span>
						</div>
						<div className="flex w-40 flex-col gap-1">
							<div className="flex h-1 overflow-hidden rounded-full bg-foreground/[0.07]">
								<span className="rounded-full bg-primary/70" style={{ width: `${grant.amount ? (grant.remaining / grant.amount) * 100 : 0}%` }} />
							</div>
							<span className="text-xs text-muted-foreground tabular-nums">
								<span className="text-foreground">{f.quantity(grant.remaining)}</span> of {f.quantity(grant.amount)} left
							</span>
						</div>
						<span className={cn('w-28 text-right text-xs tabular-nums', soon ? 'font-medium text-warning' : 'text-muted-foreground')}>
							{grant.expiresAt ? `Expires ${f.date(grant.expiresAt, 'short')}` : grant.creditType === 'period' ? 'Resets at period end' : 'Never expires'}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

type CreditPackGridProps = {
	packs: CreditPack[];
	onBuy?: (pack: CreditPack) => void;
	/** Pack waiting on a host call. */
	pendingPackId?: string;
	/** Hides buy buttons, e.g. when the provider has no hosted checkout. */
	readOnly?: boolean;
	className?: string;
};

/** Credit packs as cards: credits, price, price per thousand, and expiry. */
export function CreditPackGrid({ packs, onBuy, pendingPackId, readOnly, className }: CreditPackGridProps) {
	const f = useBillingFormat();
	const active = packs.filter((pack) => pack.active);
	return (
		<ul className={cn('grid gap-3 @xl/view:grid-cols-2 @4xl/view:grid-cols-3', className)}>
			{active.map((pack) => (
				<li key={pack.id} className="flex">
					<Bezel muted={!pack.featured} className={cn('flex w-full', pack.featured && 'border-primary/25 bg-primary/[0.06]')} innerClassName="flex flex-col">
						<div className="flex flex-1 flex-col gap-3 p-4">
							<div className="flex items-center justify-between gap-2">
								<h3 className="text-sm font-medium text-foreground">{pack.displayName}</h3>
								{pack.featured ? (
									<ToneBadge tone="primary">
										<Sparkles aria-hidden="true" />
										Popular
									</ToneBadge>
								) : null}
							</div>
							<div>
								<p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
									{f.quantity(pack.amount)} <span className="text-sm font-normal text-muted-foreground">credits</span>
								</p>
								<p className="text-xs text-muted-foreground tabular-nums">
									{f.money({ ...pack.price, amountMinor: Math.round((pack.price.amountMinor / pack.amount) * 1000) }, { precise: true })} per 1,000
								</p>
							</div>
							{pack.description ? <p className="text-pretty text-[13px] text-muted-foreground">{pack.description}</p> : null}
						</div>
						<div className={cn('flex items-center justify-between gap-3 border-t bg-muted/50 px-4 py-2.5', dashedRule)}>
							<span className="text-xs text-muted-foreground">{pack.expiresAfterDays ? `Expires after ${pack.expiresAfterDays} days` : 'Never expires'}</span>
							{readOnly ? (
								<span className="text-sm font-medium text-foreground tabular-nums">{f.money(pack.price)}</span>
							) : (
								<Button size="xs" variant={pack.featured ? 'default' : 'outline'} disabled={pendingPackId !== undefined} aria-busy={pendingPackId === pack.id || undefined} onClick={() => onBuy?.(pack)}>
									{pendingPackId === pack.id ? 'Opening…' : `Buy for ${f.money(pack.price)}`}
								</Button>
							)}
						</div>
					</Bezel>
				</li>
			))}
		</ul>
	);
}
