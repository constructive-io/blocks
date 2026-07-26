import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';

const MAC_UA_RE = /Mac|iPod|iPhone|iPad/;

const JSON_HIGHLIGHT_STYLES = `
.json-highlight .jh-key { color: var(--color-foreground); }
.json-highlight .jh-str { color: oklch(0.72 0.14 168); }
.json-highlight .jh-num { color: oklch(0.7 0.14 250); }
.json-highlight .jh-bool { color: oklch(0.75 0.14 55); }
.json-highlight .jh-punct { color: var(--color-muted-foreground); }
@media (prefers-color-scheme: light) {
	.json-highlight .jh-str { color: oklch(0.5 0.16 168); }
	.json-highlight .jh-num { color: oklch(0.48 0.16 250); }
	.json-highlight .jh-bool { color: oklch(0.55 0.16 55); }
}
`;

// Zero-dependency JSON syntax highlighter using regex tokenisation.
// Returns HTML string with spans for: strings, numbers, booleans/null, keys, punctuation.
function highlightJson(json: string): string {
	// Escape HTML entities first
	const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	return escaped.replace(
		// Match JSON tokens: strings, numbers, booleans, null, structural chars
		/("(?:[^"\\]|\\.)*")\s*(?=:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(true|false|null)\b|([{}[\]:,])/g,
		(match, key, str, num, bool, punct) => {
			if (key !== undefined) return `<span class="jh-key">${key}</span>`;
			if (str !== undefined) return `<span class="jh-str">${str}</span>`;
			if (num !== undefined) return `<span class="jh-num">${num}</span>`;
			if (bool !== undefined) return `<span class="jh-bool">${bool}</span>`;
			if (punct !== undefined) return `<span class="jh-punct">${punct}</span>`;
			return match;
		},
	);
}

type Props = {
	value: unknown;
	onChange: (next: unknown) => void;
	onFinished: (next?: unknown) => void;
};

export function JsonEditor({ value, onChange, onFinished }: Props) {
	const [text, setText] = useState(() => (typeof value === 'string' ? value : JSON.stringify(value, null, 2)));
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const preRef = useRef<HTMLPreElement>(null);
	const keyContainerRef = useRef<HTMLDivElement>(null);

	const { parsed, valid } = useMemo(() => {
		try {
			return { parsed: JSON.parse(text), valid: true };
		} catch {
			return { parsed: text, valid: false };
		}
	}, [text]);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const next = e.target.value;
			setText(next);
			try {
				onChange(JSON.parse(next));
			} catch {
				// invalid JSON — don't propagate
			}
		},
		[onChange],
	);

	const handleCancel = useCallback(() => onFinished(undefined), [onFinished]);
	const handleSave = useCallback(() => {
		if (valid) onFinished(parsed);
	}, [onFinished, parsed, valid]);

	// Sync scroll between textarea and highlighted pre
	const handleScroll = useCallback(() => {
		const ta = textareaRef.current;
		const pre = preRef.current;
		if (ta && pre) {
			pre.scrollTop = ta.scrollTop;
			pre.scrollLeft = ta.scrollLeft;
		}
	}, []);

	// Refs for native key handler
	const actionsRef = useRef({ handleSave, handleCancel });
	actionsRef.current = { handleSave, handleCancel };

	// Native DOM keydown listener — prevents Glide from intercepting keys
	useEffect(() => {
		const el = keyContainerRef.current;
		if (!el) return;
		const handler = (e: KeyboardEvent) => {
			const { handleSave, handleCancel } = actionsRef.current;

			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				handleCancel();
				return;
			}
			if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 's' && (e.metaKey || e.ctrlKey))) {
				e.preventDefault();
				e.stopPropagation();
				handleSave();
				return;
			}
			// Stop Tab from reaching Glide (allow default tab-indent behavior)
			if (e.key === 'Tab') {
				e.stopPropagation();
				// Insert tab character at cursor
				e.preventDefault();
				const ta = textareaRef.current;
				if (ta) {
					const start = ta.selectionStart;
					const end = ta.selectionEnd;
					const val = ta.value;
					const newVal = val.substring(0, start) + '  ' + val.substring(end);
					ta.value = newVal;
					ta.selectionStart = ta.selectionEnd = start + 2;
					ta.dispatchEvent(new Event('input', { bubbles: true }));
				}
			}
		};
		el.addEventListener('keydown', handler);
		return () => el.removeEventListener('keydown', handler);
	}, []);

	// Memoize highlighted HTML
	const highlighted = useMemo(() => highlightJson(text), [text]);

	const isMac = typeof navigator !== 'undefined' && MAC_UA_RE.test(navigator.userAgent);
	const modKey = isMac ? '⌘' : 'Ctrl';

	return (
		<EditorFocusTrap onEscape={handleCancel} className={`bg-popover ${OVERLAY.lg} rounded-lg border p-2.5 shadow-lg`}>
			<div ref={keyContainerRef}>
				{/* Editor area — grid overlay technique for matched sizing */}
				<div
					className='bg-muted/40 grid cursor-text overflow-hidden rounded-md border border-border/40'
					style={{ height: 300 }}
					onClick={() => textareaRef.current?.focus()}
				>
					{/* Both layers occupy the same grid cell */}
					<pre
						ref={preRef}
						className='json-highlight pointer-events-none col-start-1 row-start-1 m-0 overflow-hidden whitespace-pre-wrap break-words bg-transparent p-3 font-mono text-sm leading-relaxed [word-break:break-all]'
						aria-hidden='true'
						dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
					/>
					<textarea
						ref={textareaRef}
						value={text}
						onChange={handleChange}
						onScroll={handleScroll}
						spellCheck={false}
						className='col-start-1 row-start-1 m-0 resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent p-3 font-mono text-sm leading-relaxed text-transparent outline-none [word-break:break-all]'
						style={{ caretColor: 'var(--color-foreground)' }}
						autoFocus
					/>
				</div>

				{/* Footer — validation + hints + save */}
				<div className='mt-3 flex items-center justify-between gap-4 border-t px-1 pt-2.5'>
					<div className='text-muted-foreground flex items-center gap-3 text-xs'>
						{valid ? (
							<span className='text-muted-foreground/60 shrink-0 text-xs'>Valid</span>
						) : (
							<span className='text-destructive shrink-0 text-xs'>Invalid</span>
						)}
						<span className='text-border'>|</span>
						<span className='inline-flex shrink-0 items-center gap-1'>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 min-w-5 items-center justify-center rounded border font-sans text-[11px] leading-tight'>{modKey}</kbd>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 min-w-5 items-center justify-center rounded border font-sans text-[11px] leading-tight'>↵</kbd>
							<span>save</span>
						</span>
						<span className='inline-flex shrink-0 items-center gap-1'>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 items-center justify-center rounded border px-1.5 font-sans text-[11px] leading-tight'>Esc</kbd>
							<span>cancel</span>
						</span>
					</div>
					<Button onClick={handleSave} size='xs' variant='default' className='shrink-0' disabled={!valid}>
						Save
					</Button>
				</div>

				{/* Syntax highlighting styles — uses CSS variables for theme compatibility */}
				<style>{JSON_HIGHLIGHT_STYLES}</style>
			</div>
		</EditorFocusTrap>
	);
}
