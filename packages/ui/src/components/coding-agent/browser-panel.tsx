'use client';

import { ArrowLeft, ArrowRight, Globe, Lock, RotateCw } from 'lucide-react';
import * as React from 'react';

import { Button } from '../button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../input-group';
import { EmptyState } from '../workspace-kit/surface';
import { TooltipIconButton } from '../workspace-kit/primitives';
import { DEMO_QUICK_LINKS, renderDemoPage } from './demo-browser';
import type { BrowserPageRenderer } from './types';

/** One browser tab: where it is, where it's been, and the page's title when the agent or host knows it. */
export type BrowserTabState = { url: string | null; title?: string; history: string[]; index: number; reloads: number };

export function browserTab(url: string | null, title?: string): BrowserTabState {
	return { url, title, history: url ? [url] : [], index: url ? 0 : -1, reloads: 0 };
}

export function navigate(tab: BrowserTabState, url: string, title?: string): BrowserTabState {
	const history = [...tab.history.slice(0, tab.index + 1), url];
	return { ...tab, url, title, history, index: history.length - 1 };
}

export function step(tab: BrowserTabState, by: -1 | 1): BrowserTabState {
	const index = Math.min(Math.max(tab.index + by, 0), tab.history.length - 1);
	return { ...tab, index, url: tab.history[index] ?? null, title: undefined };
}

/** "localhost:3000/login" → "http://localhost:3000/login"; bare words become a search. */
function toUrl(input: string) {
	const value = input.trim();
	if (!value) return null;
	if (/^[a-z]+:\/\//i.test(value)) return value;
	const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(value);
	if (local || /^[\w-]+(\.[\w-]+)+(:\d+)?(\/|$)/.test(value)) {
		return `${local ? 'http' : 'https'}://${local ? value.replace(/^localhost/i, 'localhost') : value}`;
	}
	return `https://search.example/?q=${encodeURIComponent(value)}`;
}

function hostOf(url: string) {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}

export function displayUrl(url: string) {
	return url.replace(/^https?:\/\//, '');
}

/**
 * A tab title for a page that hasn't given one: its last path segment as words ("/settings/team" reads "Team"), or
 * its host for a site's front page.
 */
export function pageTitle(url: string) {
	try {
		const { host, pathname } = new URL(url);
		const page = pathname.split('/').filter(Boolean).pop();
		return page ? `${page.charAt(0).toUpperCase()}${page.slice(1).replace(/[-_]/g, ' ')}` : host;
	} catch {
		return url;
	}
}

/**
 * A browser tab inside the side panel: history, reload, an address bar, and a page area. The page comes from the
 * host's renderer, or without one from the bundled demo app's preview; a page the renderer returns null for shows a
 * note that it can't be shown here.
 */
export function BrowserPanel({
	tab,
	onChange,
	renderPage
}: {
	tab: BrowserTabState;
	onChange: (tab: BrowserTabState) => void;
	renderPage?: BrowserPageRenderer;
}) {
	const [draft, setDraft] = React.useState(tab.url ? displayUrl(tab.url) : '');
	// A new, empty tab is for typing an address, so the address bar takes focus.
	React.useEffect(() => {
		if (!tab.url) inputRef.current?.focus();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const [loading, setLoading] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		setDraft(tab.url ? displayUrl(tab.url) : '');
		if (!tab.url) return;
		setLoading(true);
		const timer = window.setTimeout(() => setLoading(false), 450);
		return () => window.clearTimeout(timer);
	}, [tab.url, tab.reloads]);

	const go = (input: string) => {
		const url = toUrl(input);
		if (url) onChange(navigate(tab, url));
		inputRef.current?.blur();
	};

	// The host's renderer runs once per address or reload, not on every render of the session around it.
	const page = React.useMemo(() => (tab.url ? (renderPage ?? renderDemoPage)(tab.url) : null), [renderPage, tab.url]);
	// The shortcuts point at the demo app's pages, so a host with its own renderer doesn't get them.
	const quickLinks = renderPage ? [] : DEMO_QUICK_LINKS;
	const secure = tab.url?.startsWith('https://');

	return (
		<div className="flex h-full min-h-0 flex-col">
			{/* The page below is someone else's surface, so the browser's own controls end at a rule. */}
			<div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
				<TooltipIconButton label="Back" size="sm" disabled={tab.index <= 0} onClick={() => onChange(step(tab, -1))}>
					<ArrowLeft aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
				</TooltipIconButton>
				<TooltipIconButton label="Forward" size="sm" disabled={tab.index >= tab.history.length - 1} onClick={() => onChange(step(tab, 1))}>
					<ArrowRight aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
				</TooltipIconButton>
				<TooltipIconButton label="Reload" size="sm" disabled={!tab.url} onClick={() => onChange({ ...tab, reloads: tab.reloads + 1 })}>
					<RotateCw aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
				<form
					className="ms-1 min-w-0 flex-1"
					onSubmit={(event) => {
						event.preventDefault();
						go(draft);
					}}
				>
					<InputGroup className="h-7 rounded-md border-transparent bg-muted shadow-none dark:bg-muted">
						<InputGroupAddon className="text-muted-foreground">
							{secure ? <Lock aria-hidden="true" className="size-3.5" /> : <Globe aria-hidden="true" className="size-3.5" />}
						</InputGroupAddon>
						<InputGroupInput
							ref={inputRef}
							dir="ltr"
							size="sm"
							aria-label="Address"
							placeholder="Search or enter a URL"
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onFocus={(event) => event.target.select()}
							className="text-xs"
						/>
					</InputGroup>
				</form>
			</div>
			<div className="relative min-h-0 flex-1 overflow-auto">
				{loading ? <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-primary" /> : null}
				{!tab.url ? (
					<div className="grid h-full place-items-center">
						<EmptyState
							icon={Globe}
							title="Open a page"
							description="Preview your app, read docs, or browse the web."
							action={
								quickLinks.length > 0 ? (
									<div className="flex flex-wrap justify-center gap-1.5">
										{quickLinks.map((link) => (
											<Button key={link} size="xs" variant="outline" className="font-mono" onClick={() => go(link)}>
												{link}
											</Button>
										))}
									</div>
								) : undefined
							}
						/>
					</div>
				) : page ? (
					<div key={`${tab.url}-${tab.reloads}`} className="h-full">
						{page}
					</div>
				) : (
					<div className="grid h-full place-items-center">
						<EmptyState
							icon={Globe}
							title="This page can’t be previewed here"
							description={<span className="[overflow-wrap:anywhere]">{hostOf(tab.url)} opens outside the preview, in a real browser.</span>}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
