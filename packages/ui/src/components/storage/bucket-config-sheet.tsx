'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';

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
import { ToneBadge } from '../workspace-kit/primitives';
import { dashedRule } from '../workspace-kit/surface';
import type { BucketVisibility, StorageBucket } from './types';
import { humanizeBytes } from './utils';
import { VISIBILITY } from './visibility-badge';

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

const VISIBILITY_OPTIONS: BucketVisibility[] = ['private', 'public', 'temp'];

const FIELD_LABEL = 'text-[13px] font-medium text-foreground';
const FIELD_HINT = 'text-xs text-muted-foreground';

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
			<SheetHeader className='space-y-1 p-4 pr-12 pb-3 text-left'>
				<SheetTitle className='text-sm font-medium'>{mode === 'create' ? 'New bucket' : 'Edit bucket'}</SheetTitle>
				<SheetDescription className='text-[13px]'>
					{mode === 'create'
						? 'Configure a new storage bucket.'
						: 'Update this bucket’s configuration.'}
				</SheetDescription>
			</SheetHeader>

			<div className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t px-4 py-4', dashedRule)}>
				{/* Key */}
				<div className='flex flex-col gap-1.5'>
					<Label htmlFor='bucket-key' className={FIELD_LABEL}>Key</Label>
					<Input
						id='bucket-key'
						value={value.key}
						disabled={mode === 'edit'}
						placeholder='my-bucket'
						className='font-mono'
						autoComplete='off'
						aria-invalid={keyMissing || undefined}
						onChange={(event) => set('key', event.target.value)}
					/>
					{mode === 'edit' && (
						<p className={FIELD_HINT}>The key cannot be changed after creation.</p>
					)}
				</div>

				{/* Visibility */}
				<div className='flex flex-col gap-2'>
					<Label id='bucket-visibility-label' className={FIELD_LABEL}>Visibility</Label>
					<RadioGroup
						aria-labelledby='bucket-visibility-label'
						value={value.visibility}
						onValueChange={(next) => set('visibility', next as BucketVisibility)}
						className='gap-1.5'
					>
						{VISIBILITY_OPTIONS.map((option) => {
							const { icon: Icon, label, hint } = VISIBILITY[option];
							return (
								<Label
									key={option}
									htmlFor={`visibility-${option}`}
									className='flex cursor-pointer items-center gap-3 rounded-lg bg-card px-3 py-2.5 font-normal shadow-card transition-shadow duration-(--duration-fast) has-[:checked]:ring-2 has-[:checked]:ring-primary/40'
								>
									<Icon aria-hidden='true' className='size-4 shrink-0 text-muted-foreground' />
									<span className='flex min-w-0 flex-1 flex-col gap-0.5'>
										<span className='text-[13px] font-medium text-foreground'>{label}</span>
										<span className={FIELD_HINT}>{hint}</span>
									</span>
									<RadioGroupItem id={`visibility-${option}`} value={option} />
								</Label>
							);
						})}
					</RadioGroup>
				</div>

				{/* Allow custom keys */}
				{supports('allowCustomKeys') && (
					<Label
						htmlFor='allow-custom-keys'
						className='flex cursor-pointer items-center justify-between gap-3 font-normal'
					>
						<span className='flex flex-col gap-0.5'>
							<span className={FIELD_LABEL}>Allow custom keys</span>
							<span className={cn('text-pretty', FIELD_HINT)}>
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
						<Label className={FIELD_LABEL}>Allowed MIME types</Label>
						<ChipsInput
							value={value.allowedMimeTypes}
							onChange={(next) => set('allowedMimeTypes', next)}
							placeholder='image/png, application/pdf…'
							ariaLabel='Allowed MIME types'
						/>
						<p className={FIELD_HINT}>Leave empty to allow any type.</p>
					</div>
				)}

				{/* Max file size */}
				{supports('maxFileSize') && (
					<div className='flex flex-col gap-1.5'>
						<Label htmlFor='max-file-size' className={FIELD_LABEL}>Max file size</Label>
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
							<span className='text-[13px] text-muted-foreground'>bytes</span>
							{value.maxFileSize ? (
								<span className='ml-auto text-xs text-muted-foreground tabular-nums'>≈ {humanizeBytes(value.maxFileSize)}</span>
							) : null}
						</div>
					</div>
				)}

				{/* Allowed origins (CORS) */}
				{supports('allowedOrigins') && (
					<div className='flex flex-col gap-1.5'>
						<Label className={FIELD_LABEL}>Allowed origins (CORS)</Label>
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
						<Label htmlFor='bucket-description' className={FIELD_LABEL}>Description</Label>
						<Textarea
							id='bucket-description'
							value={value.description}
							placeholder='What is this bucket for?'
							onChange={(event) => set('description', event.target.value)}
						/>
					</div>
				)}
			</div>

			<SheetFooter className={cn('gap-2 border-t bg-muted/40 p-3 sm:space-x-0', dashedRule)}>
				<Button
					type='button'
					size='sm'
					variant='outline'
					onClick={() => {
						onCancel?.();
						onOpenChange(false);
					}}
				>
					Cancel
				</Button>
				<Button type='submit' size='sm' disabled={keyMissing}>
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
			<SheetContent side='right' className='w-full gap-0 p-0 sm:max-w-md'>
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
				`flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 shadow-2xs
				focus-within:border-ring/60 focus-within:ring-[3px] focus-within:ring-ring/35`,
			)}
		>
			{value.map((chip, index) => (
				<ToneBadge key={chip} tone='neutral' className='max-w-full pr-0.5 font-mono'>
					<span className='truncate'>{chip}</span>
					<button
						type='button'
						aria-label={`Remove ${chip}`}
						onClick={() => removeAt(index)}
						className='inline-flex size-4 cursor-pointer items-center justify-center rounded-[4px] hover:bg-foreground/10'
					>
						<XIcon className='size-3' aria-hidden />
					</button>
				</ToneBadge>
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
				className='min-w-24 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle-foreground'
			/>
		</div>
	);
}
