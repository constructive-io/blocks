import type { Effect, Machine, TransitionResult } from '../machine/use-machine';
import type { MultiStepConfig } from './types';
import type { MultiStepState } from './state';
import { multiStepReducer, initialMultiStepState } from './reducer';

export interface MultiStepMachineState<TContext> {
  view: MultiStepState<TContext>;
  config: MultiStepConfig<TContext> | null;
}

export type MultiStepMachineEvent<TContext> =
  | { type: 'START'; commandId: string; config: MultiStepConfig<TContext> }
  | { type: 'COMPLETE_STEP'; output: Partial<TContext> }
  | { type: 'GO_BACK' }
  | { type: 'SKIP_STEP' }
  | { type: 'CANCEL' }
  | { type: 'SET_ERROR'; error: Error }
  | { type: 'LOADER_RESOLVE'; data: unknown }
  | { type: 'LOADER_REJECT'; error: Error }
  | { type: 'COMPLETE_RESOLVE' }
  | { type: 'COMPLETE_REJECT'; error: Error };

export interface MultiStepMachineOptions {
  onCompleted?: () => void;
}

const COMPLETE_INVOKE_ID = 'onComplete';

function withLoaderEffect<TContext>(
  state: MultiStepMachineState<TContext>
): TransitionResult<MultiStepMachineState<TContext>, MultiStepMachineEvent<TContext>> {
  if (!state.config) return { state };

  const view = state.view;
  if (view.flowStatus !== 'active') return { state };

  const stepState = view.steps[view.currentStepIndex];
  if (!stepState || stepState.status !== 'active') return { state };

  const stepDef = state.config.steps[view.currentStepIndex];
  if (!stepDef?.loader) return { state };

  if (stepState.data !== undefined) return { state };

  const nextView = multiStepReducer(view, { type: 'SET_LOADING' });
  const effect: Effect<MultiStepMachineEvent<TContext>> = {
    type: 'invoke',
    id: `loader:${view.currentStepIndex}`,
    fn: () => stepDef.loader!(nextView.context as any),
    onDone: (data) => ({ type: 'LOADER_RESOLVE', data }),
    onError: (error) => ({
      type: 'LOADER_REJECT',
      error: error instanceof Error ? error : new Error(String(error)),
    }),
  };

  return { state: { ...state, view: nextView }, effects: [effect] };
}

function mergeResults<TContext>(
  first: TransitionResult<MultiStepMachineState<TContext>, MultiStepMachineEvent<TContext>>,
  second: TransitionResult<MultiStepMachineState<TContext>, MultiStepMachineEvent<TContext>>
): TransitionResult<MultiStepMachineState<TContext>, MultiStepMachineEvent<TContext>> {
  const effects = [
    ...(first.effects ?? []),
    ...(second.effects ?? []),
  ];

  return {
    state: second.state,
    effects: effects.length ? effects : undefined,
  };
}

/** Shared terminal state: SET_COMPLETED + config cleared + optional onCompleted action */
function resolveCompletion<TContext>(
  view: MultiStepState<TContext>,
  options?: MultiStepMachineOptions
): TransitionResult<MultiStepMachineState<TContext>, MultiStepMachineEvent<TContext>> {
  const completed = multiStepReducer(view, { type: 'SET_COMPLETED' });
  const state: MultiStepMachineState<TContext> = { view: completed, config: null };
  const effects: Effect<MultiStepMachineEvent<TContext>>[] | undefined =
    options?.onCompleted
      ? [{ type: 'action', fn: () => options.onCompleted?.() }]
      : undefined;
  return { state, effects };
}

function withCompletionEffect<TContext>(
  prev: MultiStepMachineState<TContext>,
  next: MultiStepMachineState<TContext>,
  options?: MultiStepMachineOptions
): TransitionResult<MultiStepMachineState<TContext>, MultiStepMachineEvent<TContext>> {
  if (prev.view.flowStatus === 'completing' || next.view.flowStatus !== 'completing') {
    return { state: next };
  }

  if (!next.config?.onComplete) {
    return resolveCompletion(next.view, options);
  }

  const effect: Effect<MultiStepMachineEvent<TContext>> = {
    type: 'invoke',
    id: COMPLETE_INVOKE_ID,
    fn: () => Promise.resolve(next.config!.onComplete!(next.view.context as any)),
    onDone: () => ({ type: 'COMPLETE_RESOLVE' }),
    onError: (error) => ({
      type: 'COMPLETE_REJECT',
      error: error instanceof Error ? error : new Error(String(error)),
    }),
  };

  return { state: next, effects: [effect] };
}

