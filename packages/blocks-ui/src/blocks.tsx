'use client';

/**
 * Document-level blocks that need no data source. The data blocks
 * (`DataTable`, `DetailPanel`, `RelationList`, `Chart`, `AgentChat`) are
 * deliberately absent: they need a query runtime, so they fall back to the
 * renderer's visible `UnknownBlock` until a host registers them.
 */

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui';
import { useRenderer } from 'blocks-renderer';
import type { BlockProps } from 'blocks-renderer';
import type { UINodeProps } from 'blocks-schema';

function text(props: UINodeProps, ...keys: string[]): string | undefined {
	for (const key of keys) {
		const value = props[key];
		if (typeof value === 'string') return value;
	}
	return undefined;
}

const VARIANTS = new Set(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']);

/**
 * A button either submits its form or fires its `click` action; the renderer
 * decides what an action means, so this block only reports the event.
 */
export function ButtonBlock({ node, props }: BlockProps) {
	const { onAction } = useRenderer();
	const label = text(props, 'text', 'label') ?? 'Button';
	const variant = text(props, 'variant');
	const submits = props.type === 'submit' || props.submit === true;
	const action = node.actions?.click;

	return (
		<Button
			type={submits ? 'submit' : 'button'}
			disabled={Boolean(props.disabled)}
			{...(variant && VARIANTS.has(variant) ? { variant: variant as 'default' } : {})}
			{...(action ? { onClick: () => onAction?.(action, 'click') } : {})}
		>
			{label}
		</Button>
	);
}

export function ActionBarBlock({ props, children }: BlockProps) {
	return (
		<div className={['flex flex-wrap items-center gap-2', props.className ? String(props.className) : ''].join(' ').trim()}>
			{children}
		</div>
	);
}

/**
 * Markdown source is rendered as pre-wrapped text rather than parsed: a parser
 * is a dependency and an XSS surface, and a host that wants one registers it.
 */
export function MarkdownBlock({ props }: BlockProps) {
	const content = text(props, 'content', 'text', 'markdown') ?? '';

	return <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>;
}

export function StatCardBlock({ props }: BlockProps) {
	const label = text(props, 'label', 'title') ?? '';
	const value = props.value;
	const description = text(props, 'description');

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>
				<span className="text-2xl font-semibold tabular-nums">
					{value === null || value === undefined ? '—' : String(value)}
				</span>
			</CardContent>
		</Card>
	);
}
