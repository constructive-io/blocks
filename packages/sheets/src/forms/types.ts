import type { CellType } from '../cell-types/types';
import type { MetaQuery } from '@constructive-io/data';

export type MetaTable = NonNullable<NonNullable<NonNullable<MetaQuery['_meta']>['tables']>[number]>;

export type MetaField = NonNullable<NonNullable<MetaTable['fields']>[number]>;

export interface ScalarConstraintHints {
	isUnique?: boolean;
	isPrimaryKey?: boolean;
}

export type ScalarFieldKind =
	| 'text'
	| 'multiline'
	| 'email'
	| 'url'
	| 'phone'
	| 'uuid'
	| 'inet'
	| 'number'
	| 'integer'
	| 'smallint'
	| 'decimal'
	| 'currency'
	| 'percentage'
	| 'boolean'
	| 'bit'
	| 'date'
	| 'datetime'
	| 'timestamptz'
	| 'time'
	| 'json'
	| 'tsvector';

export interface ScalarFieldSpec {
	name: string;
	label: string;
	description?: string;
	kind: ScalarFieldKind;
	nullable: boolean;
	defaultValue?: unknown;
	enumValues?: string[];
	maxLength?: number;
	minLength?: number;
	minimum?: number;
	maximum?: number;
	numericPrecision?: number;
	numericScale?: number;
	metadata: {
		cellType: CellType;
		gqlType: string;
		pgType?: string | null;
		pgAlias?: string | null;
		subtype?: string | null;
		typmod?: number | null;
		encoding?: MetaField['type']['encoding'];
	};
	constraints: ScalarConstraintHints;
}

export interface DynamicFormSpec {
	tableName: string;
	versionHash: string;
	fields: ScalarFieldSpec[];
}

export interface BuildFormSpecOptions {
	/**
	 * Optional set of field names that should be treated as multiline inputs despite being text-based.
	 */
	multilineFields?: Set<string>;
}
