import type {
	MetaschemaField,
	MetaschemaForeignKeyConstraint,
	MetaschemaTable,
	MetaschemaTableBelongsToRelation,
	MetaschemaTableHasRelation,
	MetaschemaTableManyToManyRelation,
} from '../meta-query.types';
import { getRowIdentityDefinition } from '../row-identity';
import { createRecordOf } from './build-operations';
import { resolveDisplayFieldsFromCandidates, type DisplayCandidate } from './display-fields';
import {
	isListTypeRef,
	isRequiredInput,
	namedTypeOf,
	type IntrospectedField,
	type IntrospectedType,
	type SchemaRoots,
} from './schema-introspection';
import { tableKeyForName, tableKeyOf } from './table-key';
import type { TypeLookup } from './type-lookup';
import type {
	DisplayFieldOverrides,
	ModelIssue,
	RelationJunctionModel,
	RelationKeyPair,
	RelationModelKind,
	RelationModel,
	RelationTargetModel,
} from './types';
import { columnValueKind } from './value-kind';

export interface RelationsContext {
	table: MetaschemaTable;
	tables: readonly MetaschemaTable[];
	rowType: IntrospectedType | null;
	filterType: IntrospectedType | null;
	roots: SchemaRoots;
	lookup: TypeLookup;
	issues: ModelIssue[];
	displayOverrides?: DisplayFieldOverrides;
}

function names(fields: ReadonlyArray<MetaschemaField | null> | null | undefined): string[] {
	return (fields ?? []).flatMap((field) => (field?.name ? [field.name] : []));
}

function sameNames(left: readonly string[], right: readonly string[]): boolean {
	return left.length === right.length && left.every((name, position) => right[position] === name);
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
	const set = new Set(left);
	return left.length === right.length && right.every((name) => set.has(name));
}

function foreignKeysOf(table: MetaschemaTable): MetaschemaForeignKeyConstraint[] {
	const nested = Array.isArray(table.constraints) ? null : table.constraints?.foreignKey;
	return (nested ?? table.foreignKeyConstraints ?? []).filter(
		(constraint): constraint is MetaschemaForeignKeyConstraint => constraint != null,
	);
}

function fieldOf(table: MetaschemaTable | undefined, name: string): MetaschemaField | null {
	return table?.fields?.find((field) => field?.name === name) ?? null;
}

function isRequiredField(field: MetaschemaField | null): boolean {
	return Boolean(field?.isNotNull ?? field?.type.isNotNull);
}

/** Identity and label fields of related records, from the related table's `_meta` and row type. */
function relationTarget(
	target: MetaschemaTable | undefined,
	lookup: TypeLookup,
	overrides: DisplayFieldOverrides | undefined,
): { target: RelationTargetModel; rowType: IntrospectedType | null } {
	if (!target) return { target: { primaryKey: [], labelFields: [] }, rowType: null };
	const rowType = lookup.type(target.name);
	const identity = getRowIdentityDefinition(target);
	const primaryKey = identity.status === 'keyed' ? identity.fields.map((field) => field.fieldName) : [];

	const candidates: DisplayCandidate[] = (target.fields ?? []).flatMap((field) => {
		if (!field) return [];
		const rowField = lookup.field(rowType, field.name);
		const named = namedTypeOf(rowField?.type);
		const isLeaf = Boolean(rowField && named && (named.kind === 'SCALAR' || named.kind === 'ENUM') && !rowField.args.some(isRequiredInput));
		const outputType: IntrospectedType | null = named
			? { kind: named.kind, name: named.name, fields: null, inputFields: null, enumValues: null }
			: null;
		return [{
			name: field.name,
			kind: columnValueKind(field, outputType, null, lookup),
			isArray: field.type.isArray,
			isLeaf,
			isPrimaryKey: primaryKey.includes(field.name),
			isForeignKey: field.isForeignKey === true,
		}];
	});
	const leafNames = new Set(candidates.filter((candidate) => candidate.isLeaf).map((candidate) => candidate.name));
	const display = resolveDisplayFieldsFromCandidates(
		{ key: tableKeyOf(target), name: target.name },
		candidates,
		primaryKey,
		overrides,
	);
	return {
		target: {
			primaryKey: primaryKey.every((name) => leafNames.has(name)) ? primaryKey : [],
			labelFields: display.fields,
		},
		rowType,
	};
}

