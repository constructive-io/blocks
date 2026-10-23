import { isManyRelation } from './fields';
import type { AnyResource, ResourceField, ResourceRow } from './types';

/** What a form control holds: text, a toggle, or a set of linked ids. */
export type FormValue = string | boolean | string[];
export type FormValues = Record<string, FormValue>;
export type FormErrors = Record<string, string>;

export type FormMode = 'create' | 'edit';

/** The fields a form shows: writable ones always, read-only ones only when editing. */
export function formFieldsFor(resource: AnyResource, mode: FormMode): ResourceField[] {
	return resource.formFields.flatMap((name) => {
		const field = resource.fields[name];
		if (!field || field.hidden) return [];
		if (field.readOnly && mode === 'create') return [];
		return [field];
	});
}

const pad = (value: number) => String(value).padStart(2, '0');

/** An ISO timestamp as a `datetime-local` value in the reader's time zone. */
function toLocalDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** One stored value as its form control holds it. */
function toFormValue(field: ResourceField, value: unknown): FormValue {
	if (isManyRelation(field)) {
		return Array.isArray(value) ? value.map((item) => String(item && typeof item === 'object' ? (item as ResourceRow).id : item)) : [];
	}
	if (field.input === 'boolean') return value === true || value === 'true';
	if (value == null) return '';
	switch (field.input) {
		case 'date':
			return /^\d{4}-\d{2}-\d{2}/.exec(String(value))?.[0] ?? '';
		case 'datetime':
			return toLocalDateTime(String(value));
		case 'time':
			return String(value).slice(0, 5);
		case 'json':
			return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
		default:
			return String(value);
	}
}

/**
 * The form's starting values: the record's (when editing), then any defaults
 * (e.g. the parent of a related list), then empty controls.
 */
export function initialFormValues(
	fields: readonly ResourceField[],
	record?: ResourceRow | null,
	defaults?: ResourceRow,
	linked?: Record<string, string[]>,
): FormValues {
	const values: FormValues = {};
	for (const field of fields) {
		const source = linked && isManyRelation(field) && field.name in linked ? linked[field.name] : record?.[field.name] ?? defaults?.[field.name];
		values[field.name] = toFormValue(field, source);
	}
	return values;
}

const isEmpty = (value: FormValue) => (Array.isArray(value) ? value.length === 0 : typeof value === 'string' ? value.trim() === '' : false);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Digits as typed, without grouping separators or spaces. */
const numeric = (text: string) => text.trim().replace(/[\s,]/g, '');

/** Why a value is not acceptable for its field, or nothing when it is. */
function fieldError(field: ResourceField, value: FormValue): string | undefined {
	if (isEmpty(value)) {
		if (!field.required || field.input === 'boolean') return undefined;
		return field.input === 'relation' || field.input === 'select' ? 'Choose an option.' : 'This field is required.';
	}
	if (typeof value !== 'string') return undefined;
	const text = value.trim();
	switch (field.input) {
		case 'number':
		case 'currency':
			return Number.isFinite(Number(numeric(text))) ? undefined : 'Enter a number.';
		case 'integer':
			return /^-?\d+$/.test(numeric(text)) ? undefined : 'Enter a whole number.';
		case 'email':
			return EMAIL.test(text) ? undefined : 'Enter an email address like name@example.com.';
		case 'url':
			try {
				new URL(text);
				return undefined;
			} catch {
				return 'Enter a full web address, like https://example.com.';
			}
		case 'uuid':
			return UUID.test(text) ? undefined : 'Enter a valid UUID.';
		case 'json':
			try {
				JSON.parse(text);
				return undefined;
			} catch {
				return 'Enter valid JSON.';
			}
		default:
			return undefined;
	}
}

/** Field errors keyed by field name; empty when the form can be saved. */
export function validateFormValues(fields: readonly ResourceField[], values: FormValues): FormErrors {
	const errors: FormErrors = {};
	for (const field of fields) {
		if (field.readOnly) continue;
		const message = fieldError(field, values[field.name] ?? '');
		if (message) errors[field.name] = message;
	}
	return errors;
}

