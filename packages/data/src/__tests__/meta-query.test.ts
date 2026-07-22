import { parse } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
	META_CONTRACT_VERSION,
	META_CONTRACT_INTROSPECTION_SOURCE,
	META_CONTRACT_REQUIREMENTS,
	META_QUERY_SOURCE,
	MetaContractError,
	assessMetaContract,
	assertMetaContract,
	parseMetaSearchWeights,
} from '../meta-query';
import type { MetaContractIntrospectionQuery } from '../meta-query.types';

const fields = (names: readonly string[]) => names.map((name) => ({ name }));

function compatibleContract(): MetaContractIntrospectionQuery {
	return Object.fromEntries(
		Object.entries(META_CONTRACT_REQUIREMENTS).map(([alias, requirement]) => [
			alias,
			{ name: requirement.typeName, fields: fields(requirement.fields) },
		]),
	) as MetaContractIntrospectionQuery;
}

describe('Constructive _meta contract', () => {
	it('publishes a syntactically valid query with the July capability fields', () => {
		expect(() => parse(META_CONTRACT_INTROSPECTION_SOURCE)).not.toThrow();
		expect(() => parse(META_QUERY_SOURCE)).not.toThrow();
		for (const field of ['encoding', 'enumValues', 'storage', 'search', 'i18n', 'realtime', 'scope']) {
			expect(META_QUERY_SOURCE).toContain(field);
		}
	});

	it('accepts the current contract', () => {
		expect(assessMetaContract(compatibleContract())).toEqual({
			contractVersion: META_CONTRACT_VERSION,
			status: 'compatible',
			missing: [],
		});
	});

	it('distinguishes an outdated contract from a missing _meta root', () => {
		const outdated = compatibleContract();
		outdated.metaType = { name: 'MetaType', fields: fields(['pgType', 'gqlType', 'isArray']) };
		expect(assessMetaContract(outdated)).toMatchObject({
			status: 'incompatible',
			missing: expect.arrayContaining(['MetaType.encoding']),
		});

		const unavailable = compatibleContract();
		unavailable.queryType = { name: 'Query', fields: [] };
		expect(assessMetaContract(unavailable)).toMatchObject({ status: 'unavailable' });
		expect(() => assertMetaContract(unavailable)).toThrowError(MetaContractError);
	});

	it('parses search weights without accepting malformed or non-numeric data', () => {
		expect(parseMetaSearchWeights({ boostRecent: false, weights: '{"tsvector":0.7,"vector":0.3}' })).toEqual({
			tsvector: 0.7,
			vector: 0.3,
		});
		expect(parseMetaSearchWeights({ boostRecent: false, weights: '{"vector":"high"}' })).toBeNull();
		expect(parseMetaSearchWeights({ boostRecent: false, weights: 'invalid' })).toBeNull();
	});
});
