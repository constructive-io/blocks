'use client';

import { CalendarClock, CircleAlert, CreditCard, Hourglass, type LucideIcon, OctagonAlert, ShieldAlert } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { TextShimmer } from '../ai/text-shimmer';
import { useBillingFormat } from './context';
import { LIFECYCLE, type Tone } from './format';
import { IconTile, StatusBadge, TONE_COLOR } from './surface';
import type { BillingLifecycle, DatabaseStanding, Subscription } from './types';

export function LifecycleBadge({ lifecycle, className }: { lifecycle: BillingLifecycle; className?: string }) {
	return <StatusBadge presentation={LIFECYCLE[lifecycle]} className={className} />;
}

type NoticeProps = {
	tone: Tone;
	icon: LucideIcon;
	title: React.ReactNode;
	description?: React.ReactNode;
	actions?: React.ReactNode;
	className?: string;
	/** `alert` for states that block work; `status` (default) for everything else. */
	role?: 'alert' | 'status';
};

/** Tinted inline notice: icon tile, title and copy, actions on the right. */
export function Notice({ tone, icon, title, description, actions, className, role = 'status' }: NoticeProps) {
	const color = tone === 'neutral' ? null : TONE_COLOR[tone];
	return (
		<div
			role={role}
			className={cn('flex flex-wrap items-start gap-3 rounded-xl border px-3.5 py-3', color ? null : 'border-border bg-muted/50', className)}
			style={
				color
					? {
							borderColor: `color-mix(in oklab, ${color} 28%, transparent)`,
							backgroundColor: `color-mix(in oklab, ${color} 7%, var(--card))`,
						}
					: undefined
			}
		>
			<IconTile icon={icon} tone={tone} />
			<div className="min-w-0 flex-1 basis-56 pt-0.5">
				<p className="text-sm font-medium text-foreground">{title}</p>
				{description ? <div className="mt-0.5 text-pretty text-[13px] text-muted-foreground">{description}</div> : null}
			</div>
			{actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 self-center">{actions}</div> : null}
		</div>
	);
}

type BillingStatusBannerProps = {
	lifecycle: BillingLifecycle;
	subscription?: Subscription;
	/** Display name for a plan id, used by the scheduled-change notice. */
	planName?: (planId: string) => string;
	/** Databases this account owns; suspended ones are listed in the notice. */
	databases?: DatabaseStanding[];
	/** Renders the next step for the state, e.g. "Update payment method". */
	renderActions?: (state: BannerState) => React.ReactNode;
	className?: string;
};

export type BannerState = 'grace' | 'suspended' | 'checkout_pending' | 'review_required' | 'scheduled_change' | 'admin_hold' | 'unsubscribed' | 'ended';

/**
 * The one notice an account needs right now, in priority order: an admin
 * hold, a billing suspension, the grace period, a checkout still settling, a
 * provider change awaiting review, then a scheduled plan change. Renders
 * nothing when the account is in good standing.
 */
export function BillingStatusBanner({ lifecycle, subscription, planName, databases = [], renderActions, className }: BillingStatusBannerProps) {
	const f = useBillingFormat();
	const held = databases.filter((database) => database.suspendedReason === 'admin');
	const suspended = databases.filter((database) => database.suspendedReason === 'billing');
	const names = (list: DatabaseStanding[]) => list.map((database) => database.name).join(', ');

	let state: BannerState | null = null;
	let notice: Omit<NoticeProps, 'actions'> | null = null;

	if (held.length > 0) {
		state = 'admin_hold';
		notice = {
			tone: 'danger',
			icon: ShieldAlert,
			role: 'alert',
			title: held.length === 1 ? `${held[0]!.name} is on hold` : `${held.length} databases are on hold`,
			description: `A platform admin paused ${held.length === 1 ? 'this database' : names(held)}. Contact support to lift the hold.`,
		};
	} else if (lifecycle === 'suspended' || suspended.length > 0) {
		state = 'suspended';
		notice = {
			tone: 'danger',
			icon: OctagonAlert,
			role: 'alert',
			title: 'Billing suspended',
			description: (
				<>
					The grace period ended with no capacity left{suspended.length > 0 ? `, so ${names(suspended)} stopped serving requests` : ''}. Paying the open
					invoice, changing plan, or adding credits restores service right away.
				</>
			),
		};
	} else if (lifecycle === 'grace') {
		state = 'grace';
		const deadline = subscription?.graceDeadlineAt;
		notice = {
			tone: 'warning',
			icon: Hourglass,
			title: 'Payment failed',
			description: deadline ? (
				<>
					Service continues until <span className="font-medium text-foreground tabular-nums">{f.date(deadline)}</span> ({f.relative(deadline)}). Update the
					payment method to avoid a suspension.
				</>
			) : (
				'Service continues through the grace period. Update the payment method to avoid a suspension.'
			),
		};
	} else if (lifecycle === 'checkout_pending') {
		state = 'checkout_pending';
		notice = {
			tone: 'info',
			icon: CreditCard,
			title: <TextShimmer className="font-medium">Confirming your payment</TextShimmer>,
			description: 'The provider is settling the checkout. Your new plan applies as soon as it confirms; this usually takes a few seconds.',
		};
	} else if (lifecycle === 'review_required') {
		state = 'review_required';
		notice = {
			tone: 'warning',
			icon: CircleAlert,
			title: 'A billing change needs review',
			description: 'A provider update could not be confirmed. Nothing was charged twice; support will reconcile it and let you know.',
		};
	} else if (subscription?.scheduledChange) {
		state = 'scheduled_change';
		const change = subscription.scheduledChange;
		notice = {
			tone: 'info',
			icon: CalendarClock,
			title: `Moving to ${planName?.(change.planId) ?? change.planId} on ${f.date(change.effectiveAt)}`,
			description:
				change.state === 'preparing'
					? 'Scheduling the change with the provider.'
					: 'You keep everything in your current plan until then. Cancel the change any time before it takes effect.',
		};
	} else if (lifecycle === 'unsubscribed' || lifecycle === 'ended') {
		state = lifecycle;
		notice = {
			tone: 'neutral',
			icon: CreditCard,
			title: lifecycle === 'ended' ? 'Your subscription ended' : 'No plan yet',
			description: 'Pick a plan for higher limits and more included usage.',
		};
	}

	if (!state || !notice) return null;
	return <Notice {...notice} actions={renderActions?.(state)} className={className} />;
}