interface FieldShape {
	shape: RelationModel['shape'];
	pageArg: string | null;
	hasTotalCount: boolean;
}

/** What the relation field returns, proven against the row type. Null when it does not return the related rows. */
function fieldShape(
	field: IntrospectedField | null,
	targetName: string,
	single: boolean,
	lookup: TypeLookup,
): FieldShape | null {
	if (!field || field.args.some(isRequiredInput)) return null;
	const named = namedTypeOf(field.type);
	if (!named) return null;
	const firstArg = field.args.find((arg) => arg.name === 'first' && namedTypeOf(arg.type)?.name === 'Int');
	if (named.name === targetName) {
		if (single && !isListTypeRef(field.type)) return { shape: 'object', pageArg: null, hasTotalCount: false };
		if (!single && isListTypeRef(field.type)) return { shape: 'list', pageArg: firstArg?.name ?? null, hasTotalCount: false };
		return null;
	}
	if (single || named.kind !== 'OBJECT') return null;
	const connection = lookup.type(named.name);
	const nodes = lookup.field(connection, 'nodes');
	if (namedTypeOf(nodes?.type)?.name !== targetName || !isListTypeRef(nodes?.type)) return null;
	return { shape: 'connection', pageArg: firstArg?.name ?? null, hasTotalCount: Boolean(lookup.field(connection, 'totalCount')) };
}

const LOGICAL_OPERATORS = ['and', 'or', 'not'];

/**
 * The Boolean filter field that tests whether a linked record exists. The
 * filter input names it after the relation field (`countryExists`,
 * `tasksExist`); it counts only when the input really has it as a Boolean.
 * Filters read rows and never write them.
 */
function existsFieldFor(filterType: IntrospectedType, fieldName: string): string | null {
	const matches = (filterType.inputFields ?? []).filter(
		(input) =>
			(input.name === `${fieldName}Exists` || input.name === `${fieldName}Exist`) &&
			!isListTypeRef(input.type) &&
			namedTypeOf(input.type)?.name === 'Boolean',
	);
	return matches.length === 1 ? matches[0]!.name : null;
}

/** How this table's filter input filters by the relation, proven against the introspected inputs. */
function relationFilter(
	filterType: IntrospectedType | null,
	fieldName: string,
	single: boolean,
	lookup: TypeLookup,
): RelationModel['filter'] {
	const field = filterType?.inputFields?.find((input) => input.name === fieldName);
	const named = namedTypeOf(field?.type);
	if (!filterType || !field || named?.kind !== 'INPUT_OBJECT' || isListTypeRef(field.type)) return null;
	const input = lookup.type(named.name);
	if (!input) return null;
	const inputFields = input.inputFields ?? [];
	const exists = existsFieldFor(filterType, fieldName);

	if (single) {
		// A one-record relation filters by the linked table's own filter input.
		if (!inputFields.some((inputField) => LOGICAL_OPERATORS.includes(inputField.name))) return null;
		return { field: field.name, typeName: named.name, exists, many: null, recordFilterType: named.name };
	}
	const quantifier = (name: 'some' | 'every' | 'none') => {
		const inputField = inputFields.find((candidate) => candidate.name === name);
		return inputField && namedTypeOf(inputField.type)?.kind === 'INPUT_OBJECT' ? inputField : null;
	};
	const many = { some: quantifier('some'), every: quantifier('every'), none: quantifier('none') };
	const present = Object.values(many).filter((inputField) => inputField !== null);
	if (present.length === 0) return null;
	// Every quantifier takes the same condition input: the linked table's own filter input.
	const targets = new Set(present.map((inputField) => namedTypeOf(inputField!.type)?.name));
	const [recordFilterType] = [...targets];
	return {
		field: field.name,
		typeName: named.name,
		exists,
		many: { some: many.some?.name ?? null, every: many.every?.name ?? null, none: many.none?.name ?? null },
		recordFilterType: targets.size === 1 && recordFilterType ? recordFilterType : null,
	};
}

