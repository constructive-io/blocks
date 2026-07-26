'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

import { sheetsLogger } from '../../utils/sheets-logger';
import { SheetsErrorState } from './sheets-error-state';

interface SheetsErrorBoundaryProps {
	children: ReactNode;
	/** Called when a render error is caught. Mirrors SheetsConfig.onError. */
	onError?: (error: unknown, ctx?: { source?: 'grid' | 'editor' | 'mutation' | 'upload'; tableName?: string }) => void;
	/** Custom fallback. Receives the error and a reset callback to retry rendering. */
	fallback?: (error: unknown, reset: () => void) => ReactNode;
}

interface SheetsErrorBoundaryState {
	error: unknown;
}

/**
 * Render-error boundary for the grid subtree. Catches exceptions thrown during
 * render of the DataEditor and editors, logs them through the injectable logger,
 * forwards them to the host via onError, and shows a recoverable error state.
 */
export class SheetsErrorBoundary extends Component<SheetsErrorBoundaryProps, SheetsErrorBoundaryState> {
	state: SheetsErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: unknown): SheetsErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: unknown, info: ErrorInfo): void {
		sheetsLogger().error('[sheets] render error', { error, componentStack: info.componentStack });
		this.props.onError?.(error, { source: 'grid' });
	}

	reset = (): void => {
		this.setState({ error: null });
	};

	render(): ReactNode {
		const { error } = this.state;
		if (error != null) {
			return this.props.fallback?.(error, this.reset) ?? <SheetsErrorState error={error} onRetry={this.reset} />;
		}
		return this.props.children;
	}
}