export function createMultiStepMachine<TContext>(
  options?: MultiStepMachineOptions
): Machine<MultiStepMachineState<TContext>, MultiStepMachineEvent<TContext>> {
  const initial: MultiStepMachineState<TContext> = {
    view: initialMultiStepState as MultiStepState<TContext>,
    config: null,
  };

  return {
    initial,
    transition(state, event) {
      switch (event.type) {
        case 'START': {
          const view = multiStepReducer(state.view, {
            type: 'START',
            commandId: event.commandId,
            stepCount: event.config.steps.length,
            initialContext: event.config.initialContext,
          });

          const next: MultiStepMachineState<TContext> = {
            view,
            config: event.config,
          };

          return withLoaderEffect(next);
        }

        case 'COMPLETE_STEP': {
          if (!state.config) return { state };

          const stepDef = state.config.steps[state.view.currentStepIndex];
          if (stepDef?.validate) {
            const merged = { ...state.view.context, ...event.output } as TContext;
            const result = stepDef.validate(merged as any);
            if (result !== true) {
              const error = new Error(
                typeof result === 'string' ? result : 'Validation failed'
              );
              const view = multiStepReducer(state.view, {
                type: 'SET_ERROR',
                error,
              });
              return { state: { ...state, view } };
            }
          }

          const view = multiStepReducer(state.view, {
            type: 'COMPLETE_STEP',
            output: event.output,
          });

          const next = { ...state, view };
          const withCompletion = withCompletionEffect(state, next, options);
          const withLoader = withLoaderEffect(withCompletion.state);
          return mergeResults(withCompletion, withLoader);
        }

        case 'GO_BACK': {
          const view = multiStepReducer(state.view, { type: 'GO_BACK' });
          const effects: Effect<MultiStepMachineEvent<TContext>>[] = [];
          if (state.view.steps[state.view.currentStepIndex]?.status === 'loading') {
            effects.push({ type: 'cancel', id: `loader:${state.view.currentStepIndex}` });
          }
          const next = { state: { ...state, view }, effects: effects.length ? effects : undefined };
          const withLoader = withLoaderEffect(next.state);
          return mergeResults(next, withLoader);
        }

        case 'SKIP_STEP': {
          const view = multiStepReducer(state.view, { type: 'SKIP_STEP' });
          const next = { ...state, view };
          const withCompletion = withCompletionEffect(state, next, options);
          const withLoader = withLoaderEffect(withCompletion.state);
          return mergeResults(withCompletion, withLoader);
        }

        case 'SET_ERROR': {
          const view = multiStepReducer(state.view, {
            type: 'SET_ERROR',
            error: event.error,
          });
          return { state: { ...state, view } };
        }

        case 'LOADER_RESOLVE': {
          if (!state.config) return { state };
          const view = multiStepReducer(state.view, {
            type: 'SET_STEP_DATA',
            data: event.data,
          });
          return { state: { ...state, view } };
        }

        case 'LOADER_REJECT': {
          if (!state.config) return { state };
          const view = multiStepReducer(state.view, {
            type: 'SET_ERROR',
            error: event.error,
          });
          return { state: { ...state, view } };
        }

        case 'COMPLETE_RESOLVE': {
          if (state.view.flowStatus !== 'completing') return { state };
          return resolveCompletion(state.view, options);
        }

        case 'COMPLETE_REJECT': {
          if (!state.config) return { state };
          const view = multiStepReducer(state.view, {
            type: 'SET_ERROR',
            error: event.error,
          });
          return { state: { ...state, view } };
        }

        case 'CANCEL': {
          const view = multiStepReducer(state.view, { type: 'CANCEL' });
          const effects: Effect<MultiStepMachineEvent<TContext>>[] = [
            { type: 'cancel', id: COMPLETE_INVOKE_ID },
            { type: 'cancel', id: `loader:${state.view.currentStepIndex}` },
          ];

          if (state.config?.onCancel) {
            effects.push({
              type: 'action',
              fn: () => state.config?.onCancel?.(state.view.context, state.view.currentStepIndex),
            });
          }

          return {
            state: { view, config: null },
            effects,
          };
        }

        default:
          return { state };
      }
    },
  };
}
