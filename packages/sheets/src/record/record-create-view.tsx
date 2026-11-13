'use client';

// A new record filled in the panel (an alternative to a draft row). Every field uses
// the grid's editor and parser; nothing is sent until Create. The model form schema
// checks the whole record first: fields the create requires, and every value by its
// column's rules. Only fields the user set are sent (the database fills the rest), and
// a field the create does not accept is never sent. On success the panel shows the
// created record.

import { useMemo, useState } from 'react';

import type { ColumnModel } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@constructive-io/ui/sheet';

import type { CellTypeRegistry } from '../cell-types/cell-type-registry';
import { parseColumnInput } from '../cell-types/column-value';
import { buildModelFormSchema, buildModelFormSpec } from '../forms/model-form';
import { writeErrorMessages } from '../grid/feedback/write-errors';
import { useSheetsTable } from '../hooks/use-sheets-table';
import { useTableModel } from '../hooks/use-table-model';
import type { SheetsOpenRecordRequest } from '../relations/relation-navigation';
import { RecordField } from './record-field';
import { recordFieldCell, recordLayout } from './record-layout';
import type { RecordRelationSectionComponent } from './record-relation-section';
import { recordKeyOf, recordTitle, type RecordPanelNewEntry, type RecordPanelRecordEntry } from './record-target';

type RowRecord = Record<string, unknown>;

export interface RecordCreateViewProps {
	entry: RecordPanelNewEntry;
	registry: CellTypeRegistry;
	typeOverrides?: Readonly<Record<string, string>>;
	/** Why files cannot be changed here (no storage endpoint), or null. */
	mediaReason?: string | null;
	/** The record was created: show it. */
	onCreated: (entry: RecordPanelRecordEntry) => void;
	/** Leave without creating. */
	onCancel: () => void;
	/** A record was created; refresh the grid. */
	onInvalidate: () => void;
	/** Open a linked record (from a belongsTo section). */
	onOpenRecord: (request: SheetsOpenRecordRequest) => void;
	RelationSection: RecordRelationSectionComponent | null;
}

function withoutKey(record: Readonly<Record<string, string>>, key: string): Record<string, string> {
	if (!(key in record)) return record;
	const { [key]: _removed, ...rest } = record;
	return rest;
}

