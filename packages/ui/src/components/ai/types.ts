/** Shared presentation types for agent surfaces (host-runtime agnostic). */

export type ToolStatus =
	| 'pending'
	| 'running'
	| 'success'
	| 'error'
	| 'aborted'
	// AI SDK–style part states
	| 'input-streaming'
	| 'input-available'
	| 'output-available'
	| 'output-error';

export type NormalizedToolStatus = 'pending' | 'running' | 'success' | 'error' | 'aborted';

export function normalizeToolStatus(status: ToolStatus | string | undefined): NormalizedToolStatus {
	switch (status) {
		case 'input-streaming':
		case 'pending':
			return 'pending';
		case 'input-available':
		case 'running':
			return 'running';
		case 'output-available':
		case 'success':
			return 'success';
		case 'output-error':
		case 'error':
			return 'error';
		case 'aborted':
			return 'aborted';
		default:
			return 'pending';
	}
}

export type PlanStepStatus = 'pending' | 'in_progress' | 'done';

export type PlanStep = {
	label: string;
	status: PlanStepStatus;
};

export type Plan = {
	steps: PlanStep[];
};

export type ContextUsage = {
	/** null while recomputing after compaction */
	tokens: number | null;
	percent?: number | null;
	contextWindow: number;
};

export type DiffFileChip = {
	file: string;
	add?: number;
	del?: number;
};

export type InlineDiffSource = {
	before: string;
	after: string;
	fileName?: string;
};
