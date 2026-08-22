/**
 * Structural types for the slice of Constructive's `_meta` contract this
 * package reads.
 *
 * These mirror `@constructive-io/data`'s `Metaschema*` types but are declared
 * locally and permissively (nullable, optional) so a `_meta` payload from that
 * package — or from a raw GraphQL response — is assignable without this package
 * depending on a GraphQL client.
 */

import type { UINodeType } from 'blocks-schema';
import type { JSONSchema, WidgetRule } from 'json-schema-to-blocks';

export interface MetaEnum {
	name?: string | null;
	values?: readonly (string | null)[] | null;
}

export interface MetaEncoding {
	kind?: string | null;
	elementType?: string | null;
}

export interface MetaType {
	gqlType?: string | null;
	pgType?: string | null;
	isArray?: boolean | null;
	subtype?: string | null;
	encoding?: MetaEncoding | null;
}

export interface MetaField {
	name: string;
	type?: MetaType | null;
	isNotNull?: boolean | null;
	hasDefault?: boolean | null;
	isPrimaryKey?: boolean | null;
	isForeignKey?: boolean | null;
	description?: string | null;
	enumValues?: MetaEnum | null;
}

export interface MetaTableRef {
	name?: string | null;
}

export interface MetaForeignKey {
	name?: string | null;
	fields?: readonly (MetaField | null)[] | null;
	referencedTable?: string | null;
	referencedFields?: readonly (string | null)[] | null;
	refTable?: MetaTableRef | null;
	refFields?: readonly (MetaField | null)[] | null;
}

export interface MetaHasRelation {
	fieldName?: string | null;
	isUnique?: boolean | null;
	referencedBy?: MetaTableRef | null;
	keys?: readonly (MetaField | null)[] | null;
}

export interface MetaManyToManyRelation {
	fieldName?: string | null;
	rightTable?: MetaTableRef | null;
	junctionTable?: MetaTableRef | null;
}

export interface MetaRelations {
	belongsTo?: readonly unknown[] | null;
	hasOne?: readonly (MetaHasRelation | null)[] | null;
	hasMany?: readonly (MetaHasRelation | null)[] | null;
	manyToMany?: readonly (MetaManyToManyRelation | null)[] | null;
}

export interface MetaTableQuery {
	all?: string | null;
	one?: string | null;
	create?: string | null;
	update?: string | null;
	delete?: string | null;
}

export interface MetaConstraints {
	primaryKey?: { fields?: readonly (MetaField | null)[] | null } | null;
	foreignKey?: readonly (MetaForeignKey | null)[] | null;
}

/** The `_meta` table shape this package lowers. */
export interface MetaTable {
	name: string;
	schemaName?: string | null;
	description?: string | null;
	fields?: readonly (MetaField | null)[] | null;
	query?: MetaTableQuery | null;
	relations?: MetaRelations | null;
	constraints?: MetaConstraints | readonly unknown[] | null;
	foreignKeyConstraints?: readonly (MetaForeignKey | null)[] | null;
	primaryKeyConstraints?: readonly ({ fields?: readonly (MetaField | null)[] | null } | null)[] | null;
	storage?: { isFilesTable?: boolean | null; isBucketsTable?: boolean | null } | null;
	i18n?: { translatableFields?: readonly ({ name: string } | null)[] | null } | null;
}

/** How a field is presented, overriding what the column type implies. */
export interface FieldOverride {
	widget?: UINodeType;
	label?: string;
	description?: string;
	placeholder?: string;
	hidden?: boolean;
	disabled?: boolean;
	order?: number;
	props?: Record<string, unknown>;
	/** Drop the field from the generated document entirely. */
	omit?: boolean;
}

export interface MetaOptions {
	/** Document id; defaults to `<table>-<kind>`. */
	id?: string;
	/** Screen title; defaults to the titleized table name. */
	title?: string;
	/** Widget rules tried before `json-schema-to-blocks`' defaults. */
	rules?: WidgetRule[];
	replaceDefaultRules?: boolean;
	/** Per-column presentation overrides, keyed by column name. */
	fields?: Record<string, FieldOverride>;
	/** Columns to leave out. */
	omitFields?: readonly string[];
	/**
	 * Emit primary keys, defaulted columns and audit columns too. Off for forms
	 * (the database fills them), on for list and detail screens.
	 */
	includeSystemFields?: boolean;
	/** Explicit column order; unlisted columns keep their `_meta` order after these. */
	fieldOrder?: readonly string[];
}

export interface FormOptions extends MetaOptions {
	/** Wrap the fields in a `Form` node. Default `true`. */
	form?: boolean;
	submitLabel?: string;
	rootKey?: string;
	/** `create` omits system fields, `update` disables the primary key. Default `create`. */
	mode?: 'create' | 'update';
}

export interface ListOptions extends MetaOptions {
	/** Columns to show; defaults to the lowerable columns, capped by `maxColumns`. */
	columns?: readonly string[];
	maxColumns?: number;
	rootKey?: string;
}

export interface DetailOptions extends MetaOptions {
	/** Emit a `RelationList` per `hasMany`/`manyToMany` relation. Default `true`. */
	relations?: boolean;
	rootKey?: string;
}

/** A column lowered to a JSON Schema fragment, keyed by its column name. */
export interface LoweredField {
	name: string;
	schema: JSONSchema;
}
