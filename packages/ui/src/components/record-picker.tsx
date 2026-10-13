'use client';

import { useCallback, useMemo, useState } from 'react';
import { RiCheckLine, RiLoader4Line, RiSearchLine } from '@remixicon/react';
import { matchSorter } from 'match-sorter';

import { useDebounce } from '../lib/use-debounce';
import { Checkbox } from './checkbox';
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group';
import { ScrollArea } from './scroll-area';

// Module-level so the default keeps one identity and the filter memo below is not recomputed on every render.
const DEFAULT_SEARCH_FIELDS = ['name', 'title', 'label'];
const NO_LABELS: readonly string[] = [];

/** Keeps the same array while its items are unchanged, so a memo keyed on it does not run again for an equal one. */
function useStableArray<T>(next: readonly T[]): readonly T[] {
	const [stable, setStable] = useState(next);
	if (stable === next || (stable.length === next.length && stable.every((item, index) => item === next[index]))) return stable;
	// Adjusting state while rendering: React re-renders at once, before anything is committed, and no ref is involved.
	setStable(next);
	return next;
}

interface RecordPickerProps {
	records: any[];
	linkedRecordIds: Set<string>;
	onLink: (record: any) => void;
	isLinking: boolean;
	getRecordLabel: (record: any) => string;
	getRecordId: (record: any) => string;
	searchFields?: string[];
	placeholder?: string;
	maxHeight?: string;
}

export function RecordPicker({
	records,
	linkedRecordIds,
	onLink,
	isLinking,
	getRecordLabel,
	getRecordId,
	searchFields = DEFAULT_SEARCH_FIELDS,
	placeholder = 'Search records...',
	maxHeight = '300px',
}: RecordPickerProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const debouncedSearchQuery = useDebounce(searchQuery, 300);

	const searching = debouncedSearchQuery.trim() !== '';
	// The text each row shows, read only while a search runs. Hosts usually pass `getRecordLabel` inline, so it is a new
	// function on every render; comparing the labels it returns keeps the much heavier search from running again for nothing.
	const labels = useStableArray(searching ? records.map((record) => String(getRecordLabel(record) ?? '')) : NO_LABELS);
	const fields = useStableArray(searchFields);

	// Filter records based on search query
	const filteredRecords = useMemo(() => {
		if (!searching) {
			return records;
		}

		// The row's own label is always searchable, so a query can never miss text the user can see.
		const labelOf = new Map(records.map((record, index) => [record, labels[index]]));
		return matchSorter(records, debouncedSearchQuery, {
			keys: [...fields, (record: any) => labelOf.get(record) ?? ''],
			threshold: matchSorter.rankings.CONTAINS,
		});
	}, [records, debouncedSearchQuery, searching, fields, labels]);

	// Separate linked and unlinked records
	const { linkedRecords, unlinkableRecords } = useMemo(() => {
		const linked: any[] = [];
		const unlinkable: any[] = [];

		filteredRecords.forEach((record) => {
			const recordId = getRecordId(record);
			if (linkedRecordIds.has(recordId)) {
				linked.push(record);
			} else {
				unlinkable.push(record);
			}
		});

		return { linkedRecords: linked, unlinkableRecords: unlinkable };
	}, [filteredRecords, linkedRecordIds, getRecordId]);

	const handleLinkRecord = useCallback(
		(record: any) => {
			onLink(record);
		},
		[onLink],
	);

	return (
		<div className='space-y-3'>
			{/* Search Input */}
			<InputGroup>
				<InputGroupAddon>
					<RiSearchLine />
				</InputGroupAddon>
				<InputGroupInput
					placeholder={placeholder}
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</InputGroup>

			{/* Records List */}
			<ScrollArea style={{ maxHeight }} className='scrollbar-neutral-thin'>
				<div className='space-y-2 pe-2'>
					{/* Unlinkable Records */}
					{unlinkableRecords.length > 0 && (
						<div className='space-y-1'>
							<h4 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
								Available Records ({unlinkableRecords.length})
							</h4>
							{unlinkableRecords.map((record) => {
								const recordId = getRecordId(record);
								const label = getRecordLabel(record);

								return (
									<div
										key={recordId}
										className='hover:bg-muted/50 flex items-center space-x-3 rounded-md p-2'
									>
										<Checkbox
											id={`record-${recordId}`}
											checked={false}
											onCheckedChange={() => handleLinkRecord(record)}
											disabled={isLinking}
											className='flex-shrink-0'
										/>
										<label
											htmlFor={`record-${recordId}`}
											className='flex-1 cursor-pointer truncate text-sm'
											title={label}
										>
											{label}
										</label>
										{isLinking && (
											<RiLoader4Line className='text-muted-foreground h-4 w-4 flex-shrink-0 animate-spin' />
										)}
									</div>
								);
							})}
						</div>
					)}

					{/* Already Linked Records */}
					{linkedRecords.length > 0 && (
						<div className='space-y-1'>
							<h4 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
								Already Linked ({linkedRecords.length})
							</h4>
							{linkedRecords.map((record) => {
								const recordId = getRecordId(record);
								const label = getRecordLabel(record);

								return (
									<div key={recordId} className='bg-muted/30 flex items-center space-x-3 rounded-md p-2'>
										<div className='flex h-4 w-4 flex-shrink-0 items-center justify-center'>
											<RiCheckLine className='h-3 w-3 text-green-600' />
										</div>
										<span className='text-muted-foreground flex-1 truncate text-sm' title={label}>
											{label}
										</span>
									</div>
								);
							})}
						</div>
					)}

					{/* Empty State */}
					{filteredRecords.length === 0 && (
						<div className='text-muted-foreground py-8 text-center'>
							<RiSearchLine className='mx-auto mb-2 h-8 w-8 opacity-50' />
							<p className='text-sm'>{searchQuery ? 'No records match your search' : 'No records available'}</p>
						</div>
					)}

					{/* No Unlinkable Records */}
					{filteredRecords.length > 0 && unlinkableRecords.length === 0 && (
						<div className='text-muted-foreground py-4 text-center'>
							<RiCheckLine className='mx-auto mb-2 h-6 w-6 opacity-50' />
							<p className='text-sm'>All matching records are already linked</p>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
