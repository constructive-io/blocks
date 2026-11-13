/**
 * Grid Feedback Reducer
 *
 * One save status for every write the grid makes: cell saves (an edit, a paste, a
 * fill, undo and redo), new rows, deletes, and the editors and record panel that
 * save on their own. Writes that overlap share the status: it reads "saving" while
 * any write is in flight and settles once, when the last one ends, to one outcome
 * for all of them. So two saves can never show two checks, and a fast save cannot
 * replace the outcome of a slow one that is still running.
 *
 * Failed writes are also kept as reports (`writeErrors`) until the user dismisses
 * them, so a message is never lost when the status clears.
 *
 * Uses vanilla React (useReducer): the state is local to the grid, ephemeral, and
 * cleaned up on unmount.
 */

import type { WriteErrorReport } from './write-errors';

export type OperationStatus = 'idle' | 'pending' | 'success' | 'partial' | 'error';

/** What a write does. `update` saves values, `submit` creates rows, `delete` removes rows. */
export type OperationType = 'delete' | 'submit' | 'update';

/** The save status the grid shows. */
export interface OperationFeedback {
	/** Stable while the status is on screen, so a new write changes it in place. */
	id: string;
	type: OperationType;
	status: OperationStatus;
	message: string;
	total: number;
	completed: number;
	failed: number;
	/** When the status last changed. A settled status is cleared `dismissAfter` ms after it. */
	timestamp: number;
	/** Auto-dismiss duration in ms. 0 = shown until it changes. */
	dismissAfter: number;
}

/** One write in flight. */
interface PendingWrite {
	id: string;
	type: OperationType;
	total: number;
	completed: number;
	failed: number;
}

/** One write that ended while others in the same status were running or had ended. */
interface EndedWrite {
	type: OperationType;
	status: 'success' | 'partial' | 'error';
	message: string;
}

export interface FeedbackState {
	/** The save status (shown in the status bar), or null when there is nothing to show. */
	operation: OperationFeedback | null;
	/** Writes in flight. */
	pending: readonly PendingWrite[];
	/** Writes that ended since the status was last idle or settled. */
	ended: readonly EndedWrite[];
	/** Failed writes, newest last, until the user dismisses them. */
	writeErrors: readonly WriteErrorReport[];
}

/** Most failed writes kept on screen; older ones are dropped first. */
export const MAX_WRITE_ERRORS = 4;

// Action types
type FeedbackAction =
	| { type: 'OPERATION_START'; operationType: OperationType; total: number; id: string; now: number }
	| { type: 'OPERATION_PROGRESS'; id: string; completed: number; failed: number }
	| {
			type: 'OPERATION_COMPLETE';
			id: string;
			status: 'success' | 'partial' | 'error';
			message: string;
			dismissAfter: number;
			now: number;
	  }
	| { type: 'OPERATION_DISMISS'; id: string; timestamp: number }
	| { type: 'OPERATION_CLEAR' }
	| { type: 'WRITE_ERROR_ADD'; report: WriteErrorReport }
	| { type: 'WRITE_ERROR_DISMISS'; id: string }
	| { type: 'WRITE_ERROR_CLEAR' };

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
		pending: [],
		ended: [],
		writeErrors: [],
	};
}

