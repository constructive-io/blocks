/**
 * Filter values: from what the user entered to what the filter input takes.
 *
 * Big whole numbers and decimals stay exact text (never `Number()`), dates and
 * times stay ISO text, and an object operand is built field by field. A value
 * the control cannot accept is `invalid` with a message for the user; a value
 * not entered yet is `incomplete`, and the condition is simply not applied.
 */
import type { FilterValueControl, ScalarValueControl } from '../filter-operators';
import type { SheetsFilterValue } from '../view-state/view-state.types';

export type FilterValueResult =
	| { status: 'ready'; value: unknown }
	| { status: 'incomplete' }
	| { status: 'invalid'; message: string };

const INCOMPLETE: FilterValueResult = { status: 'incomplete' };

const invalid = (message: string): FilterValueResult => ({ status: 'invalid', message });
const ready = (value: unknown): FilterValueResult => ({ status: 'ready', value });

const WHOLE_NUMBER = /^[+-]?\d+$/;
const DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^(\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?$/;

/** Exact decimal text without a leading `+`. */
function exactText(text: string): string {
	return text.startsWith('+') ? text.slice(1) : text;
}

function encodeText(control: ScalarValueControl, raw: string): FilterValueResult {
	const text = control.kind === 'text' || control.kind === 'json' ? raw : raw.trim();
	if (text.trim() === '') return INCOMPLETE;
	switch (control.kind) {
		case 'text':
			return ready(text);
		case 'integer': {
			const value = Number(text);
			return WHOLE_NUMBER.test(text) && Number.isSafeInteger(value) ? ready(value) : invalid('Enter a whole number.');
		}
		case 'number': {
			const value = Number(text);
			return DECIMAL.test(text) && Number.isFinite(value) ? ready(value) : invalid('Enter a number.');
		}
		case 'exact-integer':
			return WHOLE_NUMBER.test(text) ? ready(exactText(text)) : invalid('Enter a whole number.');
		case 'exact-decimal':
			return DECIMAL.test(text) ? ready(exactText(text)) : invalid('Enter a number.');
		case 'date':
			return DATE.test(text) && !Number.isNaN(Date.parse(text)) ? ready(text) : invalid('Enter a date.');
		case 'datetime':
			return Number.isNaN(Date.parse(text)) ? invalid('Enter a date and time.') : ready(new Date(text).toISOString());
		case 'time': {
			const match = TIME.exec(text);
			if (!match) return invalid('Enter a time.');
			return ready(`${match[1]}:${match[2]}:${match[3] ?? '00'}${match[4] ?? ''}`);
		}
		case 'choice':
			return control.options.some((option) => option.value === text)
				? ready(text)
				: invalid('Choose one of the listed values.');
		case 'json':
			try {
				return ready(JSON.parse(text));
			} catch {
				return invalid('Enter valid JSON.');
			}
		case 'boolean':
			return text === 'true' ? ready(true) : text === 'false' ? ready(false) : invalid('Choose true or false.');
	}
}

function encodeScalar(control: ScalarValueControl, value: SheetsFilterValue): FilterValueResult {
	if (value === null || value === undefined) return INCOMPLETE;
	if (control.kind === 'boolean') {
		if (typeof value === 'boolean') return ready(value);
		return typeof value === 'string' ? encodeText(control, value) : invalid('Choose true or false.');
	}
	return typeof value === 'string' ? encodeText(control, value) : invalid('This value does not fit this condition.');
}

/**
 * The operand for a condition, from its value control and the entered value.
 * `fixedValue` is the operand of an operator that takes no value (`isNull`).
 */
export function encodeFilterValue(
	control: FilterValueControl,
	value: SheetsFilterValue,
	fixedValue?: boolean,
): FilterValueResult {
	switch (control.kind) {
		case 'none':
			return fixedValue === undefined ? invalid('This condition has no value.') : ready(fixedValue);
		case 'unsupported':
			return invalid(control.reason);
		case 'multi': {
			if (!Array.isArray(value)) return value === null || value === '' ? INCOMPLETE : invalid('This value does not fit this condition.');
			const items = (value as readonly string[]).filter((item) => typeof item === 'string' && item.trim() !== '');
			if (items.length === 0) return INCOMPLETE;
			const encoded: unknown[] = [];
			for (const item of items) {
				const result = encodeScalar(control.item, item);
				if (result.status === 'invalid') return invalid(`"${item}": ${result.message}`);
				if (result.status === 'ready') encoded.push(result.value);
			}
			return ready(encoded);
		}
		case 'fields': {
			if (!value || typeof value !== 'object' || Array.isArray(value)) return INCOMPLETE;
			const entered = value as Readonly<Record<string, string>>;
			const operand: Record<string, unknown> = {};
			let missingRequired = false;
			for (const field of control.fields) {
				const raw = entered[field.name];
				const result = typeof raw === 'string' ? encodeScalar(field.control, raw) : INCOMPLETE;
				if (result.status === 'invalid') return invalid(`${field.label}: ${result.message}`);
				if (result.status === 'ready') operand[field.name] = result.value;
				else if (field.required) missingRequired = true;
			}
			return missingRequired || Object.keys(operand).length === 0 ? INCOMPLETE : ready(operand);
		}
		default:
			return encodeScalar(control, value);
	}
}

/** The value a new condition starts with for a control. */
export function emptyFilterValue(control: FilterValueControl): SheetsFilterValue {
	switch (control.kind) {
		case 'none':
		case 'unsupported':
			return null;
		case 'multi':
			return [];
		case 'fields':
			return {};
		case 'boolean':
			return true;
		default:
			return '';
	}
}

/**
 * Whether a value entered for one control can carry over to another, so a
 * condition keeps its value when the operator changes within the same shape.
 */
export function valueFitsControl(control: FilterValueControl, value: SheetsFilterValue): boolean {
	switch (control.kind) {
		case 'none':
		case 'unsupported':
			return value === null;
		case 'multi':
			return Array.isArray(value);
		case 'fields':
			return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'choice':
			return typeof value === 'string' && (value === '' || control.options.some((option) => option.value === value));
		default:
			return typeof value === 'string';
	}
}
