'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../tooltip';

type PromptInputContextValue = {
	isLoading: boolean;
	value: string;
	setValue: (value: string) => void;
	maxHeight: number | string;
	onSubmit?: () => void;
	disabled?: boolean;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const PromptInputContext = React.createContext<PromptInputContextValue | null>(null);

function usePromptInput() {
	const context = React.useContext(PromptInputContext);
	if (!context) {
		throw new Error('PromptInput compound parts must be used within <PromptInput>.');
	}
	return context;
}

type PromptInputProps = React.ComponentProps<'div'> & {
	isLoading?: boolean;
	value?: string;
	onValueChange?: (value: string) => void;
	maxHeight?: number | string;
	onSubmit?: () => void;
	disabled?: boolean;
	/** Visual shell. `default` uses Constructive radius; `pill` is more rounded. */
	shape?: 'default' | 'pill';
};

/**
 * Compound chat composer shell. Host owns submit/streaming; this owns layout,
 * autosize context, and action slots.
 */
function PromptInput({
	className,
	isLoading = false,
	maxHeight = 240,
	value,
	onValueChange,
	onSubmit,
	children,
	disabled = false,
	shape = 'default',
	onClick,
	...props
}: PromptInputProps) {
	const [internalValue, setInternalValue] = React.useState(value ?? '');
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);

	React.useEffect(() => {
		if (value !== undefined) setInternalValue(value);
	}, [value]);

	const handleChange = React.useCallback(
		(next: string) => {
			setInternalValue(next);
			onValueChange?.(next);
		},
		[onValueChange],
	);

	const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
		if (!disabled) textareaRef.current?.focus();
		onClick?.(event);
	};

	return (
		<TooltipProvider>
			<PromptInputContext.Provider
				value={{
					isLoading,
					value: value ?? internalValue,
					setValue: onValueChange ?? handleChange,
					maxHeight,
					onSubmit,
					disabled: disabled || isLoading,
					textareaRef,
				}}
			>
				<div
					data-slot="prompt-input"
					data-shape={shape}
					data-loading={isLoading ? 'true' : 'false'}
					onClick={handleClick}
					className={cn(
						'cursor-text border border-input bg-background p-2 shadow-xs',
						'transition-shadow focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-primary/35',
						shape === 'pill' ? 'rounded-3xl' : 'rounded-xl',
						disabled && 'cursor-not-allowed opacity-60',
						className,
					)}
					{...props}
				>
					{children}
				</div>
			</PromptInputContext.Provider>
		</TooltipProvider>
	);
}

type PromptInputTextareaProps = Omit<React.ComponentProps<'textarea'>, 'value' | 'onChange'> & {
	disableAutosize?: boolean;
};

function PromptInputTextarea({
	className,
	onKeyDown,
	disableAutosize = false,
	...props
}: PromptInputTextareaProps) {
	const { value, setValue, maxHeight, onSubmit, disabled, textareaRef } = usePromptInput();

	const adjustHeight = React.useCallback(
		(element: HTMLTextAreaElement | null) => {
			if (!element || disableAutosize) return;
			element.style.height = 'auto';
			if (typeof maxHeight === 'number') {
				element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
			} else {
				element.style.height = `min(${element.scrollHeight}px, ${maxHeight})`;
			}
		},
		[disableAutosize, maxHeight],
	);

	const setRefs = React.useCallback(
		(element: HTMLTextAreaElement | null) => {
			textareaRef.current = element;
			adjustHeight(element);
		},
		[adjustHeight, textareaRef],
	);

	React.useLayoutEffect(() => {
		adjustHeight(textareaRef.current);
	}, [adjustHeight, textareaRef, value]);

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
			event.preventDefault();
			onSubmit?.();
		}
		onKeyDown?.(event);
	};

	return (
		<textarea
			ref={setRefs}
			data-slot="prompt-input-textarea"
			value={value}
			onChange={(event) => {
				adjustHeight(event.target);
				setValue(event.target.value);
			}}
			onKeyDown={handleKeyDown}
			disabled={disabled}
			rows={1}
			className={cn(
				'min-h-11 w-full resize-none border-none bg-transparent px-2 py-1.5 text-sm outline-none',
				'placeholder:text-muted-foreground disabled:cursor-not-allowed',
				className,
			)}
			{...props}
		/>
	);
}

type PromptInputActionsProps = React.ComponentProps<'div'>;

function PromptInputActions({ className, ...props }: PromptInputActionsProps) {
	return (
		<div
			data-slot="prompt-input-actions"
			className={cn('flex items-center gap-1.5 px-1', className)}
			{...props}
		/>
	);
}

type PromptInputActionProps = {
	tooltip: React.ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
	children: React.ReactNode;
	className?: string;
} & Omit<React.ComponentProps<typeof Tooltip>, 'children'>;

function PromptInputAction({
	tooltip,
	children,
	className,
	side = 'top',
	...props
}: PromptInputActionProps) {
	const { disabled } = usePromptInput();
	return (
		<Tooltip {...props}>
			<TooltipTrigger
				asChild
				// Keep focus on the textarea when interacting with actions.
				onClick={(event) => event.stopPropagation()}
				disabled={disabled}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent side={side} className={className}>
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);
}

type PromptInputBodyProps = React.ComponentProps<'div'>;

function PromptInputBody({ className, ...props }: PromptInputBodyProps) {
	return (
		<div data-slot="prompt-input-body" className={cn('flex min-w-0 flex-col gap-1', className)} {...props} />
	);
}

export {
	PromptInput,
	PromptInputTextarea,
	PromptInputActions,
	PromptInputAction,
	PromptInputBody,
	usePromptInput,
};
export type {
	PromptInputProps,
	PromptInputTextareaProps,
	PromptInputActionsProps,
	PromptInputActionProps,
	PromptInputBodyProps,
};
