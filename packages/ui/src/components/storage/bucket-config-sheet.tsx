'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';

import { Badge } from '../badge';
import { Button } from '../button';
import { Input } from '../input';
import { Label } from '../label';
import { RadioGroup, RadioGroupItem } from '../radio-group';
import { Switch } from '../switch';
import { Textarea } from '../textarea';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '../sheet';
import { cn } from '../../lib/utils';
import type { BucketVisibility, StorageBucket } from './types';

export type BucketConfigMode = 'create' | 'edit';

/** The editable subset of a bucket, as a flat form value. */
export interface BucketConfigValue {
	key: string;
	visibility: BucketVisibility;
	allowCustomKeys: boolean;
	allowedMimeTypes: string[];
	maxFileSize: number | null;
	allowedOrigins: string[];
	description: string;
}

/**
 * Which optional bucket controls the host's schema actually supports. Core
 * fields (key/visibility) always render; each optional control renders only when
 * its flag is `true`. Omitted/undefined ⇒ render it (back-compat: a host that
 * doesn't pass this shows everything).
 */
export interface BucketConfigSupportedFields {
	allowCustomKeys?: boolean;
	allowedMimeTypes?: boolean;
	maxFileSize?: boolean;
	allowedOrigins?: boolean;
	description?: boolean;
}

interface BucketConfigSheetProps {
	mode: BucketConfigMode;
	/** Seed values (e.g. the bucket being edited). */
	initial?: Partial<StorageBucket>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (value: BucketConfigValue) => void;
	onCancel?: () => void;
	/**
	 * Gate optional controls to the host schema's real columns. When omitted, all
	 * controls render (back-compat). Core key/visibility always render.
	 */
	supportedFields?: BucketConfigSupportedFields;
}

const VISIBILITY_OPTIONS: { value: BucketVisibility; label: string; hint: string }[] = [
	{ value: 'public', label: 'Public', hint: 'Anyone with the link can read objects.' },
	{ value: 'private', label: 'Private', hint: 'Only authorized requests can read objects.' },
	{ value: 'temp', label: 'Temp', hint: 'Short-lived objects, cleaned up automatically.' },
];

function toFormValue(initial?: Partial<StorageBucket>): BucketConfigValue {
	return {
		key: initial?.key ?? '',
		visibility: initial?.visibility ?? 'private',
		allowCustomKeys: initial?.allowCustomKeys ?? false,
		allowedMimeTypes: initial?.allowedMimeTypes ?? [],
		maxFileSize: initial?.maxFileSize ?? null,
		allowedOrigins: initial?.allowedOrigins ?? [],
		description: initial?.description ?? '',
	};
}

/**
 * Form body, remounted per open/initial via `key` so all fields initialize
 * from `initial` with plain `useState` — no sync effect.
 */
