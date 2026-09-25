'use client';

import { Check, ChevronRight, Copy, Download, Plus, RefreshCw, Trash2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from '../dialog';
import { Input } from '../input';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet';
import { Switch } from '../switch';
import { focusRingClass, ToneBadge, TooltipIconButton } from '../workspace-kit/primitives';
import { CODE_PATTERN, CODE_STATUS, CodeGrantList, codeStatus, type DescribeTarget, generateCode, normalizeCode, RedemptionList } from './codes';
import { useBillingFormat } from './context';
import { CREDIT_TYPE, dayKey } from './format';
import { EmptyState, KeyValueList, nativeSelectClass, Panel, TableSurface, tableHeadClass, tableRowClass } from './surface';
import type { CodeRedemption, CreditCode, CreditCodeDraft, CreditCodeItem, CreditTarget, CreditType } from './types';

/** A credit target an operator can put in a code, with its display label. */
export type CodeTargetOption = { target: CreditTarget; label: string };

const LIMIT_CREDIT_TYPES: CreditType[] = ['permanent', 'period'];
const METER_CREDIT_TYPES: CreditType[] = ['permanent', 'period', 'rollover'];
const optionValue = (target: CreditTarget) => `${target.kind}:${target.key}`;

function parseTarget(value: string): CreditTarget {
	const [kind, ...rest] = value.split(':');
	return { kind: kind === 'limit' ? 'limit' : 'meter', key: rest.join(':') };
}

/** `YYYY-MM-DD` for a date input, read in UTC so the chosen day round-trips. */
const toDateInput = (iso?: string) => (iso ? dayKey(iso, 'UTC') : '');
/** Codes expire at the end of the chosen UTC day. */
const fromDateInput = (value: string) => (value ? `${value}T23:59:59.000Z` : undefined);

/* ------------------------------------------------------------------ *
 * Items editor
 * ------------------------------------------------------------------ */

type CodeItemsEditorProps = {
	items: CreditCodeItem[];
	onChange: (items: CreditCodeItem[]) => void;
	targets: CodeTargetOption[];
	error?: string;
};

/** Rows of target, amount, credit type, and lifetime. Limits only accept permanent or period credits. */
export function CodeItemsEditor({ items, onChange, targets, error }: CodeItemsEditorProps) {
	const id = React.useId();
	const used = new Set(items.map((item) => optionValue(item.target)));
	const meters = targets.filter((option) => option.target.kind === 'meter');
	const limits = targets.filter((option) => option.target.kind === 'limit');
	const update = (index: number, patch: Partial<CreditCodeItem>) => onChange(items.map((item, at) => (at === index ? { ...item, ...patch } : item)));
	const firstFree = targets.find((option) => !used.has(optionValue(option.target)));

	return (
		<fieldset className="flex flex-col gap-2" aria-describedby={error ? `${id}-error` : undefined}>
			<legend className="mb-1 text-xs text-muted-foreground">Grants</legend>
			{items.map((item, index) => {
				const types = item.target.kind === 'limit' ? LIMIT_CREDIT_TYPES : METER_CREDIT_TYPES;
				const renderOption = (option: CodeTargetOption) => {
					const value = optionValue(option.target);
					return (
						<option key={value} value={value} disabled={used.has(value) && value !== optionValue(item.target)}>
							{option.label}
						</option>
					);
				};
				return (
					<div key={index} className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] items-end gap-2 rounded-lg border border-border bg-muted/30 p-2.5 @lg/view:grid-cols-[minmax(0,1fr)_6.5rem_7.5rem_6rem_auto]">
						<label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
							Credits for
							<select
								className={nativeSelectClass}
								value={optionValue(item.target)}
								onChange={(event) => {
									const target = parseTarget(event.target.value);
									update(index, { target, creditType: target.kind === 'limit' && item.creditType === 'rollover' ? 'permanent' : item.creditType });
								}}
							>
								{meters.length ? <optgroup label="Meters">{meters.map(renderOption)}</optgroup> : null}
								{limits.length ? <optgroup label="Limits">{limits.map(renderOption)}</optgroup> : null}
							</select>
						</label>
						<label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
							Amount
							<input
								inputMode="numeric"
								value={item.amount ? String(item.amount) : ''}
								placeholder="36000"
								onChange={(event) => update(index, { amount: Number(event.target.value.replace(/\D/g, '')) || 0 })}
								className={cn(nativeSelectClass, 'tabular-nums')}
							/>
						</label>
						<TooltipIconButton label="Remove grant" size="sm" className="mb-1" disabled={items.length === 1} onClick={() => onChange(items.filter((_, at) => at !== index))}>
							<Trash2 aria-hidden="true" className="size-3.5" />
						</TooltipIconButton>
						<label className="col-span-1 flex flex-col gap-1 text-[11px] text-muted-foreground @lg/view:col-auto @lg/view:row-start-1 @lg/view:col-start-3">
							Type
							<select className={nativeSelectClass} value={item.creditType} onChange={(event) => update(index, { creditType: event.target.value as CreditType })}>
								{types.map((type) => (
									<option key={type} value={type}>
										{CREDIT_TYPE[type].label}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1 text-[11px] text-muted-foreground @lg/view:row-start-1 @lg/view:col-start-4">
							Lasts (days)
							<input
								inputMode="numeric"
								value={item.expiresAfterDays ? String(item.expiresAfterDays) : ''}
								placeholder={item.target.kind === 'limit' ? 'n/a' : 'Forever'}
								disabled={item.creditType === 'period' || item.target.kind === 'limit'}
								onChange={(event) => update(index, { expiresAfterDays: Number(event.target.value.replace(/\D/g, '')) || undefined })}
								className={cn(nativeSelectClass, 'tabular-nums disabled:opacity-60')}
							/>
						</label>
					</div>
				);
			})}
			<div className="flex items-center justify-between gap-3">
				{error ? (
					<p id={`${id}-error`} className="text-xs text-destructive">
						{error}
					</p>
				) : (
					<span />
				)}
				<Button
					type="button"
					size="xs"
					variant="ghost"
					disabled={!firstFree}
					onClick={() => firstFree && onChange([...items, { target: firstFree.target, amount: 0, creditType: 'permanent' }])}
				>
					<Plus aria-hidden="true" />
					Add grant
				</Button>
			</div>
		</fieldset>
	);
}

function itemsError(items: CreditCodeItem[]) {
	if (items.length === 0) return 'Add at least one grant.';
	if (items.some((item) => !item.amount || item.amount <= 0)) return 'Every grant needs an amount above zero.';
	return undefined;
}

const emptyItem = (targets: CodeTargetOption[]): CreditCodeItem[] => (targets[0] ? [{ target: targets[0].target, amount: 0, creditType: 'permanent' }] : []);

/* ------------------------------------------------------------------ *
 * Create or edit one code
 * ------------------------------------------------------------------ */

type CreditCodeDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The code being edited; absent to create one. */
	code?: CreditCode;
	targets: CodeTargetOption[];
	/** Codes already taken, to catch duplicates before the host is called. */
	existingCodes: string[];
	/** Saves the draft; reject with an Error to keep the dialog open with its message. */
	onSave: (draft: CreditCodeDraft) => Promise<void> | void;
};

type CodeForm = { code: string; note: string; items: CreditCodeItem[]; unlimited: boolean; maxRedemptions: string; expires: string; active: boolean };

const formFor = (code: CreditCode | undefined, targets: CodeTargetOption[]): CodeForm => ({
	code: code?.code ?? '',
	note: code?.note ?? '',
	items: code?.items ?? emptyItem(targets),
	unlimited: code ? code.maxRedemptions === null : false,
	maxRedemptions: code?.maxRedemptions ? String(code.maxRedemptions) : '100',
	expires: toDateInput(code?.expiresAt),
	active: code?.active ?? true,
});

/**
 * One code: the string (typed or generated), what it grants, how many
 * accounts can redeem it, when it expires, and whether it is live. A code
 * that has been redeemed keeps its string, so shared links keep working.
 */
export function CreditCodeDialog({ open, onOpenChange, code, targets, existingCodes, onSave }: CreditCodeDialogProps) {
	const [form, setForm] = React.useState<CodeForm>(() => formFor(code, targets));
	const [errors, setErrors] = React.useState<Partial<Record<'code' | 'items' | 'max' | 'save', string>>>({});
	const [busy, setBusy] = React.useState(false);
	const id = React.useId();

	// Each opening starts from the code being edited (or a blank form), during render so stale input never shows.
	const session = open ? (code?.id ?? 'new') : null;
	const [lastSession, setLastSession] = React.useState(session);
	if (session !== lastSession) {
		setLastSession(session);
		if (session !== null) {
			setForm(formFor(code, targets));
			setErrors({});
			setBusy(false);
		}
	}

	const locked = Boolean(code && code.redemptions > 0);
	const taken = new Set(existingCodes.map(normalizeCode));
	if (code) taken.delete(normalizeCode(code.code));
	const set = (patch: Partial<CodeForm>) => setForm((current) => ({ ...current, ...patch }));

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const normalized = normalizeCode(form.code);
		const max = Number(form.maxRedemptions);
		const next = {
			code: !CODE_PATTERN.test(normalized) ? 'Use 3–32 letters, digits, or dashes.' : taken.has(normalized) ? 'That code already exists.' : undefined,
			items: itemsError(form.items),
			max: !form.unlimited && !(Number.isInteger(max) && max > 0) ? 'Enter a whole number above zero, or allow unlimited.' : undefined,
		};
		setErrors(next);
		if (next.code || next.items || next.max) return;
		setBusy(true);
		try {
			await onSave({
				code: normalized,
				items: form.items,
				maxRedemptions: form.unlimited ? null : max,
				expiresAt: fromDateInput(form.expires),
				active: form.active,
				note: form.note.trim() || undefined,
				batch: code?.batch,
			});
			onOpenChange(false);
		} catch (reason) {
			setErrors({ save: reason instanceof Error ? reason.message : 'The code could not be saved.' });
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
			<DialogPopup className="max-w-2xl">
				<form onSubmit={submit} noValidate className="@container/view flex min-h-0 flex-col">
					<DialogHeader className="gap-1.5 pb-3">
						<DialogTitle className="text-base font-medium">{code ? `Edit ${code.code}` : 'New code'}</DialogTitle>
						<DialogDescription className="text-[13px]">
							Each billing account can redeem a code once. Changes apply to future redemptions only.
						</DialogDescription>
					</DialogHeader>
					<div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pb-5">
						<div className="grid gap-3 @lg/view:grid-cols-2">
							<div className="flex flex-col gap-1">
								<label htmlFor={`${id}-code`} className="text-xs text-muted-foreground">
									Code
								</label>
								<div className="flex gap-2">
									<Input
										id={`${id}-code`}
										size="sm"
										value={form.code}
										disabled={locked}
										onChange={(event) => set({ code: event.target.value.toUpperCase() })}
										placeholder="LAUNCH-2026"
										autoComplete="off"
										spellCheck={false}
										aria-invalid={errors.code ? true : undefined}
										aria-describedby={`${id}-code-help`}
										className="font-mono"
									/>
									<TooltipIconButton label="Generate a code" size="sm" disabled={locked} onClick={() => set({ code: generateCode() })}>
										<RefreshCw aria-hidden="true" className="size-3.5" />
									</TooltipIconButton>
								</div>
								<p id={`${id}-code-help`} className={cn('text-xs', errors.code ? 'text-destructive' : 'text-muted-foreground')}>
									{errors.code ?? (locked ? 'Already redeemed, so the code itself can’t change.' : 'Case and spaces are ignored when people redeem it.')}
								</p>
							</div>
							<label htmlFor={`${id}-note`} className="flex flex-col gap-1 text-xs text-muted-foreground">
								Note (internal)
								<Input id={`${id}-note`} size="sm" value={form.note} onChange={(event) => set({ note: event.target.value })} placeholder="Hackathon, Sep 2026" />
							</label>
						</div>
						<CodeItemsEditor items={form.items} onChange={(items) => set({ items })} targets={targets} error={errors.items} />
						<div className="grid gap-3 @lg/view:grid-cols-3">
							<div className="flex flex-col gap-1">
								<label htmlFor={`${id}-max`} className="text-xs text-muted-foreground">
									Redemptions allowed
								</label>
								<input
									id={`${id}-max`}
									inputMode="numeric"
									value={form.unlimited ? '' : form.maxRedemptions}
									placeholder={form.unlimited ? 'Unlimited' : '100'}
									disabled={form.unlimited}
									onChange={(event) => set({ maxRedemptions: event.target.value.replace(/\D/g, '') })}
									aria-invalid={errors.max ? true : undefined}
									className={cn(nativeSelectClass, 'tabular-nums disabled:opacity-60')}
								/>
								<label className="flex items-center gap-2 text-xs text-muted-foreground">
									<input type="checkbox" className="accent-primary" checked={form.unlimited} onChange={(event) => set({ unlimited: event.target.checked })} />
									Unlimited
								</label>
								{errors.max ? <p className="text-xs text-destructive">{errors.max}</p> : null}
							</div>
							<label htmlFor={`${id}-expires`} className="flex flex-col gap-1 text-xs text-muted-foreground">
								Code expires (UTC)
								<input id={`${id}-expires`} type="date" value={form.expires} onChange={(event) => set({ expires: event.target.value })} className={nativeSelectClass} />
								<span>{form.expires ? 'Redemptions stop at the end of that day.' : 'Leave empty to keep it open.'}</span>
							</label>
							<div className="flex flex-col gap-1 text-xs text-muted-foreground">
								<span id={`${id}-active`}>Live</span>
								<span className="flex items-center gap-2">
									<Switch aria-labelledby={`${id}-active`} checked={form.active} onCheckedChange={(active) => set({ active })} />
									<span>{form.active ? 'Accepting redemptions' : 'Paused'}</span>
								</span>
							</div>
						</div>
						{errors.save ? (
							<p role="alert" className="text-[13px] text-destructive">
								{errors.save}
							</p>
						) : null}
					</div>
					<DialogFooter>
						<Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" size="sm" disabled={busy} aria-busy={busy || undefined}>
							{busy ? 'Saving…' : code ? 'Save code' : 'Create code'}
						</Button>
					</DialogFooter>
				</form>
			</DialogPopup>
		</Dialog>
	);
}

/* ------------------------------------------------------------------ *
 * Bulk codes
 * ------------------------------------------------------------------ */

type BulkCodeDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	targets: CodeTargetOption[];
	existingCodes: string[];
	/** Creates every draft; reject with an Error to stay on the form. */
	onCreate: (drafts: CreditCodeDraft[]) => Promise<void> | void;
};

const MAX_BATCH = 500;

/** Draws `count` unique single-use codes that collide with nothing already taken. */
function drawCodes(prefix: string, count: number, taken: ReadonlySet<string>) {
	const codes = new Set<string>();
	while (codes.size < count) {
		const code = generateCode(prefix);
		if (!taken.has(code)) codes.add(code);
	}
	return [...codes];
}

/**
 * Many single-use codes in one go, e.g. for an event: a prefix, a count,
 * what each grants, and an expiry. After creation the codes can be copied
 * or downloaded as CSV.
 */
export function BulkCodeDialog({ open, onOpenChange, targets, existingCodes, onCreate }: BulkCodeDialogProps) {
	const f = useBillingFormat();
	const [prefix, setPrefix] = React.useState('');
	const [count, setCount] = React.useState('50');
	const [items, setItems] = React.useState<CreditCodeItem[]>(() => emptyItem(targets));
	const [expires, setExpires] = React.useState('');
	const [note, setNote] = React.useState('');
	const [errors, setErrors] = React.useState<Partial<Record<'prefix' | 'count' | 'items' | 'save', string>>>({});
	const [busy, setBusy] = React.useState(false);
	const [created, setCreated] = React.useState<string[] | null>(null);
	const [copied, setCopied] = React.useState(false);
	const id = React.useId();

	const [wasOpen, setWasOpen] = React.useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setPrefix('');
			setCount('50');
			setItems(emptyItem(targets));
			setExpires('');
			setNote('');
			setErrors({});
			setCreated(null);
			setCopied(false);
		}
	}

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const head = normalizeCode(prefix);
		const total = Number(count);
		const next = {
			prefix: head && !/^[A-Z0-9-]{1,12}$/.test(head) ? 'Use up to 12 letters, digits, or dashes.' : undefined,
			count: !(Number.isInteger(total) && total >= 1 && total <= MAX_BATCH) ? `Between 1 and ${MAX_BATCH}.` : undefined,
			items: itemsError(items),
		};
		setErrors(next);
		if (next.prefix || next.count || next.items) return;
		const batch = `${head || 'BATCH'}-${generateCode('', 4)}`;
		const codes = drawCodes(head, total, new Set(existingCodes.map(normalizeCode)));
		setBusy(true);
		try {
			await onCreate(codes.map((code) => ({ code, items, maxRedemptions: 1, expiresAt: fromDateInput(expires), active: true, note: note.trim() || undefined, batch })));
			setCreated(codes);
		} catch (reason) {
			setErrors({ save: reason instanceof Error ? reason.message : 'The codes could not be created.' });
		} finally {
			setBusy(false);
		}
	};

	const download = () => {
		if (!created) return;
		const url = URL.createObjectURL(new Blob([`code\n${created.join('\n')}\n`], { type: 'text/csv' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `${normalizeCode(prefix) || 'codes'}-${created.length}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
			<DialogPopup className="max-w-2xl">
				{created ? (
					<>
						<DialogHeader className="gap-1.5 pb-3">
							<DialogTitle className="text-base font-medium">{f.quantity(created.length)} codes created</DialogTitle>
							<DialogDescription className="text-[13px]">Each works once. Copy or download them now; they are also listed in the catalog.</DialogDescription>
						</DialogHeader>
						<div className="px-6 pb-5">
							<pre className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-[13px] leading-6 text-foreground">{created.join('\n')}</pre>
						</div>
						<DialogFooter>
							<Button size="sm" variant="ghost" onClick={download}>
								<Download aria-hidden="true" />
								Download CSV
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									navigator.clipboard?.writeText(created.join('\n')).then(
										() => setCopied(true),
										() => {},
									);
								}}
							>
								{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
								{copied ? 'Copied' : 'Copy all'}
							</Button>
							<Button size="sm" onClick={() => onOpenChange(false)}>
								Done
							</Button>
						</DialogFooter>
					</>
				) : (
					<form onSubmit={submit} noValidate className="@container/view flex min-h-0 flex-col">
						<DialogHeader className="gap-1.5 pb-3">
							<DialogTitle className="text-base font-medium">Bulk create codes</DialogTitle>
							<DialogDescription className="text-[13px]">Single-use codes that share what they grant, e.g. one per attendee.</DialogDescription>
						</DialogHeader>
						<div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pb-5">
							<div className="grid gap-3 @lg/view:grid-cols-3">
								<label htmlFor={`${id}-prefix`} className="flex flex-col gap-1 text-xs text-muted-foreground">
									Prefix
									<Input
										id={`${id}-prefix`}
										size="sm"
										value={prefix}
										onChange={(event) => setPrefix(event.target.value.toUpperCase())}
										placeholder="HACK"
										aria-invalid={errors.prefix ? true : undefined}
										className="font-mono"
									/>
									<span className={errors.prefix ? 'text-destructive' : undefined}>{errors.prefix ?? `e.g. ${normalizeCode(prefix) || 'HACK'}-7KQM-X3TP`}</span>
								</label>
								<label htmlFor={`${id}-count`} className="flex flex-col gap-1 text-xs text-muted-foreground">
									How many
									<input
										id={`${id}-count`}
										inputMode="numeric"
										value={count}
										onChange={(event) => setCount(event.target.value.replace(/\D/g, ''))}
										aria-invalid={errors.count ? true : undefined}
										className={cn(nativeSelectClass, 'tabular-nums')}
									/>
									<span className={errors.count ? 'text-destructive' : undefined}>{errors.count ?? `Up to ${MAX_BATCH} at a time.`}</span>
								</label>
								<label htmlFor={`${id}-expires`} className="flex flex-col gap-1 text-xs text-muted-foreground">
									Codes expire (UTC)
									<input id={`${id}-expires`} type="date" value={expires} onChange={(event) => setExpires(event.target.value)} className={nativeSelectClass} />
								</label>
							</div>
							<CodeItemsEditor items={items} onChange={setItems} targets={targets} error={errors.items} />
							<label htmlFor={`${id}-note`} className="flex flex-col gap-1 text-xs text-muted-foreground">
								Note (internal)
								<Input id={`${id}-note`} size="sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Campus tour, Oct 2026" />
							</label>
							{errors.save ? (
								<p role="alert" className="text-[13px] text-destructive">
									{errors.save}
								</p>
							) : null}
						</div>
						<DialogFooter>
							<Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button type="submit" size="sm" disabled={busy} aria-busy={busy || undefined}>
								{busy ? 'Creating…' : `Create ${Number(count) > 0 ? f.quantity(Number(count)) : ''} codes`}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogPopup>
		</Dialog>
	);
}

/* ------------------------------------------------------------------ *
 * Table and detail
 * ------------------------------------------------------------------ */

type CreditCodeTableProps = {
	codes: CreditCode[];
	describe: DescribeTarget;
	onToggle?: (code: CreditCode, active: boolean) => void;
	onOpen?: (code: CreditCode) => void;
	className?: string;
};

/** Promo codes: what each grants, redemptions used, expiry, and whether it is live. */
export function CreditCodeTable({ codes, describe, onToggle, onOpen, className }: CreditCodeTableProps) {
	const f = useBillingFormat();
	if (codes.length === 0) {
		return <EmptyState icon={Plus} title="No codes yet" description="Create a code to gift credits, e.g. compute for a hackathon." className={className} />;
	}
	return (
		<TableSurface className={className} minWidth="46rem">
			<thead className={tableHeadClass}>
				<tr>
					<th scope="col">Code</th>
					<th scope="col">Grants</th>
					<th scope="col">Redeemed</th>
					<th scope="col">Expires</th>
					<th scope="col">Status</th>
					<th scope="col" className="text-right">
						Live
					</th>
					<th scope="col">
						<span className="sr-only">Open</span>
					</th>
				</tr>
			</thead>
			<tbody>
				{codes.map((code) => {
					const status = codeStatus(code, f.now);
					const presentation = CODE_STATUS[status];
					return (
						<tr key={code.id} className={cn(tableRowClass, status !== 'active' && 'text-muted-foreground')}>
							<th scope="row" className="px-4 py-2 text-left font-normal">
								<code className="block font-mono text-[13px] text-foreground">{code.code}</code>
								{code.note || code.batch ? <span className="block text-xs text-muted-foreground">{code.note ?? code.batch}</span> : null}
							</th>
							<td className="text-xs">
								<CodeGrantList items={code.items} describe={describe} compact />
							</td>
							<td>
								<span className="flex items-center gap-2 tabular-nums">
									{code.maxRedemptions !== null ? (
										<span aria-hidden="true" className="h-1 w-14 overflow-hidden rounded-full bg-foreground/[0.07]">
											<span className="block h-full rounded-full bg-foreground/50" style={{ width: `${Math.min(1, code.redemptions / code.maxRedemptions) * 100}%` }} />
										</span>
									) : null}
									{f.quantity(code.redemptions)}
									{code.maxRedemptions !== null ? ` / ${f.quantity(code.maxRedemptions)}` : ''}
								</span>
							</td>
							<td className="tabular-nums">{code.expiresAt ? f.date(code.expiresAt) : 'Never'}</td>
							<td>
								<ToneBadge tone={presentation.tone}>{presentation.label}</ToneBadge>
							</td>
							<td className="text-right">
								<Switch
									className="-my-3"
									aria-label={`${code.active ? 'Pause' : 'Resume'} ${code.code}`}
									checked={code.active}
									disabled={!onToggle || status === 'expired' || status === 'used_up'}
									onCheckedChange={(active) => onToggle?.(code, active)}
								/>
							</td>
							<td className="text-right">
								{onOpen ? (
									<button
										type="button"
										aria-label={`Open ${code.code}`}
										onClick={() => onOpen(code)}
										className={cn('grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground', focusRingClass)}
									>
										<ChevronRight aria-hidden="true" className="size-3.5" />
									</button>
								) : null}
							</td>
						</tr>
					);
				})}
			</tbody>
		</TableSurface>
	);
}

type CreditCodeSheetProps = {
	code?: CreditCode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	redemptions: CodeRedemption[];
	describe: DescribeTarget;
	onToggle?: (code: CreditCode, active: boolean) => void;
	onEdit?: (code: CreditCode) => void;
};

/** One code in depth: status, what it grants, and every account that redeemed it. */
export function CreditCodeSheet({ code, open, onOpenChange, redemptions, describe, onToggle, onEdit }: CreditCodeSheetProps) {
	const f = useBillingFormat();
	const [copied, setCopied] = React.useState(false);
	React.useEffect(() => {
		if (!copied) return;
		const timer = window.setTimeout(() => setCopied(false), 1400);
		return () => window.clearTimeout(timer);
	}, [copied]);
	if (!code) return null;
	const status = codeStatus(code, f.now);
	const presentation = CODE_STATUS[status];
	const own = redemptions.filter((redemption) => redemption.codeId === code.id);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-[30rem] max-w-[94vw] gap-0 p-0 sm:max-w-[30rem]">
				<div className="flex flex-col gap-3 border-b border-border px-5 pt-5 pb-4">
					<div className="flex flex-wrap items-center gap-2 pr-8">
						<SheetTitle className="font-mono text-base font-medium">{code.code}</SheetTitle>
						<ToneBadge tone={presentation.tone}>{presentation.label}</ToneBadge>
						<TooltipIconButton
							label={copied ? 'Copied' : 'Copy code'}
							size="sm"
							onClick={() => {
								navigator.clipboard?.writeText(code.code).then(
									() => setCopied(true),
									() => {},
								);
							}}
						>
							{copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
						</TooltipIconButton>
					</div>
					<SheetDescription className="text-[13px]">{code.note ?? 'Each billing account can redeem it once.'}</SheetDescription>
					<div className="flex gap-2">
						{onEdit ? (
							<Button size="xs" variant="outline" onClick={() => onEdit(code)}>
								Edit
							</Button>
						) : null}
						{onToggle && status !== 'expired' && status !== 'used_up' ? (
							<Button size="xs" variant="ghost" onClick={() => onToggle(code, !code.active)}>
								{code.active ? 'Pause' : 'Resume'}
							</Button>
						) : null}
					</div>
				</div>
				<div className="@container/view flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-background px-5 py-5 [&>*]:shrink-0">
					<Panel title="Details">
						<KeyValueList
							items={[
								{ label: 'Redeemed', value: `${f.quantity(code.redemptions)}${code.maxRedemptions !== null ? ` of ${f.quantity(code.maxRedemptions)}` : ' (no limit)'}` },
								{ label: 'Code expires', value: code.expiresAt ? f.date(code.expiresAt, 'medium', true) : 'Never' },
								...(code.createdAt ? [{ label: 'Created', value: f.date(code.createdAt) }] : []),
								...(code.batch ? [{ label: 'Batch', value: <code className="font-mono">{code.batch}</code> }] : []),
							]}
						/>
					</Panel>
					<Panel title="Each redemption grants">
						<CodeGrantList items={code.items} describe={describe} />
					</Panel>
					<Panel title="Redemptions" description={own.length < code.redemptions ? `Showing the latest ${own.length} of ${f.quantity(code.redemptions)}.` : undefined}>
						<RedemptionList redemptions={own} describe={describe} showAccount />
					</Panel>
				</div>
			</SheetContent>
		</Sheet>
	);
}

