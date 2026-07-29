import type { StepStatus } from './types';

/** Per-step state — consolidates status, error, and loaded data */
export interface StepState {
  status: StepStatus;
  error: Error | null;
  data: unknown;
}

/** Flow-level status */
export type FlowStatus = 'idle' | 'active' | 'completing' | 'completed' | 'cancelled';

/** Animation direction for step transitions */
export type StepDirection = 'forward' | 'backward';

/** Full state of a multi-step flow */
export interface MultiStepState<TContext> {
  commandId: string;
  currentStepIndex: number;
  context: Partial<TContext>;
  steps: StepState[];
  flowStatus: FlowStatus;
  direction: StepDirection;
}

/** Actions dispatched to the multi-step reducer */
export type MultiStepAction<TContext> =
  | {
      type: 'START';
      commandId: string;
      stepCount: number;
      initialContext?: Partial<TContext>;
    }
  | { type: 'SET_LOADING' }
  | { type: 'SET_STEP_DATA'; data: unknown }
  | { type: 'SET_ERROR'; error: Error }
  | { type: 'COMPLETE_STEP'; output: Partial<TContext> }
  | { type: 'GO_BACK' }
  | { type: 'SKIP_STEP' }
  | { type: 'SET_COMPLETED' }
  | { type: 'CANCEL' };
