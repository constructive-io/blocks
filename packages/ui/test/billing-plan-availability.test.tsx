import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	isPlanAvailable,
	PLATFORM_COMPARISON_ROWS,
	PLATFORM_PLANS,
	type Plan,
	PlanChangeDialog,
	PlanComparison,
	PriceTag,
} from '../src/components/billing-kit';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal(
		'matchMedia',
		(query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as MediaQueryList,
	);
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.unstubAllGlobals();
});

async function render(node: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(node));
}

const free = PLATFORM_PLANS.find((plan) => plan.id === 'plan-free')!;
const pro = PLATFORM_PLANS.find((plan) => plan.id === 'plan-pro')!;
const enterprise = PLATFORM_PLANS.find((plan) => plan.id === 'plan-enterprise')!;

/** A paid plan whose only price was retired while the plan itself stays active. */
const legacy: Plan = {
	...pro,
	id: 'plan-starter-2024',
	name: 'starter-2024',
	displayName: 'Starter 2024 (legacy)',
	prices: [{ id: 'price-starter-2024', interval: 'month', usageType: 'licensed', amount: { amountMinor: 1_900, currency: 'usd' }, active: false }],
	recommended: false,
};

const text = () => document.body.textContent ?? '';
const buttonNamed = (name: RegExp) => [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((element) => name.test(element.textContent?.trim() ?? ''));

describe('a plan with no active price', () => {
	it('is available only when something can be bought, or the plan is priced by sales or is the free fallback', () => {
		expect(isPlanAvailable(free)).toBe(true);
		expect(isPlanAvailable(pro)).toBe(true);
		expect(isPlanAvailable(enterprise)).toBe(true);
		expect(isPlanAvailable({ ...free, prices: [] })).toBe(true);
		expect(isPlanAvailable(legacy)).toBe(false);
		expect(isPlanAvailable({ ...legacy, prices: [] })).toBe(false);
		expect(isPlanAvailable({ ...legacy, prices: [...legacy.prices, { ...legacy.prices[0]!, id: 'price-new', active: true }] })).toBe(true);
	});

	it('is hidden from the comparison, while the free plan still reads as free', async () => {
		await render(<PlanComparison plans={[free, legacy, pro]} currentPlanId={free.id} interval="month" rows={PLATFORM_COMPARISON_ROWS} />);
		expect(text()).not.toContain('Starter 2024 (legacy)');
		expect(text()).toContain('Free');
		expect(text()).toContain('Pro');
	});

	it('stays visible as the account’s own plan, priced as unavailable rather than free', async () => {
		await render(<PlanComparison plans={[free, legacy, pro]} currentPlanId={legacy.id} interval="month" rows={PLATFORM_COMPARISON_ROWS} />);
		expect(text()).toContain('Starter 2024 (legacy)');
		expect(text()).toContain('Unavailable');
		expect(text()).toContain('No longer offered');
	});

	it('shows a subscription its own price even after that price was retired', async () => {
		await render(<PriceTag plan={legacy} interval="month" price={legacy.prices[0]} />);
		expect(text()).toContain('$19');
		expect(text()).not.toContain('Unavailable');
	});

	it('is refused in the change dialog instead of being offered as "No charge"', async () => {
		const onConfirm = vi.fn();
		await render(
			<PlanChangeDialog open onOpenChange={() => {}} currentPlan={free} targetPlan={legacy} interval="month" rows={PLATFORM_COMPARISON_ROWS} onConfirm={onConfirm} />,
		);
		expect(text()).toContain('No longer offered.');
		expect(text()).not.toContain('No charge.');
		const confirm = buttonNamed(/^Unavailable$/);
		expect(confirm).toBeDefined();
		expect(confirm!.disabled).toBe(true);
		await act(async () => confirm!.click());
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('leaves the dialog working for a plan that can be bought', async () => {
		const onConfirm = vi.fn();
		await render(<PlanChangeDialog open onOpenChange={() => {}} currentPlan={free} targetPlan={pro} interval="month" rows={PLATFORM_COMPARISON_ROWS} onConfirm={onConfirm} />);
		const confirm = buttonNamed(/Upgrade now/);
		expect(confirm?.disabled).toBe(false);
		await act(async () => confirm!.click());
		expect(onConfirm).toHaveBeenCalledOnce();
	});
});

const monthlyPrice = { id: 'price-solo-month', interval: 'month', usageType: 'licensed', amount: { amountMinor: 4_900, currency: 'usd' }, active: true } as const;
const yearlyPrice = { id: 'price-solo-year', interval: 'year', usageType: 'licensed', amount: { amountMinor: 49_000, currency: 'usd' }, active: true } as const;
const withPrices = (name: string, prices: Plan['prices']): Plan => ({ ...pro, id: `plan-${name}`, name, displayName: name, prices, recommended: false });
const yearlyOnly = withPrices('Annual only', [yearlyPrice]);
const monthlyOnly = withPrices('Monthly only', [monthlyPrice]);
const both = withPrices('Both', [monthlyPrice, yearlyPrice]);

const description = () => document.body.querySelector('[data-slot="dialog-description"]')?.textContent ?? '';

describe('the price a plan is shown, previewed and handed over with', () => {
	it('names the price period from the price the dialog charges, not from the interval switch', async () => {
		const onConfirm = vi.fn();
		await render(<PlanChangeDialog open onOpenChange={() => {}} currentPlan={free} targetPlan={yearlyOnly} interval="month" rows={[]} onConfirm={onConfirm} />);
		expect(description()).toBe('$490 per year.');
		await act(async () => buttonNamed(/Upgrade now/)!.click());
		expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ price: expect.objectContaining({ id: 'price-solo-year', interval: 'year' }) }));
	});

	it('still reads per month for a monthly price and per year when the yearly price is the one chosen', async () => {
		await render(<PlanChangeDialog open onOpenChange={() => {}} currentPlan={free} targetPlan={both} interval="month" rows={[]} onConfirm={() => {}} />);
		expect(description()).toBe('$49 per month.');
		await act(async () => root!.render(<PlanChangeDialog open onOpenChange={() => {}} currentPlan={free} targetPlan={both} interval="year" rows={[]} onConfirm={() => {}} />));
		expect(description()).toBe('$490 per year.');
		await act(async () => root!.render(<PlanChangeDialog open onOpenChange={() => {}} currentPlan={free} targetPlan={monthlyOnly} interval="year" rows={[]} onConfirm={() => {}} />));
		expect(description()).toBe('$49 per month.');
	});

	it('hands onSelect the price its card shows, even when it is not the toggled interval', async () => {
		const onSelect = vi.fn();
		await render(<PlanComparison plans={[free, yearlyOnly, both, enterprise]} currentPlanId={free.id} interval="month" rows={[]} onSelect={onSelect} />);
		expect(text()).toContain('$490/yr');
		await act(async () => buttonNamed(/Upgrade to Annual only/)!.click());
		expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'plan-Annual only' }), expect.objectContaining({ id: 'price-solo-year' }));
		await act(async () => buttonNamed(/Upgrade to Both/)!.click());
		expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'plan-Both' }), expect.objectContaining({ id: 'price-solo-month' }));
		await act(async () => buttonNamed(/Talk to sales/)!.click());
		expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'plan-enterprise' }), undefined);
	});

	it('shows the account its own retired price instead of "Unavailable" when the host passes it', async () => {
		await render(<PlanComparison plans={[free, legacy, pro]} currentPlanId={legacy.id} currentPrice={legacy.prices[0]} interval="month" rows={[]} />);
		expect(text()).toContain('$19/mo');
		expect(text()).not.toContain('Unavailable');
		expect(text()).not.toContain('No longer offered');
		// Only the account's own plan takes the price; a retired plan the account is not on stays unavailable.
		await act(async () => root!.render(<PlanComparison plans={[free, legacy, pro]} currentPlanId={pro.id} currentPrice={pro.prices[0]} interval="month" rows={[]} />));
		expect(text()).not.toContain('Starter 2024');
	});

	it('compares an active current price at the chosen interval, and shows a retired price on a plan that is otherwise on offer', async () => {
		const yearly = pro.prices.find((price) => price.interval === 'year')!;
		await render(<PlanComparison plans={[free, pro]} currentPlanId={pro.id} currentPrice={yearly} interval="month" rows={[]} />);
		expect(text()).toContain('$25/mo');
		expect(text()).not.toContain('$250/yr');
		// A grandfathered price: the plan sells at $25 today, but this account pays $19.
		const grandfathered = { ...pro.prices[0]!, id: 'price-pro-2023', amount: { amountMinor: 1_900, currency: 'usd' }, active: false };
		await act(async () => root!.render(<PlanComparison plans={[free, { ...pro, prices: [...pro.prices, grandfathered] }]} currentPlanId={pro.id} currentPrice={grandfathered} interval="month" rows={[]} />));
		expect(text()).toContain('$19/mo');
		expect(text()).not.toContain('$25/mo');
	});
});