interface RelationDraft {
	kind: RelationModelKind;
	fieldName: string;
	targetName: string;
	keys: RelationKeyPair[];
	junction: RelationJunctionModel | null;
	/** Why the keys are not proven, or null. */
	keyProblem: { code: ModelIssue['code']; message: string } | null;
	/** Why unlinking is not possible, or null. */
	unlinkProblem: string | null;
}

/** True when every name is a field of the table, so a write through it can be proven. */
function allFieldsOf(table: MetaschemaTable | undefined, fieldNames: readonly string[]): boolean {
	return Boolean(table) && fieldNames.every((name) => fieldOf(table, name) !== null);
}

/**
 * belongsTo key pairs: local foreign-key fields and the fields they reference.
 * `refKeys` settles it when the server has it and every name is a field of the
 * referenced table; otherwise the table's own foreign-key constraint does.
 */
function belongsToKeys(
	table: MetaschemaTable,
	relation: MetaschemaTableBelongsToRelation,
	referenced: MetaschemaTable | undefined,
): RelationDraft['keys'] | null {
	const local = names(relation.keys);
	if (local.length === 0) return null;
	const refKeys = names(relation.refKeys);
	if (refKeys.length > 0) {
		return refKeys.length === local.length && allFieldsOf(referenced, refKeys)
			? local.map((name, position) => ({ local: name, remote: refKeys[position]! }))
			: null;
	}
	const constraints = foreignKeysOf(table).filter((constraint) => sameSet(names(constraint.fields), local));
	if (constraints.length !== 1) return null;
	const constraint = constraints[0]!;
	const constraintLocal = names(constraint.fields);
	const constraintRemote = names(constraint.refFields).length > 0 ? names(constraint.refFields) : constraint.referencedFields ?? [];
	if (constraintRemote.length !== constraintLocal.length) return null;
	return local.map((name) => ({ local: name, remote: constraintRemote[constraintLocal.indexOf(name)]! }));
}

/**
 * hasOne/hasMany key pairs: fields here and the foreign-key fields on the
 * related table that point at them. `remoteKeys` settles it when the server
 * has it. Otherwise the pair is resolved only when exactly one foreign key
 * links the two tables, read from the related table's belongsTo relations.
 */
function hasKeys(
	table: MetaschemaTable,
	relation: MetaschemaTableHasRelation,
	related: MetaschemaTable | undefined,
): { keys: RelationKeyPair[] } | { problem: RelationDraft['keyProblem'] } {
	const local = names(relation.keys);
	const remoteKeys = names(relation.remoteKeys);
	if (local.length > 0 && remoteKeys.length > 0) {
		// The server lists the names whatever the related table exposes, so check them.
		return remoteKeys.length === local.length && allFieldsOf(related, remoteKeys)
			? { keys: local.map((name, position) => ({ local: name, remote: remoteKeys[position]! })) }
			: { problem: { code: 'RELATION_INCOMPLETE', message: 'The linked records for this field cannot be identified.' } };
	}
	if (!related || local.length === 0) {
		return { problem: { code: 'RELATION_INCOMPLETE', message: 'The linked records for this field cannot be identified.' } };
	}

	const linksHere = [...(table.relations?.hasOne ?? []), ...(table.relations?.hasMany ?? [])].filter(
		(candidate) => candidate?.referencedBy?.name === related.name,
	);
	const backLinks = (related.relations?.belongsTo ?? []).filter(
		(candidate): candidate is MetaschemaTableBelongsToRelation => candidate?.references?.name === table.name,
	);
	if (linksHere.length !== 1 || backLinks.length !== 1) {
		return {
			problem: {
				code: 'RELATION_AMBIGUOUS',
				message: 'More than one link connects these tables, so this field is read-only.',
			},
		};
	}
	const pairs = belongsToKeys(related, backLinks[0]!, table);
	if (!pairs || !sameSet(pairs.map((pair) => pair.remote), local)) {
		return { problem: { code: 'RELATION_INCOMPLETE', message: 'The linked records for this field cannot be identified.' } };
	}
	return { keys: local.map((name) => ({ local: name, remote: pairs.find((pair) => pair.remote === name)!.local })) };
}

