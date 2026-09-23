'use client';

import { useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type Ref } from 'react';

import { cn } from '../lib/utils';

// Adapted from BoardUI Input OTP (MIT), https://www.boardui.com/r/input-otp.json.

/**
 * One-time-code input: one box per digit, side by side.
 *
 * It looks like N inputs but behaves like one value, and the two views stay in step in every direction:
 *
 *   type      fills a box and advances
 *   Backspace clears the box, or steps back when the box is already empty
 *   arrows    move between boxes without changing anything
 *   paste     distributes across the boxes from wherever the caret is
 *   autofill  the OS hands the whole code to the first box at once
 *
 * That last one is why every box carries `autoComplete="one-time-code"` and why the change handler accepts more
 * than a single character: iOS and Chrome both deliver the full code into whichever box has focus.
 *
 * Digits are monospace so the boxes stay optically even; in a proportional face a `1` is visibly narrower than
 * an `8`, which makes a row of fixed boxes look mis-set even when it is perfectly aligned.
 */
interface InputOtpProps {
	/** Number of digit boxes. */
	length?: number;
	/** Controlled value. Longer strings are truncated to `length`. */
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	/** Fires once the last box is filled. */
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

const DIGITS_ONLY = /\D/g;
// Preserve empty interior slots when editing a controlled code.
const INVALID_SLOT = /[^0-9 ]/g;

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
	const groupId = useId();
	const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
	const [internal, setInternal] = useState(defaultValue.replace(DIGITS_ONLY, '').slice(0, length));

	const controlled = value !== undefined;
	const code = (controlled ? value : internal).replace(INVALID_SLOT, '').slice(0, length);

	const commit = (next: string) => {
		const clean = next.replace(INVALID_SLOT, '').slice(0, length);
		if (!controlled) setInternal(clean);
		onChange?.(clean);
		if (clean.length === length && !clean.includes(' ')) onComplete?.(clean);
	};

	const focusBox = (index: number) => {
		const target = inputsRef.current[Math.max(0, Math.min(index, length - 1))];
		target?.focus();
		target?.select();
	};

	const clearAt = (index: number) => {
		const chars = code.padEnd(length, ' ').split('');
		chars[index] = ' ';
		commit(chars.join('').trimEnd());
	};

	/** Writes `digits` starting at `index`, which covers typing and autofill. */
	const writeFrom = (index: number, digits: string) => {
		const clean = digits.replace(DIGITS_ONLY, '');
		if (clean === '') {
			clearAt(index);
			return;
		}
		// Autofill or a complete pasted code replaces the whole value, even when a middle slot has focus.
		const start = clean.length >= length ? 0 : index;
		const chars = code.padEnd(length, ' ').split('');
		for (let offset = 0; offset < clean.length && start + offset < length; offset += 1) {
			chars[start + offset] = clean[offset];
		}
		commit(chars.join('').trimEnd());
		focusBox(start + clean.length);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
		if (event.key === 'Backspace') {
			event.preventDefault();
			// Clear in place; the caret only steps back on an already-empty box, which makes holding Backspace feel right.
			if (code[index]?.trim()) {
				clearAt(index);
				return;
			}
			clearAt(Math.max(0, index - 1));
			focusBox(index - 1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			focusBox(index - 1);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			focusBox(index + 1);
		}
	};

	const onPaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
		event.preventDefault();
		writeFrom(index, event.clipboardData.getData('text'));
	};

	return (
		<div
			ref={ref}
			role="group"
			aria-label={ariaLabel}
			aria-describedby={ariaDescribedBy}
			data-slot="input-otp"
			data-size={size}
			// No `aria-invalid` here: `group` does not support it. Each box carries its own.
			className={cn(
				'flex w-full items-center',
				size === 'sm' ? 'max-w-[15.5rem] gap-1.5' : 'max-w-[21rem] gap-1 sm:gap-2',
				className,
			)}
		>
			{Array.from({ length }, (_, index) => {
				const filled = code[index]?.trim() ?? '';
				const gapBefore = groupEvery !== undefined && index > 0 && index % groupEvery === 0;
				return (
					<div
						key={index}
						className={cn(
							'flex min-w-0 flex-1 items-center',
							size === 'sm' ? 'max-w-9' : 'max-w-10 sm:max-w-12',
							gapBefore && (size === 'sm' ? 'ml-1.5' : 'ml-1 sm:ml-2'),
						)}
					>
						<input
							ref={(node) => {
								inputsRef.current[index] = node;
							}}
							id={`${groupId}-${index}`}
							// `text` with a numeric mode rather than `number`: a number input brings spinners, accepts `e`
							// and `-`, and reports an empty value for anything it considers malformed.
							type="text"
							inputMode="numeric"
							autoComplete="one-time-code"
							// Long enough to accept a full autofilled code in one box.
							maxLength={length}
							disabled={isDisabled}
							aria-label={`Digit ${index + 1} of ${length}`}
							aria-invalid={isInvalid || undefined}
							data-slot="input-otp-slot"
							value={filled}
							onChange={(event) => writeFrom(index, event.target.value)}
							onKeyDown={(event) => onKeyDown(event, index)}
							onPaste={(event) => onPaste(event, index)}
							onFocus={(event) => event.target.select()}
							className={cn(
								'w-full min-w-0 text-center font-mono tabular-nums',
								size === 'sm' ? 'h-9 rounded-md text-base' : 'h-11 rounded-lg text-lg sm:h-12',
								'border border-input bg-background text-foreground shadow-xs dark:bg-input/32',
								'outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none',
								'hover:border-ring/50 focus-visible:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/35',
								// Keep the invalid state visible without relying on tint alone.
								isInvalid && 'border-destructive bg-destructive/5 text-destructive hover:border-destructive',
								isDisabled && 'cursor-not-allowed bg-muted text-muted-foreground shadow-none',
							)}
						/>
					</div>
				);
			})}
		</div>
	);
}

export { InputOtp };
export type { InputOtpProps };
