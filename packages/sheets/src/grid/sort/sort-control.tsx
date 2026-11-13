/**
 * The toolbar sort control: lists the sort keys in priority order and lets the
 * user change a direction, reorder, remove, or add a key. Only columns the
 * table model can sort by are offered.
 */
import { RiArrowDownLine, RiArrowUpLine, RiCloseLine } from '@remixicon/react';

import type { ColumnModel, TableModel } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { moveSortKey, setSortDirection } from '../view-state/view-state';
import type { SheetsSortDirection, SheetsSortKey } from '../view-state/view-state.types';

/** Words for the two directions of a column, by what its values are. */
export function sortDirectionLabels(column: ColumnModel | undefined): Record<SheetsSortDirection, string> {
	if (column && !column.value.isArray) {
		switch (column.value.kind) {
			case 'integer':
			case 'bigint':
			case 'decimal':
			case 'float':
				return { asc: '1 → 9', desc: '9 → 1' };
			case 'date':
			case 'datetime':
				return { asc: 'Oldest first', desc: 'Newest first' };
			case 'time':
				return { asc: 'Earliest first', desc: 'Latest first' };
			case 'boolean':
				return { asc: 'False first', desc: 'True first' };
			case 'enum':
				return { asc: 'First → last option', desc: 'Last → first option' };
			case 'text':
				return { asc: 'A → Z', desc: 'Z → A' };
		}
	}
	return { asc: 'Ascending', desc: 'Descending' };
}

export interface SortControlProps {
	model: TableModel | null;
	sort: readonly SheetsSortKey[];
	onChange: (sort: readonly SheetsSortKey[]) => void;
	/** Grid columns, in display order. */
	columnKeys: readonly string[];
	columnLabel: (name: string) => string;
}

export function SortControl({ model, sort, onChange, columnKeys, columnLabel }: SortControlProps) {
	if (!model) return <p className='text-muted-foreground text-sm'>Sorting is available once the table has loaded.</p>;
	const columnOf = (name: string) => model.columns.find((column) => column.name === name);
	const sortable = columnKeys.filter((key) => columnOf(key)?.sort);
	const available = sortable.filter((key) => !sort.some((entry) => entry.column === key));

	return (
		<div className='grid gap-3' data-part-id='sheets-sort-control'>
			{sort.length === 0 ? (
				<p className='text-muted-foreground text-sm'>Rows are not sorted.</p>
			) : (
				<ol className='grid gap-2' aria-label='Sort order'>
					{sort.map((entry, index) => {
						const label = columnLabel(entry.column);
						const directions = sortDirectionLabels(columnOf(entry.column));
						return (
							<li key={entry.column} className='flex items-center gap-2' data-part-id='sheets-sort-key'>
								<span className='text-muted-foreground w-4 text-right text-xs tabular-nums'>{index + 1}</span>
								<span className='w-[9rem] truncate text-sm' title={entry.column}>
									{label}
								</span>
								<Select
									value={entry.direction}
									onValueChange={(direction) => onChange(setSortDirection(sort, entry.column, direction as SheetsSortDirection))}
								>
									<SelectTrigger size='sm' className='w-[9.5rem]' aria-label={`Direction for ${label}`}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='asc'>{directions.asc}</SelectItem>
										<SelectItem value='desc'>{directions.desc}</SelectItem>
									</SelectContent>
								</Select>
								<Button
									variant='ghost'
									size='icon-xs'
									aria-label={`Move ${label} up`}
									disabled={index === 0}
									onClick={() => onChange(moveSortKey(sort, index, index - 1))}
								>
									<RiArrowUpLine aria-hidden='true' />
								</Button>
								<Button
									variant='ghost'
									size='icon-xs'
									aria-label={`Move ${label} down`}
									disabled={index === sort.length - 1}
									onClick={() => onChange(moveSortKey(sort, index, index + 1))}
								>
									<RiArrowDownLine aria-hidden='true' />
								</Button>
								<Button
									variant='ghost'
									size='icon-xs'
									aria-label={`Remove sort by ${label}`}
									onClick={() => onChange(sort.filter((candidate) => candidate.column !== entry.column))}
								>
									<RiCloseLine aria-hidden='true' />
								</Button>
							</li>
						);
					})}
				</ol>
			)}
			<div className='flex items-center gap-2 border-t pt-2'>
				{available.length > 0 ? (
					<Select value={null} onValueChange={(column) => onChange([...sort, { column, direction: 'asc' }])}>
						<SelectTrigger size='sm' className='w-[12rem]' aria-label='Add a sort'>
							<SelectValue placeholder='Add a sort' />
						</SelectTrigger>
						<SelectContent>
							{available.map((key) => (
								<SelectItem key={key} value={key} title={key}>
									{columnLabel(key)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : (
					<p className='text-muted-foreground text-xs'>
						{sortable.length === 0 ? 'No column of this table can be sorted.' : 'Every sortable column is in the sort.'}
					</p>
				)}
				{sort.length > 0 && (
					<Button variant='ghost' size='xs' className='ml-auto' onClick={() => onChange([])}>
						Clear sort
					</Button>
				)}
			</div>
		</div>
	);
}
