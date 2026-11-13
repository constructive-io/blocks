/**
 * The filter builder: nested groups of conditions on columns and relations,
 * offering only the fields, operators and group logic the table model has.
 * Changes apply as they are made; typed values commit after a pause.
 */
import { memo, useMemo } from 'react';
import { RiAddLine, RiCloseLine } from '@remixicon/react';

import type { RelationModel, TableKey, TableModel } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectGroupLabel,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@constructive-io/ui/select';

import type { ConditionStatus } from '../view-state/build-view-query';
import { MAX_FILTER_DEPTH, createFilterGroup, removeFilterNode, replaceFilterNode } from '../view-state/view-state';
import type {
	SheetsColumnCondition,
	SheetsFilterCondition,
	SheetsFilterGroup,
	SheetsFilterLogic,
	SheetsRelationCondition,
	SheetsRelationTest,
} from '../view-state/view-state.types';
import { FILTER_OPERATOR_GROUPS, filterOperatorOptions, findOperatorOption } from '../filter-operators';
import { filterFieldsOf, newCondition, type FilterField } from './filter-fields';
import { emptyFilterValue, valueFitsControl } from './filter-value';
import { FilterValueInput } from './filter-value-control';
import { relationFilterTests } from './relation-filters';
import { useCommittedText } from './use-committed-text';

interface BuilderContext {
	fields: readonly FilterField[];
	logicalOperators: readonly ('and' | 'or' | 'not')[];
	conditions: ReadonlyMap<string, ConditionStatus>;
	relatedModel: (key: TableKey) => TableModel | null;
}

function fieldOf(ctx: BuilderContext, condition: SheetsFilterCondition): FilterField | undefined {
	const key = condition.kind === 'column' ? `column:${condition.column}` : `relation:${condition.relation}`;
	return ctx.fields.find((field) => field.key === key);
}

function relatedOf(ctx: BuilderContext, relation: RelationModel): TableModel | null {
	return relation.targetKey ? ctx.relatedModel(relation.targetKey) : null;
}

function FieldSelect({
	ctx,
	value,
	onChange,
}: {
	ctx: BuilderContext;
	value: string;
	onChange: (field: FilterField) => void;
}) {
	const columns = ctx.fields.filter((field) => field.kind === 'column');
	const relations = ctx.fields.filter((field) => field.kind === 'relation');
	return (
		<Select
			value={value}
			onValueChange={(key) => {
				const field = ctx.fields.find((candidate) => candidate.key === key);
				if (field) onChange(field);
			}}
		>
			<SelectTrigger size='sm' className='w-[10rem]' aria-label='Field'>
				<SelectValue placeholder='Field' />
			</SelectTrigger>
			<SelectContent>
				{columns.length > 0 && (
					<SelectGroup>
						<SelectGroupLabel>Columns</SelectGroupLabel>
						{columns.map((field) => (
							<SelectItem key={field.key} value={field.key} title={field.name}>
								{field.label}
							</SelectItem>
						))}
					</SelectGroup>
				)}
				{relations.length > 0 && (
					<SelectGroup>
						<SelectGroupLabel>Linked records</SelectGroupLabel>
						{relations.map((field) => (
							<SelectItem key={field.key} value={field.key} title={field.name}>
								{field.label}
							</SelectItem>
						))}
					</SelectGroup>
				)}
			</SelectContent>
		</Select>
	);
}

function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
	return (
		<Button variant='ghost' size='icon-xs' onClick={onRemove} aria-label={label}>
			<RiCloseLine aria-hidden='true' />
		</Button>
	);
}

function errorOf(ctx: BuilderContext, id: string): string | null {
	const status = ctx.conditions.get(id);
	return status?.status === 'invalid' ? status.message : null;
}

