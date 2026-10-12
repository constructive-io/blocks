'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';
import { Label } from './label';
import { Separator } from './separator';

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
	return (
		<fieldset
			data-slot='field-set'
			className={cn(
				// `min-w-0`: a fieldset is `min-width: min-content`, so one unbroken value would widen every input in it.
				'flex min-w-0 flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
				className,
			)}
			{...props}
		/>
	);
}

function FieldLegend({
	className,
	variant = 'legend',
	...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
	return (
		<legend
			data-slot='field-legend'
			data-variant={variant}
			className={cn('mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base', className)}
			{...props}
		/>
	);
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='field-group'
			className={cn(
				`group/field-group @container/field-group flex w-full flex-col gap-5
				data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4`,
				className,
			)}
			{...props}
		/>
	);
}

const fieldVariants = cva('group/field flex w-full gap-2 data-[invalid=true]:text-destructive', {
	variants: {
		orientation: {
			vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
			horizontal:
				'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
			responsive:
				'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
		},
	},
	defaultVariants: {
		orientation: 'vertical',
	},
});

type StructuralFieldProps = React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>;

interface LegacyFieldProps {
	label: string;
	description?: string;
	descriptionId?: string;
	error?: string;
	errorId?: string;
	required?: boolean;
	htmlFor?: string;
	className?: string;
	children: React.ReactNode;
}

type FieldProps = LegacyFieldProps | StructuralFieldProps;

function isLegacyFieldProps(props: FieldProps): props is LegacyFieldProps {
	return typeof (props as LegacyFieldProps).label === 'string';
}

function FieldContainer({ className, orientation = 'vertical', ...props }: StructuralFieldProps) {
	return (
		<div
			role='group'
			data-slot='field'
			data-orientation={orientation}
			className={cn(fieldVariants({ orientation }), className)}
			{...props}
		/>
	);
}

function Field(props: LegacyFieldProps): React.ReactElement;
function Field(props: StructuralFieldProps): React.ReactElement;
function Field(props: FieldProps) {
	if (!isLegacyFieldProps(props)) {
		return <FieldContainer {...props} />;
	}

	const {
		label,
		description,
		descriptionId,
		error,
		errorId,
		required,
		htmlFor,
		className,
		children,
	} = props;
	return (
		<FieldContainer className={className} data-invalid={Boolean(error)}>
			<FieldLabel htmlFor={htmlFor}>
				{/* One inline run, so a wrapped label keeps the star after its last word. */}
				<span>
					{label}
					{required && (
						<span className='ms-1 text-destructive' aria-hidden='true'>
							*
						</span>
					)}
				</span>
			</FieldLabel>
			{children}
			{description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
			{error && <FieldError id={errorId}>{error}</FieldError>}
		</FieldContainer>
	);
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='field-content'
			className={cn('group/field-content flex min-w-0 flex-1 flex-col gap-0.5 leading-snug', className)}
			{...props}
		/>
	);
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
	return (
		<Label
			data-slot='field-label'
			className={cn(
				`group/field-label peer/field-label flex w-fit min-w-0 gap-2 leading-snug [overflow-wrap:anywhere]
				group-data-[disabled=true]/field:opacity-64 has-data-checked:border-primary/30 has-data-checked:bg-primary/5
				has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border
				*:data-[slot=field]:p-2.5 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col`,
				className,
			)}
			{...props}
		/>
	);
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='field-label'
			className={cn(
				'flex w-fit min-w-0 items-center gap-2 text-sm font-medium [overflow-wrap:anywhere] group-data-[disabled=true]/field:opacity-64',
				className,
			)}
			{...props}
		/>
	);
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			data-slot='field-description'
			className={cn(
				`text-start text-sm leading-normal font-normal text-muted-foreground [overflow-wrap:anywhere]
				group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5 last:mt-0 nth-last-2:-mt-1
				[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-link`,
				className,
			)}
			{...props}
		/>
	);
}

function FieldSeparator({
	children,
	className,
	...props
}: React.ComponentProps<'div'> & {
	children?: React.ReactNode;
}) {
	return (
		<div
			data-slot='field-separator'
			data-content={Boolean(children)}
			// A flex row (rule, text, rule) instead of a fixed-height box: wrapped copy grows the row.
			className={cn('relative -my-2 flex min-h-5 items-center gap-3 text-sm group-data-[variant=outline]/field-group:-mb-2', className)}
			{...props}
		>
			<Separator className='min-w-4 flex-1' />
			{children && (
				<>
					<span className='text-center text-muted-foreground [overflow-wrap:anywhere]' data-slot='field-separator-content'>
						{children}
					</span>
					<Separator className='min-w-4 flex-1' />
				</>
			)}
		</div>
	);
}

function FieldError({
	className,
	children,
	errors,
	...props
}: React.ComponentProps<'div'> & {
	errors?: Array<{ message?: string } | undefined>;
}) {
	const content = React.useMemo(() => {
		if (children) return children;
		if (!errors?.length) return null;

		const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];
		if (uniqueErrors.length === 1) return uniqueErrors[0]?.message;

		return (
			<ul className='ml-4 flex list-disc flex-col gap-1'>
				{uniqueErrors.map(
					(error, index) => error?.message && <li key={`${error.message}-${index}`}>{error.message}</li>,
				)}
			</ul>
		);
	}, [children, errors]);

	if (!content) return null;

	return (
		<div
			role='alert'
			data-slot='field-error'
			className={cn('text-sm font-normal text-destructive [overflow-wrap:anywhere]', className)}
			{...props}
		>
			{content}
		</div>
	);
}

interface FieldRowProps extends Omit<LegacyFieldProps, 'required'> {
	labelPosition?: 'start' | 'end';
}

function FieldRow({
	label,
	description,
	error,
	labelPosition = 'end',
	htmlFor,
	className,
	children,
}: FieldRowProps) {
	// Label, description and error share one column, so the description lines up with the label
	// text rather than sitting under the control.
	const content = (
		<FieldContent>
			<FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
			{description && <FieldDescription>{description}</FieldDescription>}
			{error && <FieldError>{error}</FieldError>}
		</FieldContent>
	);

	return (
		<div
			data-slot='field-row'
			data-invalid={Boolean(error)}
			// `items-start`: the control stays beside the label's first line however long the label
			// wraps; the 1px nudge centres a 16px checkbox or radio on that line.
			className={cn(
				'group/field flex items-start gap-2 data-[invalid=true]:text-destructive [&>[role=checkbox]]:mt-px [&>[role=radio]]:mt-px',
				className,
			)}
		>
			{labelPosition === 'start' && content}
			{children}
			{labelPosition === 'end' && content}
		</div>
	);
}

export {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldRow,
	FieldSeparator,
	FieldSet,
	FieldTitle,
};
export type { FieldProps, FieldRowProps, LegacyFieldProps, StructuralFieldProps };
