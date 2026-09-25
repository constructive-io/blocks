import { isUnlimited } from '../billing-kit/format';
import type { Balance, CodeRedemption, CreditGrant, LedgerEntry, LimitCounter } from '../billing-kit/types';

export type RedeemableState = {
	balances: Balance[];
	grants: CreditGrant[];
	limits: LimitCounter[];
	ledger: LedgerEntry[];
	redemptions: CodeRedemption[];
};

function creditBalance(balance: Balance | undefined, meterSlug: string, amount: number, creditType: CreditGrant['creditType']): Balance {
	const base: Balance = balance ?? { meterSlug, planLimit: 0, currentUsage: 0, purchasedCredits: 0, periodCredits: 0, rolloverCredits: 0, effectiveLimit: 0 };
	return {
		...base,
		purchasedCredits: base.purchasedCredits + amount,
		periodCredits: base.periodCredits + (creditType === 'period' ? amount : 0),
		rolloverCredits: base.rolloverCredits + (creditType === 'rollover' ? amount : 0),
		effectiveLimit: isUnlimited(base.effectiveLimit) ? base.effectiveLimit : base.effectiveLimit + amount,
	};
}

/**
 * Shows a redemption the host confirmed: meter items become credit grants,
 * raise their balances, and get a ledger entry; limit items raise the limit.
 * The host's next `data` replaces all of this with the recorded truth.
 */
export function applyRedemption(state: RedeemableState, redemption: CodeRedemption): RedeemableState {
	let { balances, grants, limits, ledger } = state;
	for (const item of redemption.items) {
		const key = item.target.key;
		if (item.target.kind === 'limit') {
			limits = limits.map((limit) => (limit.name === key && !isUnlimited(limit.max) ? { ...limit, max: limit.max + item.amount } : limit));
			continue;
		}
		const existing = balances.find((balance) => balance.meterSlug === key);
		const credited = creditBalance(existing, key, item.amount, item.creditType);
		balances = existing ? balances.map((balance) => (balance === existing ? credited : balance)) : [...balances, credited];
		grants = [
			{
				id: `${redemption.id}:${key}`,
				meterSlug: key,
				amount: item.amount,
				remaining: item.amount,
				creditType: item.creditType,
				source: 'code',
				reason: redemption.code,
				createdAt: redemption.redeemedAt,
				expiresAt: item.expiresAt,
			},
			...grants,
		];
		ledger = [
			{
				id: `${redemption.id}:${key}:ledger`,
				at: redemption.redeemedAt,
				meterSlug: key,
				delta: item.amount,
				usageAfter: credited.currentUsage,
				ledgerClass: 'grant',
				entryType: 'credit_purchase',
				note: `Code ${redemption.code}`,
			},
			...ledger,
		];
	}
	return { balances, grants, limits, ledger, redemptions: [redemption, ...state.redemptions] };
}
