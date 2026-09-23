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

const box = (index: number) => container!.querySelector<HTMLInputElement>(`[aria-label="Digit ${index} of 6"]`)!;
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

async function press(input: HTMLInputElement, key: string) {
	await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
}

describe('InputOtp', () => {
	it('fills a box and advances focus as digits are typed', async () => {
		await render(<Harness />);
		await type(box(1), '4');
		expect(value()).toBe('4');
		expect(document.activeElement).toBe(box(2));
	});

	it('ignores non-digits', async () => {
		await render(<Harness />);
		await type(box(1), 'a');
		expect(value()).toBe('');
	});

	it('distributes a pasted or autofilled code and reports completion', async () => {
		const onComplete = vi.fn();
		await render(<Harness onComplete={onComplete} />);
		await paste(box(3), '123 456');
		expect(value()).toBe('123456');
		expect(onComplete).toHaveBeenCalledWith('123456');
	});

	it('clears in place, then steps back on an empty box', async () => {
		await render(<Harness />);
		await paste(box(1), '12');
		await press(box(2), 'Backspace');
		expect(value()).toBe('1');
		await press(box(2), 'Backspace');
		expect(value()).toBe('');
		expect(document.activeElement).toBe(box(1));
	});

	it('marks every box invalid without putting aria-invalid on the group', async () => {
		await render(<InputOtp isInvalid aria-label="Verification code" />);
		const group = container!.querySelector('[role="group"]')!;
		expect(group.getAttribute('aria-label')).toBe('Verification code');
		expect(group.hasAttribute('aria-invalid')).toBe(false);
		expect(box(1).getAttribute('aria-invalid')).toBe('true');
	});
});
