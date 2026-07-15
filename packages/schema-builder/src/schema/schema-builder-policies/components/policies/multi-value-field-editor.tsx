'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Plus, Trash2 } from 'lucide-react';

function normalizeValue(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v));
	if (typeof value === 'string') return value.trim() ? [value] : [];
	return [];
}

export function MultiValueFieldEditor({
	value,
	onChange,
	disabled,
	emptyText = 'No fields yet',
	addButtonText = 'Add field',
	typeBadge,
}: {
	value: unknown;
	onChange: (next: string[]) => void;
	disabled?: boolean;
	emptyText?: string;
	addButtonText?: string;
	typeBadge?: string;
}) {
	const normalizedValue = useMemo(() => normalizeValue(value), [value]);

	const idsRef = useRef<string[]>([]);
	const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
	const pendingFocusIndex = useRef<number | null>(null);

	useEffect(() => {
		// Keep stable IDs for each row so inputs don't remount while typing.
		const nextIds = idsRef.current.slice(0, normalizedValue.length);
		while (nextIds.length < normalizedValue.length) {
			nextIds.push(`mv-${crypto.randomUUID()}`);
		}
		idsRef.current = nextIds;
	}, [normalizedValue.length]);

	useEffect(() => {
		if (pendingFocusIndex.current === null) return;
		const idx = pendingFocusIndex.current;
		const el = inputRefs.current[idx] ?? null;
		if (el) {
			el.focus();
			el.select();
		}
		pendingFocusIndex.current = null;
	}, [normalizedValue.length]);

	const addOption = useCallback(() => {
		pendingFocusIndex.current = normalizedValue.length;
		idsRef.current = [...idsRef.current, `mv-${crypto.randomUUID()}`];
		onChange([...normalizedValue, '']);
	}, [normalizedValue, onChange]);

	const updateOption = useCallback(
		(index: number, nextValue: string) => {
			const next = normalizedValue.slice();
			next[index] = nextValue;
			onChange(next);
		},
		[normalizedValue, onChange],
	);

	const removeOption = useCallback(
		(index: number) => {
			idsRef.current = idsRef.current.filter((_, i) => i !== index);
			onChange(normalizedValue.filter((_, i) => i !== index));
		},
		[normalizedValue, onChange],
	);

	const insertAfter = useCallback(
		(index: number) => {
			const next = normalizedValue.slice();
			next.splice(index + 1, 0, '');
			const nextIds = idsRef.current.slice();
			nextIds.splice(index + 1, 0, `mv-${crypto.randomUUID()}`);
			idsRef.current = nextIds;
			pendingFocusIndex.current = index + 1;
			onChange(next);
		},
		[normalizedValue, onChange],
	);

	const rowIds = idsRef.current;

	return (
		<div className='space-y-2'>
			<div className='space-y-2'>
				{normalizedValue.length === 0 ? (
					<div className='text-muted-foreground rounded-md border border-dashed p-3 text-xs'>{emptyText}</div>
				) : (
					normalizedValue.map((opt, index) => (
						<div
							key={rowIds[index] ?? `mv-${index}`}
							className='bg-background flex items-center gap-2 rounded-md border px-2 py-1.5'
						>
							<Input
								ref={(el) => {
									inputRefs.current[index] = el;
								}}
								value={opt}
								onChange={(e) => updateOption(index, e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										insertAfter(index);
									}
								}}
								disabled={disabled}
								className='h-8 border-none shadow-none focus-visible:ring-0'
							/>
							{typeBadge && (
								<span className='text-muted-foreground shrink-0 text-xs'>{typeBadge}</span>
							)}
							<Button
								type='button'
								variant='ghost'
								size='sm'
								onClick={() => removeOption(index)}
								disabled={disabled}
								className='text-muted-foreground/80 hover:text-destructive h-8 w-8 p-0'
								aria-label='Remove field'
							>
								<Trash2 className='h-4 w-4' />
							</Button>
						</div>
					))
				)}
			</div>
			<div className='pt-1'>
				<Button
					type='button'
					variant='outline'
					size='sm'
					onClick={addOption}
					disabled={disabled}
					className='h-7 gap-1.5 px-2'
				>
					<Plus className='h-3.5 w-3.5' />
					{addButtonText}
				</Button>
			</div>
		</div>
	);
}
