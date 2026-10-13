'use client';

import * as React from 'react';
import { useEffect, useMemo, useState, useSyncExternalStore, Suspense } from 'react';
import { CheckCircle2, CircleAlert, Loader2, WandSparkles } from 'lucide-react';
import type { IAceEditorProps } from 'react-ace';

import { describeJsonError } from '../lib/json-error-position';
import { useDocumentTheme } from '../lib/use-document-theme';
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

const viewportListeners = new Set<() => void>();
const notifyViewport = () => viewportListeners.forEach((notify) => notify());

/** One resize listener serves every editor on the page; it is added with the first and removed with the last. */
function subscribeToViewport(listener: () => void) {
	viewportListeners.add(listener);
	if (viewportListeners.size === 1) window.addEventListener('resize', notifyViewport);
	return () => {
		viewportListeners.delete(listener);
		if (viewportListeners.size === 0) window.removeEventListener('resize', notifyViewport);
	};
}

/** The number of editor lines that fit in 40% of the viewport (client-side; a fixed fallback during SSR). */
function useViewportLines() {
	return useSyncExternalStore(
		subscribeToViewport,
		() => Math.max(1, Math.floor((window.innerHeight * 0.4) / LINE_HEIGHT)),
		() => 24,
	);
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

const prettifyJson = (text: string) => {
	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return text;
	}
};

const countJsonLines = (text: string) => text.split(/\n/).length;
