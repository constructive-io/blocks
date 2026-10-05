import * as React from 'react';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InputOtp } from '../src/components/input-otp';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
});

async function render(node: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(node));
}

function Harness({ onComplete }: { onComplete?: (value: string) => void }) {
	const [value, setValue] = useState('');
	return (
		<>
			<InputOtp value={value} onChange={setValue} onComplete={onComplete} groupEvery={3} />
			<output data-testid="value">{value}</output>
		</>
	);
}

const field = () => container!.querySelector<HTMLInputElement>('input')!;
const slots = () => Array.from(container!.querySelectorAll('[data-slot="input-otp-slot"]'));
const value = () => container!.querySelector('[data-testid="value"]')!.textContent;

async function type(input: HTMLInputElement, text: string) {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
	await act(async () => {
		setter.call(input, text);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

async function paste(input: HTMLInputElement, text: string) {
	const event = new Event('paste', { bubbles: true, cancelable: true });
	Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
	await act(async () => input.dispatchEvent(event));
}

describe('InputOtp', () => {
	it('mirrors the single field into one slot per digit', async () => {
		await render(<Harness />);
		await type(field(), '42');
		expect(value()).toBe('42');
		expect(slots().map((slot) => slot.textContent)).toEqual(['4', '2', '', '', '', '']);
	});

	it('drops non-digits', async () => {
		await render(<Harness />);
		await type(field(), '4a');
		expect(value()).toBe('4');
	});

	it('strips separators from a pasted code and reports completion', async () => {
		const onComplete = vi.fn();
		await render(<Harness onComplete={onComplete} />);
		await act(async () => field().setSelectionRange(0, 0));
		await paste(field(), '123 456');
		expect(value()).toBe('123456');
		expect(onComplete).toHaveBeenCalledWith('123456');
	});

	it('lets a complete code replace the value wherever the caret is', async () => {
		await render(<Harness />);
		await type(field(), '99');
		await act(async () => field().setSelectionRange(1, 1));
		await paste(field(), '123456');
		expect(value()).toBe('123456');
	});

	it('completes again only when a full code changes', async () => {
		const onComplete = vi.fn();
		await render(<Harness onComplete={onComplete} />);
		await type(field(), '123456');
		await paste(field(), '123456');
		expect(onComplete).toHaveBeenCalledTimes(1);
		await type(field(), '123457');
		expect(onComplete).toHaveBeenLastCalledWith('123457');
		expect(onComplete).toHaveBeenCalledTimes(2);
	});

	it('highlights the slot the caret lands on when focused', async () => {
		await render(<Harness />);
		await type(field(), '12');
		await act(async () => field().focus());
		expect(slots()[2].hasAttribute('data-highlighted')).toBe(true);
		expect(slots().filter((slot) => slot.hasAttribute('data-highlighted'))).toHaveLength(1);
	});

	it('exposes one labelled field and marks it invalid', async () => {
		await render(<InputOtp isInvalid aria-label="Verification code" />);
		expect(container!.querySelectorAll('input')).toHaveLength(1);
		expect(field().getAttribute('aria-label')).toBe('Verification code');
		expect(field().getAttribute('aria-invalid')).toBe('true');
		expect(slots().every((slot) => slot.getAttribute('aria-hidden') === 'true')).toBe(true);
	});
});
