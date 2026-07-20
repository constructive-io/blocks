import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../src/components/select';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
});

describe('Select transitions', () => {
	it('defines both entering and exiting popup states', async () => {
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		activeRoots.add(root);

		await act(async () => {
			root.render(
				<Select defaultOpen defaultValue="one">
					<SelectTrigger aria-label="Value">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="one">One</SelectItem>
					</SelectContent>
				</Select>,
			);
		});

		const popup = document.querySelector('[data-slot="select-popup"]');
		expect(popup?.className).toContain('data-starting-style:opacity-0');
		expect(popup?.className).toContain('data-ending-style:opacity-0');
		expect(popup?.className).not.toContain('has-data-starting-style');
	});
});
