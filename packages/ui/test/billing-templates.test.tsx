import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BILLING_ACCOUNT_DEMO, BillingAccount, type BillingAccountAction, demoRedeemCode, type PlanChangeRequest } from '../src/components/billing-account';
import { BILLING_CONSOLE_DEMO, BILLING_CONSOLE_TENANT_DEMO, BillingConsole, type CreditCodeDraft, type EntitlementChange } from '../src/components/billing-console';
import { DEMO_NOW } from '../src/components/billing-kit';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// React 19.3's ViewTransition names host nodes with CSS.escape, which jsdom lacks.
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
// Base UI's switch dispatches PointerEvents, which jsdom does not implement.
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

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
		(query: string) =>
			({
				matches: false,
				media: query,
				addEventListener() {},
				removeEventListener() {},
				addListener() {},
				removeListener() {},
				onchange: null,
				dispatchEvent: () => false,
			}) as MediaQueryList,
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

const text = () => document.body.textContent ?? '';
const buttonNamed = (name: string | RegExp) =>
	[...document.body.querySelectorAll<HTMLButtonElement>('button')].find((element) => {
		const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
		return typeof name === 'string' ? label === name || element.textContent?.trim() === name : name.test(label);
	});
const byLabel = (label: string) => document.body.querySelector<HTMLElement>(`[aria-label="${label}"]`);

async function click(element: HTMLElement | null | undefined) {
	if (!element) throw new Error('Element not found');
	await act(async () => element.click());
}

