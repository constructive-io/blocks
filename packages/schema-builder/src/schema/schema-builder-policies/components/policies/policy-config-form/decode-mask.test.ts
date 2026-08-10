import { describe, expect, it } from 'vitest';

import type { CapabilityNode } from '../../../lib/gql/hooks/schema-builder/policies/use-capabilities';
import { decodeMask } from './dynamic-form-field';

const bit = (bitnum: number, width = 64) => '0'.repeat(width - 1 - bitnum) + '1' + '0'.repeat(bitnum);

const capability = (name: string, bitnum: number, kind: CapabilityNode['kind'] = 'permission'): CapabilityNode => ({
	id: name,
	name,
	bitnum,
	bitstr: bit(bitnum),
	description: null,
	kind,
});

const catalog = [
	capability('admin_members', 0),
	capability('create_entity', 4),
	capability('add_credits', 6),
	capability('level.trusted', 40, 'level'),
];

describe('decodeMask', () => {
	it('names the bits the mask sets', () => {
		const mask = bit(0).split('');
		mask[63 - 6] = '1';
		expect(decodeMask(mask.join(''), catalog, 'permission')).toEqual(['admin_members', 'add_credits']);
	});

	it('returns nothing for an empty mask', () => {
		expect(decodeMask('0'.repeat(64), catalog, 'permission')).toEqual([]);
	});

	it('keeps levels out of the capability picker and vice versa', () => {
		expect(decodeMask(bit(40), catalog, 'permission')).toEqual([]);
		expect(decodeMask(bit(40), catalog, 'level')).toEqual(['level.trusted']);
	});

	// A policy compiled before the module grew is narrower than the catalog's
	// bitstrings; bits are numbered from the right, so both still line up.
	it('reads a mask narrower than the catalog', () => {
		expect(decodeMask(bit(4, 17), catalog, 'permission')).toEqual(['create_entity']);
	});
});