function junctionModel(
	relation: MetaschemaTableManyToManyRelation,
	ctx: RelationsContext,
): { junction: RelationJunctionModel | null; problem: RelationDraft['keyProblem']; unlinkProblem: string | null } {
	const junctionMeta = ctx.tables.find((candidate) => candidate.name === relation.junctionTable?.name);
	const leftJunction = names(relation.junctionLeftKeyAttributes);
	const leftLocal = names(relation.leftKeyAttributes);
	const rightJunction = names(relation.junctionRightKeyAttributes);
	const rightRemote = names(relation.rightKeyAttributes);
	const incomplete = {
		junction: null,
		problem: { code: 'RELATION_INCOMPLETE' as const, message: 'The linked records for this field cannot be identified.' },
		unlinkProblem: 'Links for this field cannot be removed here.',
	};
	if (
		!junctionMeta ||
		leftJunction.length === 0 ||
		leftJunction.length !== leftLocal.length ||
		rightJunction.length === 0 ||
		rightJunction.length !== rightRemote.length
	) {
		return incomplete;
	}

	const keyFields = new Set([...leftJunction, ...rightJunction]);
	const record = createRecordOf(junctionMeta, ctx.roots, ctx.lookup);
	const extraRequiredFields = record?.recordType
		? (record.recordType.inputFields ?? []).filter((field) => !keyFields.has(field.name) && isRequiredInput(field)).map((field) => field.name)
		: (junctionMeta.fields ?? []).flatMap((field) => {
			if (!field || keyFields.has(field.name)) return [];
			const required = field.isRequiredOnCreate ?? (isRequiredField(field) && !(field.hasDefault ?? field.type.hasDefault));
			return required ? [field.name] : [];
		});
	const canCreate = Boolean(record?.recordType);
	const pure = canCreate && extraRequiredFields.length === 0;
	const canDelete = Boolean(junctionMeta.query?.delete && ctx.lookup.field(ctx.roots.mutation, junctionMeta.query.delete));

	return {
		junction: {
			tableKey: tableKeyOf(junctionMeta),
			tableName: junctionMeta.name,
			left: leftJunction.map((junction, position) => ({ junction, local: leftLocal[position]! })),
			right: rightJunction.map((junction, position) => ({ junction, remote: rightRemote[position]! })),
			pure,
			extraRequiredFields,
		},
		problem: !canCreate
			? { code: 'RELATION_INCOMPLETE', message: 'Links for this field cannot be added on this API.' }
			: !pure
				? {
					code: 'RELATION_INCOMPLETE',
					message: `Adding a link needs more information (${extraRequiredFields.join(', ')}), so this field is read-only.`,
				}
				: null,
		unlinkProblem: canDelete ? null : 'Links for this field cannot be removed here.',
	};
}