function plural(count: number, one: string, many: string): string {
	return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

/** What the status says while writes run. One kind of write names itself; a mix is "Saving…". */
function pendingMessage(pending: readonly PendingWrite[]): string {
	const [first] = pending;
	if (!first || pending.some((write) => write.type !== first.type)) return 'Saving…';
	const total = pending.reduce((sum, write) => sum + write.total, 0);
	switch (first.type) {
		case 'delete':
			return `Deleting ${plural(total, 'row', 'rows')}…`;
		case 'submit':
			return total === 1 ? 'Creating row…' : `Creating ${plural(total, 'row', 'rows')}…`;
		case 'update':
			return total <= 1 ? 'Saving…' : `Saving ${plural(total, 'change', 'changes')}…`;
	}
}

/** The one outcome of the writes that ended together. One write keeps its own message. */
function settledOutcome(ended: readonly EndedWrite[]): { status: 'success' | 'partial' | 'error'; message: string } {
	if (ended.length === 1) return { status: ended[0]!.status, message: ended[0]!.message };
	const ok = ended.filter((write) => write.status === 'success').length;
	const failed = ended.filter((write) => write.status === 'error').length;
	if (ok === ended.length) return { status: 'success', message: 'All changes saved' };
	if (failed === ended.length) return { status: 'error', message: 'Changes were not saved' };
	return { status: 'partial', message: 'Some changes were not saved' };
}

function dismissDuration(status: 'success' | 'partial' | 'error', requested: readonly number[]): number {
	// The longest wish of the writes that ended wins, so an error is never cut short by a success.
	return Math.max(getDefaultDismissDuration(status), ...requested);
}

export function feedbackReducer(state: FeedbackState, action: FeedbackAction): FeedbackState {
	switch (action.type) {
		case 'OPERATION_START': {
			// A write that starts after the status settled begins a new set of writes; the
			// status keeps its id, so it changes in place instead of being replaced.
			const ended = state.pending.length === 0 ? [] : state.ended;
			const pending = [
				...state.pending,
				{ id: action.id, type: action.operationType, total: action.total, completed: 0, failed: 0 },
			];
			return {
				...state,
				pending,
				ended,
				operation: {
					id: state.operation?.id ?? action.id,
					type: pending.every((write) => write.type === action.operationType) ? action.operationType : 'update',
					status: 'pending',
					message: pendingMessage(pending),
					total: pending.reduce((sum, write) => sum + write.total, 0),
					completed: pending.reduce((sum, write) => sum + write.completed, 0),
					failed: pending.reduce((sum, write) => sum + write.failed, 0),
					timestamp: action.now,
					dismissAfter: 0,
				},
			};
		}

		case 'OPERATION_PROGRESS': {
			if (!state.pending.some((write) => write.id === action.id) || !state.operation) return state;
			const pending = state.pending.map((write) =>
				write.id === action.id ? { ...write, completed: action.completed, failed: action.failed } : write,
			);
			return {
				...state,
				pending,
				operation: {
					...state.operation,
					completed: pending.reduce((sum, write) => sum + write.completed, 0),
					failed: pending.reduce((sum, write) => sum + write.failed, 0),
				},
			};
		}

		case 'OPERATION_COMPLETE': {
			const write = state.pending.find((candidate) => candidate.id === action.id);
			// A write from before a reset (a table switch) has nothing left to report to.
			if (!write || !state.operation) return state;
			const pending = state.pending.filter((candidate) => candidate.id !== action.id);
			const ended = [...state.ended, { type: write.type, status: action.status, message: action.message }];
			if (pending.length > 0) {
				// Others are still running: the status keeps saying so, and settles with them.
				return {
					...state,
					pending,
					ended,
					operation: { ...state.operation, message: pendingMessage(pending), total: pending.reduce((sum, w) => sum + w.total, 0) },
				};
			}
			const outcome = settledOutcome(ended);
			return {
				...state,
				pending,
				ended,
				operation: {
					...state.operation,
					type: ended.every((entry) => entry.type === ended[0]!.type) ? ended[0]!.type : 'update',
					status: outcome.status,
					message: outcome.message,
					completed: ended.filter((entry) => entry.status !== 'error').length,
					failed: ended.filter((entry) => entry.status !== 'success').length,
					total: ended.length,
					timestamp: action.now,
					dismissAfter: dismissDuration(outcome.status, [action.dismissAfter]),
				},
			};
		}

		case 'OPERATION_DISMISS': {
			// Only the settled status it was set for: a write that started since keeps the status.
			const operation = state.operation;
			if (!operation || operation.id !== action.id || operation.timestamp !== action.timestamp) return state;
			if (state.pending.length > 0 || operation.status === 'pending') return state;
			return { ...state, operation: null, ended: [] };
		}

		case 'OPERATION_CLEAR': {
			return { ...state, operation: null, pending: [], ended: [] };
		}

		case 'WRITE_ERROR_ADD':
			return { ...state, writeErrors: [...state.writeErrors, action.report].slice(-MAX_WRITE_ERRORS) };

		case 'WRITE_ERROR_DISMISS':
			return { ...state, writeErrors: state.writeErrors.filter((report) => report.id !== action.id) };

		case 'WRITE_ERROR_CLEAR':
			return state.writeErrors.length === 0 ? state : { ...state, writeErrors: [] };

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
