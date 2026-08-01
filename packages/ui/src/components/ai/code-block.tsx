'use client';

import { Check, ChevronDown, Copy } from 'lucide-react';
import * as React from 'react';
import { highlight } from 'sugar-high';
import { c, css, diff, go, java, python, rust } from 'sugar-high/presets';

import { cn } from '../../lib/utils';
import { Button } from '../button';

/** Default visible lines before the expand control appears. */
const DEFAULT_COLLAPSED_LINES = 12;
/** Approx. line box for text-xs + leading-relaxed (+ padding slack). */
const LINE_BOX_PX = 20;
/** Vertical padding inside the pre (p-3 = 12px × 2). */
const PRE_PAD_Y = 24;

type CodeBlockProps = React.ComponentProps<'div'> & {
	code: string;
	language?: string;
	/** Optional filename shown in the header. */
	filename?: string;
	/** Show the copy control (default true). */
	showCopy?: boolean;
	/**
	 * Syntax highlighting via sugar-high (~1 kB). Default true.
	 * Disable for ultra-hot streaming paths if the host re-highlights later.
	 */
	highlight?: boolean;
	/**
	 * Max lines shown while collapsed. Pass `false` to always show full code.
	 * Default 12. Collapse only engages when the source is longer.
	 */
	maxCollapsedLines?: number | false;
	/**
	 * When expanded, cap height and scroll inside the block.
	 * Pass `false` for fully unconstrained height. Default ~28rem / 70vh.
	 */
	maxExpandedHeight?: string | false;
	/** Controlled expand state. */
	expanded?: boolean;
	/** Uncontrolled initial expand. Default false. */
	defaultExpanded?: boolean;
	onExpandedChange?: (expanded: boolean) => void;
	/** Reveal code line-by-line for demos / progressive stream. */
	streamingLines?: boolean;
	/** Lines revealed per tick when streamingLines is true. */
	lineIntervalMs?: number;
};

/** Map common language labels to sugar-high presets (JS/TS/JSX is the default). */
function optionsForLanguage(language?: string) {
	if (!language) return undefined;
	const key = language.toLowerCase().trim();
	switch (key) {
		case 'ts':
		case 'tsx':
		case 'typescript':
		case 'js':
		case 'jsx':
		case 'javascript':
		case 'mjs':
		case 'cjs':
			return undefined;
		case 'py':
		case 'python':
			return python;
		case 'rs':
		case 'rust':
			return rust;
		case 'go':
		case 'golang':
			return go;
		case 'java':
			return java;
		case 'c':
		case 'h':
		case 'cpp':
		case 'c++':
		case 'cxx':
		case 'cc':
			return c;
		case 'css':
		case 'scss':
		case 'less':
			return css;
		case 'diff':
		case 'patch':
			return diff;
		default:
			return undefined;
	}
}

/**
 * Agent code surface with lightweight sugar-high highlighting, elegant header,
 * copy action, and collapse/expand for long sources.
 */
