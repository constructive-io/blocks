'use client';

// The grid's one save status, in the status bar: "Saving…" while any write is in
// flight, then a green check with "Saved" (or an error icon with what was not
// saved), then it fades out. Every write reports to the same state (see
// feedback-reducer.ts), so this is the only place a write's outcome shows; failed
// writes also keep their full messages in the error cards above the bar.
//
// Motion follows transitions.dev (https://transitions.dev):
// - Icon swap (09): the spinner, the check and the error icon share one slot and
//   cross-fade with blur and scale.
// - Success check (10): the check fades, turns upright, settles and draws its stroke.
// - Text states swap (04): the old label leaves upward with blur, the new one rises in.
// - "Saving…" shows only once a write has run for 300 ms. A quicker save goes straight to
//   its outcome, and a new save keeps the last outcome on screen until then, so quick
//   edits never make the bar blink between a spinner and a check.
// The CSS is scoped to this component and keeps each snippet's reduced-motion guard.

import { useEffect, useRef, useState } from 'react';
import { RiErrorWarningLine, RiLoader4Line } from '@remixicon/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { cn } from '../../utils/cn';
import { useOperationFeedback } from './feedback-context';
import type { OperationFeedback } from './feedback-reducer';

type Phase = 'saving' | 'saved' | 'partial' | 'failed';

function phaseOf(status: OperationFeedback['status']): Phase {
	if (status === 'success') return 'saved';
	if (status === 'partial') return 'partial';
	if (status === 'error') return 'failed';
	return 'saving';
}

/** Length of the check path below (`getTotalLength()` = 19.8), rounded up by 1. */
const CHECK_PATH_LENGTH = 21;

const STYLES = `
[data-part-id='sheets-save-status'] {
	--icon-swap-dur: 250ms;
	--icon-swap-blur: 2px;
	--icon-swap-start-scale: 0.25;
	--icon-swap-ease: ease-in-out;
	--check-opacity-dur: 500ms;
	--check-rotate-dur: 500ms;
	--check-rotate-from: 80deg;
	--check-bob-dur: 500ms;
	--check-y-amount: 8px;
	--check-blur-dur: 500ms;
	--check-blur-from: 8px;
	--check-path-dur: 500ms;
	--check-path-delay: 80ms;
	--check-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
	--check-ease-opacity: cubic-bezier(0.22, 1, 0.36, 1);
	--check-ease-rotate: cubic-bezier(0.22, 1, 0.36, 1);
	--check-ease-bob: cubic-bezier(0.34, 1.35, 0.64, 1);
	--check-ease-path: cubic-bezier(0.22, 1, 0.36, 1);

	opacity: 0;
	filter: blur(2px);
	transition: opacity 150ms ease-in-out, filter 150ms ease-in-out;
}
[data-part-id='sheets-save-status'][data-visible='true'] {
	opacity: 1;
	filter: blur(0);
}

[data-part-id='sheets-save-status'] .t-icon-swap {
	position: relative;
	display: inline-grid;
}
[data-part-id='sheets-save-status'] .t-icon-swap .t-icon {
	grid-area: 1 / 1;
	display: inline-flex;
	opacity: 0;
	filter: blur(var(--icon-swap-blur));
	transform: scale(var(--icon-swap-start-scale));
	transition:
		opacity   var(--icon-swap-dur) var(--icon-swap-ease),
		filter    var(--icon-swap-dur) var(--icon-swap-ease),
		transform var(--icon-swap-dur) var(--icon-swap-ease);
}
[data-part-id='sheets-save-status'] .t-icon-swap[data-state='saving'] .t-icon[data-icon='saving'],
[data-part-id='sheets-save-status'] .t-icon-swap[data-state='saved'] .t-icon[data-icon='saved'],
[data-part-id='sheets-save-status'] .t-icon-swap[data-state='failed'] .t-icon[data-icon='failed'] {
	opacity: 1;
	filter: blur(0);
	transform: scale(1);
}

[data-part-id='sheets-save-status'] .t-success-check {
	display: inline-block;
	transform-origin: center;
	opacity: 0;
	will-change: transform, opacity, filter;
}
[data-part-id='sheets-save-status'] .t-success-check svg { display: block; overflow: visible; }
[data-part-id='sheets-save-status'] .t-success-check svg path {
	stroke-dasharray: ${CHECK_PATH_LENGTH};
	stroke-dashoffset: ${CHECK_PATH_LENGTH};
}
[data-part-id='sheets-save-status'] .t-success-check[data-state='in'] {
	animation:
		sheets-check-fade   var(--check-opacity-dur) var(--check-ease-opacity) forwards,
		sheets-check-rotate var(--check-rotate-dur)  var(--check-ease-rotate)  forwards,
		sheets-check-blur   var(--check-blur-dur)    var(--check-ease-out)     forwards,
		sheets-check-bob    var(--check-bob-dur)     var(--check-ease-bob)     forwards;
}
[data-part-id='sheets-save-status'] .t-success-check[data-state='in'] svg path {
	animation: sheets-check-draw var(--check-path-dur) var(--check-ease-path) var(--check-path-delay, 0ms) forwards;
}
@keyframes sheets-check-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheets-check-rotate {
	from { transform: rotate(var(--check-rotate-from)); }
	to   { transform: rotate(0deg); }
}
@keyframes sheets-check-blur {
	from { filter: blur(var(--check-blur-from)); }
	to   { filter: blur(0); }
}
@keyframes sheets-check-bob {
	from { translate: 0 var(--check-y-amount); }
	to   { translate: 0 0; }
}
@keyframes sheets-check-draw { to { stroke-dashoffset: 0; } }

@media (prefers-reduced-motion: reduce) {
	[data-part-id='sheets-save-status'] { transition: none !important; }
	[data-part-id='sheets-save-status'] .t-icon-swap .t-icon { transition: none !important; }
	[data-part-id='sheets-save-status'] .t-success-check { animation: none !important; opacity: 1; }
	[data-part-id='sheets-save-status'] .t-success-check svg path { animation: none !important; stroke-dashoffset: 0 !important; }
}
`;

