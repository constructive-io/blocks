'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';

import {
	createInitialState,
	feedbackReducer,
	generateOperationId,
	getDefaultDismissDuration,
	type FeedbackState,
	type OperationFeedback,
} from './feedback-reducer';

interface FeedbackContextValue {
	state: FeedbackState;

	// Operation feedback actions
	startOperation: (type: OperationFeedback['type'], total: number) => string;
	updateOperationProgress: (id: string, completed: number, failed: number) => void;
	completeOperation: (
		id: string,
		status: 'success' | 'partial' | 'error',
		message: string,
		dismissAfter?: number,
	) => void;
	clearOperationFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

interface FeedbackProviderProps {
	children: React.ReactNode;
}

export function FeedbackProvider({ children }: FeedbackProviderProps) {
	const [state, dispatch] = useReducer(feedbackReducer, undefined, createInitialState);

	// Track timeout for auto-clearing operation feedback
	const operationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (operationTimeoutRef.current) {
				clearTimeout(operationTimeoutRef.current);
			}
		};
	}, []);

	// Operation feedback actions
	const startOperation = useCallback((type: OperationFeedback['type'], total: number): string => {
		// Clear any pending operation timeout
		if (operationTimeoutRef.current) {
			clearTimeout(operationTimeoutRef.current);
			operationTimeoutRef.current = null;
		}
		const id = generateOperationId();
		dispatch({ type: 'OPERATION_START', operationType: type, total, id });
		return id;
	}, []);

	const updateOperationProgress = useCallback((id: string, completed: number, failed: number) => {
		dispatch({ type: 'OPERATION_PROGRESS', id, completed, failed });
	}, []);

	const completeOperation = useCallback(
		(id: string, status: 'success' | 'partial' | 'error', message: string, dismissAfter?: number) => {
			const duration = dismissAfter ?? getDefaultDismissDuration(status);
			dispatch({ type: 'OPERATION_COMPLETE', id, status, message, dismissAfter: duration });

			// Auto-dismiss if duration > 0
			if (duration > 0) {
				operationTimeoutRef.current = setTimeout(() => {
					dispatch({ type: 'OPERATION_CLEAR' });
					operationTimeoutRef.current = null;
				}, duration);
			}
		},
		[],
	);

	const clearOperationFeedback = useCallback(() => {
		if (operationTimeoutRef.current) {
			clearTimeout(operationTimeoutRef.current);
			operationTimeoutRef.current = null;
		}
		dispatch({ type: 'OPERATION_CLEAR' });
	}, []);

	const value = useMemo<FeedbackContextValue>(
		() => ({
			state,
			startOperation,
			updateOperationProgress,
			completeOperation,
			clearOperationFeedback,
		}),
		[state, startOperation, updateOperationProgress, completeOperation, clearOperationFeedback],
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

/**
 * Hook for accessing only operation feedback - useful for dock status bar
 */
export function useOperationFeedback(): OperationFeedback | null {
	const { state } = useFeedback();
	return state.operation;
}
