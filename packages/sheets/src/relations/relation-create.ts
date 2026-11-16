/**
 * Creating a related record from the relation editor, with the record form
 * the grid and the record panel use (`forms/model-form.ts`): the same fields,
 * read-only reasons, parsers and required checks. The fields the link itself
 * fills (hasOne/hasMany: the related table's `keys[].remote` = this record's
 * values) are fixed and not shown.
 */
import type { RelationModel, TableModel } from '@constructive-io/data';

import { buildModelFormSchema, buildModelFormSpec, type ModelFormField, type ModelFormSpec } from '../forms/model-form';
import { hasLinkPatch, type FieldValues, type RecordValues } from './relation-keys';

export type RelatedCreatePlan =
	| {
			ok: true;
			spec: ModelFormSpec;
			/** Fields shown first: required ones and the label fields. */
			primary: ModelFormField[];
			/** Other fields the form can set. */
			secondary: ModelFormField[];
			/** Values the link fills, sent with the create. */
			fixed: FieldValues;
	  }
	| { ok: false; reason: string };

/** Plan the create form for a record of `target` linked through `relation` to `row`. */
export function planRelatedCreate(relation: RelationModel, target: TableModel, row: RecordValues | null): RelatedCreatePlan {
	const spec = buildModelFormSpec(target, 'create');
	if (!target.operations.create) {
		return { ok: false, reason: spec.fields.find((field) => field.readOnlyReason)?.readOnlyReason ?? 'New records cannot be added to the linked table.' };
	}

	let fixed: FieldValues = {};
	if (relation.kind === 'hasOne' || relation.kind === 'hasMany') {
		const link = row ? hasLinkPatch(relation, row) : null;
		if (!link) return { ok: false, reason: 'This record has no value to link by yet.' };
		fixed = link;
	}
	for (const name of Object.keys(fixed)) {
		const field = spec.fields.find((candidate) => candidate.name === name);
		if (!field?.writable) return { ok: false, reason: field?.readOnlyReason ?? 'A new linked record cannot be given this link.' };
	}

	const blocking = spec.fields.find((field) => !field.writable && field.column.write.requiredOnCreate && !(field.name in fixed));
	if (blocking) return { ok: false, reason: `A new record needs "${blocking.label}": ${blocking.readOnlyReason ?? 'it cannot be entered here.'}` };

	const open = spec.fields.filter((field) => field.writable && !(field.name in fixed));
	const isPrimary = (field: ModelFormField) => field.required || relation.target.labelFields.includes(field.name);
	return { ok: true, spec, primary: open.filter(isPrimary), secondary: open.filter((field) => !isPrimary(field)), fixed };
}

/**
 * Check and parse the form values (plus the fixed link values) with the record
 * form's schema. Untouched fields are left out, so their defaults apply.
 */
export function readRelatedCreate(
	plan: Extract<RelatedCreatePlan, { ok: true }>,
	raw: Readonly<Record<string, unknown>>,
): { ok: true; values: FieldValues } | { ok: false; errors: Record<string, string> } {
	const result = buildModelFormSchema(plan.spec).safeParse({ ...raw, ...plan.fixed });
	if (!result.success) {
		const errors: Record<string, string> = {};
		for (const issue of result.error.issues) {
			const name = String(issue.path[0] ?? '');
			if (name && !errors[name]) errors[name] = issue.message;
		}
		return { ok: false, errors };
	}
	const values: FieldValues = {};
	for (const [name, value] of Object.entries(result.data)) if (value !== undefined) values[name] = value;
	return { ok: true, values };
}
