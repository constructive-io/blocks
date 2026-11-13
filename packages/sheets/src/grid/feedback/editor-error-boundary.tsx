'use client';

import { Component, useEffect, useId, useRef, type ErrorInfo, type ReactNode } from 'react';

import { useSheetsContext } from '../../context/sheets-context';
import { sheetsLogger } from '../../utils/sheets-logger';

type SheetsOnError = (
	error: unknown,
	ctx?: { source?: 'grid' | 'editor' | 'mutation' | 'upload'; tableName?: string },
) => void;

interface EditorErrorBoundaryProps {
	children: ReactNode;
	/** Closes the overlay so the grid stays interactive after a failure. */
	onClose: () => void;
	/** Called when a render/chunk-load error is caught. Mirrors SheetsConfig.onError. */
	onError?: SheetsOnError;
}

interface EditorErrorBoundaryState {
	error: unknown;
}

/** The error as text for the Details disclosure. */
function errorDetail(error: unknown): string {
	if (error instanceof Error) return error.message || error.name;
	return typeof error === 'string' ? error : 'Unknown error';
}

/**
 * What shows in place of an editor that failed. It takes focus on its Close button,
 * so the keyboard can leave it: Escape or Close closes it without a write and puts
 * focus back where it was (the grid, which keeps the same active cell).
 */
function EditorErrorFallback({ error, onClose }: { error: unknown; onClose: () => void }) {
	const titleId = useId();
	const closeRef = useRef<HTMLButtonElement>(null);
	const returnFocusRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		const previous = document.activeElement;
		returnFocusRef.current = previous instanceof HTMLElement && previous !== document.body ? previous : null;
		closeRef.current?.focus();
	}, []);

	const close = () => {
		const target = returnFocusRef.current;
		if (target?.isConnected) target.focus();
		onClose();
	};

	return (
		<div
			role='alertdialog'
			aria-labelledby={titleId}
			data-slot='sheets-editor-error'
			className='bg-popover text-foreground flex w-72 flex-col gap-2 rounded-lg border p-3 text-sm shadow-lg'
			onKeyDown={(event) => {
				if (event.key !== 'Escape') return;
				event.preventDefault();
				event.stopPropagation();
				close();
			}}
		>
			<p id={titleId} className='font-medium'>
				This editor could not open.
			</p>
			<p className='text-muted-foreground'>Nothing was changed.</p>
			<div className='flex items-start justify-between gap-2'>
				<details className='text-muted-foreground min-w-0 text-xs'>
					<summary className='cursor-pointer select-none'>Details</summary>
					<p className='mt-1 [overflow-wrap:anywhere]'>{errorDetail(error)}</p>
				</details>
				<button
					ref={closeRef}
					type='button'
					onClick={close}
					className='border-border/60 hover:bg-muted/60 focus-visible:ring-ring/50 shrink-0 rounded-md border px-2.5 py-1 text-xs outline-none focus-visible:ring-2'
				>
					Close
				</button>
			</div>
		</div>
	);
}

/**
 * Per-overlay-editor error boundary. Catches render throws AND React.lazy
 * chunk-load rejections inside a single overlay editor so they never reach the
 * grid-level SheetsErrorBoundary (which blanks the whole grid). It must wrap the
 * editor's own Suspense so lazy rejections surface here. Routes the error to the
 * host via onError and shows {@link EditorErrorFallback}.
 */
export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
	state: EditorErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: unknown): EditorErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: unknown, info: ErrorInfo): void {
		sheetsLogger().error('[sheets] editor render error', { error, componentStack: info.componentStack });
		this.props.onError?.(error, { source: 'editor' });
	}

	render(): ReactNode {
		if (this.state.error == null) {
			return this.props.children;
		}
		return <EditorErrorFallback error={this.state.error} onClose={this.props.onClose} />;
	}
}

interface EditorErrorGuardProps {
	// Optional so `React.createElement(EditorErrorGuard, { onClose }, child)` type-checks;
	// children are forwarded positionally to the class boundary below.
	children?: ReactNode;
	onClose: () => void;
}

/**
 * Functional shim that sources `onError` from the sheets context. Overlay editors
 * render in Glide's portal but stay within the provider tree (same path the
 * relation/image editors use for `useSheetsContext`), so the host callback is
 * reachable here.
 */
export function EditorErrorGuard({ children, onClose }: EditorErrorGuardProps): ReactNode {
	const { config } = useSheetsContext();
	return (
		<EditorErrorBoundary onClose={onClose} onError={config.onError}>
			{children}
		</EditorErrorBoundary>
	);
}