/** A valid form value as the source stores it. Empty controls become null. */
function toStoredValue(field: ResourceField, value: FormValue): unknown {
	if (field.input === 'boolean') return value === true;
	if (typeof value !== 'string') return value;
	const text = field.input === 'textarea' ? value : value.trim();
	if (text.trim() === '') return null;
	switch (field.input) {
		case 'number':
		case 'currency':
			return Number(numeric(text));
		case 'integer':
			return Number.parseInt(numeric(text), 10);
		case 'json':
			return JSON.parse(text);
		case 'datetime':
			return new Date(text).toISOString();
		default:
			return text;
	}
}

export type LinkDiff = { add: string[]; remove: string[]; changed: boolean };

/** What changes between two sets of linked ids, ignoring order and duplicates. */
export function diffLinks(before: readonly string[], after: readonly string[]): LinkDiff {
	const was = new Set(before);
	const now = new Set(after);
	const add = [...now].filter((id) => !was.has(id));
	const remove = [...was].filter((id) => !now.has(id));
	return { add, remove, changed: add.length > 0 || remove.length > 0 };
}

export type Submission = {
	/** Column values for `create`, or only the changed ones for `update`. */
	values: ResourceRow;
	/** Many-to-many fields whose full set of linked ids must be written with `link`. */
	links: Record<string, string[]>;
};

const sameValue = (left: FormValue, right: FormValue) =>
	Array.isArray(left) && Array.isArray(right) ? !diffLinks(left, right).changed : left === right;

/**
 * Turns a valid form into what the source receives. Creating leaves out empty
 * optional fields so the database applies its defaults; editing sends only the
 * fields that changed (a cleared field as null) and re-links a many-to-many set
 * only when its members changed.
 */
export function buildSubmission(fields: readonly ResourceField[], values: FormValues, initial: FormValues, mode: FormMode, defaults?: ResourceRow): Submission {
	const submission: Submission = { values: {}, links: {} };
	// Defaults for columns the form does not show (the parent of a related list) still belong to a new record.
	if (mode === 'create' && defaults) {
		const shown = new Set(fields.map((field) => field.name));
		for (const [name, value] of Object.entries(defaults)) {
			if (!shown.has(name) && value !== undefined) submission.values[name] = value;
		}
	}
	for (const field of fields) {
		if (field.readOnly) continue;
		const value = values[field.name] ?? '';
		if (isManyRelation(field)) {
			const ids = [...new Set(value as string[])];
			if (mode === 'create' ? ids.length > 0 : diffLinks((initial[field.name] as string[]) ?? [], ids).changed) {
				submission.links[field.name] = ids;
			}
			continue;
		}
		if (mode === 'edit' && sameValue(value, initial[field.name] ?? '')) continue;
		const stored = toStoredValue(field, value);
		if (mode === 'create' && stored === null) continue;
		submission.values[field.name] = stored;
	}
	return submission;
}

/** Field messages a source attached to a rejected write, e.g. `{ fields: { email: 'Already taken.' } }`. */
export function serverFieldErrors(error: unknown): FormErrors {
	const fields = error && typeof error === 'object' ? (error as { fields?: unknown }).fields : undefined;
	if (!fields || typeof fields !== 'object') return {};
	return Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

/** A readable message for a rejected request. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	return fallback;
}

export type SaveFailure = {
	/** What the person reads first: the source's `userMessage`, or a plain sentence from the kit. */
	message: string;
	/** The source's own wording, kept out of the headline because it can carry server internals. */
	detail?: string;
	fields: FormErrors;
};

/**
 * How a rejected write is shown. A source can attach `fields` (messages under
 * inputs) and `userMessage` (a headline written for people); otherwise the
 * kit's sentence leads and the raw message is only a detail.
 */
export function describeSaveFailure(error: unknown, fallback: string): SaveFailure {
	const fields = serverFieldErrors(error);
	const userMessage = error && typeof error === 'object' ? (error as { userMessage?: unknown }).userMessage : undefined;
	if (typeof userMessage === 'string' && userMessage.trim()) return { message: userMessage, fields };
	if (Object.keys(fields).length > 0) return { message: 'Check the highlighted fields.', fields };
	const raw = errorMessage(error, '');
	return { message: fallback, detail: raw && raw !== fallback ? raw : undefined, fields };
}
