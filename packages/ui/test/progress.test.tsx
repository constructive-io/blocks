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

	it('lets Base UI expose null as indeterminate progress', () => {
		const { root, indicator } = renderProgress({ value: null });

		expect(root?.hasAttribute('data-indeterminate')).toBe(true);
		expect(root?.hasAttribute('aria-valuenow')).toBe(false);
		expect(indicator?.hasAttribute('data-indeterminate')).toBe(true);
		expect(indicator?.style.width).toBe('');
	});
});
