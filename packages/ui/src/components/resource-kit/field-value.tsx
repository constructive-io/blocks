'use client';

import { CheckIcon, CircleAlertIcon, MinusIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { focusRingClass, ToneBadge } from '../workspace-kit/primitives';
import { useResourceKit } from './context';
import { fieldFormat, isManyRelation, NUMERIC_FORMATS, recordId } from './fields';
import { errorMessage } from './form-values';
import { formatFieldText, optionFor } from './format';
import { type RelationLabel, useRecordLabels } from './labels';
import { queryFailure, useLinkedIds } from './queries';
import type { AnyResource, ResourceField, ResourceRow } from './types';

export const linkClass = cn('rounded-sm text-foreground underline-offset-4 hover:underline', focusRingClass);
const chipClass = cn(
	'inline-flex h-5 max-w-full min-w-0 items-center rounded-[5px] border border-border bg-muted/60 px-1.5 text-xs text-muted-foreground hover:text-foreground',
	focusRingClass,
);
const DATE_FORMATS = new Set(['date', 'datetime']);

/** A quiet dash for a value nobody set, named for screen readers. */
export function EmptyValue() {
	return (
		<span className="text-subtle-foreground">
			<span aria-hidden="true">—</span>
			<span className="sr-only">Not set</span>
		</span>
	);
}

/** A related record that could not be read: deleted, or not visible to this user. */
export function MissingValue({ id }: { id: string }) {
	return (
		<span title={id} className="text-subtle-foreground italic">
			Unavailable
		</span>
	);
}

/** A short shimmer where a label is still loading. */
export function LabelSkeleton({ className }: { className?: string }) {
	return <span aria-hidden="true" className={cn('inline-block h-2.5 w-20 rounded-full bg-muted align-middle motion-safe:animate-pulse', className)} />;
}

type FieldValueProps = {
	resource: AnyResource;
	field: ResourceField;
	row: ResourceRow;
	/** A resolved belongs-to label, from `useRelationLabels`. */
	relation?: RelationLabel | null;
	/** One line with an ellipsis (tables) instead of wrapping (detail). */
	truncate?: boolean;
	className?: string;
};

/** One field of a record as it reads: formatted text, an option badge, a yes/no, or links to related records. */
export function FieldValue({ resource, field, row, relation, truncate = false, className }: FieldValueProps) {
	const { locale, currency, now, router, byName } = useResourceKit();
	const lineClass = truncate ? 'block min-w-0 truncate' : 'min-w-0 [overflow-wrap:anywhere]';

	if (isManyRelation(field)) return <ManyRelationValue resource={resource} field={field} row={row} truncate={truncate} className={className} />;

	if (field.input === 'relation') {
		const target = field.relation ? byName.get(field.relation.resource) : undefined;
		if (!relation) return <EmptyValue />;
		if (relation.missing) return <MissingValue id={relation.id} />;
		if (relation.label === null) return <LabelSkeleton />;
		if (!target) return <span dir="auto" className={cn(lineClass, className)}>{relation.label}</span>;
		// The text carries `dir="auto"` on the element that truncates, so right-to-left labels end in an ellipsis, not a cut.
		return (
			<router.Link href={router.detailHref(target.name, relation.id)} className={cn(linkClass, 'block min-w-0', !truncate && 'inline', className)}>
				<span dir="auto" title={relation.label} className={lineClass}>
					{relation.label}
				</span>
			</router.Link>
		);
	}

	const value = row[field.name];
	if (value == null || value === '') return <EmptyValue />;
	const format = fieldFormat(field);

	if (format === 'badge') {
		const option = optionFor(field, value);
		const label = option?.label ?? String(value);
		return (
			<ToneBadge tone={option?.tone ?? 'neutral'} className={cn('max-w-full', className)}>
				<span dir="auto" title={label} className="min-w-0 truncate">
					{label}
				</span>
			</ToneBadge>
		);
	}

	if (format === 'boolean') {
		const on = value === true || value === 'true';
		const Icon = on ? CheckIcon : MinusIcon;
		return (
			<span className={cn('inline-flex items-center gap-1.5', on ? 'text-foreground' : 'text-muted-foreground', className)}>
				<Icon aria-hidden="true" className={cn('size-3.5 shrink-0', on ? 'text-success' : 'text-subtle-foreground')} />
				{on ? 'Yes' : 'No'}
			</span>
		);
	}

	const text = formatFieldText(field, value, { locale, currency, now, compact: truncate }) ?? '';
	// Compact cells drop the year and seconds; the full value stays one hover away.
	const full = truncate && DATE_FORMATS.has(format) ? (formatFieldText(field, value, { locale, currency, now }) ?? text) : text;
	if (field.input === 'url' && /^https?:\/\//i.test(text)) {
		return (
			<a href={text} target="_blank" rel="noreferrer" dir="ltr" title={text} className={cn(linkClass, lineClass, className)}>
				{text}
			</a>
		);
	}
	if (field.input === 'email') {
		return (
			<a href={`mailto:${text}`} dir="ltr" title={text} className={cn(linkClass, lineClass, className)}>
				{text}
			</a>
		);
	}
	return (
		<span
			title={truncate ? full : undefined}
			dir={NUMERIC_FORMATS.has(format) ? undefined : 'auto'}
			className={cn(
				lineClass,
				NUMERIC_FORMATS.has(format) && 'tabular-nums',
				field.input === 'json' && 'font-mono text-xs',
				field.input === 'textarea' && !truncate && 'whitespace-pre-wrap',
				className,
			)}
		>
			{text}
		</span>
	);
}

/** Linked records of a many-to-many field, from an array the source embedded or from `source.linked`. */
function ManyRelationValue({ resource, field, row, truncate, className }: { resource: AnyResource; field: ResourceField; row: ResourceRow; truncate: boolean; className?: string }) {
	const { byName, router } = useResourceKit();
	const target = byName.get(field.relation!.resource);
	const labelField = field.relation?.labelField ?? target?.titleField;
	const embedded = Array.isArray(row[field.name]) ? (row[field.name] as unknown[]) : null;
	const linked = useLinkedIds(resource, recordId(resource, row), field.name, { enabled: !embedded && Boolean(resource.source.linked) });
	const { ids, known } = React.useMemo(() => {
		const entries = (embedded ?? linked.data ?? []).map((item) => {
			if (item && typeof item === 'object') {
				const record = item as ResourceRow;
				const label = labelField ? record[labelField] : undefined;
				return { id: String(record[target?.primaryKey ?? 'id']), label: typeof label === 'string' ? label : undefined };
			}
			return { id: String(item), label: undefined };
		});
		return {
			ids: entries.map((entry) => entry.id),
			known: new Map(entries.flatMap((entry) => (entry.label ? [[entry.id, entry.label] as const] : []))),
		};
	}, [embedded, linked.data, labelField, target?.primaryKey]);
	const { labels, missing } = useRecordLabels(target, ids, labelField, known);

	const linkFailure = embedded ? null : queryFailure(linked);
	// A failed read is not "no links": say so, with the reason on hover.
	if (linkFailure && !linked.data) {
		return (
			<span title={errorMessage(linkFailure)} className={cn('inline-flex items-center gap-1 text-destructive', className)}>
				<CircleAlertIcon aria-hidden="true" className="size-3.5 shrink-0" />
				Couldn’t load
			</span>
		);
	}
	if (!embedded && linked.isPending && linked.fetchStatus !== 'idle') return <LabelSkeleton />;
	if (ids.length === 0) return <EmptyValue />;
	const shown = truncate ? ids.slice(0, 2) : ids;
	const rest = ids.length - shown.length;
	return (
		<span className={cn('flex min-w-0 gap-1', truncate ? 'flex-nowrap items-center' : 'flex-wrap', className)}>
			{shown.map((id) => {
				const label = labels.get(id);
				if (missing.has(id)) return <MissingValue key={id} id={id} />;
				if (label === undefined) return <LabelSkeleton key={id} className="w-12" />;
				return target ? (
					<router.Link key={id} href={router.detailHref(target.name, id)} className={chipClass}>
						<span dir="auto" title={label} className="min-w-0 truncate">
							{label}
						</span>
					</router.Link>
				) : (
					<span key={id} className={chipClass}>
						<span dir="auto" className="min-w-0 truncate">
							{label}
						</span>
					</span>
				);
			})}
			{rest > 0 ? <span className="shrink-0 text-xs text-muted-foreground tabular-nums">+{rest}</span> : null}
		</span>
	);
}
