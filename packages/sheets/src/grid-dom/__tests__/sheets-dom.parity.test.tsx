/* @vitest-environment jsdom */
//
// CAPSTONE test (post-cutover). The TanStack DOM grid is the ONLY render path; the
// canvas glide grid is gone, so this proves two things over the all-cell-types
// showcase fixture the Storybook showcase renders:
//
//   • DOM mount — the real public <Sheets __impl='dom'> is rendered through the
//     in-memory mock adapter (createMockAdapter + the showcase fixture) in jsdom,
//     exactly as the stories do, and we wait for it to populate (role="gridcell"
//     nodes appear once the mock query resolves). This is the genuine DOM render
//     path on the showcase data, drawing zero canvas.
//
//   • Display golden — for every (row, column) the native pipeline
//     (createSheetsCell -> projectSheetsCell) projects to a stable
//     { displayText, copyText } pair, frozen in `sheets-dom.golden.json`. With the
//     glide reference removed, the native projection IS the source of truth; the
//     committed golden locks it so a future regression to the dispatcher/factories
//     over the showcase fixture is caught. Cell types are resolved through the
//     PRODUCTION channel `resolveCellType(name, fieldMeta)` (reads field.type.pgAlias)
//     — the same resolution useSheetsContent performs at runtime.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

import { SheetsProvider } from '../../context/sheets-provider';
import type { SheetsConfig } from '../../context/sheets-context';
import { Sheets } from '../../grid/sheets';
import { buildAllCellTypesTable, makeRows } from '../../stories/_support/fixtures';
import { createMockAdapter } from '../../stories/_support/mock-adapter';
import { resolveCellType, type FieldMetadata } from '../../cell-types/cell-type-resolver';
import { createSheetsCell } from '../../cell-model/create-sheets-cell';
import {
	makeMetadata,
	fakeGeometrySheetsCell,
	RELATION_INFO_BELONGS_TO,
} from '../../grid/__golden__/display-cases';
import { assertOrUpdateGolden, projectSheetsCell } from '../../grid/__golden__/parity.harness';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import type { MetaField } from '../../forms/types';
import type { SheetsRow } from '../../grid/row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── Shared showcase fixture (the all-cell-types table the showcase renders) ─────────────────────
const TABLE = buildAllCellTypesTable();
const TABLE_NAME = TABLE.name; // 'demo'
const ROWS: SheetsRow[] = makeRows(TABLE, 12, 7);
const FIELDS = (TABLE.fields ?? []) as MetaField[];

// Build the CellCreationMetadata the grid would build for a column: cellType resolved through the
// PRODUCTION channel (resolveCellType reads field.type.pgAlias), relationInfo supplied for the
// relation column exactly as useSheetsContent does (the relation factory keys canHandle on the
// resolved 'relation' cellType, so display parity needs the same metadata).
function metadataForField(field: MetaField): CellCreationMetadata {
	const fieldMeta = field as unknown as FieldMetadata;
	const { cellType } = resolveCellType(field.name, fieldMeta);
	const isRelation = cellType === 'relation';
	return makeMetadata(cellType, {
		fieldName: field.name,
		fieldMeta,
		...(isRelation ? { relationInfo: RELATION_INFO_BELONGS_TO, relationOptions: {} } : {}),
	});
}

const proto = window.HTMLElement.prototype;

describe('CAPSTONE — DOM grid renders + projects the showcase fixture (frozen golden)', () => {
	let root: Root;
	let container: HTMLDivElement;
	const origW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const origH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
	const origRect = proto.getBoundingClientRect;

	beforeEach(() => {
		// jsdom does no layout; shim element geometry so TanStack Virtual emits a realistic, bounded
		// window (sized scroll element + a real per-row height the row virtualizer measures).
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
		if (origW) Object.defineProperty(proto, 'offsetWidth', origW);
		else delete (proto as unknown as Record<string, unknown>).offsetWidth;
		if (origH) Object.defineProperty(proto, 'offsetHeight', origH);
		else delete (proto as unknown as Record<string, unknown>).offsetHeight;
		proto.getBoundingClientRect = origRect;
	});

	it('mounts the real DOM grid over the showcase fixture and it populates', async () => {
		const adapter = createMockAdapter({ table: TABLE, rows: ROWS });
		const config: SheetsConfig = {
			endpoint: 'mock://parity',
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
						<Sheets tableName={TABLE_NAME} __impl='dom' />
					</SheetsProvider>
				</div>,
			);
		});

		// Poll for the grid to populate after the async mock query resolves.
		await waitFor(() => {
			expect(container.querySelector('[data-part-id="sheets-viewport"]')).not.toBeNull();
			expect(container.querySelector('[data-impl="dom"]')).not.toBeNull();
			expect(container.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
		});

		// Zero canvas on the DOM render path.
		expect(container.querySelectorAll('canvas').length).toBe(0);
	});

	it('projects each (row, column) of the showcase fixture to the frozen golden', () => {
		// The native DOM pipeline is the ONLY display path now, so its projection IS the
		// source of truth — frozen here so a dispatcher/factory regression over the showcase
		// fixture is caught. cell types are resolved through the production resolver.
		const rows = FIELDS.map((field) => {
			const meta = metadataForField(field);
			const cells = ROWS.map((row, r) => {
				const value = (row as Record<string, unknown>)[field.name];
				const { displayText, copyText } = projectSheetsCell(createSheetsCell(value, meta, fakeGeometrySheetsCell));
				return { row: r, displayText, copyText };
			});
			return { field: field.name, cellType: meta.cellType, cells };
		});

		// Guard against a vacuous golden: the fixture must actually exercise every column × row.
		const assertions = rows.reduce((n, f) => n + f.cells.length, 0);
		expect(assertions).toBe(FIELDS.length * ROWS.length);
		expect(FIELDS.length).toBeGreaterThanOrEqual(46);

		assertOrUpdateGolden('sheets-dom.golden', rows);
	});
});

// ─── Minimal async poller (no @testing-library in this package; mirrors the smoke-test idiom) ─────
async function waitFor(assert: () => void, { timeout = 4000, interval = 25 } = {}): Promise<void> {
	const start = Date.now();
	let lastError: unknown;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		try {
			await act(async () => {
				await Promise.resolve();
			});
			assert();
			return;
		} catch (error) {
			lastError = error;
			if (Date.now() - start > timeout) throw lastError;
			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, interval));
			});
		}
	}
}
