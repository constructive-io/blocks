/**
 * Targeted GraphQL introspection for the table model.
 *
 * The model never sends the full schema query. It reads the two root types
 * once per schema and then named types with batched `__type(name:)` lookups,
 * fetched lazily for the table being opened. Every result is cached, so later
 * tables reuse the shared types (scalars, operator inputs, page info).
 */

/** Executes one GraphQL document. Hosts pass their transport (auth, endpoint). */
export type GraphQLExecutor = <TResult = unknown>(
	document: string,
	variables?: Record<string, unknown>,
) => Promise<TResult>;

export type IntrospectedTypeKind =
	| 'SCALAR'
	| 'OBJECT'
	| 'INTERFACE'
	| 'UNION'
	| 'ENUM'
	| 'INPUT_OBJECT'
	| 'LIST'
	| 'NON_NULL';

export interface IntrospectedTypeRef {
	kind: IntrospectedTypeKind;
	name: string | null;
	ofType: IntrospectedTypeRef | null;
}

export interface IntrospectedInputValue {
	name: string;
	defaultValue: string | null;
	type: IntrospectedTypeRef;
}

export interface IntrospectedField {
	name: string;
	args: readonly IntrospectedInputValue[];
	type: IntrospectedTypeRef;
}

export interface IntrospectedType {
	kind: IntrospectedTypeKind;
	name: string;
	fields: readonly IntrospectedField[] | null;
	inputFields: readonly IntrospectedInputValue[] | null;
	enumValues: readonly { name: string }[] | null;
}

export interface SchemaRoots {
	query: IntrospectedType | null;
	mutation: IntrospectedType | null;
}

/** Read access to what has been introspected so far. */
export interface SchemaTypeIndex {
	/** The root types, or null before they load. */
	readonly roots: SchemaRoots | null;
	/** A named type: `undefined` when not loaded yet, `null` when the schema has no such type. */
	get(name: string): IntrospectedType | null | undefined;
}

const TYPE_REF_SELECTION =
	'kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } }';

const NAMED_TYPE_FRAGMENT = /* GraphQL */ `
	fragment ConstructiveTypeRef on __Type { ${TYPE_REF_SELECTION} }
	fragment ConstructiveNamedType on __Type {
		kind
		name
		fields(includeDeprecated: true) {
			name
			args { name defaultValue type { ...ConstructiveTypeRef } }
			type { ...ConstructiveTypeRef }
		}
		inputFields { name defaultValue type { ...ConstructiveTypeRef } }
		enumValues(includeDeprecated: true) { name }
	}
`;

/** Root query and mutation types with every field and argument. One request per schema. */
export const SCHEMA_ROOTS_SOURCE = /* GraphQL */ `
	query ConstructiveSchemaRoots {
		__schema {
			queryType { ...ConstructiveNamedType }
			mutationType { ...ConstructiveNamedType }
		}
	}
	${NAMED_TYPE_FRAGMENT}
`;

/** Names per `__type` batch. Keeps each request bounded on very large schemas. */
const TYPE_BATCH_SIZE = 80;

/** A batch of `__type(name:)` lookups. Names travel as variables, never inlined. */
export function buildSchemaTypesSource(count: number): string {
	const variables = Array.from({ length: count }, (_, index) => `$n${index}: String!`).join(', ');
	const lookups = Array.from(
		{ length: count },
		(_, index) => `t${index}: __type(name: $n${index}) { ...ConstructiveNamedType }`,
	).join('\n\t\t');
	return /* GraphQL */ `
	query ConstructiveSchemaTypes(${variables}) {
		${lookups}
	}
	${NAMED_TYPE_FRAGMENT}
`;
}

/** The named type behind wrappers, or null for a malformed reference. */
export function namedTypeOf(ref: IntrospectedTypeRef | null | undefined): { kind: IntrospectedTypeKind; name: string } | null {
	let current = ref ?? null;
	while (current && (current.kind === 'NON_NULL' || current.kind === 'LIST')) current = current.ofType;
	return current?.name ? { kind: current.kind, name: current.name } : null;
}

/** True when a list wrapper appears anywhere in the reference. */
export function isListTypeRef(ref: IntrospectedTypeRef | null | undefined): boolean {
	let current = ref ?? null;
	while (current) {
		if (current.kind === 'LIST') return true;
		current = current.ofType;
	}
	return false;
}

