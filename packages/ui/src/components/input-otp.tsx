'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type FocusEvent, type Ref } from 'react';
import { motion, useAnimate, useReducedMotion, type Transition } from 'motion/react';

import { FluidHighlight } from '../lib/motion/fluid-highlight';
import { cn } from '../lib/utils';

/**
 * One-time-code input: one slot per digit, side by side.
 *
 * The slots are drawn, not typed into. A single transparent `<input>` lies over the whole row and owns the value,
 * the caret, and the selection; the slots mirror it. That one-field model is what makes the code behave like text:
 *
 *   type        fills the selected slot and moves on
 *   Backspace   deletes like any text field; later digits close the gap
 *   ⌘A / Shift  selects across slots, so cut, copy, and paste work on the whole code or a slice of it
 *   paste       strips separators and inserts at the caret; a complete code replaces the value outright
 *   autofill    the OS hands the whole code to the one field, which is all `autoComplete="one-time-code"` needs
 *
 * It also means one tab stop and one labelled field for assistive tech, rather than six "digit N" boxes.
 *
 * Because the real glyphs and caret are transparent, the slots can animate what the user sees: digits rise into
 * place, a drawn caret blinks in the empty active slot, the focus ring glides between slots, and the row shakes
 * once when the code turns invalid. All of it stands still under reduced motion.
 */
interface InputOtpProps {
	/** Number of digit slots. */
	length?: number;
	/** Controlled value. Non-digits are dropped and longer strings are truncated to `length`. */
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	/** Fires when an edit leaves every slot filled with a code that differs from the previous one. */
	onComplete?: (value: string) => void;
	isDisabled?: boolean;
	isInvalid?: boolean;
	/** Renders a gap between groups, e.g. `3` gives 000 000. */
	groupEvery?: number;
	/** `sm` fits the code into an inline row (e.g. a settings list) instead of a dialog. */
	size?: 'default' | 'sm';
	'aria-label'?: string;
	'aria-describedby'?: string;
	className?: string;
	ref?: Ref<HTMLDivElement>;
}

interface SlotSelection {
	start: number;
	end: number;
}

type SelectionDirection = 'forward' | 'backward' | 'none';

const DIGITS_ONLY = /\D/g;
// Chrome restores autofill styling and the caret position a beat after a value change, so the mirror re-reads them.
const RESYNC_DELAYS = [0, 10, 50];
// A hard on/off blink, like a text caret, rather than a fade.
const CARET_BLINK = { opacity: [1, 1, 0, 0] };
const CARET_TIMING: Transition = { duration: 1, times: [0, 0.5, 0.5, 1], ease: 'linear', repeat: Infinity };

const toCode = (raw: string, length: number) => raw.replace(DIGITS_ONLY, '').slice(0, length);

