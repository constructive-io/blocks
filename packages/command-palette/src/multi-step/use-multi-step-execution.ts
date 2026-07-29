import { useCallback, useMemo, useRef } from 'react';
import type { MultiStepConfig } from './types';
import type { MultiStepState } from './state';
import { useMachine } from '../machine/use-machine';
import { createMultiStepMachine } from './machine';

export interface UseMultiStepExecution {
  /** Current flow state, or null if no flow is active */
  state: MultiStepState<any> | null;
  /** Active multi-step config, if any */
  config: MultiStepConfig<any> | null;
  /** Start a new multi-step flow */
  start: <TContext>(
    commandId: string,
    config: MultiStepConfig<TContext>
  ) => void;
  /** Complete current step with output merged into context */
  completeStep: (output: Partial<any>) => void;
  /** Navigate back to previous step */
  goBack: () => void;
  /** Skip current step (if skippable) */
  skipStep: () => void;
  /** Cancel the entire flow */
  cancel: () => void;
  /** Report an error on the current step */
  setError: (error: Error | string) => void;
}

export interface UseMultiStepExecutionOptions {
  onCompleted?: () => void;
}

export function useMultiStepExecution(
  options?: UseMultiStepExecutionOptions
): UseMultiStepExecution {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const machine = useMemo(
    () =>
      createMultiStepMachine<any>({
        onCompleted: () => optionsRef.current?.onCompleted?.(),
      }),
    []
  );

  const { state: machineState, send } = useMachine(machine);
  const view = machineState.view;

  const isVisible =
    machineState.config !== null || view.flowStatus === 'completed';

  const start = useCallback(
    <TContext>(commandId: string, config: MultiStepConfig<TContext>) => {
      send({ type: 'START', commandId, config });
    },
    [send]
  );

  const completeStep = useCallback(
    (output: Partial<any>) => {
      send({ type: 'COMPLETE_STEP', output });
    },
    [send]
  );

  const goBack = useCallback(() => {
    send({ type: 'GO_BACK' });
  }, [send]);

  const skipStep = useCallback(() => {
    send({ type: 'SKIP_STEP' });
  }, [send]);

  const cancel = useCallback(() => {
    send({ type: 'CANCEL' });
  }, [send]);

  const setError = useCallback(
    (error: Error | string) => {
      const err = typeof error === 'string' ? new Error(error) : error;
      send({ type: 'SET_ERROR', error: err });
    },
    [send]
  );

  return {
    state: isVisible ? view : null,
    config: machineState.config,
    start,
    completeStep,
    goBack,
    skipStep,
    cancel,
    setError,
  };
}
