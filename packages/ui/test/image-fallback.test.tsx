import * as React from 'react';
import { act } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { Source } from '../src/components/ai/source';
import { PersonAvatar } from '../src/components/data-rooms/parts';
import type { Person } from '../src/components/data-rooms';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const person = { id: 'person-dana', name: 'Dana Chen', email: 'dana@example.com', avatarUrl: 'https://img.invalid/dana.png' } as Person;

const cases = [
	{ name: 'a person avatar', element: (url = 'https://img.invalid/dana.png') => <PersonAvatar person={{ ...person, avatarUrl: url }} />, fallback: 'DC' },
	{ name: 'a source favicon', element: (url = 'https://img.invalid/fav.png') => <Source href="https://example.com/a" title="example.com" favicon={url} />, fallback: 'document glyph' },
];

type Settled = 'loading' | 'loaded' | 'broken' | 'broken, no decode()' | 'svg without intrinsic size';

/** What a browser reports for an `<img>` once its request has finished, which jsdom does not model. */
function settle(image: HTMLImageElement, state: Settled) {
	const define = (name: string, value: unknown) => Object.defineProperty(image, name, { value, configurable: true });
	if (state === 'loading') return define('complete', false);
	define('complete', true);
	define('naturalWidth', state === 'loaded' ? 24 : 0);
	if (state === 'broken') define('decode', () => Promise.reject(new DOMException('The source image cannot be decoded.', 'EncodingError')));
	if (state === 'svg without intrinsic size') define('decode', () => Promise.resolve());
	if (state === 'broken, no decode()') define('decode', undefined);
}

let container: HTMLDivElement | undefined;
afterEach(() => container?.remove());

const hasImage = () => Boolean(container!.querySelector('img'));
const settleMicrotasks = () => act(async () => {});

describe.each(cases)('$name whose image fails', ({ element, fallback }) => {
	// The avatar falls back to initials, the favicon to a document glyph (the chip's other icon is the external-link arrow).
	const shown = () => (fallback === 'document glyph' ? Boolean(container!.querySelector('svg.opacity-70')) : container!.textContent === fallback);

	async function serverRendered(state: Settled, url?: string) {
		container = document.createElement('div');
		document.body.appendChild(container);
		container.innerHTML = renderToString(element(url));
		settle(container.querySelector('img')!, state);
		let root!: ReturnType<typeof hydrateRoot>;
		await act(async () => {
			root = hydrateRoot(container!, element(url));
		});
		await settleMicrotasks();
		return root;
	}

	it('shows its fallback when the client renders it and the image then errors', async () => {
		container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		await act(async () => root.render(element()));
		expect(hasImage()).toBe(true);
		await act(async () => container!.querySelector('img')!.dispatchEvent(new Event('error')));
		expect(hasImage()).toBe(false);
		expect(shown()).toBe(true);
	});

	it('shows its fallback when the image had already failed before the server-rendered page hydrated', async () => {
		await serverRendered('broken');
		expect(hasImage()).toBe(false);
		expect(shown()).toBe(true);
	});

	it('also does when the browser cannot decode() to double-check', async () => {
		await serverRendered('broken, no decode()');
		expect(hasImage()).toBe(false);
		expect(shown()).toBe(true);
	});

	it('keeps an image that loaded, including an svg that reports no natural size', async () => {
		await serverRendered('loaded');
		expect(hasImage()).toBe(true);
		container!.remove();
		await serverRendered('svg without intrinsic size');
		expect(hasImage()).toBe(true);
	});

	it('waits for an image that is still loading, and falls back if it fails later', async () => {
		await serverRendered('loading');
		expect(hasImage()).toBe(true);
		await act(async () => container!.querySelector('img')!.dispatchEvent(new Event('error')));
		expect(hasImage()).toBe(false);
		expect(shown()).toBe(true);
	});

	it('tries the next image after the first one failed', async () => {
		const root = await serverRendered('broken', 'https://img.invalid/one.png');
		expect(hasImage()).toBe(false);
		await act(async () => root.render(element('https://img.invalid/two.png')));
		expect(hasImage()).toBe(true);
	});
});
