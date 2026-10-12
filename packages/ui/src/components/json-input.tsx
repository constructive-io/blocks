'use client';

import * as React from 'react';
import { useEffect, useMemo, useState, useSyncExternalStore, Suspense } from 'react';
import { CheckCircle2, CircleAlert, Loader2, WandSparkles } from 'lucide-react';
import type { IAceEditorProps } from 'react-ace';

import { cn } from '../lib/utils';

import { Button } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

// Lazy load AceEditor
const AceEditor = React.lazy(async () => {
	const ace = await import('react-ace');
	await import('ace-builds/src-noconflict/mode-json');
	await import('ace-builds/src-noconflict/theme-textmate');
	await import('ace-builds/src-noconflict/theme-cloud9_night');
	return ace;
});

const EditorLoading = () => (
	<div className="flex h-32 items-center justify-center">
		<Loader2 className="h-6 w-6 animate-spin" />
	</div>
);

type JsonDisplay = {
	icon?: React.ReactNode;
	text?: string;
	className?: string;
};

interface JsonState {
	state: 'empty' | 'loading' | 'success' | 'error';
	errMsg?: string;
}

const displayJsonState = (jsonState: JsonState) => {
	const jsonStateMap: Record<JsonState['state'], JsonDisplay> = {
		loading: {
			icon: <Loader2 className="text-muted-foreground size-[18px] animate-spin" />,
			text: 'Checking JSON Format...',
			className: 'text-muted-foreground',
		},

		success: {
			icon: <CheckCircle2 className="size-[18px] text-green-600" />,
			text: 'Valid JSON Format',
			className: 'text-foreground',
		},

		error: {
			icon: <CircleAlert className="text-destructive size-[18px]" />,
			text: jsonState.errMsg || 'Invalid JSON Format',
			className: 'text-destructive',
		},

		empty: {},
	};

	return jsonStateMap[jsonState.state];
};

type JsonInputProps = {
	value: string;
	setValue: (value: string) => void;
	minLines?: number;
	/** Tallest the editor grows, in lines; longer documents scroll inside it. Defaults to what fits in 40% of the viewport. */
	maxLines?: number;
	className?: string;
	/** Theme for the editor: 'light' or 'dark'. Defaults to the document's theme (the `dark` class on `<html>`). */
	theme?: 'light' | 'dark';
};

// Ace draws a 14px line about 19px tall.
const LINE_HEIGHT = 19;

/**
 * Connects to the page when the first listener arrives and lets go when the last one leaves, so any number of editors
 * share one MutationObserver and one resize listener.
 */
function sharedSubscription(connect: (notify: () => void) => () => void) {
	const listeners = new Set<() => void>();
	let disconnect: (() => void) | undefined;

	return (listener: () => void) => {
		listeners.add(listener);
		if (listeners.size === 1) disconnect = connect(() => listeners.forEach((notify) => notify()));
		return () => {
			listeners.delete(listener);
			if (listeners.size === 0) {
				disconnect?.();
				disconnect = undefined;
			}
		};
	};
}

const subscribeToViewport = sharedSubscription((notify) => {
	window.addEventListener('resize', notify);
	return () => window.removeEventListener('resize', notify);
});

const subscribeToDocumentTheme = sharedSubscription((notify) => {
	const observer = new MutationObserver(notify);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	return () => observer.disconnect();
});

const subscribeToNothing = () => () => {};

/** The number of editor lines that fit in 40% of the viewport (client-side; a fixed fallback during SSR). */
function useViewportLines() {
	return useSyncExternalStore(
		subscribeToViewport,
		() => Math.max(1, Math.floor((window.innerHeight * 0.4) / LINE_HEIGHT)),
		() => 24,
	);
}

const documentTheme = (): 'light' | 'dark' => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

/** The theme the page is in, following the `dark` class on `<html>`. Pass `false` when the host sets the theme itself. */
function useDocumentTheme(follow = true) {
	return useSyncExternalStore(follow ? subscribeToDocumentTheme : subscribeToNothing, documentTheme, () => 'light' as const);
}

export const JsonInput = ({ value = '', setValue, minLines = 16, maxLines, className, theme: themeProp }: JsonInputProps) => {
	const [jsonState, setJsonState] = useState<JsonState>({ state: 'empty' });
	const viewportLines = useViewportLines();
	const pageTheme = useDocumentTheme(themeProp === undefined);
	const theme = themeProp ?? pageTheme;

	const handleChange = (val: string) => {
		setJsonState({ state: 'loading' });
		setValue(val);
	};

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			const error = validateJson(value);

			if (value.trim().length === 0) setJsonState({ state: 'empty' });
			else if (error) setJsonState({ state: 'error', errMsg: describeJsonError(value, error) });
			else setJsonState({ state: 'success' });
		}, 400);

		return () => clearTimeout(timeoutId);
	}, [value]);

	const { icon, text, className: textClassName } = displayJsonState(jsonState);
	const isValidJson = validateJson(value) === null;

	const cap = Math.max(minLines, maxLines ?? viewportLines);
	const lines = useMemo(() => {
		return Math.min(Math.max(countJsonLines(value), minLines), cap);
	}, [value, minLines, cap]);

	return (
		<div>
			{/* The code is always left to right, so the format button stays on the right and the editor leaves it room. */}
			<div className={cn('border-border relative overflow-y-auto rounded-md border p-2.5 pr-12', className)}>
				<JsonEditor value={value} setValue={handleChange} lines={lines} theme={theme} />
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="absolute top-2 right-2 size-8 rounded-md"
								size="icon"
								variant="outline"
								type="button"
								disabled={!isValidJson}
								onClick={() => setValue(prettifyJson(value))}
							>
								<WandSparkles className="text-muted-foreground size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Format JSON</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			{jsonState.state !== 'empty' && (
				<div className="mt-2 flex items-center gap-2">
					{icon}
					<span className={cn('text-sm', textClassName)}>{text}</span>
				</div>
			)}
		</div>
	);
};

