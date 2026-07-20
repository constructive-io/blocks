'use client';

import * as React from 'react';
import { createContext, useContext } from 'react';
import { CheckIcon, LoaderCircleIcon } from 'lucide-react';
import { Slot } from '../lib/slot';

import { cn } from '../lib/utils';

// Types
type StepperContextValue = {
	activeStep: number;
	setActiveStep: (step: number) => void;
	orientation: 'horizontal' | 'vertical';
};

type StepItemContextValue = {
	step: number;
	state: StepState;
	isDisabled: boolean;
	isLoading: boolean;
};

type StepState = 'active' | 'completed' | 'inactive' | 'loading';

// Contexts
const StepperContext = createContext<StepperContextValue | undefined>(undefined);
const StepItemContext = createContext<StepItemContextValue | undefined>(undefined);

const iconSwapClass =
	'transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none';
const iconSwapVisible = 'scale-100 opacity-100 blur-0';
const iconSwapHidden = 'scale-[0.25] opacity-0 blur-[4px]';

const useStepper = () => {
	const context = useContext(StepperContext);
	if (!context) {
		throw new Error('useStepper must be used within a Stepper');
	}
	return context;
};

const useStepItem = () => {
	const context = useContext(StepItemContext);
	if (!context) {
		throw new Error('useStepItem must be used within a StepperItem');
	}
	return context;
};

// Components
interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
	defaultValue?: number;
	value?: number;
	onValueChange?: (value: number) => void;
	orientation?: 'horizontal' | 'vertical';
}

function Stepper({
	defaultValue = 0,
	value,
	onValueChange,
	orientation = 'horizontal',
	className,
	...props
}: StepperProps) {
	const [activeStep, setInternalStep] = React.useState(defaultValue);

	const setActiveStep = React.useCallback(
		(step: number) => {
			if (value === undefined) {
				setInternalStep(step);
			}
			onValueChange?.(step);
		},
		[value, onValueChange],
	);

	const currentStep = value ?? activeStep;

	return (
		<StepperContext.Provider
			value={{
				activeStep: currentStep,
				setActiveStep,
				orientation,
			}}
		>
			<div
				data-slot="stepper"
				className={cn(
					`group/stepper inline-flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row
					data-[orientation=vertical]:flex-col`,
					className,
				)}
				data-orientation={orientation}
				{...props}
			/>
		</StepperContext.Provider>
	);
}

// StepperItem
interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
	step: number;
	completed?: boolean;
	disabled?: boolean;
	loading?: boolean;
}

function StepperItem({
	step,
	completed = false,
	disabled = false,
	loading = false,
	className,
	children,
	...props
}: StepperItemProps) {
	const { activeStep } = useStepper();

	const state: StepState = completed || step < activeStep ? 'completed' : activeStep === step ? 'active' : 'inactive';

	const isLoading = loading && step === activeStep;

	return (
		<StepItemContext.Provider value={{ step, state, isDisabled: disabled, isLoading }}>
			<div
				data-slot="stepper-item"
				className={cn(
					`group/step flex items-center group-data-[orientation=horizontal]/stepper:flex-row
					group-data-[orientation=vertical]/stepper:flex-col`,
					className,
				)}
				data-state={state}
				{...(isLoading ? { 'data-loading': true } : {})}
				{...props}
			>
				{children}
			</div>
		</StepItemContext.Provider>
	);
}

// StepperTrigger
interface StepperTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	asChild?: boolean;
	/** Disables hover and press scaling when motion would distract. */
	static?: boolean;
}

function StepperTrigger({ asChild = false, static: isStatic, className, children, ...props }: StepperTriggerProps) {
	const { setActiveStep } = useStepper();
	const { step, isDisabled } = useStepItem();

	const triggerClassName = cn(
		`focus-visible:border-ring focus-visible:ring-ring/50 inline-flex items-center gap-3 rounded-full transition-transform
		duration-150 ease-out outline-none focus-visible:z-10 focus-visible:ring-[3px]
		disabled:pointer-events-none disabled:opacity-50`,
		!isStatic && 'motion-safe:hover:scale-105 motion-safe:active:not-disabled:scale-[0.96]',
		className,
	);

	if (asChild) {
		return (
			<Slot
				data-slot="stepper-trigger"
				className={triggerClassName}
				onClick={() => setActiveStep(step)}
				disabled={isDisabled}
				{...props}
			>
				{children}
			</Slot>
		);
	}

	return (
		<button
			data-slot="stepper-trigger"
			className={triggerClassName}
			onClick={() => setActiveStep(step)}
			disabled={isDisabled}
			{...props}
		>
			{children}
		</button>
	);
}

// StepperIndicator
interface StepperIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
	asChild?: boolean;
}

function StepperIndicator({ asChild = false, className, children, ...props }: StepperIndicatorProps) {
	const { state, step, isLoading } = useStepItem();
	const showNumber = !isLoading && state !== 'completed';
	const showCheck = !isLoading && state === 'completed';

	return (
		<span
			data-slot="stepper-indicator"
			className={cn(
				`bg-muted text-muted-foreground data-[state=active]:bg-primary data-[state=completed]:bg-primary
					data-[state=active]:text-primary-foreground data-[state=completed]:text-primary-foreground relative flex size-6
					shrink-0 items-center justify-center rounded-full text-xs font-medium transition-[color,background-color] duration-200 ease-out`,
				className,
			)}
			data-state={state}
			{...props}
		>
			{asChild ? (
				children
			) : (
				<>
					<span className={cn('absolute', iconSwapClass, showNumber ? iconSwapVisible : iconSwapHidden)}>
						{step}
					</span>
					<CheckIcon
						className={cn('absolute', iconSwapClass, showCheck ? iconSwapVisible : iconSwapHidden)}
						size={16}
						aria-hidden='true'
					/>
					<span className={cn('absolute', iconSwapClass, isLoading ? iconSwapVisible : iconSwapHidden)}>
						<LoaderCircleIcon
							className={cn(isLoading && 'motion-safe:animate-spin')}
							size={14}
							aria-hidden='true'
						/>
					</span>
				</>
			)}
		</span>
	);
}

// StepperTitle
function StepperTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			data-slot="stepper-title"
			className={cn('text-sm font-medium transition-colors duration-200 ease-out', className)}
			{...props}
		/>
	);
}

// StepperDescription
function StepperDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p
			data-slot="stepper-description"
			className={cn('text-muted-foreground text-sm transition-colors duration-200 ease-out', className)}
			{...props}
		/>
	);
}

// StepperSeparator
function StepperSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="stepper-separator"
			className={cn(
				`bg-muted group-data-[state=completed]/step:bg-primary m-0.5 transition-colors duration-200 ease-out
				group-data-[orientation=horizontal]/stepper:h-0.5 group-data-[orientation=horizontal]/stepper:w-full
				group-data-[orientation=horizontal]/stepper:flex-1 group-data-[orientation=vertical]/stepper:h-12
				group-data-[orientation=vertical]/stepper:w-0.5`,
				className,
			)}
			{...props}
		/>
	);
}

export { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperSeparator, StepperTitle, StepperTrigger };
