/**
 * The toolbar "Fields" control: find a field, show or hide it, reorder by drag
 * or with the move buttons, show all / hide all, choose how many fields stay
 * in place and the row height.
 */
import { useMemo, useRef, useState } from 'react';
import { RiArrowDownLine, RiArrowUpLine, RiDraggable, RiLayoutColumnLine } from '@remixicon/react';

import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';
import { Input } from '@constructive-io/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@constructive-io/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { cn } from '../../utils/cn';
import { TOOLBAR_POPOVER } from '../popup-classes';
import { ROW_HEIGHTS, ROW_HEIGHT_LABELS } from './column-layout';
import type { ColumnLayoutBindings } from './use-column-layout';
import type { SheetsRowHeight } from '../view-state/view-state.types';

export interface FieldsControlProps {
	layout: ColumnLayoutBindings;
	columnLabel: (name: string) => string;
	/** Whether the table model has loaded; before that the control waits. */
	ready: boolean;
}

interface DropTarget {
	key: string;
	side: 'before' | 'after';
}

function FieldList({ layout, columnLabel }: Omit<FieldsControlProps, 'ready'>) {
	const [query, setQuery] = useState('');
	const dragging = useRef<string | null>(null);
	const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
	const term = query.trim().toLowerCase();
	const keys = useMemo(
		() =>
			layout.orderedKeys.filter((key) => !term || columnLabel(key).toLowerCase().includes(term) || key.toLowerCase().includes(term)),
		[layout.orderedKeys, term, columnLabel],
	);
	const last = layout.orderedKeys.length - 1;

	return (
		<div className='grid gap-2'>
			<Input
				size='sm'
				aria-label='Find a field'
				placeholder='Find a field'
				value={query}
				onChange={(event) => setQuery(event.target.value)}
			/>
			{keys.length === 0 ? (
				<p className='text-muted-foreground px-1 py-2 text-sm'>No field matches “{query.trim()}”.</p>
			) : (
				<ul aria-label='Fields' className='grid max-h-72 gap-0.5 overflow-auto'>
					{keys.map((key) => {
						const label = columnLabel(key);
						const shown = !layout.isHidden(key);
						const reason = layout.hideReason(key);
						const index = layout.orderedKeys.indexOf(key);
						const side = dropTarget?.key === key && dragging.current !== key ? dropTarget.side : null;
						return (
							<li
								key={key}
								data-part-id='sheets-field'
								data-field={key}
								draggable
								onDragStart={(event) => {
									dragging.current = key;
									event.dataTransfer?.setData('text/plain', key);
								}}
								onDragOver={(event) => {
									if (!dragging.current) return;
									event.preventDefault();
									const rect = event.currentTarget.getBoundingClientRect();
									setDropTarget({ key, side: event.clientY < rect.top + rect.height / 2 ? 'before' : 'after' });
								}}
								onDrop={(event) => {
									event.preventDefault();
									const from = dragging.current;
									if (from && dropTarget && from !== dropTarget.key) layout.moveBeside(from, dropTarget.key, dropTarget.side);
									dragging.current = null;
									setDropTarget(null);
								}}
								onDragEnd={() => {
									dragging.current = null;
									setDropTarget(null);
								}}
								className={cn(
									'hover:bg-muted/60 relative flex items-center gap-2 rounded px-1 py-1',
									side === 'before' && 'before:bg-primary before:absolute before:inset-x-0 before:top-0 before:h-0.5',
									side === 'after' && 'after:bg-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5',
								)}
							>
								<RiDraggable className='text-muted-foreground size-4 shrink-0 cursor-grab' aria-hidden='true' />
								<Checkbox
									checked={shown}
									disabled={reason !== null}
									title={reason ?? undefined}
									aria-label={`Show ${label}`}
									onCheckedChange={(checked) => layout.setHidden(key, !checked)}
								/>
								<span className='min-w-0 flex-1 truncate text-sm' title={key}>
									{label}
								</span>
								<Button
									variant='ghost'
									size='icon-xs'
									aria-label={`Move ${label} up`}
									disabled={index <= 0}
									onClick={() => layout.moveTo(key, index - 1)}
								>
									<RiArrowUpLine aria-hidden='true' />
								</Button>
								<Button
									variant='ghost'
									size='icon-xs'
									aria-label={`Move ${label} down`}
									disabled={index >= last}
									onClick={() => layout.moveTo(key, index + 1)}
								>
									<RiArrowDownLine aria-hidden='true' />
								</Button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

export function FieldsControl({ layout, columnLabel, ready }: FieldsControlProps) {
	const hiddenCount = layout.orderedKeys.length - layout.visibleKeys.length;
	const frozenChoices = Array.from({ length: layout.visibleKeys.length + 1 }, (_, count) => count);
	return (
		<Popover open={layout.fieldsOpen} onOpenChange={layout.setFieldsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					disabled={!ready}
					title={ready ? undefined : 'Fields are available once the table has loaded.'}
					aria-label={hiddenCount > 0 ? `Fields (${hiddenCount} hidden)` : 'Fields'}
				>
					<RiLayoutColumnLine className='text-muted-foreground/60 -ms-1.5 size-5' aria-hidden='true' />
					Fields
					{hiddenCount > 0 && <span className='text-muted-foreground text-xs tabular-nums'>{hiddenCount} hidden</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className={cn('w-[22rem]', TOOLBAR_POPOVER)} align='end'>
				<div className='grid gap-3' data-part-id='sheets-fields-control'>
					<h4 className='leading-none font-medium'>Fields</h4>
					<FieldList layout={layout} columnLabel={columnLabel} />
					<div className='flex items-center gap-2'>
						<Button variant='ghost' size='xs' onClick={layout.showAll} disabled={hiddenCount === 0}>
							Show all
						</Button>
						<Button variant='ghost' size='xs' onClick={layout.hideAll} disabled={layout.visibleKeys.length <= 1}>
							Hide all
						</Button>
					</div>
					<div className='grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 border-t pt-3 text-sm'>
						<span className='text-muted-foreground'>Frozen fields</span>
						<Select value={String(layout.frozenCount)} onValueChange={(value) => (Number(value) === 0 ? layout.unfreeze() : layout.freezeUpTo(layout.visibleKeys[Number(value) - 1]!))}>
							<SelectTrigger size='sm' aria-label='Frozen fields'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{frozenChoices.map((count) => (
									<SelectItem key={count} value={String(count)}>
										{count === 0 ? 'None' : count === 1 ? `First field (${columnLabel(layout.visibleKeys[0]!)})` : `First ${count} fields`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<span className='text-muted-foreground'>Row height</span>
						<Select value={layout.layout.rowHeight} onValueChange={(value) => layout.setRowHeight(value as SheetsRowHeight)}>
							<SelectTrigger size='sm' aria-label='Row height'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ROW_HEIGHTS.map((height) => (
									<SelectItem key={height} value={height}>
										{ROW_HEIGHT_LABELS[height]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
