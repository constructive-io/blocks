import * as React from 'react';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type AiModel, type ModelSelection, ModelSelector } from '../src/components/ai/model-selector';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

const LEVELS = [
	{ id: 'low', label: 'Low' },
	{ id: 'medium', label: 'Medium' },
	{ id: 'high', label: 'High' },
];

const MODELS: AiModel[] = [
	{ id: 'claude', name: 'Claude 5', provider: 'Anthropic', levels: LEVELS, defaultLevel: 'medium', pricing: { input: 5, output: 25 } },
	{ id: 'gpt', name: 'GPT-5', provider: 'OpenAI', levels: LEVELS, defaultLevel: 'low', pricing: { input: 1.25, output: 10 } },
	{ id: 'scout', name: 'Scout', provider: 'Meta', pricing: { input: 0, output: 0 }, tags: ['free'] },
	{ id: 'old', name: 'Legacy', provider: 'OpenAI', disabled: true, disabledReason: 'Retired' },
];

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let latest: ModelSelection | undefined;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
	Element.prototype.scrollIntoView ??= function scrollIntoView() {};
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	document.body.innerHTML = '';
	vi.unstubAllGlobals();
});

function Harness() {
	const [value, setValue] = useState<ModelSelection>({ modelId: 'claude', levelId: 'medium' });
	latest = value;
	return <ModelSelector models={MODELS} value={value} onValueChange={setValue} recentIds={['claude']} />;
}

async function render() {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(<Harness />));
}

const trigger = () => document.querySelector<HTMLButtonElement>('button[aria-label^="Model"]')!;
const option = (name: string) =>
	[...document.querySelectorAll<HTMLElement>('[cmdk-item]')].find((item) => item.textContent?.includes(name));

async function click(element: HTMLElement | null | undefined) {
	if (!element) throw new Error('Element not found');
	await act(async () => element.click());
}

describe('ModelSelector', () => {
	it('labels the trigger with the model and its level', async () => {
		await render();
		expect(trigger().getAttribute('aria-label')).toBe('Model: Claude 5, Medium');
	});

	it('selects a model at its default level and closes', async () => {
		await render();
		await click(trigger());
		await click(option('GPT-5'));
		expect(latest).toEqual({ modelId: 'gpt', levelId: 'low' });
		expect(document.querySelector('[cmdk-item]')).toBeNull();
	});

	it('picks a level from the side card for the highlighted model', async () => {
		await render();
		await click(trigger());
		const high = [...document.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((radio) => radio.textContent === 'High');
		await click(high);
		expect(latest).toEqual({ modelId: 'claude', levelId: 'high' });
	});

	it('keeps disabled models unselectable and shows why', async () => {
		await render();
		await click(trigger());
		const legacy = option('Legacy');
		expect(legacy?.getAttribute('aria-disabled')).toBe('true');
		expect(legacy?.textContent).toContain('Retired');
	});

	it('switches between relative cost and prices per million', async () => {
		await render();
		await click(trigger());
		expect(option('GPT-5')?.querySelector('[role="img"]')?.getAttribute('aria-label')).toMatch(/Cost tier [1-4] of 4/);
		await click(document.querySelector<HTMLButtonElement>('[aria-label="Show prices per million tokens"]'));
		expect(option('GPT-5')?.textContent).toContain('$1.25');
		expect(option('Scout')?.textContent).toContain('Free');
	});
});