function CodeBlock({
	code,
	language,
	filename,
	showCopy = true,
	highlight: highlightEnabled = true,
	maxCollapsedLines = DEFAULT_COLLAPSED_LINES,
	maxExpandedHeight = 'min(28rem, 70vh)',
	expanded: expandedProp,
	defaultExpanded = false,
	onExpandedChange,
	streamingLines = false,
	lineIntervalMs = 240,
	className,
	...props
}: CodeBlockProps) {
	const [copied, setCopied] = React.useState(false);
	const [uncontrolledExpanded, setUncontrolledExpanded] = React.useState(defaultExpanded);
	const expanded = expandedProp ?? uncontrolledExpanded;

	const setExpanded = React.useCallback(
		(next: boolean) => {
			if (expandedProp === undefined) setUncontrolledExpanded(next);
			onExpandedChange?.(next);
		},
		[expandedProp, onExpandedChange],
	);

	const lines = React.useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
	const lineCount = lines.length === 1 && lines[0] === '' ? 0 : lines.length;

	const [visibleCount, setVisibleCount] = React.useState(streamingLines ? 0 : lines.length);

	React.useEffect(() => {
		if (!streamingLines) {
			setVisibleCount(lines.length);
			return;
		}
		setVisibleCount(0);
		if (lines.length === 0) return;
		const id = window.setInterval(() => {
			setVisibleCount((count) => {
				if (count >= lines.length) {
					window.clearInterval(id);
					return count;
				}
				return count + 1;
			});
		}, lineIntervalMs);
		return () => window.clearInterval(id);
	}, [streamingLines, lines, lineIntervalMs, code]);

	const visible = streamingLines ? lines.slice(0, visibleCount).join('\n') : code;

	const highlightedHtml = React.useMemo(() => {
		if (!highlightEnabled || !visible) return null;
		try {
			return highlight(visible, optionsForLanguage(language));
		} catch {
			return null;
		}
	}, [visible, language, highlightEnabled]);

	const handleCopy = React.useCallback(async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard can fail in non-secure contexts; stay quiet.
		}
	}, [code]);

	const collapsible =
		maxCollapsedLines !== false && lineCount > maxCollapsedLines && !streamingLines;
	const isCollapsed = collapsible && !expanded;
	const hiddenLineCount = collapsible ? Math.max(0, lineCount - maxCollapsedLines) : 0;

	const collapsedMaxHeight =
		maxCollapsedLines === false
			? undefined
			: PRE_PAD_Y + maxCollapsedLines * LINE_BOX_PX;

	const hasHeader = Boolean(filename || language || showCopy);

	return (
		<div
			data-slot="code-block"
			data-language={language || undefined}
			data-expanded={collapsible ? expanded : undefined}
			className={cn(
				'overflow-hidden rounded-lg border border-border bg-muted/40 text-sm',
				// sugar-high token colors (light defaults; dark overrides below)
				'[--sh-class:oklch(0.48_0.12_250)] [--sh-identifier:var(--foreground)] [--sh-sign:var(--muted-foreground)]',
				'[--sh-property:oklch(0.48_0.11_230)] [--sh-entity:oklch(0.48_0.1_175)] [--sh-jsxliterals:oklch(0.5_0.14_290)]',
				'[--sh-string:oklch(0.48_0.1_160)] [--sh-keyword:oklch(0.52_0.16_25)] [--sh-comment:var(--muted-foreground)]',
				'[--sh-space:transparent] [--sh-break:transparent]',
				'dark:[--sh-class:oklch(0.78_0.1_250)] dark:[--sh-identifier:oklch(0.93_0_0)]',
				'dark:[--sh-sign:oklch(0.68_0.02_286)] dark:[--sh-property:oklch(0.78_0.1_230)]',
				'dark:[--sh-entity:oklch(0.78_0.1_175)] dark:[--sh-jsxliterals:oklch(0.8_0.12_290)]',
				'dark:[--sh-string:oklch(0.78_0.1_160)] dark:[--sh-keyword:oklch(0.78_0.14_25)]',
				'dark:[--sh-comment:oklch(0.62_0.02_286)]',
				className,
			)}
			{...props}
		>
			{hasHeader ? (
				<div
					data-slot="code-block-header"
					className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-2.5 py-1.5"
				>
					<div className="flex min-w-0 flex-1 items-center gap-2">
						{filename ? (
							<span
								data-slot="code-block-filename"
								className="min-w-0 truncate font-mono text-[12px] text-foreground/80"
								title={filename}
							>
								{filename}
							</span>
						) : language ? (
							<span
								data-slot="code-block-language"
								className="min-w-0 truncate font-mono text-[12px] text-foreground/80"
							>
								{language}
							</span>
						) : null}

						{filename && language ? (
							<span
								data-slot="code-block-language"
								className={cn(
									'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5',
									'border border-border/60 bg-background/50',
									'font-sans text-[10px] font-medium tracking-wide text-muted-foreground uppercase',
								)}
							>
								{language}
							</span>
						) : null}

						{/* Quiet line count when long enough to collapse */}
						{collapsible ? (
							<span
								data-slot="code-block-meta"
								className="hidden shrink-0 font-sans text-[11px] tabular-nums text-muted-foreground/70 sm:inline"
							>
								{lineCount} lines
							</span>
						) : null}
					</div>

					{showCopy ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="shrink-0 text-muted-foreground hover:text-foreground"
							aria-label={copied ? 'Copied' : 'Copy code'}
							onClick={handleCopy}
						>
							{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
						</Button>
					) : null}
				</div>
			) : null}

			{/* Body: constrained height + optional fade when collapsed */}
			<div data-slot="code-block-body" className="relative">
				<pre
					className={cn(
						'overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground',
						'[&_.sh__line]:block',
						// Soft height transition when toggling expand
						'transition-[max-height] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
						isCollapsed && 'overflow-y-hidden',
						!isCollapsed && maxExpandedHeight !== false && collapsible && 'overflow-y-auto',
					)}
					style={
						isCollapsed
							? { maxHeight: collapsedMaxHeight }
							: collapsible && maxExpandedHeight !== false
								? { maxHeight: maxExpandedHeight }
								: undefined
					}
				>
					{highlightedHtml ? (
						<code
							// sugar-high escapes token text and emits only its own span markup
							dangerouslySetInnerHTML={{ __html: highlightedHtml }}
						/>
					) : (
						<code>{visible}</code>
					)}
				</pre>

				{/* Fade into the expand control so the cut isn’t harsh */}
				{isCollapsed ? (
					<div
						aria-hidden
						data-slot="code-block-fade"
						className={cn(
							'pointer-events-none absolute inset-x-0 bottom-0 h-16',
							'bg-linear-to-t from-muted/95 via-muted/55 to-transparent',
							// Match the soft code surface in light/dark
							'dark:from-muted/90 dark:via-muted/50',
						)}
					/>
				) : null}
			</div>

			{collapsible ? (
				<div
					data-slot="code-block-footer"
					className="border-t border-border/70 bg-muted/40"
				>
					<button
						type="button"
						data-slot="code-block-expand"
						aria-expanded={expanded}
						onClick={() => setExpanded(!expanded)}
						className={cn(
							'flex w-full items-center justify-center gap-1.5 px-3 py-2',
							'text-[12px] font-medium text-muted-foreground',
							'outline-none transition-colors duration-150',
							'hover:bg-muted/70 hover:text-foreground',
							'focus-visible:bg-muted/70 focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
						)}
					>
						<span>
							{expanded
								? 'Show less'
								: hiddenLineCount === 1
									? 'Show 1 more line'
									: `Show ${hiddenLineCount} more lines`}
						</span>
						<ChevronDown
							className={cn(
								'size-3.5 opacity-70 transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
								expanded && 'rotate-180',
							)}
							aria-hidden
						/>
					</button>
				</div>
			) : null}
		</div>
	);
}

export { CodeBlock };
export type { CodeBlockProps };
