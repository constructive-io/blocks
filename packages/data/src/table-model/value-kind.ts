import type { MetaschemaField } from '../meta-query.types';
import type { IntrospectedType } from './schema-introspection';
import type { TypeLookup } from './type-lookup';
import type { ColumnFileModel, ColumnSemantic, ColumnValueKind } from './types';

/** Encoding kinds `_meta` reports, mapped to the value kind they settle. */
const KIND_BY_ENCODING: Readonly<Record<string, ColumnValueKind>> = {
	datetime: 'datetime',
	date: 'date',
	time: 'time',
	interval: 'interval',
	uuid: 'uuid',
	geojson: 'geometry',
	point: 'point',
	inet: 'network',
	ltree: 'path',
	vector: 'vector',
	bytea: 'binary',
	composite: 'composite',
};

/** Value types without an encoding, identified by their codec name (text value domains included). */
const KIND_BY_CODEC: Readonly<Record<string, ColumnValueKind>> = {
	tsvector: 'fulltext',
	bit: 'bitstring',
	varbit: 'bitstring',
	macaddr: 'network',
	macaddr8: 'network',
	json: 'json',
	jsonb: 'json',
	email: 'text',
	url: 'text',
	hostname: 'text',
	origin: 'text',
};

/** Standard scalars, mapped to the value kind they carry. */
const KIND_BY_SCALAR: Readonly<Record<string, ColumnValueKind>> = {
	String: 'text',
	ID: 'text',
	Int: 'integer',
	Float: 'float',
	Boolean: 'boolean',
	UUID: 'uuid',
	JSON: 'json',
	BigInt: 'bigint',
	BigFloat: 'decimal',
	Datetime: 'datetime',
	Date: 'date',
	Time: 'time',
	GeoJSON: 'geometry',
	InternetAddress: 'network',
	CidrAddress: 'network',
	MacAddress: 'network',
	LTree: 'path',
	FullText: 'fulltext',
	BitString: 'bitstring',
	Base64EncodedBinary: 'binary',
};

const SEMANTIC_DOMAINS: ReadonlySet<ColumnSemantic> = new Set<ColumnSemantic>([
	'email',
	'url',
	'hostname',
	'origin',
	'image',
	'upload',
	'attachment',
	'currency',
]);

const FILE_DOMAINS: ReadonlySet<string> = new Set(['image', 'upload', 'attachment']);

/** Codec name of one element: `uploadArray` -> `upload`. */
function elementCodecName(field: MetaschemaField): string {
	const pgType = field.type.pgType ?? '';
	return field.type.isArray && pgType.endsWith('Array') ? pgType.slice(0, -'Array'.length) : pgType;
}

/** True for an object type shaped like a range: `start` and `end` bounds with `value` and `inclusive`. */
export function isRangeType(type: IntrospectedType | null, lookup: TypeLookup): boolean {
	if (!type || type.kind !== 'OBJECT') return false;
	const names = new Set((type.fields ?? []).map((field) => field.name));
	if (names.size !== 2 || !names.has('start') || !names.has('end')) return false;
	return ['start', 'end'].every((bound) => {
		const boundType = lookup.typeOf(lookup.field(type, bound)?.type);
		const boundFields = new Set((boundType?.fields ?? []).map((field) => field.name));
		return boundFields.has('value') && boundFields.has('inclusive');
	});
}

/** File column details from `_meta`, or from the file value domains when the server predates them. */
export function columnFile(field: MetaschemaField): ColumnFileModel | null {
	const meta = field.file;
	if (meta?.kind && FILE_DOMAINS.has(meta.kind)) {
		return {
			kind: meta.kind as ColumnFileModel['kind'],
			multiple: meta.isMultiple ?? field.type.isArray,
			filesType: meta.filesType ?? null,
		};
	}
	const codec = elementCodecName(field);
	if (!FILE_DOMAINS.has(codec)) return null;
	return { kind: codec as ColumnFileModel['kind'], multiple: field.type.isArray, filesType: null };
}

export function columnSemantic(field: MetaschemaField, file: ColumnFileModel | null): ColumnSemantic | null {
	if (file) return file.kind;
	const codec = elementCodecName(field) as ColumnSemantic;
	return SEMANTIC_DOMAINS.has(codec) ? codec : null;
}

/**
 * What a column's values are. `_meta` settles most kinds (enum labels,
 * encodings, codec names); the introspected output type settles enums and
 * ranges; the scalar name covers the plain cases. The first match wins.
 */
export function columnValueKind(
	field: MetaschemaField,
	outputType: IntrospectedType | null,
	file: ColumnFileModel | null,
	lookup: TypeLookup,
): ColumnValueKind {
	if (file) return 'file';
	if (outputType?.kind === 'ENUM' || field.enumValues?.name) return 'enum';
	const encoding = field.type.encoding?.kind;
	if (encoding === 'bigint') return field.type.gqlType === 'BigFloat' ? 'decimal' : 'bigint';
	if (encoding && KIND_BY_ENCODING[encoding]) return KIND_BY_ENCODING[encoding];
	if (isRangeType(outputType, lookup)) return 'range';
	const codecKind = KIND_BY_CODEC[elementCodecName(field)];
	if (codecKind) return codecKind;
	const scalarName = outputType?.kind === 'SCALAR' ? outputType.name : field.type.gqlType;
	return KIND_BY_SCALAR[scalarName] ?? 'unknown';
}
