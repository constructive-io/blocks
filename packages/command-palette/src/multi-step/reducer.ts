import type { StepState, MultiStepState, MultiStepAction } from './state';

function updateStep(
  steps: StepState[],
  index: number,
  patch: Partial<StepState>
): StepState[] {
  const next = [...steps];
  next[index] = { ...next[index], ...patch };
  return next;
}

const EMPTY_STEP: StepState = { status: 'idle', error: null, data: undefined };

export function multiStepReducer<TContext>(
  state: MultiStepState<TContext>,
  action: MultiStepAction<TContext>
): MultiStepState<TContext> {
  switch (action.type) {
    case 'START': {
      return {
        commandId: action.commandId,
        currentStepIndex: 0,
        context: action.initialContext ?? {},
        steps: Array.from({ length: action.stepCount }, (_, i) => ({
          ...EMPTY_STEP,
          status: i === 0 ? ('active' as const) : ('idle' as const),
        })),
        flowStatus: 'active',
        direction: 'forward',
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        steps: updateStep(state.steps, state.currentStepIndex, {
          status: 'loading',
        }),
      };
    }

    case 'SET_STEP_DATA': {
      return {
        ...state,
        steps: updateStep(state.steps, state.currentStepIndex, {
          status: 'active',
          data: action.data,
        }),
      };
    }

    case 'SET_ERROR': {
      // Ignore errors arriving after the flow has ended (in-flight loaders/onComplete)
      if (
        state.flowStatus === 'cancelled' ||
        state.flowStatus === 'completed'
      ) {
        return state;
      }

      return {
        ...state,
        steps: updateStep(state.steps, state.currentStepIndex, {
          status: 'error',
          error: action.error,
        }),
        // Revert to active if error occurred during onComplete —
        // allows the last step to show the error and retry
        flowStatus:
          state.flowStatus === 'completing' ? 'active' : state.flowStatus,
      };
    }

    case 'COMPLETE_STEP': {
      const i = state.currentStepIndex;
      const current = state.steps[i];

      // Guard: only allow completion from active or error (retry) states
      if (current.status !== 'active' && current.status !== 'error') {
        return state;
      }

      const isLast = i === state.steps.length - 1;
      const nextSteps = updateStep(state.steps, i, {
        status: 'complete',
        error: null,
      });
      const nextContext = { ...state.context, ...action.output };

      if (isLast) {
        return {
          ...state,
          context: nextContext,
          steps: nextSteps,
          flowStatus: 'completing',
          direction: 'forward',
        };
      }

      // Activate next step, clear stale error and data so loader re-runs with fresh context
      nextSteps[i + 1] = { status: 'active', error: null, data: undefined };
      return {
        ...state,
        currentStepIndex: i + 1,
        context: nextContext,
        steps: nextSteps,
        direction: 'forward',
      };
    }

    case 'GO_BACK': {
      const i = state.currentStepIndex;
      if (i === 0) return state;
      // Block back-nav while a loader is running or onComplete is in-flight
      if (state.steps[i].status === 'loading') return state;
      if (state.flowStatus === 'completing') return state;

      const nextSteps = updateStep(state.steps, i, { status: 'idle' });
      nextSteps[i - 1] = { ...nextSteps[i - 1], status: 'active' };

      return {
        ...state,
        currentStepIndex: i - 1,
        steps: nextSteps,
        direction: 'backward',
      };
    }

    case 'SKIP_STEP': {
      const i = state.currentStepIndex;
      const isLast = i === state.steps.length - 1;
      const nextSteps = updateStep(state.steps, i, { status: 'complete' });

      if (isLast) {
        return {
          ...state,
          steps: nextSteps,
          flowStatus: 'completing',
          direction: 'forward',
        };
      }

      nextSteps[i + 1] = { status: 'active', error: null, data: undefined };
      return {
        ...state,
        currentStepIndex: i + 1,
        steps: nextSteps,
        direction: 'forward',
      };
    }

    case 'SET_COMPLETED': {
      // Only transition from completing — ignore if cancelled or already completed
      if (state.flowStatus !== 'completing') return state;
      return { ...state, flowStatus: 'completed' };
    }

    case 'CANCEL': {
      return { ...state, flowStatus: 'cancelled' };
    }

    default:
      return state;
  }
}

/** Initial state — idle before any flow starts */
export const initialMultiStepState: MultiStepState<any> = {
  commandId: '',
  currentStepIndex: 0,
  context: {},
  steps: [],
  flowStatus: 'idle',
  direction: 'forward',
};