/** True when the outermost wrapper is non-null. */
export function isNonNullTypeRef(ref: IntrospectedTypeRef | null | undefined): boolean {
	return ref?.kind === 'NON_NULL';
}

/** Print a type reference in SDL form, for variable definitions. */
export function printTypeRef(ref: IntrospectedTypeRef): string {
	if (ref.kind === 'NON_NULL') return ref.ofType ? `${printTypeRef(ref.ofType)}!` : '';
	if (ref.kind === 'LIST') return ref.ofType ? `[${printTypeRef(ref.ofType)}]` : '';
	return ref.name ?? '';
}

/** An argument or input field that must be provided: non-null and without a default. */
export function isRequiredInput(value: IntrospectedInputValue): boolean {
	return isNonNullTypeRef(value.type) && value.defaultValue == null;
}

export interface SchemaTypeLoader {
	/** Everything loaded so far. */
	readonly index: SchemaTypeIndex;
	/** Load the root types once; a failed load is retried on the next call. */
	loadRoots(execute: GraphQLExecutor): Promise<SchemaRoots>;
	/** Load named types that are neither cached nor in flight, batched into as few requests as possible. */
	loadTypes(execute: GraphQLExecutor, names: Iterable<string>): Promise<void>;
	/** True when the name was requested at least once (loaded, missing, or in flight). */
	wasRequested(name: string): boolean;
}

interface SchemaRootsResponse {
	__schema?: {
		queryType?: IntrospectedType | null;
		mutationType?: IntrospectedType | null;
	} | null;
}

type SchemaTypesResponse = Record<string, IntrospectedType | null | undefined>;

const GRAPHQL_NAME = /^[_A-Za-z][_0-9A-Za-z]*$/;

/** A per-schema cache of introspected types. Create one per `_meta` result. */
export function createSchemaTypeLoader(): SchemaTypeLoader {
	const types = new Map<string, IntrospectedType | null>();
	const pending = new Map<string, Promise<void>>();
	let roots: SchemaRoots | null = null;
	let rootsPromise: Promise<SchemaRoots> | null = null;

	const index: SchemaTypeIndex = {
		get roots() {
			return roots;
		},
		get(name: string) {
			return types.has(name) ? types.get(name) ?? null : undefined;
		},
	};

	function remember(type: IntrospectedType | null | undefined) {
		if (type?.name) types.set(type.name, type);
	}

	async function fetchBatch(execute: GraphQLExecutor, names: readonly string[]): Promise<void> {
		const variables = Object.fromEntries(names.map((name, position) => [`n${position}`, name]));
		const response = await execute<SchemaTypesResponse>(buildSchemaTypesSource(names.length), variables);
		names.forEach((name, position) => {
			const type = response?.[`t${position}`] ?? null;
			types.set(name, type && type.name === name ? type : null);
		});
	}

	return {
		index,
		wasRequested(name) {
			return types.has(name) || pending.has(name);
		},
		loadRoots(execute) {
			if (roots) return Promise.resolve(roots);
			if (rootsPromise) return rootsPromise;
			const request = execute<SchemaRootsResponse>(SCHEMA_ROOTS_SOURCE).then((response) => {
				const loaded: SchemaRoots = {
					query: response?.__schema?.queryType ?? null,
					mutation: response?.__schema?.mutationType ?? null,
				};
				remember(loaded.query);
				remember(loaded.mutation);
				roots = loaded;
				return loaded;
			});
			rootsPromise = request;
			request.catch(() => {
				if (rootsPromise === request) rootsPromise = null;
			});
			return request;
		},
		async loadTypes(execute, names) {
			const wanted = [...new Set(names)].filter((name) => GRAPHQL_NAME.test(name));
			const fresh = wanted.filter((name) => !types.has(name) && !pending.has(name));
			const inFlight = wanted.flatMap((name) => {
				const promise = pending.get(name);
				return promise ? [promise] : [];
			});

			const batches: Promise<void>[] = [];
			for (let start = 0; start < fresh.length; start += TYPE_BATCH_SIZE) {
				const batch = fresh.slice(start, start + TYPE_BATCH_SIZE);
				const request = fetchBatch(execute, batch).finally(() => {
					for (const name of batch) if (pending.get(name) === request) pending.delete(name);
				});
				for (const name of batch) pending.set(name, request);
				batches.push(request);
			}
			await Promise.all([...batches, ...inFlight]);
		},
	};
}
