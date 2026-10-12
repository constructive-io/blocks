import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecordPicker } from '../src/components/record-picker';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Contact = { id: string; name?: string; email?: string };

const contacts: Contact[] = [
	{ id: 'c1', name: 'Ada Lovelace', email: 'ada@analytical.example.com' },
	{ id: 'c2', email: 'ops@sub.department.region.example.co.uk' },
	{ id: 'c3', name: 'Grace Hopper' },
];

// Shows whatever the contact has, the way a defensive consumer would.
const label = (contact: Contact) => contact.name ?? contact.email ?? contact.id;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
	vi.useRealTimers();
});

async function render(searchFields?: string[]) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () =>
		root!.render(
			<RecordPicker
				records={contacts}
				linkedRecordIds={new Set()}
				isLinking={false}
				getRecordId={(contact: Contact) => contact.id}
				getRecordLabel={label}
				searchFields={searchFields}
				onLink={() => {}}
			/>,
		),
	);
}

async function search(query: string) {
	const input = container!.querySelector<HTMLInputElement>('input[type="text"], input:not([type])')!;
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
	await act(async () => {
		setter.call(input, query);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
	// The query is debounced before it filters.
	await act(async () => vi.advanceTimersByTime(400));
}

const rows = () => Array.from(container!.querySelectorAll('label')).map((element) => element.textContent);

describe('RecordPicker search', () => {
	it('matches the text a row shows even when it is not one of the default search fields', async () => {
		await render();
		await search('ops@sub');

		expect(rows()).toEqual(['ops@sub.department.region.example.co.uk']);
	});

	it('still searches the configured fields', async () => {
		await render(['name', 'email']);
		await search('analytical');

		// The row's label is the name, so only the email field can explain this match.
		expect(rows()).toEqual(['Ada Lovelace']);
	});

	it('shows the no-match message for a query nothing contains', async () => {
		await render();
		await search('zzz');

		expect(rows()).toEqual([]);
		expect(container!.textContent).toContain('No records match your search');
	});
});