function draftRelations(ctx: RelationsContext): RelationDraft[] {
	const { table, tables } = ctx;
	const relations = table.relations;
	const drafts: RelationDraft[] = [];
	const findTable = (name: string | null | undefined) => tables.find((candidate) => candidate.name === name);

	for (const relation of relations?.belongsTo ?? []) {
		if (!relation?.fieldName) continue;
		const keys = belongsToKeys(table, relation, findTable(relation.references.name));
		const nullable = (keys ?? []).every((pair) => !isRequiredField(fieldOf(table, pair.local)));
		drafts.push({
			kind: 'belongsTo',
			fieldName: relation.fieldName,
			targetName: relation.references.name,
			keys: keys ?? [],
			junction: null,
			keyProblem: keys ? null : { code: 'RELATION_INCOMPLETE', message: 'The linked record for this field cannot be identified.' },
			unlinkProblem: nullable ? null : 'This link is required, so it cannot be removed.',
		});
	}

	for (const [kind, list] of [['hasOne', relations?.hasOne], ['hasMany', relations?.hasMany]] as const) {
		for (const relation of list ?? []) {
			if (!relation?.fieldName) continue;
			const related = findTable(relation.referencedBy.name);
			const resolved = hasKeys(table, relation, related);
			const keys = 'keys' in resolved ? resolved.keys : [];
			const nullable = keys.every((pair) => !isRequiredField(fieldOf(related, pair.remote)));
			drafts.push({
				kind,
				fieldName: relation.fieldName,
				targetName: relation.referencedBy.name,
				keys,
				junction: null,
				keyProblem: 'problem' in resolved ? resolved.problem : null,
				unlinkProblem: nullable ? null : 'Each linked record must keep this link, so it cannot be removed.',
			});
		}
	}

	for (const relation of relations?.manyToMany ?? []) {
		if (!relation?.fieldName) continue;
		const { junction, problem, unlinkProblem } = junctionModel(relation, ctx);
		drafts.push({
			kind: 'manyToMany',
			fieldName: relation.fieldName,
			targetName: relation.rightTable.name,
			keys: [],
			junction,
			keyProblem: problem,
			unlinkProblem,
		});
	}
	return drafts;
}

/** Relation models for every relation `_meta` reports with a field, with an issue for each degraded one. */
export function buildRelations(ctx: RelationsContext): RelationModel[] {
	const { lookup, issues } = ctx;
	return draftRelations(ctx).map((draft) => {
		const targetMeta = ctx.tables.find((candidate) => candidate.name === draft.targetName);
		const targetKey = tableKeyForName(ctx.tables, draft.targetName);
		const { target } = relationTarget(targetMeta, lookup, ctx.displayOverrides);
		const single = draft.kind === 'belongsTo' || draft.kind === 'hasOne';
		const shape = fieldShape(lookup.field(ctx.rowType, draft.fieldName), draft.targetName, single, lookup);
		const selectable = target.primaryKey.length + target.labelFields.length > 0;

		const keyProblem = !targetKey
			? { code: 'RELATION_UNRESOLVED' as const, message: 'The linked table for this field cannot be found.' }
			: draft.keyProblem ?? (target.primaryKey.length === 0
				? { code: 'RELATION_INCOMPLETE' as const, message: 'The linked records for this field cannot be identified.' }
				: null);
		const readProblem = !shape || !selectable ? 'The linked records for this field cannot be shown here.' : null;
		const editable = !keyProblem && !readProblem;
		const unlinkable = editable && draft.unlinkProblem === null;
		const reason = readProblem ?? keyProblem?.message ?? draft.unlinkProblem;

		if (readProblem) {
			issues.push({ scope: 'relation', target: draft.fieldName, code: 'RELATION_UNREADABLE', message: readProblem });
		} else if (keyProblem) {
			issues.push({ scope: 'relation', target: draft.fieldName, code: keyProblem.code, message: keyProblem.message });
		}

		return {
			kind: draft.kind,
			fieldName: draft.fieldName,
			targetKey,
			targetName: draft.targetName,
			shape: shape?.shape ?? (single ? 'object' : 'connection'),
			readable: readProblem === null,
			keys: draft.keys,
			junction: draft.junction,
			target,
			pageArg: shape?.pageArg ?? null,
			hasTotalCount: shape?.hasTotalCount ?? false,
			filter: relationFilter(ctx.filterType, draft.fieldName, single, lookup),
			editable,
			unlinkable,
			reason: editable && unlinkable ? null : reason,
		};
	});
}
