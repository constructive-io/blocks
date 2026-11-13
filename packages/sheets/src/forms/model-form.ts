// Form spec and validation schema built from the table model, for a record form
// (create a record, or edit one) that must follow the same rules as the grid.
//
// Each field carries its column, its cell type (the same routing the grid uses), and
// whether it can be written in this mode, with the reason when it cannot. The schema
// checks every value with `parseColumnInput`, so a form and a grid cell accept and
// refuse exactly the same values, and it outputs the parsed values (exact decimal
// strings, enum wire values) ready for `encodeWriteValues`.

import { z } from 'zod';

import type { ColumnModel, ColumnOption, TableModel } from '@constructive-io/data';

import { parseColumnInput } from '../cell-types/column-value';
import { fieldLabel } from '../cell-types/field-label';
import { resolveModelCellRoute } from '../grid/cell-routing';
import { createMetadataHash } from './metadata-hash';

/** Whether the form creates a record or edits an existing one. */
export type ModelFormMode = 'create' | 'update';

export interface ModelFormField {
	/** Field name on the row (also the key in the form values). */
	name: string;
	/** Readable label. */
	label: string;
	/** Column comment, or null. */
	description: string | null;
	/** The table-model column. */
	column: ColumnModel;
	/** The cell type key the grid uses for this column (a built-in cell type or a host override); it picks the editor. */
	cellType: string;
	/** The form may set this field in this mode. */
	writable: boolean;
	/** Why the field cannot be set in this mode, or null when it can. */
	readOnlyReason: string | null;
	/** A value must be given: create requires it (no default), or an edit cannot empty it. */
	required: boolean;
	/** The column accepts no value. */
	nullable: boolean;
	/** Fixed choices, or null. `value` is what is stored. */
	options: readonly ColumnOption[] | null;
	maxLength: number | null;
	precision: number | null;
	scale: number | null;
}

export interface ModelFormSpec {
	/** `TableModel.key` of the table. */
	tableKey: string;
	/** GraphQL type name of the table. */
	tableName: string;
	mode: ModelFormMode;
	/** Changes whenever a field's rules change; use it as a cache key. */
	versionHash: string;
	/** Readable fields, in column order. */
	fields: ModelFormField[];
}

export interface BuildModelFormSpecOptions {
	/** Host cell-type overrides keyed by `tableName.fieldName` (`SheetsConfig.fieldTypeOverrides`). */
	typeOverrides?: Readonly<Record<string, string>>;
}

/**
 * Build the fields of a create or edit form from the table model. Each field's cell
 * type and read-only reason come from the grid's own routing (`resolveModelCellRoute`:
 * a create is routed like a draft row, an edit like a saved row with its key fixed),
 * so a form and a grid cell never disagree.
 */
export function buildModelFormSpec(model: TableModel, mode: ModelFormMode, options: BuildModelFormSpecOptions = {}): ModelFormSpec {
	const lockedFields = new Set(model.primaryKey);
	const fields: ModelFormField[] = model.columns
		.filter((column) => column.readable)
		.map((column) => {
			const { cellType, readOnlyReason } = resolveModelCellRoute({
				column,
				table: model,
				isDraftRow: mode === 'create',
				cellError: null,
				typeOverride: options.typeOverrides?.[`${model.name}.${column.name}`] ?? null,
				lockedFields,
			});
			const writable = readOnlyReason === null;
			return {
				name: column.name,
				label: fieldLabel(column.name),
				description: column.description,
				column,
				cellType,
				writable,
				readOnlyReason,
				required: writable && (mode === 'create' ? column.write.requiredOnCreate : !column.nullable),
				nullable: column.nullable,
				options: column.value.options,
				maxLength: column.value.maxLength,
				precision: column.value.precision,
				scale: column.value.scale,
			};
		});

	const versionHash = createMetadataHash({
		table: model.key,
		mode,
		fields: fields.map((field) => ({
			name: field.name,
			cellType: field.cellType,
			writable: field.writable,
			required: field.required,
			nullable: field.nullable,
			options: field.options,
			maxLength: field.maxLength,
			precision: field.precision,
			scale: field.scale,
		})),
	});

	return { tableKey: model.key, tableName: model.name, mode, versionHash, fields };
}

function requiredOnSubmit(field: ModelFormField, mode: ModelFormMode): boolean {
	return mode === 'create' && field.required;
}

function fieldSchema(field: ModelFormField, mode: ModelFormMode): z.ZodType<unknown> {
	return z
		.unknown()
		.optional()
		.transform((value, ctx) => {
			// An untouched field is left out: the database default applies on create, the stored value stays on edit.
			if (value === undefined) return undefined;
			if (requiredOnSubmit(field, mode) && (value === null || value === '')) {
				ctx.addIssue({ code: 'custom', message: `${field.label} is required` });
				return z.NEVER;
			}
			// Clearing follows the column rules: null, '' for text that cannot be empty, or a refusal.
			const parsed = parseColumnInput(field.column, value, { fromText: typeof value === 'string' });
			if (!parsed.ok) {
				ctx.addIssue({ code: 'custom', message: parsed.reason });
				return z.NEVER;
			}
			return parsed.value;
		});
}

const modelSchemaCache = new Map<string, z.ZodObject<Record<string, z.ZodType<unknown>>>>();

/**
 * Build the validation schema of a model form. Only writable fields are in it; each
 * one is checked and parsed by the column's rules. Unknown keys are dropped, so a
 * read-only field can never reach a write.
 */
export function buildModelFormSchema(spec: ModelFormSpec): z.ZodObject<Record<string, z.ZodType<unknown>>> {
	const cached = modelSchemaCache.get(spec.versionHash);
	if (cached) return cached;
	const shape: Record<string, z.ZodType<unknown>> = {};
	for (const field of spec.fields) {
		if (field.writable) shape[field.name] = fieldSchema(field, spec.mode);
	}
	// A field a create requires must be present; an absent key never reaches its own check.
	const schema = z.object(shape).superRefine((values, ctx) => {
		for (const field of spec.fields) {
			if (!field.writable || !requiredOnSubmit(field, spec.mode)) continue;
			if (values[field.name] === undefined) ctx.addIssue({ code: 'custom', path: [field.name], message: `${field.label} is required` });
		}
	});
	modelSchemaCache.set(spec.versionHash, schema);
	return schema;
}