type JsonEditorProps = {
	value: string;
	lines: number;
	setValue?: (value: string) => void;
	readOnly?: boolean;
	isValid?: boolean;
	enableFolding?: boolean;
	/** Theme for the editor: 'light' or 'dark'. Defaults to the document's theme (the `dark` class on `<html>`). */
	theme?: 'light' | 'dark';
};

export const JsonEditor = ({
	value,
	setValue,
	lines,
	readOnly = false,
	isValid = true,
	enableFolding = false,
	theme: themeProp,
}: JsonEditorProps) => {
	const pageTheme = useDocumentTheme(themeProp === undefined);
	const theme = themeProp ?? pageTheme;
	const editorProps: IAceEditorProps = {
		mode: 'json',
		theme: theme === 'light' ? 'textmate' : 'cloud9_night',
		fontSize: '14px',
		readOnly,
		style: {
			width: '100%',
			background: 'transparent',
			offset: 0,
		},
		setOptions: {
			useWorker: false,
			printMargin: false,
			showFoldWidgets: enableFolding,
			foldStyle: 'markbegin',
		},
		tabSize: 2,
		wrapEnabled: readOnly && !isValid,
		showGutter: enableFolding,
		minLines: lines,
		maxLines: lines,
		highlightActiveLine: !readOnly,
		value,
		onChange: setValue,
	};

	return (
		<Suspense fallback={<EditorLoading />}>
			<AceEditor {...editorProps} />
		</Suspense>
	);
};

export const validateJson = (text: string) => {
	try {
		if (text.trim().length === 0) throw new SyntaxError(`Can't use empty string`);
		JSON.parse(text);
		return null;
	} catch (error) {
		return (error as SyntaxError).message;
	}
};

// Sticky, so they match at `lastIndex` itself: a number of any length is read whole and nothing is sliced out of the text.
const JSON_NUMBER = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
const JSON_HEX_ESCAPE = /[0-9a-fA-F]{4}/y;

/**
 * Where `text` first stops being valid JSON, as a 0-based character offset (null when it parses). Engines word
 * syntax errors differently and often leave out the position, which makes a mistake on line 4,500 hard to find.
 */
export const findJsonErrorOffset = (text: string): number | null => {
	let i = 0;
	const fail = (at = i): never => {
		throw new JsonOffsetError(at);
	};
	const whitespace = () => {
		while (i < text.length && ' \n\r\t'.includes(text[i])) i += 1;
	};
	const string = () => {
		i += 1;
		while (i < text.length) {
			const char = text[i];
			if (char === '"') {
				i += 1;
				return;
			}
			if (char === '\\') {
				const escape = text[i + 1];
				if (escape === 'u') {
					JSON_HEX_ESCAPE.lastIndex = i + 2;
					if (!JSON_HEX_ESCAPE.test(text)) fail(i);
					i += 6;
				} else if (escape !== undefined && '"\\/bfnrt'.includes(escape)) i += 2;
				else fail(i + 1);
			} else if (char < ' ') fail(i);
			else i += 1;
		}
		fail(text.length);
	};
	const value = (): void => {
		whitespace();
		const char = text[i];
		if (char === '{') {
			i += 1;
			whitespace();
			if (text[i] === '}') {
				i += 1;
				return;
			}
			for (;;) {
				whitespace();
				if (text[i] !== '"') fail();
				string();
				whitespace();
				if (text[i] !== ':') fail();
				i += 1;
				value();
				whitespace();
				if (text[i] === ',') {
					i += 1;
					continue;
				}
				if (text[i] === '}') {
					i += 1;
					return;
				}
				fail();
			}
		} else if (char === '[') {
			i += 1;
			whitespace();
			if (text[i] === ']') {
				i += 1;
				return;
			}
			for (;;) {
				value();
				whitespace();
				if (text[i] === ',') {
					i += 1;
					continue;
				}
				if (text[i] === ']') {
					i += 1;
					return;
				}
				fail();
			}
		} else if (char === '"') string();
		else if (char === '-' || (char >= '0' && char <= '9')) {
			JSON_NUMBER.lastIndex = i;
			const number = JSON_NUMBER.exec(text);
			if (!number) fail();
			i += number![0].length;
		} else if (text.startsWith('true', i)) i += 4;
		else if (text.startsWith('false', i)) i += 5;
		else if (text.startsWith('null', i)) i += 4;
		else fail();
	};

	try {
		value();
		whitespace();
		if (i < text.length) fail();
		return null;
	} catch (error) {
		return error instanceof JsonOffsetError ? error.offset : null;
	}
};

class JsonOffsetError extends Error {
	constructor(readonly offset: number) {
		super('Invalid JSON');
	}
}

/** The engine's message plus the line and column of the first error ("... (line 4,500, column 3)"). */
export const describeJsonError = (text: string, message: string) => {
	const offset = findJsonErrorOffset(text);
	if (offset === null) return message;
	const before = text.slice(0, offset);
	const line = before.split('\n').length;
	const column = offset - before.lastIndexOf('\n');
	return `${message} (line ${line.toLocaleString('en-US')}, column ${column})`;
};

const prettifyJson = (text: string) => {
	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return text;
	}
};

const countJsonLines = (text: string) => text.split(/\n/).length;
