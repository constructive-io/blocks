import * as React from 'react';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type AskAnswer, AskCard } from '../src/components/ai/ask-card';

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

const QUESTIONS = [
	{
		id: 'where',
		question: 'Where should the digest go?',
		options: [
			{ id: 'slack', label: 'Post it to #support-leads' },
			{ id: 'here', label: 'Keep it here' },
		],
	},
];

function Harness({ onSubmit }: { onSubmit?: (answer: AskAnswer) => void }) {
	const [answer, setAnswer] = useState<AskAnswer | undefined>();
	return (
		<AskCard
			questions={QUESTIONS}
			answer={answer}
			onSubmit={(choices) => {
				setAnswer({ choices });
				onSubmit?.({ choices });
			}}
			onSkip={() => setAnswer({ skipped: true })}
		/>
	);
}

const button = (name: string) =>
	[...container!.querySelectorAll('button')].find((element) => element.textContent?.trim() === name)!;
const radio = (name: string) =>
	[...container!.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((element) => element.textContent?.includes(name))!;

async function click(element: HTMLElement) {
	await act(async () => element.click());
}

describe('AskCard', () => {
	it('enables Continue only once every question has an answer', async () => {
		const onSubmit = vi.fn();
		await render(<Harness onSubmit={onSubmit} />);

		expect(button('Continue').disabled).toBe(true);
		await click(radio('Keep it here'));
		expect(radio('Keep it here').getAttribute('aria-checked')).toBe('true');
		expect(button('Continue').disabled).toBe(false);

		await click(button('Continue'));
		expect(onSubmit).toHaveBeenCalledWith({ choices: { where: { option: 'here' } } });
	});

	it('accepts free text and settles into a summary chip', async () => {
		await render(<Harness />);
		const input = container!.querySelector<HTMLInputElement>('input[type="text"]')!;
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
		await act(async () => {
			setter.call(input, 'Email it to me');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		await click(button('Continue'));

		const card = container!.querySelector('[data-slot="ask-card"]')!;
		expect(card.getAttribute('data-state')).toBe('answered');
		expect(card.textContent).toContain('“Email it to me”');
	});

	it('marks every question skipped', async () => {
		await render(<Harness />);
		await click(button('Skip'));
		expect(container!.textContent).toContain('Skipped');
		expect(container!.querySelector('[role="radio"]')).toBeNull();
	});
});