export function RecordCreateView({ entry, registry, typeOverrides, mediaReason, onCreated, onCancel, onInvalidate, onOpenRecord, RelationSection }: RecordCreateViewProps) {
	const { model, isLoading, error: modelError } = useTableModel(entry.tableName);
	const table = useSheetsTable<RowRecord>(entry.tableName, { enabled: false });
	const [values, setValues] = useState<RowRecord>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const recordId = `${entry.tableKey}:new`;

	const spec = useMemo(() => (model ? buildModelFormSpec(model, 'create', { typeOverrides }) : null), [model, typeOverrides]);
	const layout = useMemo(
		() => (model ? recordLayout(model, { mode: 'create', row: values, withRelations: RelationSection !== null, typeOverrides, mediaReason }) : []),
		[model, values, RelationSection, typeOverrides, mediaReason],
	);
	const createReason = model && !model.operations.create
		? model.issues.find((issue) => issue.scope === 'operation' && issue.target === 'create')?.message ?? 'New records cannot be added to this table.'
		: null;

	function setField(column: ColumnModel, value: unknown, fromText: boolean): boolean {
		const parsed = parseColumnInput(column, value, { fromText });
		if (!parsed.ok) {
			setErrors((current) => ({ ...current, [column.name]: parsed.reason }));
			return false;
		}
		setErrors((current) => withoutKey(current, column.name));
		setSubmitError(null);
		setValues((current) => ({ ...current, [column.name]: parsed.value }));
		return true;
	}

	async function submit() {
		if (!model || !spec || creating || createReason) return;
		const result = buildModelFormSchema(spec).safeParse(values);
		if (!result.success) {
			const next: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const field = String(issue.path[0] ?? '');
				if (field && !(field in next)) next[field] = issue.message;
			}
			setErrors(next);
			setSubmitError('Some fields need attention before the record can be created.');
			return;
		}
		const createValues = Object.fromEntries(Object.entries(result.data).filter(([, value]) => value !== undefined));
		setCreating(true);
		setSubmitError(null);
		try {
			const { createdRow } = await table.create(createValues);
			onInvalidate();
			const key = recordKeyOf(model, createdRow);
			if (!createdRow || !key) {
				setSubmitError('The record was created, but the server did not return its key, so it cannot be opened here.');
				return;
			}
			onCreated({ kind: 'record', tableKey: model.key, tableName: model.name, key, label: recordTitle(model, createdRow) });
		} catch (error) {
			setSubmitError(writeErrorMessages(error, 'create').join('\n'));
		} finally {
			setCreating(false);
		}
	}

	return (
		<div
			data-slot='record-create'
			className='flex min-h-0 flex-1 flex-col gap-4'
			onKeyDown={(e) => {
				if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
					e.preventDefault();
					void submit();
				}
			}}
		>
			<SheetHeader className='gap-1'>
				<span className='text-muted-foreground text-xs font-medium'>{entry.tableName}</span>
				<SheetTitle>New record</SheetTitle>
				<SheetDescription>Fill in the fields, then create the record. Fields marked * are required.</SheetDescription>
				{createReason ? <p className='text-muted-foreground text-xs'>{createReason}</p> : null}
			</SheetHeader>

			{modelError ? (
				<p role='alert' className='text-destructive text-sm'>This table could not be loaded: {modelError.message}</p>
			) : isLoading || !model ? (
				<div aria-busy='true' className='flex flex-col gap-3'>
					{[0, 1, 2].map((index) => (
						<div key={index} className='bg-muted h-10 animate-pulse rounded-md' />
					))}
				</div>
			) : (
				<div className='flex flex-col gap-4'>
					{layout.map((item) =>
						item.kind === 'field' ? (
							<RecordField
								key={item.field.name}
								name={item.field.name}
								label={item.field.label}
								description={item.field.description}
								column={item.field.column}
								cellType={item.cellType}
								readOnlyReason={item.readOnlyReason}
								required={item.field.required}
								value={values[item.field.name]}
								cell={recordFieldCell(registry, model, item, values[item.field.name], false)}
								saving={false}
								error={errors[item.field.name] ?? null}
								registry={registry}
								table={model}
								row={values}
								rowIdentifier={null}
								recordId={recordId}
								onSave={(value, fromText) => setField(item.field.column, value, fromText)}
								onCommitPatch={(patch) => setValues((current) => ({ ...current, ...patch }))}
								onInvalidate={onInvalidate}
							/>
						) : RelationSection ? (
							<RelationSection
								key={item.relation.fieldName}
								table={model}
								relation={item.relation}
								row={values}
								rowIdentifier={null}
								isDraft
								readOnlyReason={item.readOnlyReason}
								onCommitPatch={(patch) => setValues((current) => ({ ...current, ...patch }))}
								onInvalidateData={onInvalidate}
								onOpenRecord={onOpenRecord}
							/>
						) : null,
					)}
				</div>
			)}

			<SheetFooter variant='band' className='mt-auto'>
				{submitError ? (
					<p role='alert' className='text-destructive me-auto text-xs whitespace-pre-wrap'>
						{submitError}
					</p>
				) : null}
				<Button size='sm' variant='outline' onClick={onCancel} disabled={creating}>
					Cancel
				</Button>
				<Button size='sm' onClick={() => void submit()} disabled={creating || Boolean(createReason) || !model} title={createReason ?? undefined}>
					{creating ? 'Creating…' : 'Create record'}
				</Button>
			</SheetFooter>
		</div>
	);
}