/** Text states swap (04) tokens: 150 ms, 4 px, 2 px blur, ease-in-out. */
const TEXT_SWAP = { duration: 0.15, ease: 'easeInOut' } as const;

/** How long a write runs before the status says "Saving…". */
const SAVING_GRACE_MS = 300;

/**
 * The status to show: a settled status at once, "saving" only after the grace period.
 * Until then it keeps what it showed before (nothing, or the last outcome).
 */
function useShownStatus(operation: OperationFeedback | null): OperationFeedback | null {
	const saving = operation?.status === 'pending';
	const [savingShown, setSavingShown] = useState(false);
	useEffect(() => {
		if (!saving) {
			setSavingShown(false);
			return;
		}
		const timer = setTimeout(() => setSavingShown(true), SAVING_GRACE_MS);
		return () => clearTimeout(timer);
	}, [saving]);
	const settledRef = useRef<OperationFeedback | null>(null);
	if (!operation) settledRef.current = null;
	else if (!saving) settledRef.current = operation;
	return saving && !savingShown ? settledRef.current : operation;
}

export function SaveStatus({ className }: { className?: string }) {
	const operation = useShownStatus(useOperationFeedback());
	const reduceMotion = useReducedMotion();
	// While the status fades out it keeps showing what it last said.
	const lastRef = useRef<OperationFeedback | null>(null);
	if (operation) lastRef.current = operation;
	const shown = operation ?? lastRef.current;
	const phase: Phase = shown ? phaseOf(shown.status) : 'saving';
	const iconState = phase === 'partial' ? 'failed' : phase;
	const offset = reduceMotion ? 0 : 4;
	const blur = reduceMotion ? 'blur(0px)' : 'blur(2px)';

	return (
		<div
			data-part-id='sheets-save-status'
			data-visible={operation ? 'true' : 'false'}
			data-phase={phase}
			className={cn('flex items-center gap-1.5', className)}
		>
			<style>{STYLES}</style>
			<span className='t-icon-swap size-3.5' data-state={iconState} aria-hidden='true'>
				<span className='t-icon' data-icon='saving'>
					<RiLoader4Line className='text-muted-foreground size-3.5 animate-spin motion-reduce:animate-none' />
				</span>
				<span className='t-icon' data-icon='saved'>
					{/* Remounted for each settled status, so the check plays every time a save lands. */}
					<span key={phase === 'saved' ? shown?.timestamp : 'idle'} className='t-success-check' data-state={phase === 'saved' && operation ? 'in' : 'out'}>
						<svg viewBox='0 0 24 24' fill='none' className='size-3.5 text-emerald-600 dark:text-emerald-500'>
							<path d='M5 12.5l4.5 4.5L19 7.5' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' />
						</svg>
					</span>
				</span>
				<span className='t-icon' data-icon='failed'>
					<RiErrorWarningLine className={cn('size-3.5', phase === 'partial' ? 'text-amber-600 dark:text-amber-500' : 'text-destructive')} />
				</span>
			</span>
			{/* The words, announced to screen readers as they change. */}
			<span role='status' aria-live='polite' className='inline-grid'>
				<AnimatePresence mode='wait' initial={false}>
					<motion.span
						key={shown?.message ?? ''}
						initial={{ opacity: 0, y: offset, filter: blur }}
						animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
						exit={{ opacity: 0, y: -offset, filter: blur }}
						transition={reduceMotion ? { duration: 0 } : TEXT_SWAP}
						className={cn('whitespace-nowrap', phase === 'failed' && 'text-destructive')}
					>
						{operation ? operation.message : shown?.message}
					</motion.span>
				</AnimatePresence>
			</span>
		</div>
	);
}