function InputOtp({
	length = 6,
	value,
	defaultValue = '',
	onChange,
	onComplete,
	isDisabled = false,
	isInvalid = false,
	groupEvery,
	size = 'default',
	'aria-label': ariaLabel = 'One-time code',
	'aria-describedby': ariaDescribedBy,
	className,
	ref,
}: InputOtpProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const previousSelection = useRef<[number | null, number | null, SelectionDirection]>([null, null, 'none']);
	const wasInvalid = useRef(isInvalid);
	const [rowRef, animate] = useAnimate<HTMLDivElement>();
	const reduceMotion = useReducedMotion();
	const [internal, setInternal] = useState(() => toCode(defaultValue, length));
	const [isFocused, setIsFocused] = useState(false);
	const [selection, setSelection] = useState<SlotSelection | null>(null);

	const controlled = value !== undefined;
	const code = toCode(controlled ? value : internal, length);

	const mirror = (start: number, end: number) =>
		setSelection((current) => (current?.start === start && current.end === end ? current : { start, end }));

	const commit = (next: string) => {
		if (next === code) return;
		if (!controlled) setInternal(next);
		onChange?.(next);
		// Comparing against the previous code keeps a re-render or an identical paste from verifying twice, while
		// correcting one digit of a full code still counts as a new attempt.
		if (next.length === length) onComplete?.(next);
	};

	useEffect(() => {
		const input = inputRef.current;
		if (!input) return;

		// The native caret only ever sits between characters. Over a slot, that reads as nothing being selected, so
		// a collapsed caret inside a full run is widened to select the digit after it (or before it, when moving left).
		const syncSelection = () => {
			if (document.activeElement !== input) {
				setSelection(null);
				return;
			}
			const { selectionStart, selectionEnd, selectionDirection, maxLength, value: current } = input;
			const [, previousEnd] = previousSelection.current;
			let start = -1;
			let end = -1;
			let direction: SelectionDirection | undefined;

			if (current.length !== 0 && selectionStart !== null && selectionEnd !== null) {
				const isCaret = selectionStart === selectionEnd;
				const isAppending = selectionStart === current.length && current.length < maxLength;
				if (isCaret && !isAppending) {
					const caret = selectionStart;
					if (caret === 0) {
						[start, end, direction] = [0, 1, 'forward'];
					} else if (caret === maxLength) {
						[start, end, direction] = [caret - 1, caret, 'backward'];
					} else if (maxLength > 1 && current.length > 1) {
						let offset = 0;
						const [previousStart] = previousSelection.current;
						if (previousStart !== null && previousEnd !== null) {
							direction = caret < previousEnd ? 'backward' : 'forward';
							const wasAppending = previousStart === previousEnd && previousStart < maxLength;
							if (direction === 'backward' && !wasAppending) offset = -1;
						}
						start = caret + offset;
						end = caret + offset + 1;
					}
				}
				if (start !== -1 && end !== -1 && start !== end) input.setSelectionRange(start, end, direction);
			}

			const nextStart = start !== -1 ? start : (selectionStart ?? 0);
			const nextEnd = end !== -1 ? end : (selectionEnd ?? 0);
			mirror(nextStart, nextEnd);
			previousSelection.current = [nextStart, nextEnd, direction ?? selectionDirection ?? 'none'];
		};

		document.addEventListener('selectionchange', syncSelection, { capture: true });
		syncSelection();
		if (document.activeElement === input) setIsFocused(true);
		return () => document.removeEventListener('selectionchange', syncSelection, { capture: true });
	}, []);

	useEffect(() => {
		const timeouts = RESYNC_DELAYS.map((delay) =>
			setTimeout(() => {
				const input = inputRef.current;
				if (!input) return;
				// A non-bubbling `input` event clears Chrome's `:autofill` state without reaching React's onChange.
				input.dispatchEvent(new Event('input'));
				if (document.activeElement !== input || input.selectionStart === null || input.selectionEnd === null) return;
				mirror(input.selectionStart, input.selectionEnd);
				previousSelection.current = [input.selectionStart, input.selectionEnd, input.selectionDirection ?? 'none'];
			}, delay),
		);
		return () => timeouts.forEach(clearTimeout);
	}, [code, isFocused]);

	useEffect(() => {
		const turnedInvalid = isInvalid && !wasInvalid.current;
		wasInvalid.current = isInvalid;
		if (!turnedInvalid || reduceMotion || !rowRef.current) return;
		animate(rowRef.current, { x: [0, -6, 6, -4, 4, -2, 0] }, { duration: 0.4, ease: 'easeInOut' });
	}, [isInvalid, reduceMotion, animate, rowRef]);

	const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const next = toCode(event.target.value, length);
		// Deleting doesn't fire `selectionchange`, so the mirror is nudged by hand.
		if (next.length < code.length) document.dispatchEvent(new Event('selectionchange'));
		commit(next);
	};

	const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
		// Always handled here: a native paste of "123 456" would be cut to `maxLength` before the spaces were dropped,
		// and iOS pastes over the whole field rather than at the caret.
		event.preventDefault();
		const input = event.currentTarget;
		const pasted = event.clipboardData.getData('text/plain').replace(DIGITS_ONLY, '');
		if (pasted === '') return;
		const start = input.selectionStart ?? code.length;
		const end = input.selectionEnd ?? start;
		// A complete code replaces the value even when the caret is mid-way; it's an autofill or a copied message.
		const next =
			pasted.length >= length ? pasted.slice(0, length) : (code.slice(0, start) + pasted + code.slice(end)).slice(0, length);
		input.value = next;
		commit(next);
		const caret = Math.min(next.length, length - 1);
		input.setSelectionRange(caret, next.length);
		mirror(caret, next.length);
	};

	const onFocus = (event: FocusEvent<HTMLInputElement>) => {
		// Focus lands on the first empty slot, or selects the last digit of a full code so typing replaces it.
		const input = event.currentTarget;
		const start = Math.min(input.value.length, length - 1);
		input.setSelectionRange(start, input.value.length);
		mirror(start, input.value.length);
		setIsFocused(true);
	};

	const isSlotActive = (index: number) =>
		isFocused &&
		selection !== null &&
		(selection.start === selection.end ? index === selection.start : index >= selection.start && index < selection.end);
	const isRange = selection !== null && selection.end - selection.start > 1;

	return (
		<div
			ref={ref}
			data-slot="input-otp"
			data-size={size}
			// Chrome Translate wraps text nodes in <font>, which breaks React's next update; a code is never translatable.
			translate="no"
			className={cn('w-full', size === 'sm' ? 'max-w-[15.5rem]' : 'max-w-[21rem]', className)}
		>
			<div
				ref={rowRef}
				className={cn('group/otp relative flex w-full items-center', size === 'sm' ? 'gap-1.5' : 'gap-1 sm:gap-2')}
			>
				{Array.from({ length }, (_, index) => {
					const digit = code[index];
					const isActive = isSlotActive(index);
					const gapBefore = groupEvery !== undefined && index > 0 && index % groupEvery === 0;
					return (
						<div
							key={index}
							aria-hidden
							data-slot="input-otp-slot"
							data-active={isActive || undefined}
							// The single active slot is what the gliding ring tracks; a range is shown by the slots themselves.
							data-highlighted={(isActive && !isRange) || undefined}
							className={cn(
								'relative flex min-w-0 flex-1 items-center justify-center overflow-hidden font-mono tabular-nums',
								size === 'sm' ? 'h-9 max-w-9 rounded-md text-base' : 'h-11 max-w-10 rounded-lg text-lg sm:h-12 sm:max-w-12',
								gapBefore && (size === 'sm' ? 'ml-1.5' : 'ml-1 sm:ml-2'),
								'border border-input bg-background text-foreground shadow-xs dark:bg-input/32',
								'transition-[background-color,border-color] duration-150 ease-out motion-reduce:transition-none',
								!isDisabled && 'group-hover/otp:border-ring/50',
								isActive && isRange && 'bg-accent',
								// Keep the invalid state visible without relying on tint alone.
								isInvalid && 'border-destructive bg-destructive/5 text-destructive group-hover/otp:border-destructive',
								isDisabled && 'bg-muted text-muted-foreground shadow-none',
							)}
						>
							{digit !== undefined && (
								// Keyed on the digit so each new one replays the rise, including a correction in place.
								<span
									key={digit}
									className="inline-block transition-[translate,opacity] duration-150 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none"
								>
									{digit}
								</span>
							)}
							{isActive && digit === undefined && (
								// The real caret is transparent, so the empty active slot draws its own.
								<motion.span
									className={cn('pointer-events-none absolute w-px bg-foreground', size === 'sm' ? 'h-4' : 'h-5')}
									animate={reduceMotion ? undefined : CARET_BLINK}
									transition={CARET_TIMING}
								/>
							)}
						</div>
					);
				})}
				<FluidHighlight
					className={cn(
						'z-10 border bg-transparent',
						size === 'sm' ? 'rounded-md' : 'rounded-lg',
						isInvalid ? 'border-destructive ring-[3px] ring-destructive/25' : 'border-ring/60 ring-[3px] ring-ring/35',
					)}
				/>
				<input
					ref={inputRef}
					// `text` with a numeric mode rather than `number`: a number input brings spinners, accepts `e`
					// and `-`, and reports an empty value for anything it considers malformed.
					type="text"
					inputMode="numeric"
					autoComplete="one-time-code"
					spellCheck={false}
					maxLength={length}
					disabled={isDisabled}
					aria-label={ariaLabel}
					aria-describedby={ariaDescribedBy}
					aria-invalid={isInvalid || undefined}
					data-slot="input-otp-input"
					value={code}
					onChange={onInputChange}
					onPaste={onPaste}
					onFocus={onFocus}
					onBlur={() => setIsFocused(false)}
					className={cn(
						// Present and hit-testable over the whole row, but invisible: transparent ink rather than opacity,
						// because iOS only offers paste on a press-and-hold over a visible field.
						'absolute inset-0 z-20 size-full cursor-text appearance-none border-0 bg-transparent p-0 font-mono leading-none',
						'text-transparent caret-transparent tracking-[-0.5em] tabular-nums shadow-none outline-none',
						// A font as tall as the row keeps every glyph under the slots, so a tap anywhere lands in the field.
						size === 'sm' ? 'text-[36px]' : 'text-[44px] sm:text-[48px]',
						'selection:bg-transparent selection:text-transparent',
						'autofill:opacity-0! autofill:shadow-none! autofill:[-webkit-text-fill-color:transparent]!',
						// iOS lays the glyphs out wider and leaks the caret at the edge; squeeze them back under the slots.
						'supports-[-webkit-touch-callout:none]:-left-px supports-[-webkit-touch-callout:none]:right-px',
						'supports-[-webkit-touch-callout:none]:font-thin supports-[-webkit-touch-callout:none]:tracking-[-0.6em]',
						'disabled:cursor-not-allowed',
					)}
				/>
			</div>
		</div>
	);
}

export { InputOtp };
export type { InputOtpProps };
