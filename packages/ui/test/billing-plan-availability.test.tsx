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
