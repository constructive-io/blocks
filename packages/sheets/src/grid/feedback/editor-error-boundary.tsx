'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

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

/**
 * Per-overlay-editor error boundary. Catches render throws AND React.lazy
 * chunk-load rejections inside a single overlay editor so they never reach the
 * grid-level SheetsErrorBoundary (which blanks the whole grid). It must wrap the
 * editor's own Suspense so lazy rejections surface here. Routes the error to the
 * host via onError and renders a tiny inline fallback with a Close button.
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
		return (
			<div className='bg-popover text-foreground flex flex-col gap-2 rounded-lg border p-3 text-sm shadow-lg'>
				<span className='text-muted-foreground'>Editor failed to load/render</span>
				<button
					type='button'
					onClick={this.props.onClose}
					className='border-border/60 hover:bg-muted/60 self-end rounded-md border px-2.5 py-1 text-xs'
				>
					Close
				</button>
			</div>
		);
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