async function type(input: HTMLInputElement | null, value: string) {
	if (!input) throw new Error('Input not found');
	await act(async () => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
		setter.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

describe('BillingAccount', () => {
	it('previews a downgrade, schedules it for the period end, and lets the customer keep their plan', async () => {
		const onChangePlan = vi.fn<(request: PlanChangeRequest) => Promise<void>>().mockResolvedValue(undefined);
		const onAction = vi.fn<(action: BillingAccountAction) => void>();
		await render(<BillingAccount data={BILLING_ACCOUNT_DEMO} now={DEMO_NOW} onChangePlan={onChangePlan} onAction={onAction} />);

		await click(buttonNamed('Plans'));
		await click(buttonNamed('Switch to Pro'));

		const dialog = document.body.querySelector('[role="dialog"]');
		expect(dialog?.textContent).toContain('Switch to Pro');
		expect(dialog?.textContent).toContain('7 databases in use; Pro allows 5.');
		const periodEnd = [...document.body.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((input) => input.value === 'period_end');
		expect(periodEnd?.checked).toBe(true);

		await click(buttonNamed('Schedule change'));
		expect(onChangePlan).toHaveBeenCalledWith(expect.objectContaining({ timing: 'period_end', checkout: false, plan: expect.objectContaining({ name: 'pro' }) }));
		expect(text()).toContain('Moving to Pro on Oct 1, 2026');

		await click(buttonNamed('Keep Team'));
		expect(onAction).toHaveBeenCalledWith({ type: 'cancel-scheduled-change' });
		expect(text()).not.toContain('Moving to Pro');
	});

	it('keeps the preview open with the host’s message when a change is refused', async () => {
		const onChangePlan = vi.fn().mockRejectedValue(new Error('The card on file expired.'));
		await render(<BillingAccount data={BILLING_ACCOUNT_DEMO} now={DEMO_NOW} defaultView="plans" onChangePlan={onChangePlan} />);

		await click(buttonNamed('Switch to Free'));
		await click(buttonNamed('Schedule change'));
		expect(document.body.querySelector('[role="dialog"] [role="alert"]')?.textContent).toBe('The card on file expired.');
	});

	it('only offers the views the host can back', async () => {
		await render(<BillingAccount data={BILLING_ACCOUNT_DEMO} now={DEMO_NOW} views={['overview', 'plans']} />);
		expect(buttonNamed('Plans')).toBeDefined();
		expect(buttonNamed(/^Usage/)).toBeUndefined();
		expect(buttonNamed('Invoices')).toBeUndefined();
		expect(buttonNamed('Buy credits')).toBeUndefined();
	});

	it('redeems a gift code from a promo link and shows what it added', async () => {
		const redeem = demoRedeemCode(BILLING_ACCOUNT_DEMO);
		const onRedeemCode = vi.fn(redeem);
		await render(<BillingAccount data={BILLING_ACCOUNT_DEMO} now={DEMO_NOW} initialRedeemCode="hackweek-2026" onRedeemCode={onRedeemCode} />);

		const dialog = () => document.body.querySelector('[role="dialog"]');
		expect((dialog()?.querySelector('input') as HTMLInputElement).value).toBe('hackweek-2026');
		await click(buttonNamed('Redeem'));
		expect(onRedeemCode).toHaveBeenCalledWith('HACKWEEK-2026');
		expect(dialog()?.textContent).toContain('Credits added');
		expect(dialog()?.textContent).toContain('+25,000');
		expect(dialog()?.textContent).toContain('Model input tokens');

		await click(buttonNamed('View credits'));
		const codesPanel = [...document.body.querySelectorAll('section')].find((section) => section.querySelector('h2')?.textContent === 'Codes you redeemed');
		expect(codesPanel?.textContent).toContain('HACKWEEK-2026');
		expect(codesPanel?.textContent).toContain('LAUNCH-2026');

		const field = document.body.querySelector<HTMLInputElement>('input[placeholder="XXXX-XXXX"]');
		await type(field, 'launch-2026');
		await click(buttonNamed('Redeem'));
		expect(document.body.querySelector('[role="alert"]')?.textContent).toBe('This account has already redeemed this code.');
	});

	it('hides redeeming from members and when the host cannot redeem', async () => {
		await render(<BillingAccount data={BILLING_ACCOUNT_DEMO} now={DEMO_NOW} />);
		expect(buttonNamed('Redeem code')).toBeUndefined();
	});
});

describe('BillingConsole', () => {
	it('keeps billing locked until readiness passes, then turns it on through the host', async () => {
		const onToggleBilling = vi.fn().mockResolvedValue(undefined);
		const onRunReadinessCheck = vi.fn().mockResolvedValue({
			checkedAt: DEMO_NOW,
			ready: true,
			checks: BILLING_CONSOLE_TENANT_DEMO.health.checks.map((check) => ({ ...check, status: 'pass' as const })),
		});
		await render(
			<BillingConsole
				data={BILLING_CONSOLE_TENANT_DEMO}
				now={DEMO_NOW}
				defaultView="provider"
				onToggleBilling={onToggleBilling}
				onRunReadinessCheck={onRunReadinessCheck}
			/>,
		);

		const toggle = () => document.body.querySelector<HTMLElement>('[role="switch"][aria-describedby]');
		expect(text()).toContain('Locked until readiness passes.');
		expect(toggle()?.hasAttribute('data-disabled')).toBe(true);

		await click(buttonNamed('Check now'));
		expect(onRunReadinessCheck).toHaveBeenCalled();
		expect(text()).toContain('Ready to bill');
		expect(toggle()?.hasAttribute('data-disabled')).toBe(false);

		await click(toggle());
		expect(onToggleBilling).toHaveBeenCalledWith(true);
		expect(text()).toContain('Billing is on');
	});

	it('keeps catalog toggles and unsaved entitlement edits when the operator moves around', async () => {
		await render(<BillingConsole data={BILLING_CONSOLE_TENANT_DEMO} now={DEMO_NOW} defaultView="catalog" />);
		const tab = (name: string) => [...document.body.querySelectorAll<HTMLElement>('[role="radio"]')].find((element) => element.textContent?.includes(name));

		await click(tab('Meters'));
		const meterSwitch = () => byLabel('Pause Session summaries') ?? byLabel('Resume Session summaries');
		await click(meterSwitch());
		expect(meterSwitch()?.getAttribute('aria-label')).toBe('Resume Session summaries');

		await click(tab('Entitlements'));
		const cell = byLabel('Active clients for Plus') as HTMLInputElement;
		await type(cell, '60');
		await act(async () => cell.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));

		await click(tab('Plans & prices'));
		await click(tab('Entitlements'));
		expect(text()).toContain('1 unsaved change');

		await click(buttonNamed('Overview'));
		await click(buttonNamed('Catalog'));
		await click(tab('Meters'));
		expect(meterSwitch()?.getAttribute('aria-label')).toBe('Resume Session summaries');
	});

	it('saves entitlement edits as one batch of changes', async () => {
		const onSaveEntitlements = vi.fn<(changes: EntitlementChange[]) => Promise<void>>().mockResolvedValue(undefined);
		await render(<BillingConsole data={BILLING_CONSOLE_TENANT_DEMO} now={DEMO_NOW} defaultView="catalog" onSaveEntitlements={onSaveEntitlements} />);

		const tab = [...document.body.querySelectorAll<HTMLElement>('[role="radio"]')].find((element) => element.textContent?.includes('Entitlements'));
		await click(tab);
		const cell = byLabel('Active clients for Plus') as HTMLInputElement;
		await type(cell, '60');
		await act(async () => cell.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
		expect(text()).toContain('1 unsaved change');

		await click(buttonNamed('Save changes'));
		expect(onSaveEntitlements).toHaveBeenCalledWith([{ planId: 'tplan-plus', kind: 'limit', key: 'clients', value: 60 }]);
		expect(text()).toContain('Entitlements saved');
	});

	it('creates a gift code and a bulk batch through the host', async () => {
		const onSaveCode = vi.fn<(draft: CreditCodeDraft) => Promise<void>>().mockResolvedValue(undefined);
		const onCreateCodes = vi.fn<(drafts: CreditCodeDraft[]) => Promise<void>>().mockResolvedValue(undefined);
		await render(<BillingConsole data={BILLING_CONSOLE_DEMO} now={DEMO_NOW} defaultView="catalog" onSaveCode={onSaveCode} onCreateCodes={onCreateCodes} />);
		await click([...document.body.querySelectorAll<HTMLElement>('[role="radio"]')].find((element) => element.textContent?.includes('Gift codes')));

		await click(buttonNamed('New code'));
		const dialog = () => document.body.querySelector('[role="dialog"]')!;
		await type(dialog().querySelector<HTMLInputElement>('input[placeholder="LAUNCH-2026"]'), 'gift 100');
		await type(dialog().querySelector<HTMLInputElement>('input[placeholder="36000"]'), '20000');
		await click(buttonNamed('Create code'));
		expect(onSaveCode).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'GIFT100', maxRedemptions: 100, active: true, items: [expect.objectContaining({ amount: 20_000, target: { kind: 'meter', key: 'universal' } })] }),
			undefined,
		);
		expect(document.body.textContent).toContain('GIFT100');

		await click(buttonNamed('Bulk create'));
		const count = dialog().querySelector<HTMLInputElement>('input[inputmode="numeric"]');
		await type(count, '3');
		await type(dialog().querySelector<HTMLInputElement>('input[placeholder="HACK"]'), 'summit');
		await type(dialog().querySelector<HTMLInputElement>('input[placeholder="36000"]'), '15000');
		await click(buttonNamed('Create 3 codes'));
		const drafts = onCreateCodes.mock.calls[0]![0];
		expect(drafts).toHaveLength(3);
		expect(new Set(drafts.map((draft) => draft.code)).size).toBe(3);
		expect(drafts.every((draft) => draft.code.startsWith('SUMMIT-') && draft.maxRedemptions === 1)).toBe(true);
		expect(dialog().textContent).toContain('3 codes created');
	});
});
