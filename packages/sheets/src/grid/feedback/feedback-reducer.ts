/**
 * Grid Feedback Reducer
 *
 * Manages transient UI feedback state for data grid bulk operations.
 * Uses vanilla React (useReducer) instead of Zustand since this state is:
 * - Local to the data grid component tree
 * - Ephemeral (no persistence needed)
 * - Automatically cleaned up on unmount
 */

export type OperationStatus = 'idle' | 'pending' | 'success' | 'partial' | 'error';

export interface OperationFeedback {
	id: string;
	type: 'delete' | 'submit' | 'update';
	status: OperationStatus;
	message: string;
	total: number;
	completed: number;
	failed: number;
	timestamp: number;
	/** Auto-dismiss duration in ms. 0 = persistent until manually cleared. */
	dismissAfter: number;
}

export interface FeedbackState {
	/** Current bulk operation feedback (shown in floating status) */
	operation: OperationFeedback | null;
}

// Action types
type FeedbackAction =
	| { type: 'OPERATION_START'; operationType: OperationFeedback['type']; total: number; id: string }
	| { type: 'OPERATION_PROGRESS'; id: string; completed: number; failed: number }
	| {
			type: 'OPERATION_COMPLETE';
			id: string;
			status: 'success' | 'partial' | 'error';
			message: string;
			dismissAfter: number;
	  }
	| { type: 'OPERATION_CLEAR' };

// Duration constants
export const FEEDBACK_DURATIONS = {
	/** Success operation message duration (ms) */
	OPERATION_SUCCESS: 3000,
	/** Error operation message - longer for reading (ms) */
	OPERATION_ERROR: 5000,
	/** Partial success duration (ms) */
	OPERATION_PARTIAL: 4000,
} as const;

export function createInitialState(): FeedbackState {
	return {
		operation: null,
	};
}

export function feedbackReducer(state: FeedbackState, action: FeedbackAction): FeedbackState {
	switch (action.type) {
		case 'OPERATION_START': {
			const typeLabels: Record<OperationFeedback['type'], string> = {
				delete: 'Deleting',
				submit: 'Submitting',
				update: 'Updating',
			};
			return {
				...state,
				operation: {
					id: action.id,
					type: action.operationType,
					status: 'pending',
					message: `${typeLabels[action.operationType]} ${action.total} ${action.total === 1 ? 'row' : 'rows'}...`,
					total: action.total,
					completed: 0,
					failed: 0,
					timestamp: Date.now(),
					dismissAfter: 0,
				},
			};
		}

		case 'OPERATION_PROGRESS': {
			if (!state.operation || state.operation.id !== action.id) {
				return state;
			}
			return {
				...state,
				operation: {
					...state.operation,
					completed: action.completed,
					failed: action.failed,
				},
			};
		}

		case 'OPERATION_COMPLETE': {
			if (!state.operation || state.operation.id !== action.id) {
				return state;
			}
			return {
				...state,
				operation: {
					...state.operation,
					status: action.status,
					message: action.message,
					dismissAfter: action.dismissAfter,
					timestamp: Date.now(),
				},
			};
		}

		case 'OPERATION_CLEAR': {
			return { ...state, operation: null };
		}

		default:
			return state;
	}
}

// Helper to generate operation IDs
export function generateOperationId(): string {
	return `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Helper to get dismiss duration based on status
export function getDefaultDismissDuration(status: 'success' | 'partial' | 'error'): number {
	switch (status) {
		case 'success':
			return FEEDBACK_DURATIONS.OPERATION_SUCCESS;
		case 'partial':
			return FEEDBACK_DURATIONS.OPERATION_PARTIAL;
		case 'error':
			return FEEDBACK_DURATIONS.OPERATION_ERROR;
	}
}
