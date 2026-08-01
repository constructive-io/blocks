'use client';

import { Check, Copy } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';

type CodeBlockProps = React.ComponentProps<'div'> & {
	code: string;
	language?: string;
	/** Optional filename shown in the header. */
	filename?: string;
	/** Show the copy control (default true). */
	showCopy?: boolean;
	/** Reveal code line-by-line for demos / progressive stream. */
	streamingLines?: boolean;
	/** Lines revealed per tick when streamingLines is true. */
	lineIntervalMs?: number;
};

/**
 * Agent code surface with optional language label and copy action.
 * Syntax highlighting is left to the host (shiki) for settled content —
 * while streaming, plain mono keeps CPU flat.
 */
function CodeBlock({
	code,
	language,
	filename,
	showCopy = true,
	streamingLines = false,
	lineIntervalMs = 240,
	className,
	...props
}: CodeBlockProps) {
	const [copied, setCopied] = React.useState(false);
	const lines = React.useMemo(() => code.replace(/\n$/, '').split('\n'), [code]);
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

	const handleCopy = React.useCallback(async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard can fail in non-secure contexts; stay quiet.
		}
	}, [code]);

	const headerLabel = filename ?? language;

	return (
		<div
			data-slot="code-block"
			className={cn(
				'overflow-hidden rounded-lg border border-border bg-muted/40 text-sm',
				className,
			)}
			{...props}
		>
			{(headerLabel || showCopy) && (
				<div className="flex items-center justify-between gap-2 border-b border-border/80 bg-muted/60 px-3 py-1.5">
					<span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
						{headerLabel}
						{filename && language ? (
							<span className="text-muted-foreground/70"> · {language}</span>
						) : null}
					</span>
					{showCopy ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label={copied ? 'Copied' : 'Copy code'}
							onClick={handleCopy}
						>
							{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
						</Button>
					) : null}
				</div>
			)}
			<pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground">
				<code>{visible}</code>
			</pre>
		</div>
	);
}

export { CodeBlock };
export type { CodeBlockProps };