function BucketConfigForm({
	mode,
	initial,
	onSubmit,
	onCancel,
	onOpenChange,
	supportedFields,
}: Omit<BucketConfigSheetProps, 'open'>) {
	const [value, setValue] = React.useState<BucketConfigValue>(() => toFormValue(initial));

	// Optional control renders unless explicitly flagged unsupported.
	const supports = (field: keyof BucketConfigSupportedFields) => supportedFields?.[field] !== false;

	const keyMissing = mode === 'create' && value.key.trim() === '';

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (keyMissing) return;
		onSubmit({ ...value, key: value.key.trim(), description: value.description.trim() });
	};

	const set = <K extends keyof BucketConfigValue>(field: K, fieldValue: BucketConfigValue[K]) => {
		setValue((prev) => ({ ...prev, [field]: fieldValue }));
	};

	return (
		<form onSubmit={handleSubmit} className='flex min-h-0 flex-1 flex-col'>
			<SheetHeader className='text-left'>
				<SheetTitle>{mode === 'create' ? 'New bucket' : 'Edit bucket'}</SheetTitle>
				<SheetDescription>
					{mode === 'create'
						? 'Configure a new storage bucket.'
						: 'Update this bucket’s configuration.'}
				</SheetDescription>
			</SheetHeader>

			<div className='-mx-4 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-2'>
				{/* Key */}
				<div className='flex flex-col gap-1.5'>
					<Label htmlFor='bucket-key'>Key</Label>
					<Input
						id='bucket-key'
						value={value.key}
						disabled={mode === 'edit'}
						placeholder='my-bucket'
						aria-invalid={keyMissing || undefined}
						onChange={(event) => set('key', event.target.value)}
					/>
					{mode === 'edit' && (
						<p className='text-xs text-muted-foreground'>The key cannot be changed after creation.</p>
					)}
				</div>

				{/* Visibility */}
				<div className='flex flex-col gap-2'>
					<Label>Visibility</Label>
					<RadioGroup
						value={value.visibility}
						onValueChange={(next) => set('visibility', next as BucketVisibility)}
						className='gap-2'
					>
						{VISIBILITY_OPTIONS.map((option) => (
							<Label
								key={option.value}
								htmlFor={`visibility-${option.value}`}
								className='flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 font-normal has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5'
							>
								<RadioGroupItem id={`visibility-${option.value}`} value={option.value} className='mt-0.5' />
								<span className='flex flex-col gap-0.5'>
									<span className='text-sm font-medium'>{option.label}</span>
									<span className='text-xs text-muted-foreground'>{option.hint}</span>
								</span>
							</Label>
						))}
					</RadioGroup>
				</div>

				{/* Allow custom keys */}
				{supports('allowCustomKeys') && (
					<Label
						htmlFor='allow-custom-keys'
						className='flex cursor-pointer items-center justify-between gap-3 font-normal'
					>
						<span className='flex flex-col gap-0.5'>
							<span className='text-sm font-medium'>Allow custom keys</span>
							<span className='text-pretty text-xs text-muted-foreground'>
								Let clients choose object keys instead of generated ones.
							</span>
						</span>
						<Switch
							id='allow-custom-keys'
							checked={value.allowCustomKeys}
							onCheckedChange={(checked) => set('allowCustomKeys', checked)}
						/>
					</Label>
				)}

				{/* Allowed MIME types */}
				{supports('allowedMimeTypes') && (
					<div className='flex flex-col gap-1.5'>
						<Label>Allowed MIME types</Label>
						<ChipsInput
							value={value.allowedMimeTypes}
							onChange={(next) => set('allowedMimeTypes', next)}
							placeholder='image/png, application/pdf…'
							ariaLabel='Allowed MIME types'
						/>
						<p className='text-xs text-muted-foreground'>Leave empty to allow any type.</p>
					</div>
				)}

				{/* Max file size */}
				{supports('maxFileSize') && (
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='max-file-size'>Max file size</Label>
						<div className='flex items-center gap-2'>
							<Input
								id='max-file-size'
								type='number'
								min={0}
								inputMode='numeric'
								className='max-w-40'
								value={value.maxFileSize ?? ''}
								placeholder='Unlimited'
								onChange={(event) =>
									set('maxFileSize', event.target.value === '' ? null : Number(event.target.value))
								}
							/>
							<span className='text-sm text-muted-foreground'>bytes</span>
						</div>
					</div>
				)}

				{/* Allowed origins (CORS) */}
				{supports('allowedOrigins') && (
					<div className='flex flex-col gap-1.5'>
						<Label>Allowed origins (CORS)</Label>
						<ChipsInput
							value={value.allowedOrigins}
							onChange={(next) => set('allowedOrigins', next)}
							placeholder='https://example.com'
							ariaLabel='Allowed origins'
						/>
					</div>
				)}

				{/* Description */}
				{supports('description') && (
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='bucket-description'>Description</Label>
						<Textarea
							id='bucket-description'
							value={value.description}
							placeholder='What is this bucket for?'
							onChange={(event) => set('description', event.target.value)}
						/>
					</div>
				)}
			</div>

			<SheetFooter className='pt-3'>
				<Button
					type='button'
					variant='outline'
					onClick={() => {
						onCancel?.();
						onOpenChange(false);
					}}
				>
					Cancel
				</Button>
				<Button type='submit' disabled={keyMissing}>
					{mode === 'create' ? 'Create bucket' : 'Save changes'}
				</Button>
			</SheetFooter>
		</form>
	);
}

/**
 * `BucketConfigSheet` — create/edit a bucket via a right-side Sheet form. All
 * inputs are local controlled draft state (no fetching); minimal validation
 * (key required on create). On submit, emits the flat `BucketConfigValue`.
 */
export function BucketConfigSheet({
	mode,
	initial,
	open,
	onOpenChange,
	onSubmit,
	onCancel,
	supportedFields,
}: BucketConfigSheetProps) {
	// Re-key on each open so the form re-initializes from `initial`.
	const formKey = `${mode}:${initial?.id ?? 'new'}:${open}`;
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side='right' className='w-full sm:max-w-md'>
				<BucketConfigForm
					key={formKey}
					mode={mode}
					initial={initial}
					onSubmit={onSubmit}
					onCancel={onCancel}
					onOpenChange={onOpenChange}
					supportedFields={supportedFields}
				/>
			</SheetContent>
		</Sheet>
	);
}

interface ChipsInputProps {
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
	ariaLabel?: string;
}

/**
 * A small controlled chips/tag input: existing chips plus a draft field. Only
 * the in-progress token is local state; the committed list is controlled.
 * Enter or comma commits; Backspace on an empty field removes the last chip.
 */
function ChipsInput({ value, onChange, placeholder, ariaLabel }: ChipsInputProps) {
	const [draft, setDraft] = React.useState('');

	const commit = () => {
		const token = draft.trim().replace(/,$/, '').trim();
		if (token && !value.includes(token)) {
			onChange([...value, token]);
		}
		setDraft('');
	};

	const removeAt = (index: number) => {
		onChange(value.filter((_, current) => current !== index));
	};

	return (
		<div
			className={cn(
				`flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5
				focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-primary/35`,
			)}
		>
			{value.map((chip, index) => (
				<Badge key={chip} variant='secondary' className='gap-1 pr-1'>
					<span className='truncate'>{chip}</span>
					<button
						type='button'
						aria-label={`Remove ${chip}`}
						onClick={() => removeAt(index)}
						className='inline-flex size-3.5 items-center justify-center rounded-xs hover:bg-foreground/10'
					>
						<XIcon className='size-3' aria-hidden />
					</button>
				</Badge>
			))}
			<input
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ',') {
						event.preventDefault();
						commit();
					} else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
						removeAt(value.length - 1);
					}
				}}
				onBlur={commit}
				placeholder={value.length === 0 ? placeholder : undefined}
				aria-label={ariaLabel}
				className='min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72'
			/>
		</div>
	);
}
