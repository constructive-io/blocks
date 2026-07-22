import { META_CONTRACT_REQUIREMENTS, type MetaContractIntrospectionQuery } from '@constructive-io/data';

const fields = (names: readonly string[]) => names.map((name) => ({ name }));

/** Current `_meta` type signature for tests using an injected execute seam. */
export function createMetaContractFixture(): MetaContractIntrospectionQuery {
	return Object.fromEntries(
		Object.entries(META_CONTRACT_REQUIREMENTS).map(([alias, requirement]) => [
			alias,
			{ name: requirement.typeName, fields: fields(requirement.fields) },
		]),
	) as MetaContractIntrospectionQuery;
}