/** The operator select and value control of a column condition. */
function ColumnConditionControls({
	ctx,
	condition,
	field,
	onChange,
}: {
	ctx: BuilderContext;
	condition: SheetsColumnCondition;
	field: Extract<FilterField, { kind: 'column' }>;
	onChange: (next: SheetsFilterCondition) => void;
}) {
	const options = useMemo(() => filterOperatorOptions(field.column), [field.column]);
	const current = findOperatorOption(options, condition.operator, condition.value);
	const groups = FILTER_OPERATOR_GROUPS.map((entry) => ({
		...entry,
		options: options.filter((option) => option.group === entry.group),
	})).filter((entry) => entry.options.length > 0);

	return (
		<>
			<Select
				value={current?.id ?? null}
				onValueChange={(id) => {
					const option = options.find((candidate) => candidate.id === id);
					if (!option) return;
					const value =
						option.control.kind === 'none'
							? option.fixedValue ?? null
							: valueFitsControl(option.control, condition.value)
								? condition.value
								: emptyFilterValue(option.control);
					onChange({ ...condition, operator: option.operator, value });
				}}
			>
				<SelectTrigger size='sm' className='w-[11rem]' aria-label={`Condition for ${field.label}`}>
					<SelectValue placeholder='Condition' />
				</SelectTrigger>
				<SelectContent>
					{groups.map((group) => (
						<SelectGroup key={group.group}>
							<SelectGroupLabel>{group.label}</SelectGroupLabel>
							{group.options.map((option) => (
								<SelectItem
									key={option.id}
									value={option.id}
									disabled={option.control.kind === 'unsupported'}
									title={option.control.kind === 'unsupported' ? option.control.reason : undefined}
								>
									{option.label}
								</SelectItem>
							))}
						</SelectGroup>
					))}
				</SelectContent>
			</Select>
			{current && (
				<FilterValueInput
					key={`${field.key}:${current.id}`}
					control={current.control}
					value={condition.value}
					onChange={(value) => onChange({ ...condition, value })}
					label={`Value for ${field.label}`}
					error={errorOf(ctx, condition.id)}
				/>
			)}
		</>
	);
}

function LabelText({ value, onCommit, label }: { value: string; onCommit: (text: string) => void; label: string }) {
	const { text, change, flush } = useCommittedText(value, onCommit);
	return (
		<Input
			size='sm'
			className='w-[11rem]'
			aria-label={label}
			placeholder='Text'
			value={text}
			onChange={(event) => change(event.target.value)}
			onBlur={flush}
			onKeyDown={(event) => {
				if (event.key === 'Enter') flush();
			}}
		/>
	);
}

