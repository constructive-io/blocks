/**
 * The toolbar search box. It searches what the table model allows (see
 * `searchPlanOf`) and says which columns that covers. Typing commits after a
 * pause; Escape clears the search.
 */
import { useId } from 'react';
import { RiCloseLine, RiSearch2Line } from '@remixicon/react';

import { Input } from '@constructive-io/ui/input';

import { useCommittedText } from '../filters/use-committed-text';
import { searchedColumns, type SearchPlan } from '../view-state/search-plan';

export interface SearchBoxProps {
	plan: SearchPlan | null;
	value: string;
	onChange: (value: string) => void;
	columnLabel: (name: string) => string;
	inputRef: React.MutableRefObject<HTMLInputElement | null>;
	/** Whether the table model has loaded; before that the box waits. */
	ready: boolean;
}

/** The sentence that says what a search covers. */
export function searchScopeText(plan: SearchPlan, columnLabel: (name: string) => string): string {
	const names = searchedColumns(plan).map(columnLabel);
	if (plan.mode === 'unified') {
		return names.length > 0 ? `Searches the table's search fields: ${names.join(', ')}` : "Searches the table's search fields";
	}
	return `Searches ${names.join(', ')}`;
}

export function SearchBox({ plan, value, onChange, columnLabel, inputRef, ready }: SearchBoxProps) {
	const { text, change, flush, commitNow } = useCommittedText(value, onChange);
	const scopeId = useId();
	const disabledReason = !ready ? 'Search is available once the table has loaded.' : plan ? null : 'This table cannot be searched.';
	const scope = plan ? searchScopeText(plan, columnLabel) : disabledReason ?? '';
	const names = plan ? searchedColumns(plan).map(columnLabel) : [];
	const placeholder = names.length > 0 && names.length <= 3 ? `Search ${names.join(', ')}` : 'Search';

	return (
		<div data-part-id='sheets-search' className='relative flex items-center' title={scope}>
			{/* Above the input: the input's own background would otherwise cover it. */}
			<RiSearch2Line className='text-muted-foreground/70 pointer-events-none absolute left-2 z-10 size-4' aria-hidden='true' />
			<Input
				ref={inputRef}
				type='search'
				aria-label='Search rows'
				aria-describedby={scopeId}
				className='w-[14rem] ps-6 pe-6'
				placeholder={placeholder}
				disabled={Boolean(disabledReason)}
				value={text}
				onChange={(event) => change(event.target.value)}
				onBlur={flush}
				onKeyDown={(event) => {
					if (event.key === 'Enter') flush();
					if (event.key === 'Escape' && text !== '') {
						event.preventDefault();
						event.stopPropagation();
						commitNow('');
					}
				}}
			/>
			<span id={scopeId} className='sr-only'>
				{scope}
			</span>
			{text !== '' && (
				<button
					type='button'
					className='text-muted-foreground hover:text-foreground absolute right-1.5 z-10 rounded p-0.5'
					aria-label='Clear search'
					onClick={() => {
						commitNow('');
						inputRef.current?.focus();
					}}
				>
					<RiCloseLine className='size-4' aria-hidden='true' />
				</button>
			)}
		</div>
	);
}
