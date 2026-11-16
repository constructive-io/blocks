'use client';

// Small form for values made of named fields: records (composite values), plain x/y
// points and durations. The fields come from the column's write input
// (`column.value.input.fields`), so the form matches what the API accepts. The whole
// value is checked by `parseColumnInput` before it is committed; a problem shows in
// the form and nothing is written.

import { useMemo, useState } from 'react';

import type { ColumnModel, InputFieldModel } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';

import { EditorFooter, EditorHeader, editorClear } from '../../grid/editors/editor-frame';
import { OVERLAY_SM } from '../../grid/editors/overlay-presets';
import { parseColumnInput } from '../../cell-types/column-value';
import { fieldLabel } from '../../cell-types/field-label';
import { cn } from '../../utils/cn';
import type { EditorProps } from './editor-props';

function fieldText(value: unknown): string {
	if (value === null || value === undefined) return '';
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function seedFields(fields: readonly InputFieldModel[], value: unknown): Record<string, string> {
	const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
	return Object.fromEntries(fields.map((field) => [field.name, fieldText(record[field.name])]));
}

/** Plain-language hint for a field's value, from its standard GraphQL type. */
function fieldHint(field: InputFieldModel): string | undefined {
	switch (field.value.typeName) {
		case 'Int':
		case 'BigInt':
			return 'Whole number';
		case 'Float':
		case 'BigFloat':
			return 'Number';
		case 'Date':
			return 'Date, for example 2024-01-31';
		case 'Datetime':
			return 'Date and time';
		default:
			return undefined;
	}
}

interface RecordFormProps {
	column: ColumnModel;
	value: unknown;
	title: string;
	onCommit: (next: unknown) => void;
	/** Field names in the order to show them; fields not listed follow in the API's order. */
	fieldOrder?: readonly string[];
}

function orderFields(fields: readonly InputFieldModel[], order: readonly string[] | undefined): readonly InputFieldModel[] {
	if (!order) return fields;
	const rank = (name: string) => {
		const index = order.indexOf(name);
		return index === -1 ? order.length : index;
	};
	return [...fields].sort((a, b) => rank(a.name) - rank(b.name));
}

/** The form itself, for a column whose write input lists its fields. */
export function RecordForm({ column, value, title, onCommit, fieldOrder }: RecordFormProps) {
	const fields = useMemo(() => orderFields(column.value.input?.fields ?? [], fieldOrder), [column, fieldOrder]);
	const [texts, setTexts] = useState<Record<string, string>>(() => seedFields(fields, value));
	const [error, setError] = useState<string | null>(null);

	function save() {
		const draft: Record<string, unknown> = {};
		for (const field of fields) {
			const text = texts[field.name] ?? '';
			draft[field.name] = text.trim() === '' ? null : field.value.typeName === 'Boolean' ? text === 'true' : text;
		}
		const parsed = parseColumnInput(column, draft);
		if (parsed.ok === false) {
			setError(parsed.reason);
			return;
		}
		onCommit(parsed.value);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			save();
		}
	}

	return (
		<div
			data-slot='record-editor'
			className={cn('bg-popover flex flex-col gap-3 rounded-lg border p-3 shadow-lg', OVERLAY_SM)}
			onKeyDown={handleKeyDown}
		>
			<EditorHeader title={title} />
			<div className='grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2'>
				{fields.map((field, index) => {
					const id = `record-field-${column.name}-${field.name}`;
					const hint = fieldHint(field);
					return (
						<div key={field.name} className='contents'>
							<label htmlFor={id} className='text-muted-foreground text-xs'>
								{fieldLabel(field.name)}
								{field.required ? <span aria-hidden> *</span> : null}
							</label>
							{field.value.typeName === 'Boolean' ? (
								<input
									id={id}
									type='checkbox'
									checked={texts[field.name] === 'true'}
									onChange={(e) => setTexts((current) => ({ ...current, [field.name]: String(e.target.checked) }))}
									className='justify-self-start'
								/>
							) : (
								<input
									id={id}
									value={texts[field.name] ?? ''}
									placeholder={hint}
									onChange={(e) => {
										setError(null);
										setTexts((current) => ({ ...current, [field.name]: e.target.value }));
									}}
									spellCheck={false}
									autoFocus={index === 0}
									className='bg-muted/40 border-border/40 min-w-0 rounded-md border px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/35'
								/>
							)}
						</div>
					);
				})}
			</div>
			{error ? (
				<p role='alert' className='text-destructive text-xs'>
					{error}
				</p>
			) : null}
			<EditorFooter onSave={save} saveShortcut='Enter' clear={editorClear(column.nullable, () => onCommit(null))} />
		</div>
	);
}

/** Overlay editor for record, point and duration cells. */
export function RecordEditorDom({ value, column, colKey, onCancel, onCommit }: EditorProps) {
	if (!column?.value.input?.fields?.length) {
		// Routing makes such a cell read-only; this guards a consumer that routes here anyway.
		return (
			<div data-slot='record-editor' className={cn('bg-popover flex flex-col gap-2 rounded-lg border p-3 text-sm shadow-lg', OVERLAY_SM)}>
				<p>The parts of this value are not known, so it cannot be changed here.</p>
				<div className='flex justify-end'>
					<Button size='xs' variant='outline' onClick={onCancel}>
						Close
					</Button>
				</div>
			</div>
		);
	}
	return <RecordForm column={column} value={value} title={fieldLabel(column.name ?? colKey)} onCommit={onCommit} />;
}