/** The test select and text of a relation condition. Tests the model cannot run are listed disabled with the reason. */
function RelationConditionControls({
	ctx,
	condition,
	field,
	onChange,
}: {
	ctx: BuilderContext;
	condition: SheetsRelationCondition;
	field: Extract<FilterField, { kind: 'relation' }>;
	onChange: (next: SheetsFilterCondition) => void;
}) {
	const tests = relationFilterTests(field.relation, relatedOf(ctx, field.relation));
	const error = errorOf(ctx, condition.id);
	return (
		<>
			<Select
				value={condition.test}
				onValueChange={(test) => {
					const next = test as SheetsRelationTest;
					onChange({ ...condition, test: next, value: next === 'labelContains' ? condition.value ?? '' : null });
				}}
			>
				<SelectTrigger size='sm' className='w-[13rem]' aria-label={`Condition for ${field.label}`}>
					<SelectValue placeholder='Condition' />
				</SelectTrigger>
				<SelectContent>
					{tests.map((test) => (
						<SelectItem key={test.test} value={test.test} disabled={Boolean(test.reason)} title={test.reason ?? undefined}>
							{test.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{condition.test === 'labelContains' && (
				<div className='flex flex-col gap-1'>
					<LabelText
						value={condition.value ?? ''}
						onCommit={(value) => onChange({ ...condition, value })}
						label={`Value for ${field.label}`}
					/>
					{error && (
						<p className='text-destructive text-xs' role='alert'>
							{error}
						</p>
					)}
				</div>
			)}
		</>
	);
}

/**
 * One condition. The field select stays the same element when the field changes
 * kind (column to relation), so it keeps keyboard focus.
 */
function ConditionRow({
	ctx,
	condition,
	onChange,
	onRemove,
}: {
	ctx: BuilderContext;
	condition: SheetsFilterCondition;
	onChange: (next: SheetsFilterCondition) => void;
	onRemove: () => void;
}) {
	const field = fieldOf(ctx, condition);
	if (!field || field.kind !== condition.kind) {
		return (
			<div data-part-id='sheets-filter-condition' className='text-muted-foreground flex items-center gap-2 text-xs'>
				<span>This condition names a field the table no longer has.</span>
				<RemoveButton label='Remove condition' onRemove={onRemove} />
			</div>
		);
	}
	const onFieldChange = (next: FilterField) => {
		const replacement = newCondition(next, next.kind === 'relation' ? relatedOf(ctx, next.relation) : null);
		if (replacement) onChange({ ...replacement, id: condition.id });
	};
	return (
		<div data-part-id='sheets-filter-condition' className='flex flex-wrap items-start gap-2'>
			<FieldSelect ctx={ctx} value={field.key} onChange={onFieldChange} />
			{field.kind === 'relation' && condition.kind === 'relation' && (
				<RelationConditionControls ctx={ctx} condition={condition} field={field} onChange={onChange} />
			)}
			{field.kind === 'column' && condition.kind === 'column' && (
				<ColumnConditionControls ctx={ctx} condition={condition} field={field} onChange={onChange} />
			)}
			<RemoveButton label={`Remove condition on ${field.label}`} onRemove={onRemove} />
		</div>
	);
}

const LOGIC_LABEL: Record<SheetsFilterLogic, string> = { and: 'all', or: 'any' };

const GroupEditor = memo(function GroupEditor({
	ctx,
	group,
	depth,
	onChange,
	onRemove,
}: {
	ctx: BuilderContext;
	group: SheetsFilterGroup;
	depth: number;
	onChange: (next: SheetsFilterGroup) => void;
	onRemove?: () => void;
}) {
	const logics = (['and', 'or'] as const).filter((logic) => logic === group.logic || ctx.logicalOperators.includes(logic));
	const childLogic: SheetsFilterLogic = group.logic === 'and' && ctx.logicalOperators.includes('or') ? 'or' : 'and';
	const firstField = ctx.fields[0];

	const addCondition = () => {
		if (!firstField) return;
		const condition = newCondition(firstField, firstField.kind === 'relation' ? relatedOf(ctx, firstField.relation) : null);
		if (condition) onChange({ ...group, children: [...group.children, condition] });
	};

	return (
		<div
			role='group'
			aria-label={depth === 0 ? 'Filters' : 'Filter group'}
			data-part-id='sheets-filter-group'
			className={depth > 0 ? 'border-muted-foreground/20 ml-1 border-l-2 pl-3' : undefined}
		>
			<div className='mb-2 flex items-center gap-1.5 text-xs'>
				<span className='text-muted-foreground'>Match</span>
				{logics.length > 1 ? (
					<Select value={group.logic} onValueChange={(logic) => onChange({ ...group, logic: logic as SheetsFilterLogic })}>
						<SelectTrigger size='sm' className='h-7 w-[5.5rem]' aria-label='Match all or any'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{logics.map((logic) => (
								<SelectItem key={logic} value={logic}>
									{LOGIC_LABEL[logic]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : (
					<span className='font-medium'>{LOGIC_LABEL[group.logic]}</span>
				)}
				<span className='text-muted-foreground'>of these conditions</span>
				{onRemove && (
					<span className='ml-auto'>
						<RemoveButton label='Remove group' onRemove={onRemove} />
					</span>
				)}
			</div>

			<div className='grid gap-2'>
				{group.children.map((child) =>
					child.kind === 'group' ? (
						<GroupEditor
							key={child.id}
							ctx={ctx}
							group={child}
							depth={depth + 1}
							onChange={(next) => onChange(replaceFilterNode(group, child.id, next))}
							onRemove={() => onChange(removeFilterNode(group, child.id))}
						/>
					) : (
						<ConditionRow
							key={child.id}
							ctx={ctx}
							condition={child}
							onChange={(next) => onChange(replaceFilterNode(group, child.id, next))}
							onRemove={() => onChange(removeFilterNode(group, child.id))}
						/>
					),
				)}
			</div>

			<div className='mt-2 flex items-center gap-2'>
				<Button variant='ghost' size='xs' onClick={addCondition} disabled={!firstField}>
					<RiAddLine aria-hidden='true' /> Add condition
				</Button>
				{depth < MAX_FILTER_DEPTH - 1 && (
					<Button
						variant='ghost'
						size='xs'
						onClick={() => onChange({ ...group, children: [...group.children, createFilterGroup(childLogic)] })}
						disabled={!firstField}
					>
						<RiAddLine aria-hidden='true' /> Add group
					</Button>
				)}
			</div>
		</div>
	);
});

export interface FilterBuilderProps {
	model: TableModel | null;
	filters: SheetsFilterGroup;
	onChange: (filters: SheetsFilterGroup) => void;
	conditions: ReadonlyMap<string, ConditionStatus>;
	columnLabel: (name: string) => string;
	relatedModel: (key: TableKey) => TableModel | null;
}

export function FilterBuilder({ model, filters, onChange, conditions, columnLabel, relatedModel }: FilterBuilderProps) {
	const fields = useMemo(() => filterFieldsOf(model, columnLabel), [model, columnLabel]);
	const ctx = useMemo<BuilderContext>(
		() => ({ fields, logicalOperators: model?.operations.list?.logicalOperators ?? [], conditions, relatedModel }),
		[fields, model, conditions, relatedModel],
	);
	if (!model) return <p className='text-muted-foreground text-sm'>Filters are available once the table has loaded.</p>;
	if (fields.length === 0) return <p className='text-muted-foreground text-sm'>This table cannot be filtered.</p>;
	return <GroupEditor ctx={ctx} group={filters} depth={0} onChange={onChange} />;
}
