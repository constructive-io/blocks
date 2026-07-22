/**
 * PHASE-0 GATE — union-breadth + branch-reachability meta-test.
 *
 * This is the breadth gate over the committed goldens. It extends the spirit of
 * `__tests__/registry-fidelity.test.ts:152` ("covers every built-in factory
 * family at least once") from the ~7 representative families to the FULL
 * `CellType` union, and it pins that the resolver golden actually exercises the
 * editability branches (readonly / non-editable / viewer-only), not just the
 * happy path.
 *
 * Unlike the capture suites, this test reads the COMMITTED *.golden.json files
 * (not the live factories). It fails loudly if a future union member is added
 * without a display-golden case, or if the resolver golden is regenerated in a
 * way that drops a reachable branch — either of which would silently shrink
 * Phase-0 coverage and let the upcoming SheetsCell flip regress unobserved.
 *
 * Authoritative enumeration is `ALL_CELL_TYPES` (the runtime mirror of the
 * `CellType` union) and `CELL_TYPE_TO_DISPLAY_KIND` (the total type -> kind map),
 * both from `parity.harness`.
 */

import { describe, expect, it } from 'vitest';

import { ALL_CELL_TYPES, CELL_TYPE_TO_DISPLAY_KIND, loadGolden } from './parity.harness';

// ─── Shapes of the committed goldens this gate reads ────────────────────────

interface CellDisplayRow {
	typeKey: string;
}

interface ResolverRow {
	label: string;
	fieldName: string;
	resolution: {
		cellType: string;
		canEdit: boolean;
		canActivate: boolean;
		activationBehavior: 'single-click' | 'double-click';
		isReadonly: boolean;
	};
}

describe('PHASE-0 GATE — golden breadth + branch coverage', () => {
	// ── (1) cell-display golden covers EVERY CellType union member ──
	describe('cell-display golden covers the full CellType union', () => {
		const rows = loadGolden('cell-display.golden') as CellDisplayRow[];
		const coveredTypeKeys = new Set(rows.map((r) => r.typeKey));

		it('has at least one display-golden case per ALL_CELL_TYPES member', () => {
			const missing = ALL_CELL_TYPES.filter((t) => !coveredTypeKeys.has(t));
			expect(missing, `CellType members with no cell-display golden case: ${missing.join(', ')}`).toEqual([]);
		});

		it('introduces no display-golden typeKey outside the CellType union', () => {
			const known = new Set<string>(ALL_CELL_TYPES);
			const extras = [...coveredTypeKeys].filter((t) => !known.has(t));
			expect(extras, `cell-display golden typeKeys not in ALL_CELL_TYPES: ${extras.join(', ')}`).toEqual([]);
		});
	});

	// ── (2) CELL_TYPE_TO_DISPLAY_KIND is total over the union ──
	describe('CELL_TYPE_TO_DISPLAY_KIND has a DisplayKind for every union member', () => {
		it('maps every ALL_CELL_TYPES member to a defined DisplayKind', () => {
			const unmapped = ALL_CELL_TYPES.filter((t) => CELL_TYPE_TO_DISPLAY_KIND[t] === undefined);
			expect(unmapped, `CellType members missing a DisplayKind: ${unmapped.join(', ')}`).toEqual([]);
		});
	});

	// ── (3) resolver golden exercises the editability branches ──
	describe('resolver golden exercises readonly / non-editable / viewer-only branches', () => {
		const rows = loadGolden('resolver.golden') as ResolverRow[];

		const readonlyRows = rows.filter((r) => r.resolution.isReadonly === true);
		// READONLY_CONDITIONS keys: id (only when gqlType === UUID), createdAt, updatedAt.
		const readonlyIdUuid = readonlyRows.filter((r) => r.fieldName === 'id' && r.resolution.cellType === 'uuid');
		const readonlyCreatedAt = readonlyRows.filter((r) => r.fieldName === 'createdAt');
		const readonlyUpdatedAt = readonlyRows.filter((r) => r.fieldName === 'updatedAt');

		// NON_EDITABLE outcome: canEdit === false (whatever the cause — readonly name
		// OR NON_EDITABLE_TYPES membership).
		const nonEditableRows = rows.filter((r) => r.resolution.canEdit === false);
		// VIEWER_ONLY outcome: the viewer-only lock — NOT editable but STILL activatable
		// (canEdit false && canActivate true). In v1 only tsvector is VIEWER_ONLY.
		const viewerOnlyRows = rows.filter((r) => r.resolution.canEdit === false && r.resolution.canActivate === true);

		it('covers the id+UUID readonly branch', () => {
			expect(readonlyIdUuid.length, 'no readonly id+UUID row in resolver.golden').toBeGreaterThan(0);
		});

		it('covers the createdAt readonly branch', () => {
			expect(readonlyCreatedAt.length, 'no readonly createdAt row in resolver.golden').toBeGreaterThan(0);
		});

		it('covers the updatedAt readonly branch', () => {
			expect(readonlyUpdatedAt.length, 'no readonly updatedAt row in resolver.golden').toBeGreaterThan(0);
		});

		it('covers at least one NON_EDITABLE outcome (canEdit === false)', () => {
			expect(nonEditableRows.length, 'no canEdit:false row in resolver.golden').toBeGreaterThan(0);
		});

		it('covers at least one VIEWER_ONLY outcome (canEdit false but canActivate true)', () => {
			expect(
				viewerOnlyRows.length,
				'no viewer-only row (canEdit:false + canActivate:true) in resolver.golden',
			).toBeGreaterThan(0);
		});
	});
});
