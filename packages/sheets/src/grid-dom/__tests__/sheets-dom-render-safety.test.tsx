/* @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

import { SheetsProvider } from '../../context/sheets-provider';
import type { SheetsConfig } from '../../context/sheets-context';
import { Sheets } from '../../grid/sheets';
import { buildAllCellTypesTable, makeRows } from '../../stories/_support/fixtures';
import { createMockAdapter } from '../../stories/_support/mock-adapter';
import type { SheetsRow } from '../../grid/row-model';

// Regression guard: v9 `useTable` runs `table.setOptions(...)` DURING render, so SheetsDomInner
// must subscribe to NOTHING (`() => null` selector in use-sheets-table-instance.ts) — otherwise the
// render-phase store write triggers React's "Cannot update a component while rendering a different
// component" warning. This mounts the real DOM grid and asserts that warning never fires.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const TABLE = buildAllCellTypesTable();
const ROWS: SheetsRow[] = makeRows(TABLE, 12, 7);
const proto = window.HTMLElement.prototype;

describe('SheetsDomInner render safety', () => {
	let root: Root;
	let container: HTMLDivElement;
	const oW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const oH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
	const oR = proto.getBoundingClientRect;
	beforeEach(() => {
		Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => 1200 });
		Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 800 });
		proto.getBoundingClientRect = function () {
			return { width: 1200, height: 33, top: 0, left: 0, right: 1200, bottom: 33, x: 0, y: 0, toJSON() {} } as DOMRect;
		};
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});
	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		if (oW) Object.defineProperty(proto, 'offsetWidth', oW);
		if (oH) Object.defineProperty(proto, 'offsetHeight', oH);
		proto.getBoundingClientRect = oR;
	});

	it('renders with no setState-during-render warning', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const adapter = createMockAdapter({ table: TABLE, rows: ROWS });
		const config: SheetsConfig = {
			endpoint: 'mock://x',
			auth: { mode: 'embedded', getToken: () => 't' },
			adapter,
			queryClient: new QueryClient({
				defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
			}),
		};
		await act(async () => {
			root.render(
				<div style={{ height: 800, width: 1200, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
					<SheetsProvider config={config}>
						<Sheets tableName={TABLE.name} __impl='dom' />
					</SheetsProvider>
				</div>,
			);
		});
		for (let i = 0; i < 20; i++) {
			await act(async () => {
				await new Promise((r) => setTimeout(r, 25));
			});
			if (container.querySelector('[role="gridcell"]')) break;
		}
		const offenders = spy.mock.calls.filter((c) =>
			/while rendering a different component|Cannot update a component/.test(String(c[0])),
		);
		spy.mockRestore();
		expect(offenders).toHaveLength(0);
	});
});
