import React, { useCallback, useMemo } from 'react';
import { Info, Search, X } from 'lucide-react';

import { cn } from '../../utils/cn';
import { Button } from '@constructive-io/ui/button';
import { Label } from '@constructive-io/ui/label';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';

interface TsvectorEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
}
type Weight = 'A' | 'B' | 'C' | 'D';
type ParsedToken = { lexeme: string; weights: Weight[] };

function parseTsvector(tsvectorString: string): ParsedToken[] {
	if (!tsvectorString || typeof tsvectorString !== 'string') return [];
	try {
		const out: ParsedToken[] = [];
		const regex = /'([^']+)':([0-9A-D,]+)/g;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(tsvectorString)) !== null) {
			const lexeme = match[1];
			const posStr = match[2];
			const weights = Array.from(
				new Set(
					posStr
						.split(',')
						.map((p) => p.match(/[A-D]$/)?.[0] as Weight | undefined)
						.filter((w): w is Weight => !!w),
				),
			).sort();
			out.push({ lexeme, weights });
		}
		if (out.length) return out;
	} catch {
		// ignore
	}
	return tsvectorString
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => ({ lexeme: w, weights: [] }));
}

export const TsvectorEditor: React.FC<TsvectorEditorProps> = ({ value, onFinishedEditing }) => {
	const rawValue = typeof value === 'string' ? value : String(value ?? '');
	const parsedTokens = useMemo(() => parseTsvector(rawValue), [rawValue]);

	const handleClose = useCallback(() => onFinishedEditing(), [onFinishedEditing]);

	return (
		<EditorFocusTrap onEscape={handleClose} className={`bg-popover flex ${OVERLAY.md} flex-col gap-4 rounded-lg border p-4 shadow-lg`}>
			{/* Header */}
			<div className='flex items-center gap-2'>
				<Search className='text-muted-foreground h-4 w-4' />
				<h3 className='text-sm font-medium'>View Text Search Vector</h3>
			</div>

			{/* Parsed Tokens Preview */}
			{parsedTokens.length > 0 && (
				<div className='space-y-2'>
					<Label className='text-muted-foreground text-xs'>Parsed Tokens ({parsedTokens.length})</Label>
					<div className='bg-muted flex max-h-[120px] flex-wrap gap-1 overflow-y-auto rounded p-2 text-sm'>
						{parsedTokens.map((t, index) => {
							const weight = t.weights[0];
							const color =
								weight === 'A'
									? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
									: weight === 'B'
										? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
										: weight === 'C'
											? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
											: weight === 'D'
												? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
												: 'bg-primary/10 text-primary';
							return (
								<span key={index} className={cn('inline-flex items-center rounded px-2 py-1 text-xs', color)}>
									{t.lexeme}
									{t.weights.length > 0 && <span className='ml-1 font-mono opacity-80'>{t.weights.join(',')}</span>}
								</span>
							);
						})}
					</div>
				</div>
			)}

			{/* Raw tsvector */}
			<div className='space-y-2'>
				<Label className='text-muted-foreground text-xs'>Raw TSVector</Label>
				<div className='bg-muted/30 max-h-40 overflow-auto rounded-md p-2'>
					<pre className='m-0 font-mono text-xs break-all whitespace-pre-wrap'>{rawValue}</pre>
				</div>
			</div>

			{/* Help Text */}
			<div className='text-muted-foreground flex items-start gap-2 text-xs'>
				<Info className='mt-0.5 h-3 w-3 flex-shrink-0' />
				<div>
					<p>Values are generated server-side from your full-text configuration.</p>
					<p className='mt-1'>Weights: A (highest), B, C, D (lowest).</p>
				</div>
			</div>

			{/* Action Buttons */}
			<div className='flex justify-end gap-2'>
				<Button variant='outline' size='sm' onClick={handleClose}>
					<X className='mr-1 h-3 w-3' />
					Close
				</Button>
			</div>
		</EditorFocusTrap>
	);
};
