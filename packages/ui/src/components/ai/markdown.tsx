'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { useThrottledText } from './use-throttled-text';

type MarkdownProps = React.ComponentProps<'div'> & {
	children: string;
	/** Throttle re-renders while tokens arrive. */
	streaming?: boolean;
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * `*` starts emphasis only in front of text, at the start of a word, and ends
 * it only right after text. That keeps `A * B * C`, `src/**\/*.test.ts` and
 * `*.md files` as the characters the writer typed instead of eating them.
 *
 * The text between the markers cannot contain the marker itself (`**` for
 * strong, `***` for both), so an opener that never finds its closer gives up at
 * the next marker instead of scanning to the end of the line: a long line of
 * unmatched `**` takes time in proportion to its length, not its square.
 */
const STRONG_EM = /(?<![\w*])\*\*\*(?=[^\s*])((?:[^*\n]|\*(?!\*\*))*?[^\s*])\*\*\*(?![\w*])/g;
const STRONG = /(?<![\w*])\*\*(?=[^\s*])((?:[^*\n]|\*(?!\*))*?[^\s*])\*\*(?![\w*])/g;
const EM = /(?<![\w*])\*(?=[^\s*])([^\n*]*?[^\s*])\*(?![\w*])/g;

/**
 * Lightweight markdown → HTML without hard deps.
 * Handles paragraphs (consecutive lines stay together, joined with line
 * breaks), headings, bold, italic, inline code, fenced code, links, lists.
 * Tables and footnotes are outside this subset: hosts that need full GFM wrap
 * their own marked+DOMPurify pipeline.
 */
function renderBasicMarkdown(source: string): string {
	const fences: string[] = [];
	let text = source.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (_match, lang: string, code: string) => {
		const index = fences.length;
		const language = lang ? ` data-language="${escapeHtml(lang)}"` : '';
		fences.push(
			`<pre class="ai-md-pre" data-slot="markdown-pre"${language}><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`,
		);
		return `\u0000FENCE${index}\u0000`;
	});

	text = escapeHtml(text);

	// Inline code is set aside so emphasis markers inside it stay literal.
	const spans: string[] = [];
	text = text.replace(/`([^`\n]+)`/g, (_match, code: string) => {
		spans.push(`<code class="ai-md-code">${code}</code>`);
		return `\u0001CODE${spans.length - 1}\u0001`;
	});
	text = text.replace(STRONG_EM, '<strong><em>$1</em></strong>');
	text = text.replace(STRONG, '<strong>$1</strong>');
	text = text.replace(EM, '<em>$1</em>');
	text = text.replace(/\u0001CODE(\d+)\u0001/g, (_match, index: string) => spans[Number(index)] ?? '');
	text = text.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
		'<a href="$2" target="_blank" rel="noreferrer noopener" class="ai-md-link">$1</a>',
	);

	const lines = text.split('\n');
	const html: string[] = [];
	let listOpen: 'ul' | 'ol' | null = null;

	const closeList = () => {
		if (listOpen) {
			html.push(`</${listOpen}>`);
			listOpen = null;
		}
	};

	// Consecutive plain lines are one paragraph, so a line break the writer typed is kept and a blank line is what starts the next paragraph.
	let paragraph: string[] = [];
	const flushParagraph = () => {
		if (paragraph.length > 0) {
			html.push(`<p class="ai-md-p">${paragraph.join('<br>')}</p>`);
			paragraph = [];
		}
	};

	for (const line of lines) {
		const unordered = line.match(/^[-*]\s+(.+)$/);
		const ordered = line.match(/^\d+\.\s+(.+)$/);
		const heading = line.match(/^(#{1,6})\s+(.+)$/);

		if (unordered) {
			flushParagraph();
			if (listOpen !== 'ul') {
				closeList();
				html.push('<ul class="ai-md-list">');
				listOpen = 'ul';
			}
			html.push(`<li>${unordered[1]}</li>`);
			continue;
		}
		if (ordered) {
			flushParagraph();
			if (listOpen !== 'ol') {
				closeList();
				html.push('<ol class="ai-md-list">');
				listOpen = 'ol';
			}
			html.push(`<li>${ordered[1]}</li>`);
			continue;
		}

		closeList();

		if (heading) {
			flushParagraph();
			const level = heading[1].length;
			html.push(`<h${level} class="ai-md-h">${heading[2]}</h${level}>`);
			continue;
		}

		if (line.trim() === '') {
			flushParagraph();
			continue;
		}

		if (line.includes('\u0000FENCE')) {
			flushParagraph();
			html.push(line.replace(/\u0000FENCE(\d+)\u0000/g, (_m, i) => fences[Number(i)] ?? ''));
			continue;
		}

		paragraph.push(line);
	}
	flushParagraph();
	closeList();

	return html
		.join('\n')
		.replace(/\u0000FENCE(\d+)\u0000/g, (_m, i) => fences[Number(i)] ?? '');
}

/**
 * Markdown renderer for assistant messages. Throttles while streaming.
 * Uses a zero-dependency subset suitable for most agent replies; swap for a
 * host-level marked pipeline when you need tables/footnotes.
 */
function Markdown({ className, children, streaming = false, ...props }: MarkdownProps) {
	const text = useThrottledText(children, streaming);
	const html = React.useMemo(() => renderBasicMarkdown(text), [text]);

	return (
		<div
			data-slot="markdown"
			data-streaming={streaming ? 'true' : 'false'}
			className={cn(
				'ai-markdown max-w-none space-y-3 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]',
				'[&_.ai-md-p]:my-0',
				'[&_.ai-md-h]:font-semibold',
				'[&_h1.ai-md-h]:text-lg [&_h2.ai-md-h]:text-base [&_h3.ai-md-h]:text-sm [&_h4.ai-md-h]:text-sm [&_h5.ai-md-h]:text-[0.8125rem] [&_h6.ai-md-h]:text-xs',
				'[&_.ai-md-list]:my-1 [&_.ai-md-list]:list-disc [&_.ai-md-list]:space-y-1 [&_.ai-md-list]:ps-5',
				'[&_ol.ai-md-list]:list-decimal',
				'[&_.ai-md-code]:rounded-md [&_.ai-md-code]:bg-muted [&_.ai-md-code]:px-1 [&_.ai-md-code]:py-0.5 [&_.ai-md-code]:font-mono [&_.ai-md-code]:text-[0.85em]',
				'[&_.ai-md-pre]:overflow-x-auto [&_.ai-md-pre]:rounded-lg [&_.ai-md-pre]:border [&_.ai-md-pre]:border-border [&_.ai-md-pre]:bg-muted/50 [&_.ai-md-pre]:p-3 [&_.ai-md-pre]:font-mono [&_.ai-md-pre]:text-xs',
				'[&_.ai-md-link]:text-link [&_.ai-md-link]:underline-offset-2 hover:[&_.ai-md-link]:underline',
				className,
			)}
			// Content is escaped + controlled template — not host HTML.
			dangerouslySetInnerHTML={{ __html: html }}
			{...props}
		/>
	);
}

export { Markdown, renderBasicMarkdown };
export type { MarkdownProps };
