// The deprecated `_meta` form builder keeps every scalar field it built before the
// table model: a big whole number or a bit string column gets the kind it had, and
// is not left out of the form. Built over the captured torture `_meta`.
import { describe, expect, it } from 'vitest';

import { tortureMeta } from '../../adapter/__tests__/torture-backend';
import { findTableFormSpec } from '../form-spec-builder';
import type { MetaTable } from '../types';

describe('buildScalarFormSpec', () => {
	it('keeps big whole number and bit string fields with their earlier kinds', () => {
		const tables = (tortureMeta('baseline')._meta?.tables ?? []).filter((table): table is MetaTable => table != null);
		const spec = findTableFormSpec(tables, 'ScalarKind');
		const kindOf = (name: string) => spec?.fields.find((field) => field.name === name)?.kind;

		expect(kindOf('bigintValue')).toBe('integer');
		expect(kindOf('bitValue')).toBe('bit');
		expect(kindOf('varbitValue')).toBe('bit');
	});
});
