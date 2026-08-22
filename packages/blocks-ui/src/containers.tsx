'use client';

/**
 * Container nodes: layout plus, for `Form`, the submit path. Children arrive
 * already rendered, so a container only positions them — except `Tabs`, which
 * needs its children's labels to build triggers and therefore renders them
 * itself through {@link BlockRenderer}.
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui';
import { BlockRenderer, useRenderer } from 'blocks-renderer';
import type { BlockProps } from 'blocks-renderer';
import type { UINodeProps } from 'blocks-schema';

function text(props: UINodeProps, key: string): string | undefined {
	const value = props[key];
	return typeof value === 'string' ? value : undefined;
}

export function PageBlock({ props, children }: BlockProps) {
	const title = text(props, 'title');
	const description = text(props, 'description');

	return (
		<div className={props.className ? String(props.className) : 'flex flex-col gap-6'}>
			{(title || description) && (
				<header className="flex flex-col gap-1">
					{title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
					{description && <p className="text-muted-foreground">{description}</p>}
				</header>
			)}
			{children}
		</div>
	);
}

/**
 * Submitting delegates to the renderer: it validates every field against the
 * document's constraints before calling the host's `onSubmit`, so this component
 * never inspects values itself.
 */
export function FormBlock({ node, props, children }: BlockProps) {
	const { onAction } = useRenderer();
	const submitLabel = text(props, 'submitLabel') ?? (props.mode === 'update' ? 'Save' : 'Submit');

	return (
		<form
			className="flex flex-col gap-5"
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				onAction?.(node.actions?.submit ?? { type: 'handler', handler: 'submit' }, 'submit');
			}}
		>
			{children}
			<div className="flex gap-2">
				<Button type="submit">{submitLabel}</Button>
			</div>
		</form>
	);
}

export function SectionBlock({ props, children }: BlockProps) {
	const title = text(props, 'title');

	if (!title) {
		return <section className="flex flex-col gap-4">{children}</section>;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">{children}</CardContent>
		</Card>
	);
}

/** `columns` is a count, so the grid stays declarative rather than class-driven. */
export function GridBlock({ props, children }: BlockProps) {
	const columns = typeof props.columns === 'number' ? Math.min(Math.max(props.columns, 1), 4) : 2;
	const template = ['grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4'][columns - 1];

	return <div className={`grid gap-5 ${template}`}>{children}</div>;
}

// Spelled out rather than interpolated, because Tailwind only ships classes it
// can see in the source.
const SPANS = ['', 'md:col-span-2', 'md:col-span-3', 'md:col-span-4'];

export function GridColumnBlock({ props, children }: BlockProps) {
	const span = typeof props.span === 'number' ? Math.min(Math.max(props.span, 1), 4) : 1;

	return <div className={['flex flex-col gap-5', SPANS[span - 1]].filter(Boolean).join(' ')}>{children}</div>;
}

export function TabsBlock({ node }: BlockProps) {
	const tabs = node.children ?? [];
	if (tabs.length === 0) return null;

	const first = tabs[0]!.key;

	return (
		<Tabs defaultValue={first}>
			<TabsList>
				{tabs.map((tab) => (
					<TabsTrigger key={tab.key} value={tab.key}>
						{text(tab.props, 'label') ?? text(tab.props, 'title') ?? tab.key}
					</TabsTrigger>
				))}
			</TabsList>
			{tabs.map((tab) => (
				<TabsContent key={tab.key} value={tab.key}>
					<BlockRenderer node={tab} />
				</TabsContent>
			))}
		</Tabs>
	);
}

/** Rendered inside a `TabsContent` by {@link TabsBlock}; it owns no chrome. */
export function TabBlock({ children }: BlockProps) {
	return <div className="flex flex-col gap-5 pt-4">{children}</div>;
}
