'use client';

import { useCallback, useMemo, useState } from 'react';
import { RiCheckLine, RiLoader4Line, RiSearchLine } from '@remixicon/react';
import { matchSorter } from 'match-sorter';

import { useDebounce } from '../lib/use-debounce';
import { Checkbox } from './checkbox';
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group';
import { ScrollArea } from './scroll-area';

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
	searchFields = ['name', 'title', 'label'],
	placeholder = 'Search records...',
	maxHeight = '300px',
}: RecordPickerProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const debouncedSearchQuery = useDebounce(searchQuery, 300);

	// Filter records based on search query
	const filteredRecords = useMemo(() => {
		if (!debouncedSearchQuery.trim()) {
			return records;
		}

		return matchSorter(records, debouncedSearchQuery, {
			keys: searchFields,
			threshold: matchSorter.rankings.CONTAINS,
		});
	}, [records, debouncedSearchQuery, searchFields]);

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
				<div className='space-y-2 pr-2'>
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
										className='hover:bg-muted/50 flex items-center space-x-3 rounded-md p-2 transition-colors'
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
