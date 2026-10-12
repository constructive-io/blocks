import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Progress } from '../src/components/progress';

function renderProgress(props: React.ComponentProps<typeof Progress>) {
	const container = document.createElement('div');
	container.innerHTML = renderToStaticMarkup(<Progress {...props} />);
	return {
		root: container.querySelector<HTMLElement>('[data-slot="progress"]'),
		indicator: container.querySelector<HTMLElement>('[data-slot="progress-indicator"]'),
	};
}

describe('Progress', () => {
	it('derives indicator width from custom min and max values', () => {
		const { root, indicator } = renderProgress({ min: 50, max: 150, value: 100 });

		expect(root?.getAttribute('aria-valuemin')).toBe('50');
		expect(root?.getAttribute('aria-valuemax')).toBe('150');
		expect(root?.getAttribute('aria-valuenow')).toBe('100');
		expect(indicator?.style.width).toBe('50%');
	});

	it('preserves a determinate zero value', () => {
		const { root, indicator } = renderProgress({ value: 0 });

		expect(root?.getAttribute('aria-valuenow')).toBe('0');
		expect(root?.hasAttribute('data-indeterminate')).toBe(false);
		expect(indicator?.style.width).toBe('0%');
	});

	it('clamps finite values into the range and flags values over the maximum', () => {
		const over = renderProgress({ value: 142 });
		expect(over.root?.getAttribute('aria-valuenow')).toBe('100');
		expect(over.indicator?.style.width).toBe('100%');
		expect(over.root?.hasAttribute('data-overflow')).toBe(true);
		expect(over.indicator?.hasAttribute('data-overflow')).toBe(true);

		const under = renderProgress({ value: -3 });
		expect(under.root?.getAttribute('aria-valuenow')).toBe('0');
		expect(under.indicator?.style.width).toBe('0%');
		expect(under.root?.hasAttribute('data-overflow')).toBe(false);

		const exact = renderProgress({ value: 100 });
		expect(exact.indicator?.style.width).toBe('100%');
		expect(exact.root?.hasAttribute('data-overflow')).toBe(false);

		const custom = renderProgress({ min: 50, max: 150, value: 20 });
		expect(custom.root?.getAttribute('aria-valuenow')).toBe('50');
		expect(custom.indicator?.style.width).toBe('0%');
	});

	it.each([
		['NaN', { value: Number.NaN }],
		['Infinity', { value: Number.POSITIVE_INFINITY }],
		['-Infinity', { value: Number.NEGATIVE_INFINITY }],
		['undefined', { value: undefined }],
		['a zero-width range', { value: 5, max: 0 }],
		['an inverted range', { value: 5, min: 20, max: 10 }],
	])('treats %s as indeterminate instead of drawing a full bar', (_label, props) => {
		const { root, indicator } = renderProgress(props);

		expect(root?.hasAttribute('data-indeterminate')).toBe(true);
		expect(root?.hasAttribute('aria-valuenow')).toBe(false);
		expect(indicator?.hasAttribute('data-indeterminate')).toBe(true);
		expect(indicator?.style.width).toBe('');
	});

	it('lets Base UI expose null as indeterminate progress', () => {
		const { root, indicator } = renderProgress({ value: null });

		expect(root?.hasAttribute('data-indeterminate')).toBe(true);
		expect(root?.hasAttribute('aria-valuenow')).toBe(false);
		expect(indicator?.hasAttribute('data-indeterminate')).toBe(true);
		expect(indicator?.style.width).toBe('');
	});
});
