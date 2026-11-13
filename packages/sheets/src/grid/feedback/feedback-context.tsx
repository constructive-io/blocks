'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

import {
	createInitialState,
	feedbackReducer,
	generateOperationId,
	type FeedbackState,
	type OperationFeedback,
	type OperationType,
} from './feedback-reducer';
import { createWriteErrorReport, type WriteErrorReport } from './write-errors';

/** The words for one write's outcome: what the status says when it saved and when it did not. */
export interface WriteMessages {
	saved: string;
	failed: string;
}

interface FeedbackContextValue {
	state: FeedbackState;

	// Save status: every write reports here, so overlapping writes share one status.
	startOperation: (type: OperationType, total: number) => string;
	updateOperationProgress: (id: string, completed: number, failed: number) => void;
	completeOperation: (
		id: string,
		status: 'success' | 'partial' | 'error',
		message: string,
		/** Keep the settled status at least this long (ms); the default depends on the status. */
		dismissAfter?: number,
	) => void;
	clearOperationFeedback: () => void;
	/** Run one write under the save status; its error is re-thrown after it is reported. */
	trackWrite: <T>(type: OperationType, total: number, run: () => Promise<T>, messages: WriteMessages) => Promise<T>;
	/** Report a write that already ended (an editor that saves on its own). */
	noteWrite: (type: OperationType, status: 'success' | 'error', message: string) => void;

	/** Show a failed write until the user dismisses it. */
	reportWriteError: (title: string, messages: readonly string[]) => WriteErrorReport;
	dismissWriteError: (id: string) => void;
	clearWriteErrors: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

interface FeedbackProviderProps {
	children: React.ReactNode;
}

export function FeedbackProvider({ children }: FeedbackProviderProps) {
	const [state, dispatch] = useReducer(feedbackReducer, undefined, createInitialState);

	// A settled status clears itself after its duration. The timer belongs to that one settled
	// status: a write that starts meanwhile changes the status and cancels the timer, so an old
	// timer can never clear a newer status.
	const operation = state.operation;
	const settledId = operation && operation.status !== 'pending' ? operation.id : null;
	const settledAt = operation?.timestamp ?? 0;
	const dismissAfter = operation?.dismissAfter ?? 0;
	useEffect(() => {
		if (!settledId || dismissAfter <= 0) return;
		const timer = setTimeout(() => dispatch({ type: 'OPERATION_DISMISS', id: settledId, timestamp: settledAt }), dismissAfter);
		return () => clearTimeout(timer);
	}, [settledId, settledAt, dismissAfter]);

	const startOperation = useCallback((type: OperationType, total: number): string => {
		const id = generateOperationId();
		dispatch({ type: 'OPERATION_START', operationType: type, total, id, now: Date.now() });
		return id;
	}, []);

	const updateOperationProgress = useCallback((id: string, completed: number, failed: number) => {
		dispatch({ type: 'OPERATION_PROGRESS', id, completed, failed });
	}, []);

	const completeOperation = useCallback(
		(id: string, status: 'success' | 'partial' | 'error', message: string, dismissAfter?: number) => {
			dispatch({ type: 'OPERATION_COMPLETE', id, status, message, dismissAfter: dismissAfter ?? 0, now: Date.now() });
		},
		[],
	);

	const clearOperationFeedback = useCallback(() => {
		dispatch({ type: 'OPERATION_CLEAR' });
	}, []);

	const trackWrite = useCallback(
		async <T,>(type: OperationType, total: number, run: () => Promise<T>, messages: WriteMessages): Promise<T> => {
			const id = startOperation(type, total);
			try {
				const result = await run();
				completeOperation(id, 'success', messages.saved);
				return result;
			} catch (error) {
				completeOperation(id, 'error', messages.failed);
				throw error;
			}
		},
		[startOperation, completeOperation],
	);

	const noteWrite = useCallback(
		(type: OperationType, status: 'success' | 'error', message: string) => {
			completeOperation(startOperation(type, 1), status, message);
		},
		[startOperation, completeOperation],
	);

	const reportWriteError = useCallback((title: string, messages: readonly string[]) => {
		const report = createWriteErrorReport(title, messages);
		dispatch({ type: 'WRITE_ERROR_ADD', report });
		return report;
	}, []);

	const dismissWriteError = useCallback((id: string) => {
		dispatch({ type: 'WRITE_ERROR_DISMISS', id });
	}, []);

	const clearWriteErrors = useCallback(() => {
		dispatch({ type: 'WRITE_ERROR_CLEAR' });
	}, []);

	const value = useMemo<FeedbackContextValue>(
		() => ({
			state,
			startOperation,
			updateOperationProgress,
			completeOperation,
			clearOperationFeedback,
			trackWrite,
			noteWrite,
			reportWriteError,
			dismissWriteError,
			clearWriteErrors,
		}),
		[
			state,
			startOperation,
			updateOperationProgress,
			completeOperation,
			clearOperationFeedback,
			trackWrite,
			noteWrite,
			reportWriteError,
			dismissWriteError,
			clearWriteErrors,
		],
	);

	return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback(): FeedbackContextValue {
	const context = useContext(FeedbackContext);
	if (!context) {
		throw new Error('useFeedback must be used within a FeedbackProvider');
	}
	return context;
}

/** The feedback of the grid around this component, or null outside a grid (a standalone record panel). */
export function useOptionalFeedback(): FeedbackContextValue | null {
	return useContext(FeedbackContext);
}

/**
 * The save status alone - useful for a status indicator.
 */
export function useOperationFeedback(): OperationFeedback | null {
	const { state } = useFeedback();
	return state.operation;
}
